const socket = io();
socket.emit('watcher'); // Automatic join on load

let peer;
const video = document.getElementById('viewer');
const statusLabel = document.getElementById('statusLabel');
const pausedOverlay = document.getElementById('pausedOverlay');
const viewersCount = document.getElementById('viewersCount');

socket.on('viewers-count', c => {
  viewersCount.textContent = `👥 ${c} Viewer${c !== 1 ? 's' : ''}`;
});

socket.on('stream-status', isOn => {
  statusLabel.textContent = isOn ? '🟢 LIVE' : '🔴 OFFLINE';
  statusLabel.className = isOn ? 'status-on' : 'status-off';
  pausedOverlay.style.display = isOn ? 'none' : 'flex';
});

socket.on('offer', (id, sig) => {
  peer = new SimplePeer({ initiator: false, trickle: false });
  peer.on('signal', data => socket.emit('answer', id, data));
  peer.on('stream', s => {
    video.srcObject = s;
    video.play().catch(() => {});
  });
  peer.signal(sig);
});

socket.on('candidate', (id, cand) => peer?.signal(cand));
socket.on('disconnectPeer', () => {
  peer?.destroy();
  statusLabel.textContent = '🔴 OFFLINE';
  pausedOverlay.style.display = 'flex';
});

document.getElementById('fullscreenBtn').onclick = () => {
  video.requestFullscreen?.();
};
