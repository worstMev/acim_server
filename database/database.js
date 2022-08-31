//all functions related to database manipulation

const { Pool }      = require('pg');

const local_config  = {
    host        : 'localhost',
    port        : '5432',
    database    : 'acim',
    user        : 'acim',
    password    : 'acim',
}

const pool = new Pool(local_config);

async function getAllDataInTable (table) {
    console.log('get all data in table '+table);
    const query_text = `SELECT * FROM ${table} ;`;
    try{
        const { rows } = await pool.query(query_text);
        //console.log('all data in table' , rows );
        if(rows){
            return rows;
        }
    }catch(err){
        console.log('problem in getAllDataInTable ' , err);
    }
}



async function checkInDatabase(table , prop_array , value_array ){
    console.log('in checkDatabase');
    let condition = [];
    for( const [index, prop] of prop_array.entries()){
        condition.push(`${prop} = $${index+1}`);
    }
    const query_text = `SELECT * FROM ${table} WHERE ${condition.join(' AND ')};`;

    let isInTable = false;
    let data ;
    //console.log(query_text);
    //console.log(value_array);

    try{
        const { rows } = await pool.query(query_text,value_array);
        data = rows[0];
       
        if(rows[0])  isInTable = true;
    }catch(err){
        console.log('error in checkInDatabase',err);
    }
    return{
        found : isInTable,
        row   : data
    };
}

async function checkCredentials(username , pwd , num_user = null){
    console.log('in checkCredentials');
    //console.log(`in checkCredentials: ${username} , ${pwd} , ${num_user} `);

    let query_text = 'SELECT * FROM app_user WHERE username = $1 AND password = crypt($2,password)';
    let valArray = [ username , pwd];

    if(num_user) {
        query_text ='SELECT * FROM app_user WHERE num_user = $1 AND password = crypt($2,password)';
        valArray = [ num_user , pwd];

    }
    let data ;

    try{
        const { rows } = await pool.query(query_text,valArray);
        data = rows[0];
        console.log(data);
        
        if(rows[0]) {
            return {
                found : true,
                row : { 
                    num_user : data.num_user,
                    username : data.username, 
                    type_user : data.type_user,
                },
            }
        }

    }catch(err){
        console.log('error in checkCredentials', err);
    }
}

async function getAggregate(table , aggr){
    const query = `SELECT ${aggr} from ${table};`
    try{
        const { rows } = await pool.query(query);
        if ( rows ) return rows[0];
    }catch(err){
        console.log('error in getAggregate', err);
    }
}

async function getListAppUser() {
     const query = `SELECT num_user , username , libelle from view_app_user_full;`;
     try{
         const { rows } = await pool.query(query);
         if( rows ) return rows;
     }catch(err){
         console.log('error in getListAppUser :',err);
     }
}

async function createUser(username , pwd , code_type_user) {
    try{
        const newUser = await insertIntoTable('app_user',['username', 'password' , 'type_user '] , [ username , pwd , code_type_user ]);
        console.log('newUser' , newUser);
        if (newUser) return newUser;
        
    }catch(err){
        console.log('error in createUser ' ,err);
    }
}

async function getNbNewAnnonce(num_user){
    const query = `SELECT count(*) from view_annonce_recepteur_full
    WHERE date_reception is null
    AND num_app_user_recepteur = $1 ;`;
    try{
        const { rows } = await pool.query(query, [num_user]);
        if (rows) return rows[0].count;
    }catch(err){
        console.log('error in getNbNewAnnonce', err);
    }
}

async function getAllParticipants(num_intervention){
    const query = `SELECT * from view_intervention_participant
    WHERE num_intervention = $1 ;`;
    try{
        const { rows } = await pool.query(query, [num_intervention]);
        if (rows) return rows;
    }catch(err){
        console.log('error in getAllParticipants', err);
    }
}

async function getNbNewMessage(num_receiver , num_sender){
    console.log('getNbNewMessage' , num_receiver , num_sender);
    const query_text = `SELECT count(*) from view_message_full
    WHERE date_reception is null
    AND num_app_user_recepteur = $1
    ${ (num_sender) ? 'AND num_app_user_envoyeur = $2': 'AND num_app_user_envoyeur IS NOT NULL' }`;
    const value = (num_sender) ? [num_receiver, num_sender] : [num_receiver];
    console.log('getNbNewMessage--', query_text);
    console.log('getNbNewMessage--', value);
    try{
        const { rows } = await pool.query(query_text, value);
        console.log('nbNewMessage' , rows);
        if(rows) return rows[0].count;
    }catch(err){
        console.log('error in getNbNewMessage', err);
    }
}

