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
    video.play().catch(() => {});
    statusLabel.textContent = 'STREAM ON';
    statusLabel.style.background = 'green';
    pausedOverlay.style.display = 'none';
  });
  peer.signal(signal);
});

socket.on('disconnectPeer', () => {
  peer?.destroy();
  statusLabel.textContent = 'STREAM OFF';
  statusLabel.style.background = 'red';
  pausedOverlay.style.display = 'flex';
});

document.getElementById('fullscreenBtn').onclick = () => {
  video.requestFullscreen?.();
};
