const socket = io();
let micStream = null;
let screenStream = null;
let peers = {};
let mediaRecorder;

socket.emit('broadcaster');

socket.on('watcher', id => {
  const combined = new MediaStream([
    ...(screenStream?.getTracks() || []),
    ...(micStream?.getAudioTracks() || [])
  ]);
  const peer = new SimplePeer({ initiator: true, trickle: false, stream: combined });
  peer.on('signal', data => socket.emit('offer', id, data));
  peer.on('close', () => delete peers[id]);
  peers[id] = peer;
});

socket.on('answer', (id, sig) => peers[id]?.signal(sig));
socket.on('candidate', (id, cand) => peers[id]?.signal(cand));
socket.on('disconnectPeer', id => { peers[id]?.destroy(); delete peers[id]; });

document.getElementById('micBtn').onclick = async () => {
  if (!micStream) {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    micBtn.className = 'mic-on'; micBtn.textContent = 'Turn Mic Off';
  } else {
    micStream.getTracks().forEach(t => t.stop());
    micStream = null;
    micBtn.className = 'mic-off'; micBtn.textContent = 'Turn Mic On';
  }
};

document.getElementById('screenBtn').onclick = async () => {
  if (!screenStream) {
    screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    screenBtn.className = 'screen-on'; screenBtn.textContent = 'Turn Screen Off';
    preview.srcObject = screenStream;

    const combined = new MediaStream([
      ...screenStream.getTracks(),
      ...(micStream?.getAudioTracks() || [])
    ]);

    mediaRecorder = new MediaRecorder(combined);
    mediaRecorder.ondataavailable = () => {};
    mediaRecorder.start();
    socket.emit('broadcaster');
    socket.emit('stream-status', true);
  } else {
    screenStream.getTracks().forEach(t => t.stop());
    screenStream = null;
    screenBtn.className = 'screen-off'; screenBtn.textContent = 'Turn Screen On';
    preview.srcObject = null;
    mediaRecorder?.stop();
    socket.emit('stream-status', false);
  }
};

socket.on('viewers-count', count => {
  const label = document.getElementById('viewersCount');
  if (label) label.textContent = `👥 ${count} Viewer${count !== 1 ? 's' : ''}`;
});