async function getListProblem() {
    console.log('getListProblem ()');
    const query_text = 'SELECT * from probleme_type ; ';

    try{
        const { rows } = await pool.query(query_text);
        //console.log('getListProblem () --'+rows);
        return rows;
    }catch(err){
        console.log('problem in getListProblem ', err);
    }
}
async function getListProblemeStatut() {
    console.log('getListProblemStatut ()');
    const query_text = 'SELECT * from probleme_statut ; ';

    try{
        const { rows } = await pool.query(query_text);
        //console.log('getListProblemStatut () --'+rows);
        return rows;
    }catch(err){
        console.log('problem in getListProblemStatut ', err);
    }
}

async function getListLieu() {
    console.log('getListLieu ()');
    const query_text = 'SELECT * from lieu ; ';

    try{
        const { rows } = await pool.query(query_text);
        //console.log('getListLieu () --'+rows);
        return rows;
    }catch(err){
        console.log('problem in getListLieu ', err);
    }
}

async function createNotif({num_app_user_user,newProblem}) {
    //create the problem first
    let { num_probleme_type , num_lieu , num_probleme_statut , remarque} = newProblem;
    const query_text_problem = 'INSERT INTO probleme (num_probleme_type, num_lieu, num_probleme_statut , remarque) VALUES ( $1, $2, $3 , $4) RETURNING *;';
    const query_text_notif = 'INSERT INTO notification (num_app_user_user ,num_probleme ) VALUES ( $1 , $2 ) RETURNING *;';
    try{
        const insertedProblem = await pool.query(query_text_problem, [num_probleme_type, num_lieu, num_probleme_statut, remarque ]);
        console.log('inserted problem' , insertedProblem.rows[0] );
        if( insertedProblem.rows[0].num_probleme ) {
            const insertedNotif = await pool.query(query_text_notif , [num_app_user_user,insertedProblem.rows[0].num_probleme ]);
            console.log('inserted notif ' , insertedNotif.rows[0]);

            if( insertedNotif.rows[0].num_notification ){
                //emit aknowledge
                return {
                    num_notification : insertedNotif.rows[0].num_notification,
                    num_app_user_user : insertedNotif.rows[0].num_app_user_user,
                    date_envoie : insertedNotif.rows[0].date_envoie,
                }

            }

        }
    }catch(err){
        console.log('error in createNotif', err);
    }
}

async function getNotificationDay(day){
    console.log('getNotificationDay');
    const query_text = `SELECT * from get_notification_by_day($1::date) ORDER BY date_envoie DESC;`
    const value = [ day ];//day must be yyyy-mm-dd and local time
    try{
        const { rows } = await pool.query(query_text,value);
        if(rows) return rows;
    }catch(err){
        console.log('error in getNotificationDay: ',err);
    }
}
async function getNotification(arrayProp,arrayVal){
    let prop_text = arrayProp.map( (item,index) => `${item} = $${index +1}`).join(' AND ');

    console.log('getNotification' , prop_text);
    console.log('getNotification' , arrayVal);    

    const query_text = `SELECT * from view_notification_user_probleme_full
       WHERE ${prop_text} ;
    `;
    try{
        const result = await pool.query(query_text,arrayVal);
        //console.log(result.rows);
        return  result.rows; 
        
    }catch(err){
        console.log('problem on getNotification' , err);
    }
}

async function getHistoryNotificationForUser(num_user , itemPerPage, currentPage){
    const query = `SELECT * FROM view_notification_full 
    ${(num_user) ? 'WHERE num_app_user_user = $1' : ''} 
    ORDER BY date_envoie DESC
    LIMIT $2
    OFFSET $3;`;
    const queryNb = `SELECT count(*) FROM view_notification_full 
    ${(num_user) ? 'WHERE num_app_user_user = $1' : ''}`;
    const value = (num_user) ? [ num_user ] : [];
    const offset = itemPerPage*(currentPage-1);
    try{
        const response = await pool.query(queryNb, value);
        value.push( itemPerPage, offset);
        const { rows } = await pool.query(query, value);
        //console.log('history ',result.rows);
        if( rows ){
            return {rows , number : response.rows[0].count };
        }
    }catch(err){
        console.log('problem in getHistoryNotificationForUser' , err);
    }
}

async function getListNotificationUnanswered(){
    const query = `SELECT * FROM view_notification_by_user 
                    WHERE num_app_user_tech_main IS NULL 
                    ORDER BY date_envoie DESC`;
    try{
        const result = await pool.query(query);
        //console.log('notifs unanswered ',result.rows);
        if( result.rows ){
            return result.rows;
        }
    }catch(err){
        console.log('problem in getListNotificationUnanswered' , err);
    }
}

async function getNbNotificationUnanswered() {
    const query = `SELECT count(*) FROM view_notification_by_user
                    WHERE num_app_user_tech_main IS NULL;`;
    try{
        const { rows } = await pool.query(query);
        if( rows ){
            return rows[0].count;
        }
    }catch(err){
        console.log('error in getNbNotificationUnanswered', err);
    }
}

