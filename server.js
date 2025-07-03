const express = require('express');
const http = require('http');
const bodyParser = require('body-parser');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PASSWORD = 'secret123';

let sessionState = {
  screenOn: false,
  micOn: false
};

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('public'));

app.post('/login', (req, res) => {
  if (req.body.password === PASSWORD) return res.redirect('/stream.html');
  res.send('Incorrect password');
});

io.on('connection', (socket) => {
  socket.on('session-state-request', () => {
  socket.emit('session-state', sessionState);
});
  socket.on('broadcaster', () => {
    // nothing else needed here
  });

  socket.on('screen-toggle', (on) => {
    sessionState.screenOn = on;
    io.emit('screen-toggle', on);
  });

  socket.on('mic-toggle', (on) => {
    sessionState.micOn = on;
    io.emit('mic-toggle', on);
  });

  socket.on('stream-status', ({ paused, online }) => {
    sessionState.screenOn = online;
    io.emit('stream-status', { paused, online });
  });

  socket.on('watcher', () => {
    io.emit('watcher');
  });

  socket.on('offer', (id, msg) => io.to(id).emit('offer', socket.id, msg));
  socket.on('answer', (id, msg) => io.to(id).emit('answer', socket.id, msg));
  socket.on('candidate', (id, msg) => io.to(id).emit('candidate', socket.id, msg));

  socket.on('disconnect', () => {
    io.emit('disconnectPeer', socket.id);
  });
});

server.listen(process.env.PORT || 3000, () => console.log('Server running'));
