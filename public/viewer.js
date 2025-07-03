const socket = io();
socket.emit('watcher');

let peer;
const video = document.getElementById('viewer');
const statusLabel = document.getElementById('statusLabel');
video.controls = true;

socket.on('stream-status', isOn => {
  statusLabel.textContent = isOn ? 'Stream ON' : 'Stream OFF';
  statusLabel.className = isOn ? 'status-on' : 'status-off';

  if (isOn && !peer) attemptReconnect(500); // start retry if live
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
socket.on('disconnectPeer', () => peer?.destroy());

document.getElementById('fullscreenBtn').onclick = () => {
  if (video.requestFullscreen) video.requestFullscreen();
};

function attemptReconnect(delay) {
  if (peer || delay > 8000) return;
  console.log('Retrying to connect...');
  socket.emit('watcher');
  setTimeout(() => attemptReconnect(delay * 2), delay);
}
