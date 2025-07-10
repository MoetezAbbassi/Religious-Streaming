const socket = io();
let micStream = null;
let screenStream = null;
let peers = {};
let isMicOn = false;
let isScreenOn = false;

const micBtn = document.getElementById('micBtn');
const screenBtn = document.getElementById('screenBtn');
const preview = document.getElementById('preview');
const viewersCountLabel = document.getElementById('viewersCount');

socket.emit('broadcaster');

function createCombinedStream() {
  return new MediaStream([
    ...(screenStream?.getTracks() || []),
    ...(micStream?.getAudioTracks() || [])
  ]);
}

micBtn.onclick = async () => {
  if (!isMicOn) {
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      isMicOn = true;
      micBtn.textContent = 'Turn Mic Off';
      micBtn.className = 'mic-on';
    } catch (e) {
      alert('Mic access denied or unavailable');
    }
  } else {
    micStream.getTracks().forEach(t => t.stop());
    micStream = null;
    isMicOn = false;
    micBtn.textContent = 'Turn Mic On';
    micBtn.className = 'mic-off';
  }
};

screenBtn.onclick = async () => {
  if (!isScreenOn) {
    try {
      screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      preview.srcObject = screenStream;
      isScreenOn = true;
      screenBtn.textContent = 'Turn Screen Off';
      screenBtn.className = 'screen-on';

      screenStream.getVideoTracks()[0].onended = () => {
        screenStream.getTracks().forEach(t => t.stop());
        screenStream = null;
        isScreenOn = false;
        screenBtn.textContent = 'Turn Screen On';
        screenBtn.className = 'screen-off';
        preview.srcObject = null;
        socket.emit('stream-status', false);
      };

      socket.emit('stream-status', true);
    } catch (e) {
      alert('Screen share failed or was blocked');
    }
  } else {
    screenStream.getTracks().forEach(t => t.stop());
    screenStream = null;
    isScreenOn = false;
    screenBtn.textContent = 'Turn Screen On';
    screenBtn.className = 'screen-off';
    preview.srcObject = null;
    socket.emit('stream-status', false);
  }
};

socket.on('watcher', id => {
  if (peers[id]) return;

  const stream = createCombinedStream();
  const peer = new SimplePeer({ initiator: true, trickle: false, stream });

  peer.on('signal', data => socket.emit('offer', id, data));
  peer.on('close', () => { peer.destroy(); delete peers[id]; });
  peer.on('error', () => { peer.destroy(); delete peers[id]; });

  peers[id] = peer;
});

socket.on('answer', (id, sig) => peers[id]?.signal(sig));
socket.on('candidate', (id, cand) => peers[id]?.signal(cand));
socket.on('disconnectPeer', id => {
  peers[id]?.destroy();
  delete peers[id];
});

socket.on('viewers-count', count => {
  if (viewersCountLabel)
    viewersCountLabel.textContent = `👥 ${count} Viewer${count !== 1 ? 's' : ''}`;
});