async function updateNotification (setArrayProp,setValue,arrayProp, arrayVal){
    let set_prop_text = setArrayProp.map((item,index) => `${item} = $${index +1}`).join(' , ');
    let prop_text = arrayProp.map( (item,index) => `${item} = $${index +setArrayProp.length +1}`).join(' AND ');

    let arrayAllVal = setValue.concat(arrayVal);
    console.log('updateNotification' , set_prop_text , prop_text);
    console.log('updateNotification' , arrayAllVal);    
    
    const query_text = `UPDATE notification
                            SET ${set_prop_text} 
                            WHERE ${prop_text}
                        RETURNING *;`
    console.log(query_text);
    try{
        const resUpdate = await pool.query(query_text,arrayAllVal);
        let updatedNotif = resUpdate.rows[0];
        console.log('updateNotif ',updatedNotif);
        const info_query_text = `SELECT * from view_notification_by_user WHERE num_notification = $1;`;
        const resInfo = await pool.query(info_query_text,[ updatedNotif.num_notification]);
        console.log(resInfo.rows[0]);
        return resInfo.rows[0];
    }catch(err){
        console.log('problem in updateNotification ' , err);
    }

}

async function createIntervention ( num_app_user_tech_main_creator ,num_intervention_type, code_intervention_type , num_lieu_intervention , motif , date_programme , num_materiel, num_probleme_tech_type ){
    let query_num_intervention_type;
    let prop_intervention_type ;
    if ( !num_intervention_type ){
        if(code_intervention_type){
            query_num_intervention_type = `( select num_intervention_type from intervention_type where code_intervention_type = $2)`;
            prop_intervention_type = code_intervention_type;
        }
    }else{
        query_num_intervention_type = '$2';
        prop_intervention_type = num_intervention_type;
    }
    
    const query_text = ` INSERT into intervention(num_app_user_tech_main_creator , num_intervention_type , num_lieu_intervention , motif , date_programme ) values ($1 , 
        ${query_num_intervention_type} , $3 , $4 , $5) RETURNING *;`
    const values = [num_app_user_tech_main_creator ,
                    prop_intervention_type,
                    num_lieu_intervention ,
                    motif ,
                    date_programme ];
    try{
        const { rows } = await pool.query(query_text,values);
        console.log('created an intervention' , rows[0]);
        if ( rows[0] ) return rows[0];
    }catch(err){
        console.log('error in create intervention', err);
    }
}

async function insertIntoTable ( table , arrayProp , valueProp ) {
    const query_prop = arrayProp.join(',');
    console.log(query_prop);
    const query_value = arrayProp.map(( item, index) => `$${index+1}`).join(',');
    console.log(query_value);
    const query = `INSERT INTO ${table} ( ${query_prop} ) VALUES ( ${query_value} ) RETURNING * ;`
    console.log(query);
    try{
        const { rows } = await pool.query(query,valueProp);
        console.log('inserted  in table '+table+':', rows[0] );
        if( rows ) return rows[0];
    }catch(err){
        console.log('error in insert table :'+table+ '--', err);
    }
}

async function createAnnonce(id,num_envoyeur, contenu){
    console.log('database create annonce', id,num_envoyeur , contenu);
    try{
        let array = {
            prop : ['num_message' , 'num_app_user_envoyeur' , 'contenu_message', 'is_annonce' ],
            value : [ id , num_envoyeur , contenu , true],
        };
        let newAnnonce = await insertIntoTable('message', array.prop , array.value);
        //console.log('newAnnonce', newAnnonce);
        //insert in app_user_recepteur_message for all app_users
        const query_broadcast = `SELECT * from broadcast_message($1);`;
        const { rows } = await pool.query(query_broadcast,[  newAnnonce.num_message ]);
        
        newAnnonce = await checkInDatabase('view_annonce_full',['num_message'],[newAnnonce.num_message]);
        if( rows && newAnnonce.found ){
            return newAnnonce.row;
        }
    }catch(err){
        console.log('error in createAnnonce', err);
    }
}

async function createInterventionType(libelle, code){
    console.log('createInterventionType' , libelle ,code);
    try{
        let newInterventionType = await insertIntoTable('intervention_type', ['libelle_intervention_type','code_intervention_type'],[libelle, code]);
        if( newInterventionType.num_intervention_type ) {
            return newInterventionType;
        }else{
            throw `createInterventionType failed for ${libelle}--${code}`;
        }
    }catch(err){
        console.log('error in createInterventionType' , err);
    }
}


async function createParticipant(num_intervention, num_user){
    console.log('createParticipant', num_intervention , num_user);
    try{
        let newPendingParticipant = await insertIntoTable('participer_app_user_intervention',['num_intervention','num_user','is_confirmed'],[num_intervention, num_user, false]);
        if( newPendingParticipant.num_intervention )
            return newPendingParticipant;
        else
            throw `createParticipant failed for ${num_intervention} -- ${num_user}`;
    }catch(err){
        console.log('error in createParticipant :',err);
    }
}

