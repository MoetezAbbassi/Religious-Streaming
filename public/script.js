const socket = io();
let micStream = null;
let screenStream = null;
let mixedStream = null;
let peers = {};

socket.emit('broadcaster');

document.getElementById('micBtn').onclick = async () => {
  if (!micStream) {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    micBtn.textContent = 'Mic Off';
    micBtn.className = 'mic-on';
  } else {
    micStream.getTracks().forEach(t => t.stop());
    micStream = null;
    micBtn.textContent = 'Mic On';
    micBtn.className = 'mic-off';
  }
};

document.getElementById('screenBtn').onclick = async () => {
  if (!screenStream) {
    screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    document.getElementById('preview').srcObject = screenStream;
    screenBtn.textContent = 'Screen Off';
    screenBtn.className = 'screen-on';

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
  } else {
    screenStream.getTracks().forEach(t => t.stop());
    screenStream = null;
    mixedStream = null;
    document.getElementById('preview').srcObject = null;
    screenBtn.textContent = 'Screen On';
    screenBtn.className = 'screen-off';
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
