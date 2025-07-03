let viewers=0;

io.on('connection', socket => {
  socket.emit('viewer-count', viewers);

  socket.on('broadcaster', () => {/* no action */});
  socket.on('watcher', id => {
    viewers++;
    io.emit('viewer-count', viewers);
    if (broadcaster) io.to(broadcaster).emit('watcher', id);
  });
  socket.on('disconnect', () => {
    if (viewers>0) viewers--;
    io.emit('viewer-count', viewers);
    io.emit('disconnectPeer', socket.id);
  });
  socket.on('offer', (id, msg) => io.to(id).emit('offer', socket.id, msg));
  socket.on('answer', (id, msg) => io.to(id).emit('answer', socket.id, msg));
  socket.on('candidate', (id, msg) => io.to(id).emit('candidate', socket.id, msg));
});