async function createProblemeTechType(libelle){
    console.log('createProblemeTechType' , libelle );
    try{
        let newProblemeTechType = await insertIntoTable('probleme_tech_type', ['libelle_probleme_tech_type'],[libelle]);
        if( newProblemeTechType.num_probleme_tech_type ) {
            return newProblemeTechType;
        }else{
            throw `createProblemeTechType failed for ${libelle}`;
        }
    }catch(err){
        console.log('error in createProblemeTechType' , err);
    }
}

async function createCall(num_notification , duration){

    //appel_vocal ( num_notification , duree_appel_vocal)
}

async function sendMessage(message){
    //message { id , contenu ,num_sender , receivers : [num_receiver]}
    //return an array of what we get from the view_message_full,
    let newMessages = [];
    try{
        let array = {
            prop : ['num_message' , 'num_app_user_envoyeur' , 'contenu_message' ],
            value : [ message.id , message.num_sender , message.contenu ],
        };
        const newMessage = await insertIntoTable('message' , array.prop , array.value);
        //insert in app_user_recepteur_message
        for( const num_dest of message.receivers ){
            array.prop = ['num_app_user_recepteur' , 'num_message' ];
            array.value = [ num_dest , newMessage.num_message ];
            const newMs = await insertIntoTable('app_user_recepteur_message', array.prop , array.value);
            const newMsFull = await checkInDatabase('view_message_full',array.prop , array.value);
            if (newMsFull.found) newMessages.push(newMsFull.row);
        }
        if (newMessages.length) return newMessages;
    }catch(err){
        console.log('error in database.sendMessage' ,err);
    }
}

async function createInterventionCustom (arrayProp, valueProp){
    try{
        const newIntervention = await insertIntoTable('intervention', arrayProp , valueProp);
        if ( newIntervention ) return newIntervention;
    }catch(err){
        console.log('error in createInterventionCustom ',err);
    }
}

async function createProblemeTech ( arrayProp , valueProp){

    try{
        const newProblemeTech = await insertIntoTable('probleme_tech', arrayProp , valueProp);
        if ( newProblemeTech ) return newProblemeTech;
    }catch(err){
        console.log('error in createProblemeTech ',err);
    }
}

async function createDecharge ( arrayProp , valueProp){
    try{
        const newDecharge = await insertIntoTable('decharge', arrayProp , valueProp);
        if ( newDecharge ) return newDecharge;
    }catch(err){
        console.log('error in createDecharge', err);
    }
}

async function updateMateriel(setPropArray,setValueArray,wherePropArray,whereValueArray){
    try{
        const updatedMateriel = await updateTable('materiel',setPropArray,setValueArray,wherePropArray,whereValueArray)
        if(updatedMateriel) return updatedMateriel;
    }catch(err){
        console.log('error in updateMateriel :', err);
    }
}



async function createDechargeMateriel ( arrayProp , valueProp){
    try{
        const newDechargeMateriel = await insertIntoTable('decharge_materiel', arrayProp , valueProp);
        if ( newDechargeMateriel ) return newDechargeMateriel;
    }catch(err){
        console.log('error in createDechargeMateriel', err);
    }
}

async function getDechargeInfo( num_decharge ){
    const query = 'SELECT * from view_decharge_full where num_decharge = $1 ORDER BY num_materiel';
    try{
        const { rows } = await pool.query(query,[num_decharge]);
        //console.log('getDechargeInfo rows',rows);
        if (rows) return rows;
    }catch(err){
        console.log('error in getDechargeInfo', err);
    }
}

async function getDechargeInfoFull(num_decharge) {
    try{
        const res  = await checkInDatabase('decharge',['num_decharge'],[num_decharge]);
        if(res.found){
            const decharge = res.row;
            const dechargesData = await getDechargeInfo(num_decharge);//return multiple of entry in view_dehcarge_full with corresponding num_decharge
            const renews = await getRenouvellement(num_decharge);
            let dechargeObj = {
                num_decharge : num_decharge,
                is_all_working : decharge.is_all_working,
                is_all_in_place : decharge.is_all_in_place,
                is_archived : decharge.is_archived,
                date_debut : new Date(decharge.date_debut_decharge).toLocaleDateString(),
                date_fin : new Date(decharge.date_fin_decharge).toLocaleDateString(),
                num_intervention : decharge.num_intervention,
                tech_main_username: dechargesData[0].username,
                num_tech_main : dechargesData[0].num_tech_main,
                materiels : [],
                renews : renews,
            }
            for ( const dech of dechargesData){
                dechargeObj.materiels.push({
                    num_materiel : dech.num_materiel,
                    libelle_materiel : dech.libelle_materiel,
                    libelle_materiel_type : dech.libelle_materiel_type,
                    config_origine : dech.configuration_origine,
                    is_working : dech.is_working,
                    is_in_place : dech.is_in_place,
                    lieu : dech.lieu,
                });
            }
            return dechargeObj;
        }else{
            throw new Error('getDechargeInfoFull decharge not found');
        }
    }catch(err){
        console.log('error in getDechargeInfoFull:', err);
    }
}

