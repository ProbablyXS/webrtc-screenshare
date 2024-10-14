const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
    console.log('New user connected');

    socket.on('joinRoom', (room) => {
        socket.join(room);
        console.log(`${socket.id} joined room: ${room}`);
        socket.to(room).emit('userJoined', socket.id);
    });

    socket.on('offer', (data) => {
        socket.to(data.room).emit('offer', { sdp: data.sdp, sender: socket.id });
    });

    socket.on('answer', (data) => {
        socket.to(data.room).emit('answer', { sdp: data.sdp, sender: socket.id });
    });

    socket.on('iceCandidate', (data) => {
        socket.to(data.room).emit('iceCandidate', { candidate: data.candidate, sender: socket.id });
    });

    socket.on('chatMessage', (data) => {
        socket.to(data.room).emit('chatMessage', { message: data.message });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
