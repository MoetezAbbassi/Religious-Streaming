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

  const peer = new SimplePeer({ initiator: true, trickle: false });

  peer.on('signal', data => socket.emit('offer', id, data));

  peer.on('connect', () => {
    mixedStream.getTracks().forEach(track => peer._pc.addTrack(track, mixedStream));
  });

  peer.on('close', () => {
    peer.destroy();
    delete peers[id];
  });

  peers[id] = peer;
});

socket.on('answer', (id, sig) => peers[id]?.signal(sig));
socket.on('candidate', (id, cand) => peers[id]?.signal(cand));
socket.on('disconnectPeer', id => peers[id]?.destroy() && delete peers[id]);

document.getElementById('micBtn').onclick = async () => {
  if (!micStream) {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    micBtn.className = 'mic-on';
    micBtn.textContent = 'Mic On';
  } else {
    micStream.getTracks().forEach(t => t.stop());
    micStream = null;
    micBtn.className = 'mic-off';
    micBtn.textContent = 'Mic Off';
  }
};

document.getElementById('screenBtn').onclick = async () => {
  if (!screenStream) {
    screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    document.getElementById('preview').srcObject = screenStream;
    screenBtn.className = 'screen-on';
    screenBtn.textContent = 'Screen On';

    const audioContext = new AudioContext();
    const dest = audioContext.createMediaStreamDestination();

    if (micStream) {
      const micSource = audioContext.createMediaStreamSource(micStream);
      micSource.connect(dest);
    }

    const sysAudioTracks = screenStream.getAudioTracks();
    if (sysAudioTracks.length > 0) {
      const sysStream = new MediaStream(sysAudioTracks);
      const sysSource = audioContext.createMediaStreamSource(sysStream);
      sysSource.connect(dest);
    }

    const combinedTracks = [
      ...screenStream.getVideoTracks(),
      ...dest.stream.getAudioTracks()
    ];
    mixedStream = new MediaStream(combinedTracks);

    socket.emit('broadcaster');
    socket.emit('stream-status', { paused: false, online: true });

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
    screenBtn.className = 'screen-off';
    screenBtn.textContent = 'Screen Off';

    mediaRecorder?.stop();
    socket.emit('stream-status', { paused: true, online: false });

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