async function getAllDecharge(itemPerPage,currentPage){
    const queryNumber = `SELECT count(*) from decharge;`;
    //add page
    const query = `SELECT * from decharge
    ORDER BY is_archived ASC, date_fin_decharge ASC, date_creation_decharge ASC, num_decharge ASC
    LIMIT $1
    OFFSET $2;`;
    const arrayValue = [ itemPerPage ,  itemPerPage*(currentPage - 1)];
    //console.log('getAllDecharge query ',query , arrayValue);
    try{
        const { rows } = await pool.query(query, arrayValue);
        //console.log('getAllDecharge rows',rows);
        const response = await pool.query(queryNumber);
        if (rows) return {
            rows,
            number : response.rows[0].count,
        };
    }catch(err){
        console.log('error in getAllDecharge', err);
    }

}

async function getListInterventionUndone(num_tech_main = null) {
    let whereClause;
    let arrayValue;
    if(num_tech_main){
        whereClause = ` num_app_user_tech_main_creator = $1 `;
        arrayValue = [ num_tech_main ];
    }else{
        whereClause = ' num_app_user_tech_main_creator IS NOT NUll ';
    }
    

    const query_text = `SELECT * from view_intervention_undone 
    WHERE ${whereClause}
    ORDER BY date_programme ASC`
    console.log('getListInterventionUndone query' , query_text);
    try{
        const { rows } = await pool.query(query_text , arrayValue);
        if( rows ) return rows;
    }catch(err){
        console.log('error in getListInterventionUndone' , err);
    }
}

async function getListInterventionPartaking(num_tech_main = null) {
    let whereClause;
    let arrayValue;
    if(num_tech_main){
        whereClause = ` num_user_participant = $1 AND is_confirmed = true `;
        arrayValue = [ num_tech_main ];
    }else{
        //normally, this should never run
        whereClause = ' num_user_participant IS NOT NUll AND is_confirmed = true';
    }
    

    const query_text = `SELECT * from view_intervention_participant_full 
    WHERE ${whereClause}
    ORDER BY date_programme ASC`
    console.log('getListInterventionPartaking query' , query_text);
    try{
        const { rows } = await pool.query(query_text , arrayValue);
        if( rows ) return rows;
    }catch(err){
        console.log('error in getListInterventionPartaking' , err);
    }
}
async function getNbInterventionUndoneForTechMain(num_tech_main = null){
    let whereClause;
    let arrayValue;
    if(num_tech_main){
        whereClause = ` num_app_user_tech_main_creator = $1 `;
        arrayValue = [ num_tech_main ];
    }else{
        whereClause = ' num_app_user_tech_main_creator IS NOT NUll ';
    }
    

    const query_text = `SELECT count(*) from view_intervention_undone 
    WHERE ${whereClause};`;
    console.log('getNbInterventionUndoneForTechMain query' , query_text);
    try{
        const { rows } = await pool.query(query_text , arrayValue);
        console.log('getNbInterventionUndoneForTechMain ', rows);
        if( rows ) return rows[0].count;
    }catch(err){
        console.log('error in getNbInterventionUndoneForTechMain' , err);
    }
}

async function getListInterventionPending( num_tech_main = null){
    let whereClause;
    let arrayValue;
    if(num_tech_main){
        whereClause = ` num_app_user_tech_main_creator = $1 `;
        arrayValue = [ num_tech_main ];
    }else{
        whereClause = ' num_app_user_tech_main_creator IS NOT NUll ';
    }
    

    const query_text = `SELECT * from view_intervention_started 
    WHERE ${whereClause}
    ORDER BY date_programme ASC`
    console.log('getListInterventionPending query' , query_text);
    try{
        const { rows } = await pool.query(query_text , arrayValue);
        if( rows ) return rows;
    }catch(err){
        console.log('error in getListInterventionPending' , err);
    }
}

async function getListInterventionDoneToday ( num_tech_main = null ){
    let whereClause;
    let arrayValue;
    if(num_tech_main){
        whereClause = ` num_app_user_tech_main_creator = $1 `;
        arrayValue = [ num_tech_main ];
    }else{
        whereClause = ' num_app_user_tech_main_creator IS NOT NUll ';
    }
    

    const query_text = `SELECT * from view_intervention_done_today 
    WHERE ${whereClause}
    ORDER BY date_programme ASC`
    console.log('getListInterventionDoneToday query' , query_text);
    try{
        const { rows } = await pool.query(query_text , arrayValue);
        if( rows ) return rows;
    }catch(err){
        console.log('error in getListInterventionDoneToday' , err);
    }
}

