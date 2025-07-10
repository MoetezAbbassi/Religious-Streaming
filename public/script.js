const socket = io();
let micStream = null;
let screenStream = null;
let peers = {};

socket.emit('broadcaster');

function getCombinedStream() {
  return new MediaStream([
    ...(screenStream?.getTracks() || []),
    ...(micStream?.getAudioTracks() || [])
  ]);
}

function renegotiatePeers() {
  for (const id in peers) {
    const peer = peers[id];
    peer.replaceTrack(
      peer.streams[0].getVideoTracks()[0],
      getCombinedStream().getVideoTracks()[0],
      peer.streams[0]
    );
  }
}

socket.on('watcher', id => {
  const combined = getCombinedStream();
  const peer = new SimplePeer({ initiator: true, trickle: false, stream: combined });
  peer.on('signal', data => socket.emit('offer', id, data));
  peer.on('close', () => delete peers[id]);
  peer.on('error', e => peer.destroy());
  peers[id] = peer;
});

socket.on('answer', (id, sig) => peers[id]?.signal(sig));
socket.on('candidate', (id, cand) => peers[id]?.signal(cand));
socket.on('disconnectPeer', id => { peers[id]?.destroy(); delete peers[id]; });

document.getElementById('micBtn').onclick = async () => {
  if (!micStream) {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    micBtn.textContent = 'Turn Mic Off'; micBtn.className = 'mic-on';
  } else {
    micStream.getTracks().forEach(t => t.stop());
    micStream = null;
    micBtn.textContent = 'Turn Mic On'; micBtn.className = 'mic-off';
  }
  renegotiatePeers();
};

document.getElementById('screenBtn').onclick = async () => {
  if (!screenStream) {
    screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    preview.srcObject = screenStream;
    screenBtn.textContent = 'Turn Screen Off'; screenBtn.className = 'screen-on';
  } else {
    screenStream.getTracks().forEach(t => t.stop());
    screenStream = null;
    preview.srcObject = null;
    screenBtn.textContent = 'Turn Screen On'; screenBtn.className = 'screen-off';
  }
  renegotiatePeers();
  socket.emit('stream-status', !!screenStream);
};
