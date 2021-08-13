const express       = require('express');
const app           = express();
const httpServer    = require('http').createServer(app);
const cors          = require('cors');
const path          = require('path');
const database      = require('./database/database');
const bodyParser    = require('body-parser');
const Socket_io     = require('./socket_io/socket_io.js');
const GeneratePdf   = require('./generatePdf/generate.js');
const template      = require('./htmlTemplate/htmlTemplate.js');

const PORT = 3500;
const corsOption = {
    origin : 'http://localhost:3000',
};

//server config =============
app.use(cors(corsOption));
app.use(bodyParser.urlencoded({ extended : true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname,'acim')));

//initialize the socket_io
Socket_io.initSocketIO(httpServer);

app.get('/acim*' , (req,res) => {
    res.sendFile(path.join(__dirname,'acim/index.html'));
});

app.get('/',async (req, res) => {
    let result = await database.checkInDatabase('app_user' , ['username'] , ['user']);
    res.send(result.row);
});

app.post('/ajax/acim/authenticate/username', async (req,res) => {
    const username = req.body.username;
    const password = req.body.password;
    let result = await database.checkInDatabase( 'app_user' , ['username'] , [username]);
    res.send(JSON.stringify({ usernameIsValid : result.found }));
});

//route to create pdf for decharge
app.get('/pdf/acim/decharge/:num_decharge', async (req,res) => {
    let num_decharge = req.params.num_decharge;
    const html = `hello world pdf , <p> decharge ${num_decharge} </p>`;
    let decharges = await database.getDechargeInfo(num_decharge);
    console.log('decharges ' , decharges);
    let decharge = {
        num_decharge,
        tech_main_username : decharges[0].username,
        date_debut : new Date(decharges[0].date_debut_decharge).toLocaleDateString(),
        date_fin : new Date(decharges[0].date_fin_decharge).toLocaleDateString(),
        num_intervention : decharges[0].num_intervention,
        materiels : []
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
});

app.post('/ajax/acim/authenticate' ,async (req,res) => {
    const username = req.body.username;
    const password = req.body.password;
    let result = await database.checkCredentials(username , password );
    res.send(JSON.stringify(result));
});



httpServer.listen(PORT, () => console.log(`server started on ${PORT}`));