async function getDataInTable(table , arrayProp , arrayValue , orderClause = null){
    const whereClause = arrayProp.map( (prop,index) => `${prop} = $${index+1}`).join(' AND ');
    const query_text = `SELECT * from ${table}
    WHERE ${whereClause}
    ${(orderClause) ? orderClause : ''}`;
    console.log('query_text in getDataInTable', query_text , arrayValue);
    try{
        const {rows} = await pool.query(query_text , arrayValue); 
        if(rows) return rows;
        else return new Error('no data in getDataInTable');
    }catch(err){
        console.log('error in getDataInTable',table, err);
    }
}

async function getAnnonces(num_recepteur, itemPerPage, currentPage) {
    //get message ( is_annonce = true ) , 7 last days , today - 7 j
    const query = `SELECT * FROM view_annonce_recepteur_full
    WHERE num_app_user_recepteur = $1 
    ORDER BY date_envoie DESC
    LIMIT $2
    OFFSET $3;`;
    const queryNb = `SELECT count(*) FROM view_annonce_recepteur_full
    WHERE num_app_user_recepteur = $1;`;
    const offset = itemPerPage*(currentPage - 1);
    try{
        const response = await pool.query(queryNb, [num_recepteur]);
        const { rows } = await pool.query(query, [num_recepteur, itemPerPage , offset ]);
        console.log('getAnnonces' , rows);
        if(rows) return {rows, number : response.rows[0].count};
    }catch(err){
        console.log('error in getAnnonces', err);
    }
    
}

async function getMessages ( num_sender , num_receiver ){
    let array = {
        prop : ['num_app_user_envoyeur' , 'num_app_user_recepteur'],
        value : [ num_sender , num_receiver ],
    };
    let same = (num_sender === num_receiver);
    const query_text = `SELECT * from view_message_full
    WHERE num_app_user_envoyeur = $1 AND num_app_user_recepteur = $2 
    ${ (same)? '' : 'OR num_app_user_envoyeur = $2 AND num_app_user_recepteur = $1'}
    ORDER BY date_envoie ASC`;
    try{
        const { rows } = await pool.query(query_text, array.value);
        if(rows) return rows;
        //if(rows) return rows;
    }catch(err){
        console.log('error in getMessages', err);
    }
}

async function getListInterventionForReport(num_tech_main, debut , fin ){
    //debut and fin are in local
    //db in UTC so local - 3
    //toutes interventions debuté entre debut et fin
    //we added [OR ... ] for participation
    const query_text = `select * from view_intervention_full
    WHERE (
        num_app_user_tech_main_creator = $1
        OR num_intervention IN ( select num_intervention from participer_app_user_intervention where num_user = $1 and is_confirmed = true)
        )
    AND date_debut IS NOT NULL
    AND date_debut >= $2::date+ time '00:00' - time '03:00'
    AND date_debut <= $3::date+ time '23:59' - time '03:00'
    ORDER BY date_debut ASC`;
    let values = [ num_tech_main, debut , fin];
    console.log('getListInterventionForReport query ', query_text ,values);
    try{
        const { rows } = await pool.query(query_text,values);
        if(rows){
            return rows;
        }
    }catch(err){
        console.log('error in getListInterventionForReport ', err);
    }
}

async function getListIntervention(num_tech_main , debut , fin , done , probleme_resolu,num_intervention_type,num_intervention , currentPage , itemPerPage){
        
    let whereClauseArray = [
        'num_app_user_tech_main_creator = ',
        'date_programme >= ',
        'date_programme <= ',
        'done = ',
        'probleme_resolu =',
        'num_intervention_type =',
        'num_intervention::text LIKE ',
    ];
    let arrayValue = [ num_tech_main , debut, fin , done ,probleme_resolu, num_intervention_type,num_intervention ];
    let indexToSuppr = [];
    for( const [index,val] of arrayValue.entries()){
        console.log(index,val);
        if(val  === 'nd') indexToSuppr.push(index);
    }
    console.log('indexToSuppr', indexToSuppr);
    for( const [index,i] of indexToSuppr.entries() ){
        let iSuppr = i - index;//everytime we splice the size of the array goes down
        arrayValue.splice(iSuppr,1);
        whereClauseArray.splice(iSuppr,1);
    }
    console.log('whereClause' ,whereClauseArray);
    console.log('arrayValue', arrayValue);
    let whereClause = whereClauseArray.map( (item,index) => ` ${item} $${index+1} `).join(' AND ');
    console.log('whereClause' , whereClause);
    let query_text = `SELECT * from view_intervention_full
    WHERE ${whereClause}
    ORDER BY date_programme ASC
    LIMIT $${whereClauseArray.length + 1}
    OFFSET $${whereClauseArray.length + 2}`;
    let arrayValueWithPage = [ ... arrayValue, itemPerPage , itemPerPage * ( currentPage -1)];
    let query_text_full = `SELECT count(*) from view_intervention_full
    WHERE ${whereClause}`;

    console.log('query_text: ',query_text);
    console.log(arrayValueWithPage);
    //console.log('query_text_full: ',query_text_full);
    //console.log(arrayValue);
      
    try{
        const response = await pool.query(query_text_full,arrayValue); 
        console.log('response ',response);
        const {rows} = await pool.query(query_text,arrayValueWithPage); 
        //get all child of each intervention
        for( const interv of rows ){
            await getInterventionChildren(interv);
            //console.log(`interv.children of ${interv.num_intervention}`, interv.children);
        }
        if(rows) return { rows, number : response.rows[0].count };
    }catch(err){
        console.log('error in getListIntervention',err);
    }
    
}

