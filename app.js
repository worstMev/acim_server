const express       = require('express');
const app           = express();
const httpServer    = require('http').createServer(app);
const cors          = require('cors');
const database      = require('./database/database');
const bodyParser    = require('body-parser');
const Socket_io     = require('./socket_io/socket_io.js');

const PORT = 3500;
const corsOption = {
    origin : 'http://localhost:3000',
};

//server config =============
app.use(cors(corsOption));
app.use(bodyParser.urlencoded({ extended : true }));
app.use(bodyParser.json());

//initialize the socket_io
Socket_io.initSocketIO(httpServer);

app.get('/',async (req, res) => {
    let result = await database.checkInDatabase('app_user' , ['username'] , ['user']);
    res.send(result.row);
});

app.post('/authenticate/username', async (req,res) => {
    const username = req.body.username;
    const password = req.body.password;
    let result = await database.checkInDatabase( 'app_user' , ['username'] , [username]);
    res.send(JSON.stringify({ usernameIsValid : result.found }));
});

app.post('/authenticate' ,async (req,res) => {
    const username = req.body.username;
    const password = req.body.password;
    let result = await database.checkCredentials(username , password );
    res.send(JSON.stringify(result));
});

httpServer.listen(PORT, () => console.log(`server started on ${PORT}`));
