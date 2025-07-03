const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let broadcaster;

io.on('connection', socket => {
  socket.on('broadcaster', () => {
    broadcaster = socket.id;
  });

  socket.on('watcher', () => {
    if (broadcaster) io.to(broadcaster).emit('watcher', socket.id);
  });

  socket.on('offer', (id, message) => io.to(id).emit('offer', socket.id, message));
  socket.on('answer', (id, message) => io.to(id).emit('answer', socket.id, message));
  socket.on('candidate', (id, message) => io.to(id).emit('candidate', socket.id, message));

  socket.on('disconnect', () => io.emit('disconnectPeer', socket.id));
});

server.listen(process.env.PORT || 3000, () => {
  console.log('Server running');
});
