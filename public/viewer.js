const socket = io();
let peer;

const video = document.getElementById('viewer');
const statusLabel = document.getElementById('statusLabel');
const pausedOverlay = document.getElementById('pausedOverlay');
const viewersCount = document.getElementById('viewersCount');

socket.emit('watcher');

socket.on('viewers-count', cnt => {
  viewersCount.textContent = `👥 ${cnt} Viewer${cnt !== 1 ? 's' : ''}`;
});

socket.on('stream-status', isOn => {
  statusLabel.textContent = isOn ? '🟢 LIVE' : '🔴 OFFLINE';
  statusLabel.className = isOn ? 'status-on' : 'status-off';
  pausedOverlay.style.display = isOn ? 'none' : 'flex';
  if (!isOn && peer) {
    video.srcObject = null;
    peer.destroy();
    peer = null;
  }
});

socket.on('offer', (id, sig) => {
  peer = new SimplePeer({ initiator: false, trickle: false });
  peer.on('signal', data => socket.emit('answer', id, data));
  peer.on('stream', stream => {
    video.srcObject = stream;
    video.play().catch(() => {});
  });
  peer.signal(sig);
});

socket.on('candidate', (id, cand) => peer?.signal(cand));
socket.on('disconnectPeer', () => {
  statusLabel.textContent = '🔴 OFFLINE';
  statusLabel.className = 'status-off';
  pausedOverlay.style.display = 'flex';
});

document.getElementById('fullscreenBtn').onclick = () => {
  video.requestFullscreen?.();
};
