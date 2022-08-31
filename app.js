const express       = require('express');
const app           = express();
const httpServer    = require('http').createServer(app);
const cors          = require('cors');
const path          = require('path');
const database      = require('./database/database');
const bodyParser    = require('body-parser');
const Socket_io     = require('./socket_io/socket_io.js');
const GeneratePdf   = require('./generatePdf/generate.js');
const GenerateDocx  = require('./generateDocx/generate.js');
const template      = require('./htmlTemplate/htmlTemplate.js');
const peerServer    = require('./peerServer');

const PORT = 3500;
const corsOption = {
    origin : 'http://localhost:3000',
};

//server config =============
app.use(cors(corsOption));
app.use(bodyParser.urlencoded({ extended : true }));
app.use(bodyParser.json());
//makes all routes unaccessible except /acim
//works for /pdf/
app.use(express.static(path.join(__dirname,'acim')));

//initialize the socket_io
Socket_io.initSocketIO(httpServer);

app.get('/acim*' , (req,res) => {
    res.sendFile(path.join(__dirname,'acim/index.html'));
});
app.get('/notify*' , (req,res) => {
    res.sendFile(path.join(__dirname,'acim/index.html'));
});

app.get('/',async (req, res) => {
    let result = await database.checkInDatabase('app_user' , ['username'] , ['user']);
    res.send(result.row);
});

app.post('/ajax/acim/authenticate/username', async (req,res) => {
    console.log('/ajax/acim/authenticate/username');
    const username = req.body.username;
    const password = req.body.password;
    let result = await database.checkInDatabase( 'app_user' , ['username'] , [username]);
    res.send(JSON.stringify({ usernameIsValid : result.found }));
});

//route to create pdf for decharge
app.get('/pdf/acim/decharge/:num_decharge', async (req,res) => {
    try{
        let num_decharge = req.params.num_decharge;
        const html = `hello world pdf , <p> decharge ${num_decharge} </p>`;
        let decharges = await database.getDechargeInfo(num_decharge);
        const renews = await database.getRenouvellement(num_decharge);
        console.log('decharges ' , decharges);
        let decharge = {
            num_decharge,
            tech_main_username : decharges[0].username,
            date_debut : new Date(decharges[0].date_debut_decharge).toLocaleDateString(),
            date_fin : new Date(decharges[0].date_fin_decharge).toLocaleDateString(),
            num_intervention : decharges[0].num_intervention,
            materiels : [],
            renews : renews,
        };
        for( const dech of decharges){
            decharge.materiels.push({ 
                num_materiel : dech.num_materiel,
                libelle_materiel : dech.libelle_materiel,
                libelle_materiel_type : dech.libelle_materiel_type,
                config_origine : dech.configuration_origine,
            });
        }
        console.log('decharge', decharge);
        let dechargeStylePath = './htmlTemplate/decharge.css';
        const pdf = await GeneratePdf.generatePdf(template.dechargeTemplate(decharge), dechargeStylePath);
        res.set('Content-Type','application/pdf');
        //res.send(`decharge pdf : ${num_decharge}`);
        res.send(pdf);
    }catch(err){
        console.log('error in route /pdf/acim/decharge/:num_decharge :' ,err);
    }
});
app.get('/docx/acim/decharge/:num_decharge', async (req,res) => {
    try{
        let num_decharge = req.params.num_decharge;
        let decharges = await database.getDechargeInfo(num_decharge);
        const renews = await database.getRenouvellement(num_decharge);
        console.log('decharges ' , decharges);
        let decharge = {
            num_decharge,
            tech_main_username : decharges[0].username,
            date_debut : new Date(decharges[0].date_debut_decharge).toLocaleDateString(),
            date_fin : new Date(decharges[0].date_fin_decharge).toLocaleDateString(),
            num_intervention : decharges[0].num_intervention,
            materiels : [],
            renews : renews,
        };
        for( const dech of decharges){
            decharge.materiels.push({ 
                num_materiel : dech.num_materiel,
                libelle_materiel : dech.libelle_materiel,
                libelle_materiel_type : dech.libelle_materiel_type,
                config_origine : dech.configuration_origine,
            });
        }
        console.log('decharge', decharge);
        const b64string = await GenerateDocx.generateDocx(decharge);
        res.setHeader('Content-Disposition', `attachment; filename=decharge_${num_decharge}.docx`);
        res.send(Buffer.from(b64string, 'base64'));
    }catch(err){
        console.log('error in route /docx/acim/decharge/:num_decharge :',err);
    }
});

app.post('/ajax/acim/authenticate' ,async (req,res) => {
    const username = req.body.username;
    const password = req.body.password;
    let result = await database.checkCredentials(username , password );
    res.send(JSON.stringify(result));
});

app.post('/ajax/acim/type_user' , async (req,res) => {
    const num_user = req.body.num_user;
    const hmac_type_user = req.body.hmac_type_user;
    try{
        const resp = await database.checkInDatabase('view_app_user_full', [ 'num_user ', 'type_user' ] ,[ num_user , hmac_type_user ]);
        console.log( 'resp in /ajax/acim/type_user', resp.found , resp.row);
        res.send(JSON.stringify(resp.row.code));
    }catch(err){
        console.log('error in /ajax/acim/type_user', err);
    }
});

app.get('/rapportActivite/acim/:num_tech_main/:debut/:fin' , async (req,res) => {
    const { debut , fin , num_tech_main } = req.params;
    //how to get num_tech_main
    try{
        const myself = await database.checkInDatabase('app_user',['num_user'],[num_tech_main]);
        if( myself.found ){
            let me = { 
                num_user : myself.row.num_user,
                username : myself.row.username,
            };
            const listIntervs= await database.getListInterventionForReport(num_tech_main, debut, fin);
            if(listIntervs){
                //res.send('create rapport activite from '+debut+ '- '+fin+ ' --- '+listIntervs.length);
                const b64string = await GenerateDocx.generateRapportDocx(listIntervs, debut , fin , me);
                res.setHeader('Content-Disposition', `attachment; filename=rapportActivite_${me.username}_${debut}_${fin}.docx`);
                res.send(Buffer.from(b64string, 'base64'));
            }
        }
    }catch(err){
        console.log('error in get /rapportActivite/acim/:num_tech_main/:debut/:fin' , err);
    }
});


peerServer.launchServer();
httpServer.listen(PORT, () => console.log(`server started on ${PORT}`));
