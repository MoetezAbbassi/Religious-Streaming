const express = require('express');
const http = require('http');
const bodyParser = require('body-parser');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PASSWORD = 'secret123';

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('public'));

app.post('/login', (req, res) => {
  const { password } = req.body;
  if (password === PASSWORD) return res.redirect('/stream.html');
  return res.send('Incorrect password');
});

let broadcasterSocketId = null;

io.on('connection', (socket) => {
  socket.on('broadcaster', () => {
    broadcasterSocketId = socket.id;
  });

  socket.on('watcher', () => {
    if (broadcasterSocketId) {
      io.to(broadcasterSocketId).emit('watcher', socket.id);
    }
  });

  socket.on('offer', (id, message) => {
    io.to(id).emit('offer', socket.id, message);
  });

  socket.on('answer', (id, message) => {
    io.to(id).emit('answer', socket.id, message);
  });

  socket.on('candidate', (id, message) => {
    io.to(id).emit('candidate', socket.id, message);
  });

  socket.on('disconnect', () => {
    io.emit('disconnectPeer', socket.id);
  });

  socket.on('stream-packet', (data) => {
    io.emit('stream-packet', data);
  });

  socket.on('stream-status', (data) => {
    io.emit('stream-status', data);
  });
});

server.listen(process.env.PORT || 3000, () => {
  console.log('Server running');
});
