const socket = io();
let peer;
const video = document.getElementById('viewer');

socket.emit('watcher');

socket.on('offer', (id, signal) => {
  peer = new SimplePeer({ initiator: false, trickle: false });

  peer.on('signal', data => socket.emit('answer', id, data));
  peer.on('stream', stream => video.srcObject = stream);

  peer.signal(signal);
});

socket.on('candidate', (id, candidate) => {
  peer.signal(candidate);
});

socket.on('disconnectPeer', () => {
  if (peer) peer.destroy();
});

document.getElementById('fullscreenBtn').onclick = () => {
  if (video.requestFullscreen) video.requestFullscreen();
};
