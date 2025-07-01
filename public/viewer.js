const socket = io();
let mediaSource, sourceBuffer;
const video = document.getElementById('viewer');
const pausedOverlay = document.getElementById('pausedOverlay');

socket.emit('watcher');

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
  sourceBuffer.appendBuffer(new Uint8Array(blob));

});

socket.on('stream-status', ({ paused }) => {
  if (paused) {
    pausedOverlay.style.display = 'flex';
    video.pause();
  } else {
    pausedOverlay.style.display = 'none';
    video.play().catch(() => {}); // autoplay policy workaround
  }
});

socket.on('offer', (id, sig) => {
  const peer = new SimplePeer({ initiator: false, trickle: false });
  peer.on('signal', data => socket.emit('answer', id, data));
  peer.on('stream', stream => {
    video.srcObject = stream;
    video.play();
    pausedOverlay.style.display = 'none';
  });
  peer.signal(sig);
});

socket.on('candidate', (id, cand) => peer?.signal(cand));
socket.on('disconnectPeer', () => peer?.destroy());

document.getElementById('fullscreenBtn').onclick = () => {
  if (video.requestFullscreen) video.requestFullscreen();
};

function waitFor(cond) {
  return new Promise(res => {
    const iv = setInterval(() => { if (cond()) { clearInterval(iv); res(); } }, 50);
  });
}
