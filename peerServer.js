const appPeer = require('express')();
const httpPeerServer = require('http').createServer(appPeer);
const { ExpressPeerServer } = require ('peer');

const PORT = 3550;


function launchServer (){
    console.log('launch peerServer');
    const peerServer = ExpressPeerServer(httpPeerServer , { path : '/acim' });

    appPeer.use('/peer', peerServer);

    httpPeerServer.listen(PORT , () => console.log(`peer server started on port : ${PORT}`));
}

module.exports = {
    launchServer,
}

