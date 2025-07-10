const socket = io();
let peer = null;
let reconnectAttempts = 0;

const video = document.getElementById('viewer');
const statusLabel = document.getElementById('statusLabel');
const pausedOverlay = document.getElementById('pausedOverlay');
const viewersCount = document.getElementById('viewersCount');

socket.emit('watcher');

socket.on('viewers-count', count => {
  viewersCount.textContent = `👥 ${count} Viewer${count !== 1 ? 's' : ''}`;
});

socket.on('stream-status', isOn => {
  statusLabel.textContent = isOn ? '🟢 LIVE' : '🔴 OFFLINE';
  statusLabel.className = isOn ? 'status-on' : 'status-off';
  pausedOverlay.style.display = isOn ? 'none' : 'flex';
  if (isOn && !peer) connectToStream();
});

socket.on('offer', (id, sig) => {
  setupPeer(id, sig);
});

socket.on('candidate', (id, cand) => peer?.signal(cand));
socket.on('disconnectPeer', () => {
  peer?.destroy();
  peer = null;
  pausedOverlay.style.display = 'flex';
});

document.getElementById('fullscreenBtn').onclick = () => {
  video.requestFullscreen?.();
};

function setupPeer(id, sig) {
  peer = new SimplePeer({ initiator: false, trickle: false });
  peer.on('signal', data => socket.emit('answer', id, data));
  peer.on('stream', stream => {
    video.srcObject = stream;
    video.play().catch(() => {});
    pausedOverlay.style.display = 'none';
    reconnectAttempts = 0;
  });
  peer.on('close', () => {
    peer = null;
    attemptReconnect(100);
  });
  peer.signal(sig);
}

function connectToStream() {
  socket.emit('watcher');
}

function attemptReconnect(delay) {
  if (peer || reconnectAttempts > 5) return;
  reconnectAttempts++;
  setTimeout(() => {
    console.log('Reconnecting attempt', reconnectAttempts);
    connectToStream();
  }, delay * reconnectAttempts);
}
