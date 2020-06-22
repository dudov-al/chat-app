const express = require("express");
const http = require("http");
const path = require("path");
const Filter = require('bad-words')
const socketIO = require("socket.io");
//Socket IO asks for http server that's why we made refactoring
const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const {generateMessage, generateLocation} = require('./utils/messages')

const port = process.env.PORT || 3000;
const publicDir = path.join(__dirname, "../public");
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')

app.use(express.static(publicDir));



io.on('connection',(socket)=>{
    console.log('New Websocket connection')

    socket.on('join', ({username, room}, callback)=>{
        const {error, user} = addUser({ id: socket.id, username, room })

        if(error){
            return callback(error)
        }

        socket.join(user.room)
        socket.emit('message', generateMessage('Admin','Welcome!'))
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin',`${user.username} has joined!`))//send everyboody exept current user
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })
        callback()
    })

    socket.on('sendMessage',(data, cb)=>{
        const user = getUser(socket.id)

        const filter = new Filter()
        if(filter.isProfane(data)){
            return cb('Bad word used')
        }

        io.to(user.room).emit('message', generateMessage(user.username,data))
        cb()
    })

    socket.on('disconnect',()=>{ //user leave a chatroom
        const user = removeUser(socket.id)

        if(user){
            io.to(user.room).emit('message', generateMessage("Admin",`${user.username} has left`))
        }

        io.to(user.room).emit('roomData',{
            room: user.room,
            users: getUsersInRoom(user.room)
        })
    })
    
    socket.on('sendLocation', (data, cb)=>{
        const user = getUser(socket.id)
        io.to(user.room).emit('locationMessage', generateLocation(user.username,`https://google.com/maps?q=${data.latitude},${data.longitude}`))
        
        cb()
    })
    
})




server.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
