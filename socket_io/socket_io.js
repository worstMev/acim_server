//for socket.io operation
//receive an http server

function initSocketIO(httpServer){
    const io = require('socket.io')(httpServer, {
        cors : {
            origin : 'http://localhost:3000',
        }
    });
    
    io.on('connection' , (socket) => {
        console.log('a user connected');

        socket.on('disconnect', () => {
            console.log('a user has disconnected');
        });
    });

}

module.exports = {
    initSocketIO,
}
