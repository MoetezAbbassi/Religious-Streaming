const socket = io();
socket.emit('watcher');

let peer;
const vid = document.getElementById('viewer'),
      statusLabel = document.getElementById('statusLabel'),
      pausedOverlay = document.getElementById('pausedOverlay'),
      viewersCount = document.getElementById('viewersCount');

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


socket.on('viewer-count', count => {
  viewersCount.textContent = `👥 ${count} Viewer${count !== 1 ? 's' : ''}`;
});

socket.on('stream-status', isOn => {
  statusLabel.textContent = isOn ? '🟢 LIVE' : '🔴 OFFLINE';
  statusLabel.className = isOn ? 'status-on' : 'status-off';
  pausedOverlay.style.display = isOn ? 'none' : 'flex';
  if (!isOn) vid.srcObject = null;
});

socket.on('offer', (id, sig) => {
  peer = new SimplePeer({ initiator: false, trickle: false });
  peer.on('signal', data => socket.emit('answer', id, data));
  peer.on('stream', stream => {
    video.srcObject = stream;
    video.play().catch(() => {});
    pausedOverlay.style.display = 'none';
});
  peer.signal(sig);
});

socket.on('candidate', (id, cand) => peer?.signal(cand));
socket.on('disconnectPeer', () => {
  peer?.destroy();
  statusLabel.textContent = '🔴 OFFLINE';
  statusLabel.className = 'status-off';
  pausedOverlay.style.display = 'flex';
});

document.getElementById('fullscreenBtn').onclick = () => {
  vid.requestFullscreen?.();
};
