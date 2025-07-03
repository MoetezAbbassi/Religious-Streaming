const socket = io();
let peer = null;
const video = document.getElementById('viewer');
const statusLabel = document.getElementById('statusLabel');
const pausedOverlay = document.getElementById('pausedOverlay');

socket.emit('watcher');
socket.emit('session-state-request');

socket.on('session-state', ({ screenOn }) => {
  statusLabel.textContent = screenOn ? 'STREAM ON' : 'STREAM OFF';
  statusLabel.style.background = screenOn ? 'green' : 'red';
  pausedOverlay.style.display = screenOn ? 'none' : 'flex';
});

socket.on('offer', (id, signal) => {
  peer = new SimplePeer({ initiator: false, trickle: false });
  peer.on('signal', data => socket.emit('answer', id, data));
  peer.on('stream', stream => {
    video.srcObject = stream; video.play().catch(() => {});
    pausedOverlay.style.display = 'none';
  });
  peer.signal(signal);
});

socket.on('candidate', (id, candidate) => peer?.signal(candidate));
socket.on('disconnectPeer', () => peer?.destroy());

socket.on('screen-toggle', on => {
  statusLabel.textContent = on ? 'STREAM ON' : 'STREAM OFF';
  statusLabel.style.background = on ? 'green' : 'red';
  pausedOverlay.style.display = on ? 'none' : 'flex';
});

socket.on('mic-toggle', () => {
  // optional: show mic-on UI
});

document.getElementById('fullscreenBtn').onclick = () => {
  video.requestFullscreen?.();
};
