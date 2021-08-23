const { getTypeUser , User } = require('./../type_user.js');
const database = require('./../database/database.js');
//for socket.io operation
//receive an http server

function initSocketIO(httpServer){
    const io = require('socket.io')(httpServer, {
        cors : {
            origin : 'http://localhost:3000',
        }
    });
    const connectedUser = new Set();//set of num_user , must be unique
    const namespace_user = io.of('/user');
    const namespace_tech_main = io.of('/tech_main');
    //middleware
    io.use( async (socket , next )=>{
        //for auth
        const username = socket.handshake.auth.username;
        const type_user_hash = socket.handshake.auth.type_user;
        const num_user = socket.handshake.auth.num_user;
        console.log(` middleware ${username} -- ${type_user_hash} -- ${num_user}`);
        let type_user;
        //indetify the type_user
        if(username && type_user_hash && num_user) {
            socket.username = username ;
            socket.num_user = num_user;
            type_user = await getTypeUser( type_user_hash , username );
            console.log(`authentication middleware ${type_user.code}`);
            socket.type_user = type_user.code;
        }else{
            return next(new Error('invalid credentials'));
        }
        
        next();

    });
    
    io.on('connection' , async (socket) => {
        console.log(new Date().toLocaleString()+' -- a user connected');
        //join the type room
        socket.join(socket.type_user);
        //join the individual room
        socket.join(socket.num_user);
        //join the connectedUser
        connectedUser.add(socket.num_user);
        //check the rooms
        const socketInMyRoom = await io.in(socket.num_user).allSockets();
        const sockets_user = await io.in(User.USER.code).allSockets();
        const sockets_tech_main = await io.in(User.TECH_MAIN.code).allSockets();
        console.log( 'my room' , socketInMyRoom);
        console.log( 'user room' , sockets_user);
        console.log( 'tech_main room' , sockets_tech_main.entries());

        let listConnectedUser = Array.from(connectedUser);
        io.to(User.TECH_MAIN.code).emit('tech_main connected list -activeUsers' , listConnectedUser );

        socket.on('disconnect', async () => {
            let socketInRoom = await io.in(socket.num_user).allSockets();
            if( socketInRoom.size < 1 ) {
                connectedUser.delete(socket.num_user);
                let listConnectedUser = Array.from(connectedUser);
                io.to(User.TECH_MAIN.code).emit('tech_main connected list -activeUsers' , listConnectedUser );
            }
            console.log(new Date().toLocaleString()+'--a user has disconnected -- username : '+socket.username);
        });

        socket.on('get list tech_main connected',async () => {
            console.log('get list tech_main connected');
            console.log('listConnectedUser',Array.from(connectedUser));
            let listConnectedUser = Array.from(connectedUser);
           
            socket.emit('tech_main connected list -activeUsers' , listConnectedUser );
        });

        socket.on('send message' , async (message) => {
            console.log('send message', message);
            try{
                const messages_sent = await database.sendMessage(message);
                console.log('messages_sent',messages_sent);
                for(const ms of messages_sent){
                    let same = (ms.num_app_user_envoyeur === ms.num_app_user_recepteur);
                    io.to(ms.num_app_user_envoyeur).emit('message sent -messageRoom',ms);
                    if(!same) {
                        io.to(ms.num_app_user_recepteur).emit('new message -messageRoom', ms);
                        io.to(ms.num_app_user_recepteur).emit('new message -main', ms);
                    }
                }
            }catch(err){
                console.log('error in socket.on(send message)' , err);
            }
        });

        socket.on('get messages', async (num_envoyeur , num_recepteur) => {
            console.log('get messages ' , num_envoyeur , num_recepteur);

            const messages = await database.getMessages(num_envoyeur , num_recepteur);
            //console.log('messages' , messages);
            socket.emit('messages -messageRoom' , messages);

        });

        socket.on( 'get problem definition' , async () => {
            if ( socket.type_user === User.USER.code ){
                console.log('get list problem');
                let listProblem = await database.getListProblem();
                let listStatut = await database.getListProblemeStatut();
                let listLieu = await database.getListLieu();
                //console.log( 'problem ' , listProblem );
                //get the list from database
                socket.emit('list problem', listProblem);
                socket.emit('list problem_statut' , listStatut);
                socket.emit('list lieu' , listLieu);
            }

        });

        socket.on( 'notif' , async (newNotif) => {
            console.log('new Notif ', newNotif );
            if( socket.type_user === User.USER.code ){
                //create notif
                const createdNotif = await database.createNotif(newNotif);
                console.log( 'created notif' , createdNotif );
                if( createdNotif ){
                    //acknowledge , and broadcast to all tech_main
                    console.log('send aknowledge');
                    console.log('num_user', socket.num_user);
                    console.log('num_app_user_user', createdNotif.num_app_user_user );
                    let notifs = await database.getNotification(['num_notification'], [createdNotif.num_notification]);
                    let createdFormattedNotif = {
                        num_notification : notifs[0].num_notification,
                        probleme_type : notifs[0].probleme_type,
                        probleme_statut : notifs[0].probleme_statut_libelle,
                        probleme_statut_code : notifs[0].probleme_statut_code,
                        lieu : notifs[0].lieu,
                        date_envoie : notifs[0].date_envoie,
                    }
                    console.log('createdFormattedNotif' , createdFormattedNotif);
                    io.to(socket.num_user).emit('I sent a notif', createdFormattedNotif);
                    socket.to(User.TECH_MAIN.code).emit('new notif', createdFormattedNotif);
                }
            }
        });

        socket.on('tech_main do' , async ({num_notification , num_app_user_tech_main , delai}) => {
            let now_date = new Date();
            let now = now_date.toISOString();
            
            console.log(`tech_main : ${num_app_user_tech_main} do ${num_notification} after ${delai}`);
            //check that it doesn't have a num_app_user_tech_main
            //but normally it is unanswered so num_app_user_tech_main is null :3
            
            //update the notification with num_notification
            const updatedNotif = await database.updateNotification(['num_app_user_tech_main','date_reponse'] , [num_app_user_tech_main, now ] , ['num_notification'] , [num_notification]);

            let { probleme_type ,remarque , tech_main_username , date_envoie , lieu , num_lieu , user_sender_username , statut_libelle} = updatedNotif;
            console.log(`${tech_main_username} arrive pour le probleme ${probleme_type} notifie a ${new Date(date_envoie).toLocaleString('fr-FR')}.`);
            //create the intervention 
            let motif = ` reponse a un notification de ${user_sender_username} , ${probleme_type} - ${lieu} - ${statut_libelle}`;
            let date_programme = new Date( now_date.getTime() + delai*60*1000 );
            let num_intervention_type = null;
            let code_intervention_type = 'REP_NOTIF';

            //why ??? xDD
            //let intervention_type = await database.checkInDatabase( 'intervention_type' , [ 'code_intervention_type' ] , [ code_intervention_type ]);
            //console.log( 'intervention_type' , intervention_type);
            //let { num_intervention_type } = intervention_type.row ;
            
            let num_lieu_intervention = num_lieu ;
            let num_app_user_tech_main_creator = num_app_user_tech_main;

            console.log('create intervention with :', num_app_user_tech_main_creator , code_intervention_type , num_intervention_type , num_lieu_intervention , motif , date_programme);
            const newIntervention = await database.createIntervention( num_app_user_tech_main_creator , num_intervention_type, code_intervention_type , num_lieu_intervention , motif , date_programme );
            const { num_intervention } = newIntervention ;

            //add the num_intervention to the notification
            const updatedNotif1 = await database.updateNotification(['num_intervention'] , [ num_intervention ] , [ 'num_notification'] , [ num_notification ]);
            console.log('add num_intervention to notif' , updatedNotif1 );

            //emit 'new intervention' to room 'tech_main'
            io.to(User.TECH_MAIN.code).emit('new intervention' , newIntervention);
            //emit 'update notifs list unanswered'
            io.to(User.TECH_MAIN.code).emit('update notifs list unanswered');
            //emit 'notif from tech_main' to the room num_app_user_user
            io.to(updatedNotif1.num_app_user_user).emit('notif from tech_main', updatedNotif1 );

        });

        socket.on('get notifs history',async (num_user) => {
            console.log('get notifs history server', num_user);
            num_user = ( num_user === '0' ) ? undefined : num_user ;
            const notifsTab = await database.getHistoryNotificationForUser(num_user);
            //console.log('notifTab' , notifsTab );
            if( notifsTab ) io.to(socket.num_user).emit('notifs history', notifsTab);
        });

        socket.on('get intervention history', async (num_tech_main , date_debut , date_fin , statut,num_intervention_type, num_intervention) => {
            console.log(new Date().toLocaleTimeString()+' socket.on(get intervention history)' , num_tech_main , date_debut , date_fin , statut,num_intervention_type, num_intervention);
            try{
                const minDateProgramme = await database.getAggregate('view_intervention_full' , 'min(date_programme)');
                if(!date_debut) date_debut = minDateProgramme.min;
                
                console.log(' socket.on(get intervention history)' , num_tech_main , date_debut , date_fin , statut ,num_intervention_type, num_intervention);
                const interventionList = await database.getListIntervention(num_tech_main,date_debut , date_fin , statut.done , statut.probleme_resolu, num_intervention_type ,num_intervention);

                //console.log('list Intervention' , interventionList  );
                socket.emit('intervention history' , interventionList );
            }catch(err){
                console.log('error in socket.on(get intervention history)',err);
            }

        });

        socket.on('get oldest intervention date', async () =>{
            try{
                const minDateProgramme = await database.getAggregate('view_intervention_full' , 'min(date_programme)');
                console.log('minDateProgramme' ,minDateProgramme);
                if (minDateProgramme) {
                    socket.emit('oldest intervention date', minDateProgramme.min);
                }
            }catch(err){
                console.log('error in socket.on(get oldest intervention date)', err);
            }
        });

        

        socket.on('get notifs list unanswered',async () => {
            console.log('get notifs list unanswered' );
            const notifsTab = await database.getListNotificationUnanswered();
            //console.log('notifTab' , notifsTab );
            if( notifsTab ){
                io.to(socket.num_user).emit('unanswered notifs list', notifsTab);
                io.to(socket.num_user).emit('unanswered notifs nb', notifsTab.length);
            }
        });

        socket.on('get undone intervention' , async (num_tech_main = null) => {
            console.log('get undone intervention' , num_tech_main);
            const arrayUndoneIntervention = await database.getListInterventionUndone(num_tech_main);
            //console.log('list undone intervention', arrayUndoneIntervention);
            socket.emit('list undone intervention' , arrayUndoneIntervention);
        });

        socket.on('get nb intervention undone' , async () => {
            console.log('get nb intervention undone');
            const nbInterventionUndone = await database.getNbInterventionUndone();
            console.log( 'nbInterventionUndone' , nbInterventionUndone);
            
            io.to(socket.num_user).emit('nb intervention undone' , nbInterventionUndone);
        });

        socket.on('get users list' , async () => {
            console.log('get users list');
            const usersList = await database.getAllDataInTable('view_app_user_user');
            console.log('get users list' , usersList);
            if(usersList) io.to(socket.num_user).emit('users list', usersList);
            else console.log('no usersList in get users list');
        });

        socket.on('get tech_mains list' , async () => {
            console.log('get tech_mains list');
            const tech_mainsList = await database.getAllDataInTable('view_app_user_tech_main');
            console.log('get tech_mains list' , tech_mainsList);
            if(tech_mainsList){
                let num_receiver = socket.num_user;
                for( const tech of tech_mainsList){
                    tech.nbNewMessage = await database.getNbNewMessage(num_receiver, tech.num_user);
                }
                console.log('tech_mainsList +', tech_mainsList);
                io.to(socket.num_user).emit('tech_mains list', tech_mainsList);

                socket.emit('tech_mains list -activeUsers', tech_mainsList);
            } else {
                console.log('no tech_mainsList in get tech_mains list');
            }
        });

        socket.on('get list intervention_notification' , async (num_user) => {
            console.log('get list intervention_notification', num_user);
            const int_notifList = await database.getListOfInterventionFromNotif(num_user);
            console.log('intervention' , int_notifList);
            if (int_notifList) {
                socket.emit('list intervention_notification', int_notifList);
            }
        });

        socket.on('get intervention data' , async (num_intervention) => {
            console.log('get intervention data', num_intervention );
            const intervention = await database.checkInDatabase( 'view_intervention_full' , ['num_intervention'] , [num_intervention] );
            
            if( intervention.found ) {
                await database.getInterventionChildren(intervention.row);
                console.log('intervention for num_intervention', intervention.row);
                socket.emit('intervention data', intervention.row);
            }
        });

        socket.on('tech_main saw messages', async (seenMessages) => {
            console.log('seenMessages' , seenMessages);
            //seenMessages[{ id , to(username) , from , time_sent , sent , time_seen , seen}]
            const receiverNum_user = socket.num_user;
            //update app_user_recepteur_message : set date_reception to now;
            const now = new Date().toISOString();
            
            try{
                const updatedSeenMessages = [];
                const sendersId = new Set();
                for ( const ms of seenMessages ) {
                    let setArray ={
                        prop : ['date_reception'],
                        value : [now],
                    }
                    let whereArray = {
                        prop : ['num_message', 'num_app_user_recepteur'],
                        value : [ ms.id , receiverNum_user],
                    };
                    let upMs = await database.updateTable('app_user_recepteur_message',setArray.prop ,setArray.value ,whereArray.prop , whereArray.value);
                    //console.log('upMs',upMs);
                    let newMs = await database.checkInDatabase('view_message_full',['num_message'],[upMs[0].num_message]);//return { found , row}
                    //console.log('newMs',newMs);
                    updatedSeenMessages.push(newMs.row);
                    sendersId.add( newMs.row.num_app_user_envoyeur );
                }
                console.log('updatedSeenMessages' , updatedSeenMessages);
                sendersId.forEach( id => io.to(id).emit('updateMessages -messageRoom', updatedSeenMessages));
                io.to(socket.num_user).emit('updateMessages -messageRoom', updatedSeenMessages);
            }catch(err){
                console.log('error in socket.on(tech_main saw messages)', err);
            }


        });

        socket.on('get nb new message' , async (num_user_receiver , num_user_sender = null) => {
            console.log('get nb new message', num_user_receiver);
            try{
                const nbNewMessage = await database.getNbNewMessage(num_user_receiver, num_user_sender);
                console.log('nbNewMessage' , nbNewMessage);
                socket.emit('nb new message -main', nbNewMessage);

            }catch(err){
                console.log('error in socket.on(get nb new message)' , err);
            }

        });

        socket.on('authenticate intervention tech_main',async(num_intervention , pwd) => {
            console.log('authenticate intervention tech_main', num_intervention , pwd);
            try{
                let username = await database.checkInDatabase('view_intervention_full',['num_intervention'],[num_intervention]);
                if( username.found ){
                    console.log(username.row.tech_main_username);
                    username = username.row.tech_main_username;
                    const tech_main = await database.checkCredentials(username , pwd);
                    if(tech_main.found) {
                        console.log('tech_main is authenticated');
                        socket.emit('tech_main is authenticated',num_intervention);
                    }
                }
            }catch(err){
                console.log('error in socket.on(authenticate intervention tech_main',err);
            }

        });

        socket.on('start intervention' , async (num_intervention) => {
            console.log('start intervention ', num_intervention);
            try{
                let now = new Date().toISOString();
                const updatedIntervention = await database.updateIntervention( ['date_debut'] , [now] ,['num_intervention'],[num_intervention]);
                await database.getInterventionChildren(updatedIntervention);
                socket.emit('started intervention', updatedIntervention );
            }catch(err){
                console.log('error in socket.on(start intervention) ' , err);
            }
        });
        
        socket.on('end intervention' , async (num_intervention ,resolu , date_debut ) => {
            console.log('end intervention ', num_intervention);
            try{
                let now_date = new Date();
                let now = now_date.toISOString();
                
                if(!date_debut) {
                    date_debut = new Date(now_date.getTime() - 10*60*1000).toISOString();
                }else{
                    date_debut = new Date(date_debut).toISOString();
                }
                const updatedIntervention = await database.updateIntervention( ['date_fin','done', 'probleme_resolu', 'date_debut' ] , [now,true, resolu, date_debut] ,['num_intervention'],[num_intervention]);
                await database.getInterventionChildren(updatedIntervention);
                socket.emit('ended intervention', updatedIntervention );
                socket.emit('ended intervention interventionPage', updatedIntervention );
                socket.to(User.TECH_MAIN.code).emit('ended intervention' ,updatedIntervention);
                socket.to(User.TECH_MAIN.code).emit('ended intervention interventionPage' ,updatedIntervention);
            }catch(err){
                console.log('error in socket.on(end intervention) ' , err);
            }
        });

        socket.on('get intervention type', async () => {
            try{

                const intervention_types = await database.getAllDataInTable('intervention_type');
                socket.emit('intervention_type list -interventionHistoryControl' , intervention_types);
            }catch(err){
                console.log('error in socket.on(get intervention type)',error);
            }
        });

        socket.on('get intervention definition', async () => {
            console.log('get intervention_type list');
            try{
                const intervention_types = await database.getAllDataInTable('intervention_type');
                const lieus = await database.getAllDataInTable('lieu');
                const materielTypes = await database.getAllDataInTable('materiel_type');
                const materiels = await database.getAllDataInTable('view_materiel');
                const probleme_tech_s = await database.getAllDataInTable('probleme_tech_type');
                socket.emit('intervention_type list' , intervention_types);
                socket.emit('lieu list' , lieus);//this is the new norm full english , there's list lieu up there xD change it when you feel like it
                socket.emit('lieu list -problemeTechConstate' , lieus);//this is the new norm full english , there's list lieu up there xD change it when you feel like it
                socket.emit('materiel list' , materiels,materielTypes);
                socket.emit('materiel list -materielSelector' , materiels,materielTypes);
                socket.emit('probleme_tech_type list', probleme_tech_s);
                socket.emit('probleme_tech_type list -problemeTechConstate', probleme_tech_s);
                
            }catch(err){
                console.log('error in socket.on(get intervention_type list)', err);
            }

        });

        socket.on('get probleme_tech_type list' ,async () => {
            console.log('get probleme_tech_type list');
            try{
                const probleme_tech_s = await database.getAllDataInTable('probleme_tech_type');
                socket.emit('probleme_tech_type list', probleme_tech_s);
                socket.emit('probleme_tech_type list -problemeTechConstate', probleme_tech_s);
            }catch(err){
                console.log('error in socket.on(get probleme_tech_type list)', err);
            }
        });

        socket.on('get lieu list' ,async () => {
            console.log('get lieu list');
            try{
                const lieus = await database.getAllDataInTable('lieu');
                socket.emit('lieu list', lieus);
                socket.emit('lieu list -problemeTechConstate' , lieus);//this is the new norm full english , there's list lieu up there xD change it when you feel like it
            }catch(err){
                console.log('error in socket.on(get lieu list)', err);
            }
        });
        socket.on('get materiel list' ,async () => {
            console.log('get materiel list');
            try{
                const materielTypes = await database.getAllDataInTable('materiel_type');
                const materiels = await database.getAllDataInTable('view_materiel');
                socket.emit('materiel list' , materiels,materielTypes);
                socket.emit('materiel list -materielSelector' , materiels,materielTypes);
            }catch(err){
                console.log('error in socket.on(get materiel list)', err);
            }
        });
        socket.on('create intervention' , async (num_intervention_type, code_intervention_type , num_lieu_intervention , date_programme , motif , num_materiel , num_probleme_tech_type, num_intervention_pere) => {
            let num_app_user_tech_main_creator = socket.num_user;
            let num_probleme_tech = null;
            let num_lieu_probleme_tech = num_lieu_intervention;
            console.log('create intervention with :', num_app_user_tech_main_creator , code_intervention_type , num_intervention_type , num_lieu_intervention , motif , date_programme , num_materiel);
            if( num_probleme_tech_type ) {
                //create a probleme
                try{
                    let array = {
                        prop : [
                            'num_probleme_tech_type',
                            'num_lieu_probleme_tech',
                        ],
                        value : [
                            num_probleme_tech_type,
                            num_lieu_probleme_tech,
                        ],
                    };
                    const newProblemeTech = await database.createProblemeTech( array.prop , array.value );
                    num_probleme_tech = newProblemeTech.num_probleme_tech;
                }catch(err){
                    console.log('error in socket.on(create intervention) -- create problem', err);
                }
            }
            if( num_intervention_pere ) {
                try{
                    //check it in database 
                    let intervention_pere = await database.checkInDatabase('intervention' , ['num_intervention'] , [num_intervention_pere] );
                    if( !intervention_pere.found ) {
                        num_intervention_pere = null;
                        console.log(' false num_intervention_pere ');
                    }
                }catch(err){
                    console.log('error in socket.on(create intervention) num_intervention_pere');
                }
            }else{
                num_intervention_pere = null;
            }
            let array = {
                prop : [
                    'num_app_user_tech_main_creator',
                    'num_intervention_type',
                    'num_lieu_intervention',
                    'motif',
                    'date_programme',
                    'num_materiel',
                    'num_probleme_constate',
                    'num_intervention_pere',
                ],
                value : [
                    num_app_user_tech_main_creator,
                    num_intervention_type,
                    num_lieu_intervention,
                    motif,
                    date_programme,
                    num_materiel || null,
                    num_probleme_tech,
                    num_intervention_pere,
                ],
            }
            try{
                const newIntervention = await database.createInterventionCustom( array.prop , array.value ); 
                if( newIntervention ) {
                    console.log('intervention created ... send new Intervention');
                    io.to(User.TECH_MAIN.code).emit('new intervention', newIntervention);
                }
            }catch(err){
                console.log('error in socket.on(create intervention)' , err);
            }

          
        });

        socket.on('create decharge' , async ( date , materiels ) => {
            console.log('create decharge' , date , materiels );
            date = {
                debut : new Date(date.debut).toISOString(),
                fin : new Date(date.fin).toISOString(),
            };
            let array = {
                prop : [
                    'date_debut_decharge',
                    'date_fin_decharge',
                ],
                value : [
                    date.debut,
                    date.fin,
                ],
            }
            try{
                const newDecharge = await database.createDecharge( array.prop , array.value );
                console.log('newDecharge', newDecharge);
                if( newDecharge.num_decharge ){
                    //then loop throuh ,materiels and insert in decharge_materiel
                    for ( const mat of materiels ) {
                        //materiels devrait etre valide
                        let array = {
                            prop : [
                                'num_decharge',
                                'num_materiel',
                                'configuration_origine'
                            ],
                            value : [
                                newDecharge.num_decharge,
                                mat.num,
                                mat.config,
                            ],
                        };
                        const newEntry = await database.createDechargeMateriel(array.prop, array.value);
                    }
                    socket.emit('new decharge',newDecharge);
                }

            }catch(err){
                console.log('error in socket.on(create decharge)',err);
            }
        });

        socket.on('update intervention info probleme_tech' , async (num_intervention,probleme_tech) => {
            console.log('update intervention info probleme_tech');
            let num_probleme_constate = null;
            let {
                num_probleme_tech_type,
                num_lieu,
                remarque,
            } = probleme_tech;
            if( probleme_tech.num_probleme_tech_type !== 'nd' && probleme_tech.num_lieu !== 'nd'){
                //create probleme_tech first
                let array = {
                    prop : [
                        'num_probleme_tech_type',
                        'num_lieu_probleme_tech',
                        'remarque',
                    ],
                    value : [
                        num_probleme_tech_type,
                        num_lieu,
                        remarque,
                    ],
                };
                try{
                    const newProblemeTech = await database.createProblemeTech( array.prop , array.value ); 
                    if ( newProblemeTech ) num_probleme_constate = newProblemeTech.num_probleme_tech;
                }catch(err){
                    console.log('error in socket.on(update intervention info probleme_tech)',err);
                }
            }
            //update
            let array = {
                setProp: [
                    'num_probleme_constate',
                ],
                setValue : [
                    num_probleme_constate,
                ],
                whereProp : [
                    'num_intervention'
                ],
                whereValue : [
                    num_intervention,
                ],
            }
            try{
                const updatedIntervention = await database.updateIntervention(array.setProp,array.setValue,array.whereProp,array.whereValue);
                if(updatedIntervention) {
                    console.log( 'update intervention info probleme_tech',updatedIntervention);
                    await database.getInterventionChildren(updatedIntervention);
                    socket.emit('intervention data',updatedIntervention);
                }

            }catch(err){
                console.log('error in socket.on(update intervention info probleme_tech) updateIntervention',err);
            }
        });

        socket.on('update intervention info log', async (num_intervention, log) => {
            console.log('update intervention info log');
            //update
            let array = {
                setProp: [
                    'log',
                ],
                setValue : [
                    log,
                ],
                whereProp : [
                    'num_intervention'
                ],
                whereValue : [
                    num_intervention,
                ],
            }
            try{
                const updatedIntervention = await database.updateIntervention(array.setProp,array.setValue,array.whereProp,array.whereValue);
                if(updatedIntervention) {
                    console.log( 'update intervention info log ',updatedIntervention);
                    await database.getInterventionChildren(updatedIntervention);
                    socket.emit('intervention data',updatedIntervention);
                }

            }catch(err){
                console.log('error in socket.on(update intervention info log) updateIntervention',err);
            }
        });

        socket.on('update decharge intervention' , async (num_decharge , num_intervention) => {
            console.log('update decharge intervention');
            //sent in case we save a decharge to an intervention
            let array = {
                setProp : [
                    'num_intervention',
                ],
                setValue : [
                    num_intervention,
                ],
                whereProp : [
                    'num_decharge',
                ],
                whereValue : [
                    num_decharge,
                ],
            };
            try{
                const updatedDecharge = await database.updateDecharge(array.setProp, array.setValue , array.whereProp , array.whereValue);
                if(updatedDecharge){
                    let intervention = await database.checkInDatabase('view_intervention_full',['num_intervention'],[num_intervention]) ;//return { found , row}
                    intervention = intervention.row;
                    await database.getInterventionChildren(intervention);
                    socket.emit('intervention data', intervention);
                }
            }catch(err){
                console.log('error in socket.on(update decharge intervention)',err);
            }
        });

        socket.on('update intervention info num_materiel', async (num_intervention, num_materiel) => {
            console.log('update intervention info num_materiel');
            //update
            let array = {
                setProp: [
                    'num_materiel',
                ],
                setValue : [
                    num_materiel,
                ],
                whereProp : [
                    'num_intervention'
                ],
                whereValue : [
                    num_intervention,
                ],
            }
            try{
                const updatedIntervention = await database.updateIntervention(array.setProp,array.setValue,array.whereProp,array.whereValue);
                if(updatedIntervention) {
                    console.log( 'update intervention info num_materiel ',updatedIntervention);
                    await database.getInterventionChildren(updatedIntervention);
                    socket.emit('intervention data',updatedIntervention);
                }

            }catch(err){
                console.log('error in socket.on(update intervention info num_materiel) updateIntervention',err);
            }
        });

        socket.on('update intervention info',async (num_intervention , probleme_tech , log , num_materiel ) => {
            console.log('update intervention info' ,probleme_tech , log , num_materiel);
            //num_materiel is still to be pondered
            let num_probleme_constate = null;
            let {
                num_probleme_tech_type,
                num_lieu,
                remarque,
            } = probleme_tech;
            //if probleme_tech is 'nd' , no creating of probleme_tech
            if( probleme_tech.num_probleme_tech_type !== 'nd' && probleme_tech.num_lieu !== 'nd'){
                //create probleme_tech first
                let array = {
                    prop : [
                        'num_probleme_tech_type',
                        'num_lieu_probleme_tech',
                        'remarque',
                    ],
                    value : [
                        num_probleme_tech_type,
                        num_lieu,
                        remarque,
                    ],
                };
                try{
                    const newProblemeTech = await database.createProblemeTech( array.prop , array.value ); 
                    if ( newProblemeTech ) num_probleme_constate = newProblemeTech.num_probleme_tech;
                }catch(err){
                    console.log('error in socket.on(update intervention info) createProblemeTech',err);
                }
            }
            let array = {
                setProp: [
                    'num_probleme_constate',
                    'log',
                ],
                setValue : [
                    num_probleme_constate,
                    log,
                ],
                whereProp : [
                    'num_intervention'
                ],
                whereValue : [
                    num_intervention,
                ],
            }
            try{
                const updatedIntervention = await database.updateIntervention(array.setProp,array.setValue,array.whereProp,array.whereValue);
                if(updatedIntervention) {
                    console.log( 'update intervention info ',updatedIntervention);
                    await database.getInterventionChildren(updatedIntervention);
                    socket.emit('intervention data',updatedIntervention);
                }

            }catch(err){
                console.log('error in socket.on(update intervention info) updateIntervention',err);
            }
            //updateDecharge
        });
        
    });

}

module.exports = {
    initSocketIO,
}