async function getInterventionChildren(intervention){
    //use of shallow copy xD
    let {
        num_intervention,
    } = intervention;
    //console.log('getInterventionChildren' ,num_intervention);
    const query = 'SELECT * from view_intervention_full where num_intervention_pere = $1';

    try{
        const res = await pool.query(query , [num_intervention]);
        if( res.rows.length > 0 ){
            //console.log(`res.rows in getInterventionChildren --${num_intervention}`,res.rows);
            intervention.children = res.rows;
            for( const child of res.rows ) {
                await getInterventionChildren(child);
            }
        } else {
            //console.log(`res.rows in getInterventionChildren --${num_intervention}`,res.rows);
            intervention.children = [];
            //console.log(`res.rows from children in getInterventionChildren --${num_intervention}`, intervention.children);
        }

    }catch(err){
        console.log('error in getInterventionChildren', err);
    }
}

async function getNbInterventionUndone () {
    const query_text = `SELECT count(*) as nb_intervention_undone from view_intervention_undone ;`;

    try{
        const { rows } = await pool.query(query_text);
        console.log('nbTacheUndone' , rows[0]);
        return rows[0].nb_intervention_undone ;
        
    }catch(err){
        console.log('problem in getNbInterventionUndone' , err);
    }
}

async function getListOfInterventionFromNotif(num_user, itemPerPage, currentPage) {
    
    const query = `SELECT * FROM view_notification_by_user_intervention 
    ${(num_user) ? 'WHERE num_app_user_user = $1' : ''} 
    ORDER BY date_programme DESC
    LIMIT $2
    OFFSET $3;`;
    const queryNb = `SELECT count(*) FROM view_notification_by_user_intervention
    ${(num_user) ? 'WHERE num_app_user_user = $1' : ''} ;`;
    const value = (num_user) ? [ num_user ] : [];
    const offset = itemPerPage*(currentPage-1);
    try{
        const response = await pool.query(queryNb, value);
        value.push( itemPerPage, offset);
        const { rows } = await pool.query(query, value);
        //console.log('history ',result.rows);
        if( rows ){
            for( const interv of rows ) {
                await getInterventionChildren(interv);
            }
            return {rows , number: response.rows[0].count };
        }
    }catch(err){
        console.log('problem in getListOfInterventionFromNotif' , err);
    }
}

async function updateTable(table,setPropArray,setValueArray,wherePropArray,whereValueArray){
    let setClause = setPropArray.map( (setProp,index) => `${setProp} = $${index+1}`).join(' , ');
    let whereClause = wherePropArray.map( (whereProp,index) => `${whereProp} = $${index + setPropArray.length + 1}` ).join(' AND ');

    let valueArray = setValueArray.concat(whereValueArray);
    const query_text = ` UPDATE ${table}
    SET ${setClause}
    WHERE ${whereClause}
    RETURNING *;
    `;
    console.log(`updateTable query : ${query_text}`);
    console.log(`updateTable value : ${valueArray}`);
    try{
        const { rows } = await pool.query(query_text,valueArray);
        if (rows) return rows;
    }catch(err){
        console.log('error in updateTable:',table , err);
    }
}

async function updateInterventionFull (setPropArray,setValueArray,wherePropArray,whereValueArray){
    console.log('updateIntervention',setPropArray,setValueArray,wherePropArray,whereValueArray);
    try{
        const updatedInterventions = await updateTable('intervention' ,setPropArray,setValueArray,wherePropArray,whereValueArray);
        if (updatedIntervention) return updatedIntervention;
    }catch(err){
        console.log('error in updateIntervention',err);
    }

}

async function updateIntervention (setPropArray,setValueArray,wherePropArray, whereValueArray){
    try{
        const updatedInterventions = await updateTable('intervention' ,setPropArray,setValueArray,wherePropArray,whereValueArray);
        console.log('updateInterventions' ,updatedInterventions);
        let num_intervention = updatedInterventions[0].num_intervention;
        console.log('num_intervention', num_intervention);
        if (updatedInterventions){
            const updatedIntervention = await checkInDatabase('view_intervention_full',['num_intervention'],[num_intervention]) ;
            await getInterventionChildren(updatedIntervention.row);
            console.log('updatedIntervention 1', updatedIntervention.row);
            return updatedIntervention.row;

        }
    }catch(err){
        console.log('error in updateIntervention', err);
    }
}

