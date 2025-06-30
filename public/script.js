const socket = io();

let micStream = null;
let screenStream = null;
let peers = {};
let mediaRecorder;
let recordedChunks = [];

socket.emit('broadcaster');

socket.on('watcher', (id) => {
  const tracks = [...(screenStream?.getTracks() || []), ...(micStream?.getAudioTracks() || [])];
  const stream = new MediaStream(tracks);
  const peer = new SimplePeer({ initiator: true, trickle: false, stream });

  peer.on('signal', data => socket.emit('offer', id, data));
  peer.on('close', () => delete peers[id]);

  peers[id] = peer;
});

socket.on('answer', (id, signal) => {
  peers[id]?.signal(signal);
});

socket.on('candidate', (id, candidate) => {
  peers[id]?.signal(candidate);
});

socket.on('disconnectPeer', (id) => {
  peers[id]?.destroy();
  delete peers[id];
});

document.getElementById('micBtn').onclick = async () => {
  if (!micStream) {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    document.getElementById('micBtn').className = 'mic-on';
    document.getElementById('micBtn').textContent = 'Mic On';
  } else {
    micStream.getTracks().forEach(t => t.stop());
    micStream = null;
    document.getElementById('micBtn').className = 'mic-off';
    document.getElementById('micBtn').textContent = 'Mic Off';
  }
};

document.getElementById('screenBtn').onclick = async () => {
  if (!screenStream) {
    screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    document.getElementById('screenBtn').className = 'screen-on';
    document.getElementById('screenBtn').textContent = 'Screen On';
    document.getElementById('preview').srcObject = screenStream;

    const combined = new MediaStream([
      ...screenStream.getTracks(),
      ...(micStream?.getAudioTracks() || [])
    ]);

    mediaRecorder = new MediaRecorder(combined);
    recordedChunks = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);

      const downloadBtn = document.createElement('a');
      downloadBtn.href = url;
      downloadBtn.download = `lecture-${Date.now()}.webm`;
      downloadBtn.textContent = 'Download Stream';
      downloadBtn.className = 'download-btn';
      document.body.appendChild(downloadBtn);
    };

    mediaRecorder.start();
  } else {
    screenStream.getTracks().forEach(t => t.stop());
    screenStream = null;
    document.getElementById('screenBtn').className = 'screen-off';
    document.getElementById('screenBtn').textContent = 'Screen Off';
    document.getElementById('preview').srcObject = null;

    mediaRecorder?.stop();
  }
};
