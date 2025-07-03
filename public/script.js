const socket = io();
let micStream = null;
let screenStream = null;
let mixedStream = null;
let mediaRecorder = null;
let peers = {};
let chunks = [];

socket.emit('broadcaster');
socket.emit('session-state-request'); // Ask server for latest session state

document.getElementById('micBtn').onclick = async () => {
  const on = !micStream;
  if (on) {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } else {
    micStream.getTracks().forEach(t => t.stop());
    micStream = null;
  }
  socket.emit('mic-toggle', on);
};

document.getElementById('screenBtn').onclick = async () => {
  const on = !screenStream;
  if (on) {
    screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    document.getElementById('preview').srcObject = screenStream;

    const ctx = new AudioContext();
    const dest = ctx.createMediaStreamDestination();
    if (micStream) ctx.createMediaStreamSource(micStream).connect(dest);
    if (screenStream.getAudioTracks().length)
      ctx.createMediaStreamSource(new MediaStream(screenStream.getAudioTracks())).connect(dest);

    mixedStream = new MediaStream([
      ...screenStream.getVideoTracks(),
      ...dest.stream.getAudioTracks()
    ]);

    socket.emit('broadcaster');
    socket.emit('screen-toggle', true);
    socket.emit('stream-status', { paused: false, online: true });

    // Reset peers for fresh handshake
    peers = {};

    chunks = [];
    mediaRecorder = new MediaRecorder(mixedStream);
    mediaRecorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    mediaRecorder.start();
  } else {
    screenStream.getTracks().forEach(t => t.stop());
    screenStream = null;
    document.getElementById('preview').srcObject = null;
    mixedStream = null;

    mediaRecorder?.stop();
    socket.emit('screen-toggle', false);
    socket.emit('stream-status', { paused: true, online: false });

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const vid = document.createElement('video');
      vid.src = url; vid.controls = true; vid.className = 'replay-video';
      document.body.appendChild(vid);
      const a = document.createElement('a');
      a.href = url; a.download = `lecture-${Date.now()}.webm`;
      a.textContent = 'Download Stream'; a.className = 'download-btn';
      document.body.appendChild(a);
    };
  }
};

socket.on('watcher', id => {
  if (!mixedStream) return;
  const peer = new SimplePeer({ initiator: true, trickle: false, stream: mixedStream });
  peer.on('signal', data => socket.emit('offer', id, data));
  peer.on('close', () => peer.destroy());
  peers[id] = peer;
});

socket.on('answer', (id, sig) => peers[id]?.signal(sig));
socket.on('candidate', (id, cand) => peers[id]?.signal(cand));
socket.on('disconnectPeer', id => peers[id]?.destroy());

socket.on('session-state', ({ micOn, screenOn }) => {
  document.getElementById('micBtn').className = micOn ? 'mic-on' : 'mic-off';
  document.getElementById('micBtn').textContent = micOn ? 'Mic On' : 'Mic Off';
  document.getElementById('screenBtn').className = screenOn ? 'screen-on' : 'screen-off';
  document.getElementById('screenBtn').textContent = screenOn ? 'Screen On' : 'Screen Off';
});