async function updateDecharge(setPropArray,setValueArray,wherePropArray, whereValueArray){
    try{
        const updatedDecharge = await updateTable('decharge',setPropArray,setValueArray,wherePropArray, whereValueArray);
        if (updatedDecharge) return updatedDecharge;
    }catch(err){
        console.log('error in updateDecharge', err);
    }
}

async function updatePartaking(setPropArray,setValueArray,wherePropArray, whereValueArray){
    try{
        const updatedPartaking = await updateTable('participer_app_user_intervention',setPropArray,setValueArray,wherePropArray, whereValueArray);
        if (updatedPartaking) return updatedPartaking;
    }catch(err){
        console.log('error in updatePartaking', err);
    }
}

async function getRenouvellement(num_decharge) {
    // reparation_locale = decharge
    const query = `SELECT * 
    from view_renouvellement_full 
    where num_reparation_locale = $1
    `;
    const value = [num_decharge];
    try{
        const {rows} = await pool.query(query,value);
        if(rows) return rows;
        
    }catch(err){
        console.log('error in getRenouvellement', err);
    }

}

async function getStatsDates(debut, fin , num_tech_main){
    try{
        //generate the dates from debut to fin
        console.log(debut, fin, num_tech_main);
        const query_date = `SELECT j::date from generate_series( $1::date , $2::date , '1 day' ::interval) as j;`;
        const { rows } = await pool.query(query_date, [debut , fin ]);
        if(rows){
            console.log('getStatsDates', rows);
            const datesLocales = rows.map( item => new Date(item.j).toLocaleDateString('fr-FR'));
            const statsPerDate = [];

            for( const date of datesLocales){
                const query_stats = `SELECT count(*) as nb_intervention from get_intervention_by_day($1) WHERE num_app_user_tech_main_creator = $2`;
                const val = [ date , num_tech_main ];
                const { rows } = await pool.query(query_stats, val);
                if(rows){
                    statsPerDate.push({
                        date : date,
                        stats : rows[0],
                    });
                }
            }
            console.log('statsPerDate', statsPerDate);
            return statsPerDate;
           
        }
    }catch(err){
        console.log('error in getStatsDates', err);
    }
}

async function getAgenda(debut , fin , num_tech_main){
    try{
        //get all date from debut to fin
        console.log(debut ,fin ,num_tech_main);
        const query_date = `SELECT j::date from generate_series( $1::date , $2::date , '1 day' ::interval) as j;`;
        const { rows } = await pool.query(query_date, [debut , fin ]);
        if(rows){
            console.log('getAgenda dates' , rows);
            //in db it's UTC , so must use UTC for comparission
            //const dates = rows.map( item => item.j );
            const datesLocales= rows.map( item => new Date(item.j).toLocaleDateString('fr-FR') );
            console.log('getAgenda datesLocales +', datesLocales);
            const intervPerDate = [];
            for( const date of datesLocales){
                const query_day = `SELECT * from get_intervention_by_day($1)
                WHERE num_app_user_tech_main_creator = $2;`
                const { rows } = await pool.query(query_day,[date, num_tech_main]);
                if(rows){
                    intervPerDate.push({
                        date,
                        intervList : rows,
                    });
                }
            }
            console.log('intervPerDate' , intervPerDate);
            return intervPerDate;
        }
        

    }catch(err){
        console.log('error in getAgenda', err);
    }
}



module.exports = {
    checkInDatabase,
    checkCredentials,
    createAnnonce,
    createParticipant,
    createInterventionType,
    createProblemeTechType,
    getStatsDates,
    getAggregate,
    getAgenda,
    getAnnonces,
    getAllParticipants,
    getListProblem ,
    getListLieu,
    getListProblemeStatut,
    getListInterventionForReport,
    getNotification,
    getHistoryNotificationForUser,
    getListNotificationUnanswered,
    getListInterventionUndone,
    getListInterventionPartaking,
    getNbInterventionUndoneForTechMain,
    getListInterventionPending,
    getListInterventionDoneToday,
    getListIntervention,
    getAllDataInTable,
    getNbInterventionUndone,
    getNbNewAnnonce,
    getListOfInterventionFromNotif,
    getDechargeInfo,
    getDechargeInfoFull,
    getAllDecharge,
    getRenouvellement,
    getNbNewMessage,
    getInterventionChildren,
    getNotificationDay,
    getMessages,
    getNbNotificationUnanswered,
    updateNotification,
    updateIntervention,
    updateInterventionFull,
    updateDecharge,
    updatePartaking,
    updateMateriel,
    createNotif,
    createIntervention,
    createInterventionCustom,
    createProblemeTech,
    createDecharge,
    createDechargeMateriel,
    sendMessage,
    updateTable,
    getListAppUser,
    createUser,
}
