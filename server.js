const express = require('express');
const https = require('https'); // Change from http to https
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs'); // To read the certificate files

const app = express();

// Load your SSL certificate and private key
const privateKey = fs.readFileSync(path.join(__dirname, 'private-key.txt'), 'utf8');
const caBundle = fs.readFileSync(path.join(__dirname, 'ca-bundle.txt'), 'utf8');

// Create an HTTPS server with the certificate
const server = https.createServer({
    key: privateKey,
    cert: caBundle
}, app);

const io = socketIo(server);

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve .well-known/acme-challenge for Let's Encrypt validation
// app.use('/.well-known/acme-challenge', express.static(path.join(__dirname, 'public/.well-known/acme-challenge')));

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

// Start the HTTPS server on port 443 (standard HTTPS port) or any other port
const PORT = process.env.PORT || 443;
server.listen(PORT, () => console.log(`Secure server running on port ${PORT}`));
