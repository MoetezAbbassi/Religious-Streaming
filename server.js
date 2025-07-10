const express = require('express');
const http = require('http');
const bodyParser = require('body-parser');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
let broadcasterSocketId = null;
let viewers = 0;
let streamOn = false;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('public'));

app.post('/login', (req, res) => {
  const { password } = req.body;
  return password === 'secret123' ? res.redirect('/stream.html') : res.send('Incorrect password');
});

io.on('connection', socket => {
  socket.emit('viewers-count', viewers);
  socket.emit('stream-status', streamOn);

  socket.on('broadcaster', () => { broadcasterSocketId = socket.id; });

  socket.on('watcher', () => {
    viewers++;
    io.emit('viewers-count', viewers);
    if (broadcasterSocketId) io.to(broadcasterSocketId).emit('watcher', socket.id);
  });

  socket.on('offer', (id, msg) => io.to(id).emit('offer', socket.id, msg));
  socket.on('answer', (id, msg) => io.to(id).emit('answer', socket.id, msg));
  socket.on('candidate', (id, msg) => io.to(id).emit('candidate', socket.id, msg));

  socket.on('stream-status', isOn => {
    streamOn = isOn;
    io.emit('stream-status', streamOn);
  });

  socket.on('disconnect', () => {
    if (socket.id === broadcasterSocketId) broadcasterSocketId = null;
    if (viewers > 0) viewers--;
    io.emit('viewers-count', viewers);
    io.emit('disconnectPeer', socket.id);
  });
});

server.listen(process.env.PORT || 3000, () => console.log('Server running'));
