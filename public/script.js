const socket = io();
let micStream = null;
let screenStream = null;
let mixedStream = null;
let mediaRecorder = null;
let peers = {};
let chunks = [];

document.querySelectorAll('#micBtn, #screenBtn').forEach(btn => btn.disabled = false);

socket.emit('broadcaster');

document.getElementById('micBtn').onclick = async () => {
  const on = !micStream;
  if (on) {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    micBtn.className = 'mic-on'; micBtn.textContent = 'Mic On';
  } else {
    micStream.getTracks().forEach(t => t.stop());
    micStream = null;
    micBtn.className = 'mic-off'; micBtn.textContent = 'Mic Off';
  }
  socket.emit('mic-toggle', on);
};

document.getElementById('screenBtn').onclick = async () => {
  const on = !screenStream;
  if (on) {
    screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    document.getElementById('preview').srcObject = screenStream;
    screenBtn.className = 'screen-on'; screenBtn.textContent = 'Screen On';

    const ctx = new AudioContext();
    const dest = ctx.createMediaStreamDestination();
    if (micStream) ctx.createMediaStreamSource(micStream).connect(dest);
    const sysTracks = screenStream.getAudioTracks();
    if (sysTracks.length) ctx.createMediaStreamSource(new MediaStream(sysTracks)).connect(dest);

    mixedStream = new MediaStream([
      ...screenStream.getVideoTracks(),
      ...dest.stream.getAudioTracks()
    ]);

    chunks = [];
    mediaRecorder = new MediaRecorder(mixedStream);
    mediaRecorder.ondataavailable = e => chunks.push(e.data);
    mediaRecorder.start();

    socket.emit('broadcaster');
    socket.emit('screen-toggle', true);
    socket.emit('stream-status', { paused: false, online: true });

    socket.once('watcher', id => {}); // placeholders

  } else {
    screenStream.getTracks().forEach(t => t.stop());
    screenStream = null;
    document.getElementById('preview').srcObject = null;
    screenBtn.className = 'screen-off'; screenBtn.textContent = 'Screen Off';

    mediaRecorder?.stop();
    socket.emit('screen-toggle', false);
    socket.emit('stream-status', { paused: true, online: false });

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const vid = document.createElement('video');
      vid.controls = true; vid.src = url; vid.className = 'replay-video';
      document.body.appendChild(vid);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lecture-${Date.now()}.webm`;
      a.className = 'download-btn';
      a.textContent = 'Download Stream';
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

socket.on('answer', (id, signal) => peers[id]?.signal(signal));
socket.on('candidate', (id, cand) => peers[id]?.signal(cand));
socket.on('disconnectPeer', id => peers[id]?.destroy());

socket.on('session-state', ({ micOn, screenOn }) => {
  micBtn.className = micOn ? 'mic-on' : 'mic-off';
  micBtn.textContent = micOn ? 'Mic On' : 'Mic Off';
  screenBtn.className = screenOn ? 'screen-on' : 'screen-off';
  screenBtn.textContent = screenOn ? 'Screen On' : 'Screen Off';
});
