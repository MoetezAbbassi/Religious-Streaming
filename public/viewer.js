const socket = io();

let peer = null;
let retries = 0;

const video = document.getElementById('viewer');
const statusLabel = document.getElementById('statusLabel');
const pausedOverlay = document.getElementById('pausedOverlay');
const viewersCount = document.getElementById('viewersCount');

video.controls = true;
socket.emit('watcher');

socket.on('viewers-count', count => {
  viewersCount.textContent = `👥 ${count} Viewer${count !== 1 ? 's' : ''}`;
});

socket.on('stream-status', isOn => {
  statusLabel.textContent = isOn ? '🟢 LIVE' : '🔴 OFFLINE';
  statusLabel.className = isOn ? 'status-on' : 'status-off';
  pausedOverlay.style.display = isOn ? 'none' : 'flex';
  if (isOn && !peer) connectStream();
});

socket.on('offer', (id, sig) => {
  peer = new SimplePeer({ initiator: false, trickle: false });
  peer.on('signal', data => socket.emit('answer', id, data));
  peer.on('stream', stream => {
    video.srcObject = stream;
    video.play().catch(() => {});
    pausedOverlay.style.display = 'none';
    retries = 0;
  });
  peer.on('close', () => {
    peer = null;
    retryConnect();
  });
  peer.signal(sig);
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

function connectStream() {
  socket.emit('watcher');
}

function retryConnect() {
  if (peer || retries > 5) return;
  retries++;
  setTimeout(() => {
    connectStream();
  }, 500 * retries);
}
