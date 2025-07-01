const socket = io();
let micStream = null;
let screenStream = null;
let mixedStream = null;
let mediaRecorder;
let peers = {};
let chunks = [];

socket.emit('broadcaster');

socket.on('watcher', id => {
  if (!mixedStream) return;
  const peer = new SimplePeer({ initiator: true, trickle: false, stream: mixedStream });
  peer.on('signal', data => socket.emit('offer', id, data));
  peer.on('close', () => peer.destroy());
  peers[id] = peer;
});

socket.on('answer', (id, signal) => peers[id]?.signal(signal));
socket.on('candidate', (id, candidate) => peers[id]?.signal(candidate));
socket.on('disconnectPeer', (id) => peers[id]?.destroy());

document.getElementById('micBtn').onclick = async () => {
  if (!micStream) {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    micBtn.className = 'mic-on'; micBtn.textContent = 'Mic On';
  } else {
    micStream.getTracks().forEach(t => t.stop());
    micStream = null;
    micBtn.className = 'mic-off'; micBtn.textContent = 'Mic Off';
  }
};

document.getElementById('screenBtn').onclick = async () => {
  if (!screenStream) {
    screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    document.getElementById('preview').srcObject = screenStream;
    screenBtn.className = 'screen-on';
    screenBtn.textContent = 'Screen On';

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
    socket.emit('stream-status', { paused: false, online: true });

    chunks = [];
    mediaRecorder = new MediaRecorder(mixedStream);
    mediaRecorder.ondataavailable = e => chunks.push(e.data);
    mediaRecorder.start();
  } else {
    screenStream.getTracks().forEach(t => t.stop());
    screenStream = null;
    document.getElementById('preview').srcObject = null;
    screenBtn.className = 'screen-off';
    screenBtn.textContent = 'Screen Off';

    mediaRecorder?.stop();
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
      a.textContent = 'Download Stream';
      a.className = 'download-btn';
      document.body.appendChild(a);
    };
  }
};
