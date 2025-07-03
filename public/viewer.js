const socket = io();
socket.emit('watcher');

let mediaSource, sourceBuffer;
const video = document.getElementById('viewer');
const statusLabel = document.getElementById('statusLabel');
video.controls = true;

function initMediaSource() {
  mediaSource = new MediaSource();
  video.src = URL.createObjectURL(mediaSource);
  mediaSource.addEventListener('sourceopen', () => {
    sourceBuffer = mediaSource.addSourceBuffer('video/webm; codecs="vp8,vorbis"');
  });
}

socket.on('stream-packet', async blob => {
  if (!mediaSource) initMediaSource();
  await waitFor(() => sourceBuffer && !sourceBuffer.updating);
  const buf = await blob.arrayBuffer();
  sourceBuffer.appendBuffer(new Uint8Array(buf));
});

socket.on('offer', (id, sig) => {
  const peer = new SimplePeer({ initiator: false, trickle: false });
  peer.on('signal', data => socket.emit('answer', id, data));
  peer.on('stream', stream => {
    video.srcObject = stream;
    video.play().catch(() => {});
  });
  peer.signal(sig);
});

socket.on('candidate', (id, cand) => peer.signal(cand));
socket.on('disconnectPeer', () => peer?.destroy());

socket.on('stream-status', isOn => {
  statusLabel.textContent = isOn ? 'Stream ON' : 'Stream OFF';
  statusLabel.className = isOn ? 'status-on' : 'status-off';
});

document.getElementById('fullscreenBtn').onclick = () => {
  if (video.requestFullscreen) video.requestFullscreen();
};

function waitFor(cond) {
  return new Promise(res => {
    const iv = setInterval(() => { if (cond()) { clearInterval(iv); res(); } }, 50);
  });
}
