const socket = io();
socket.emit('watcher');

let peer;
const video = document.getElementById('viewer');
const statusLabel = document.getElementById('statusLabel');
video.controls = true;

socket.on('stream-status', isOn => {
  statusLabel.textContent = isOn ? 'Stream ON' : 'Stream OFF';
  statusLabel.className = isOn ? 'status-on' : 'status-off';
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
socket.on('viewers-count', () => {}); // Ignored on attendee

document.getElementById('fullscreenBtn').onclick = () => {
  if (video.requestFullscreen) video.requestFullscreen();
};
