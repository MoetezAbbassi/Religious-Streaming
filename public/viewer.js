const socket = io();
let peer = null;
let retries = 0;

const video = document.getElementById('viewer');
const statusLabel = document.getElementById('statusLabel');
const pausedOverlay = document.getElementById('pausedOverlay');
const viewersCount = document.getElementById('viewersCount');

video.muted = true;
video.playsInline = true;
video.controls = true;

socket.emit('watcher');

socket.on('viewers-count', count => {
  viewersCount.textContent = `🟢 ${count} Viewer${count !== 1 ? 's' : ''}`;
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
    video.play().catch(e => console.log('Playback error:', e));
    pausedOverlay.style.display = 'none';
    retries = 0;
  });
  peer.on('close', () => {
    peer = null;
    retryConnect();
  });
  peer.on('error', () => {
    peer.destroy();
    peer = null;
    retryConnect();
  });
  peer.signal(sig);
});

socket.on('candidate', (id, cand) => peer?.signal(cand));
socket.on('disconnectPeer', (id) => {
  // Ignore disconnectPeer on viewers completely
});

document.getElementById('fullscreenBtn').onclick = () => {
  video.requestFullscreen?.();
};

function connectStream() {
  retries = 0;
  socket.emit('watcher');
}

function retryConnect() {
  if (peer || retries > 5) return;
  retries++;
  setTimeout(() => {
    socket.emit('watcher');
  }, 500 * retries);
}
