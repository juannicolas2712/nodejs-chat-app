const path = require('path')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const port = process.env.PORT
const Filter = require('bad-words')
const { generateMessage, generateLocationMessage } = 
require('./utils/messages')
const {
    addUser,
    removeUser,
    getUser,
    getUsersInRoom
} = require('./utils/users')

const app = express()
const server = http.createServer(app)
const io = socketio(server)

//Define paths for Express config
const publicDirectoryPath = path.join(__dirname, '../public/')

app.use(express.static(publicDirectoryPath))

let count = 0

io.on('connection', (socket) => {
    console.log('New WebSocket connection')

    socket.on('join', (options, callback)=>{

        const {error, user} = addUser({id:socket.id, ...options})

        if(error){
            return callback(error)
        }

        socket.join(user.room)

        socket.emit('message', generateMessage('Admin', 'Welcome!'))
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined! He will live!`))
        io.to(user.room).emit('roomData', {
            room:user.room,
            users:getUsersInRoom(user.room)
        })

        callback()

        //socket.emit, io.emit, socket.broadcast.emit
        //io.to.emit (send to all the people on the same room), socket.broadcast.to.emit (send to all the people on the same room, excet the client who sent the message)
    })

    socket.on('sendMessage', (msg, callback) => {

        const user = getUser(socket.id)
        
        const filter = new Filter()

        if(filter.isProfane(msg)){
            return callback('Profanity is not aloud within this walls, mortal.')
        }
        
        io.to(user.room).emit('message', generateMessage(user.username, msg))
        callback() //this is for acknowlegment of the client msg
    })

    socket.on('disconnect', ()=>{

        const user = removeUser(socket.id)

        if(user){
            io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left!`))
            io.to(user.room).emit('roomData', {
                room:user.room,
                users:getUsersInRoom(user.room)
            })
        }        
    })

    socket.on('sendLocation', (location, callback)=>{
        const user = getUser(socket.id)
        //io.emit('message', `https://google.com/maps?q=${location.lat},${location.lon}`)
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username,`https://google.com/maps?q=${location.lat},${location.lon}`))
        callback()        
    })
})

server.listen(port, ()=>{
    console.log('Server is up on port ' + port)
})
