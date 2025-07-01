const socket = io();
let peer;
const video = document.getElementById('viewer');
const statusLabel = document.getElementById('statusLabel');
const pausedOverlay = document.getElementById('pausedOverlay');

socket.emit('watcher');

socket.on('offer', (id, signal) => {
  peer = new SimplePeer({ initiator: false, trickle: false });
  peer.on('signal', data => socket.emit('answer', id, data));
  peer.on('stream', stream => {
    video.srcObject = stream;
    video.play();
    pausedOverlay.style.display = 'none';
  });
  peer.signal(signal);
});

socket.on('candidate', (id, candidate) => peer?.signal(candidate));
socket.on('disconnectPeer', () => peer?.destroy());

socket.on('stream-status', ({ paused, online }) => {
  if (paused) {
    pausedOverlay.style.display = 'flex';
    video.pause();
  } else {
    pausedOverlay.style.display = 'none';
    video.play().catch(() => {});
  }

  statusLabel.textContent = online ? 'STREAM ON' : 'STREAM OFF';
  statusLabel.style.background = online ? 'green' : 'red';
});

document.getElementById('fullscreenBtn').onclick = () => {
  video.requestFullscreen?.();
};
