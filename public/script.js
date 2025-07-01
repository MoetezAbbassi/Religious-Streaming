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
socket.on('disconnectPeer', id => peers[id]?.destroy() && delete peers[id]);

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
    screenBtn.className = 'screen-on'; screenBtn.textContent = 'Screen On';
    preview.srcObject = screenStream;

    const combinedTracks = [
      ...screenStream.getVideoTracks(),
      ...(screenStream.getAudioTracks() || []),
      ...(micStream?.getAudioTracks() || [])
    ];
    const combined = new MediaStream(combinedTracks);

    mediaRecorder = new MediaRecorder(combined);
    const chunks = [];
    mediaRecorder.ondataavailable = e => {
      if (e.data.size > 0) {
        socket.emit('stream-packet', e.data);
        chunks.push(e.data);
      }
    };
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);

      const replay = document.createElement('video');
      replay.src = url;
      replay.controls = true;
      replay.className = 'replay-video';
      document.body.appendChild(replay);

      const link = document.createElement('a');
      link.href = url;
      link.download = `lecture-${Date.now()}.webm`;
      link.textContent = 'Download Stream';
      link.className = 'download-btn';
      document.body.appendChild(link);
    };

    mediaRecorder.start(1000); // gather data in 1s intervals
  } else {
    screenStream.getTracks().forEach(t => t.stop());
    screenStream = null;
    screenBtn.className = 'screen-off'; screenBtn.textContent = 'Screen Off';
    preview.srcObject = null;
    mediaRecorder?.stop();
  }
};
