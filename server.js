require("dotenv").config();
const express = require('express');
const http = require('http');
const app = express();
const server = http.createServer(app);
const socket = require('socket.io');
const io = socket(server);
const path = require('path')

const users = {};
const socketToRoom = {};


io.on("connection", socket => {
    socket.on("join room", roomId => {
        if(users[roomId]){
            const length = users[roomId].length;
            if(length === 4){
                socket.emit("room is at full capacity");
                return;
            }
            users[roomId].push(socket.id);
        } else {
            users[roomId] = [socket.id];
        }

        socketToRoom[socket.id] = roomId;
        const usersInTheRoom = users[roomId].filter(id => id !== socket.id);

        socket.emit("all users", usersInTheRoom);
    });

    socket.on("sending signal", payload => {
        io.to(payload.userToSignal).emit("user joined", {signal:payload.signal, callerId: payload.callerId});

    });

    socket.on("returning signal", payload => {
        io.to(payload.callerId).emit("receiving returned signal", {signal:payload.signal, id:socket.id});
    });


    socket.on("disconnect", () => {
        const roomId = socketToRoom[socket.id];
        let room = users[roomId];
        if(room){
            room = room.filter(id => id !== socket.id);
            users[roomId] = room;
        }
    });
});

if(process.env.PROD) {
    app.use(express.static(path.join(__dirname, "./client/build")));
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, "./client/build/index.html"));
    });
}


const port = process.env.PORT || 3001
server.listen(port, () => `Server listening on ${port}`)