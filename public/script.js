const socket = io();
let micStream = null;
let screenStream = null;
let mixedStream = null;
let mediaRecorder;
let peers = {};
let chunks = [];

socket.emit('broadcaster');

socket.on('watcher', id => {
  if (mixedStream) {
    const peer = new SimplePeer({ initiator: true, trickle: false, stream: mixedStream });
    peer.on('signal', data => socket.emit('offer', id, data));
    peer.on('close', () => delete peers[id]);
    peers[id] = peer;
  }
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
    document.getElementById('preview').srcObject = screenStream;

    // Mix mic + system audio
    const audioContext = new AudioContext();
    const destination = audioContext.createMediaStreamDestination();

    if (micStream) {
      const micSource = audioContext.createMediaStreamSource(micStream);
      micSource.connect(destination);
    }

    const screenAudioTracks = screenStream.getAudioTracks();
    if (screenAudioTracks.length > 0) {
      const sysAudio = new MediaStream(screenAudioTracks);
      const sysSource = audioContext.createMediaStreamSource(sysAudio);
      sysSource.connect(destination);
    }

    const mixedAudioTracks = destination.stream.getAudioTracks();
    const videoTracks = screenStream.getVideoTracks();
    mixedStream = new MediaStream([...videoTracks, ...mixedAudioTracks]);

    // Start broadcasting
    socket.emit('broadcaster');

    // Notify attendees that stream resumed
    socket.emit('stream-status', { paused: false });

    chunks = [];
    mediaRecorder = new MediaRecorder(mixedStream);
    mediaRecorder.ondataavailable = e => {
      if (e.data.size > 0) {
        chunks.push(e.data);
        socket.emit('stream-packet', e.data);
      }
    };
    mediaRecorder.start(1000);
  } else {
    screenStream.getTracks().forEach(t => t.stop());
    screenStream = null;
    document.getElementById('preview').srcObject = null;
    screenBtn.className = 'screen-off'; screenBtn.textContent = 'Screen Off';

    mediaRecorder?.stop();
    socket.emit('stream-status', { paused: true });

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
      link.className = 'download-btn';
      link.textContent = 'Download Stream';
      document.body.appendChild(link);
    };
  }
};
