const socket = io();

let micStream = null;
let screenStream = null;
let peers = {};
let broadcasterStarted = false;

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

function startBroadcast() {
  if (!broadcasterStarted && (screenStream || micStream)) {
    socket.emit('broadcaster');
    socket.emit('stream-status', true);
    broadcasterStarted = true;
  }
}

function stopBroadcast() {
  socket.emit('stream-status', false);
  broadcasterStarted = false;
}

function updatePeers() {
  const newStream = createCombinedStream();
  Object.values(peers).forEach(peer => {
    const senders = peer._pc.getSenders();

    newStream.getTracks().forEach(track => {
      const sender = senders.find(s => s.track?.kind === track.kind);
      if (sender) {
        sender.replaceTrack(track);
      } else {
        peer._pc.addTrack(track, newStream);
      }
    });
  });
}

micBtn.onclick = async () => {
  if (!micStream) {
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micBtn.textContent = 'Turn Mic Off';
      micBtn.className = 'mic-on';
      startBroadcast();
      updatePeers();
    } catch (err) {
      alert("Microphone access denied or unavailable.");
    }
  } else {
    micStream.getTracks().forEach(t => t.stop());
    micStream = null;
    micBtn.textContent = 'Turn Mic On';
    micBtn.className = 'mic-off';
    updatePeers();
  }

  if (!micStream && !screenStream) {
    stopBroadcast();
  }
};

screenBtn.onclick = async () => {
  if (!screenStream) {
    try {
      screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      screenBtn.textContent = 'Turn Screen Off';
      screenBtn.className = 'screen-on';
      preview.srcObject = screenStream;

      screenStream.getVideoTracks()[0].onended = () => {
        screenStream.getTracks().forEach(t => t.stop());
        screenStream = null;
        screenBtn.textContent = 'Turn Screen On';
        screenBtn.className = 'screen-off';
        preview.srcObject = null;
        updatePeers();
        if (!micStream) stopBroadcast();
        else socket.emit('stream-status', true);
      };

      startBroadcast();
      updatePeers();
    } catch (err) {
      alert("Screen share failed or was blocked.");
    }
  } else {
    screenStream.getTracks().forEach(t => t.stop());
    screenStream = null;
    screenBtn.textContent = 'Turn Screen On';
    screenBtn.className = 'screen-off';
    preview.srcObject = null;
    updatePeers();
    if (!micStream) stopBroadcast();
    else socket.emit('stream-status', true);
  }
};

socket.on('watcher', id => {
  const stream = createCombinedStream();
  const peer = new SimplePeer({ initiator: true, trickle: false, stream });

  peer.on('signal', data => socket.emit('offer', id, data));
  peer.on('close', () => {
    peer.destroy();
    delete peers[id];
  });
  peer.on('error', () => {
    peer.destroy();
    delete peers[id];
  });

  peers[id] = peer;
});

socket.on('answer', (id, sig) => peers[id]?.signal(sig));
socket.on('candidate', (id, cand) => peers[id]?.signal(cand));
socket.on('disconnectPeer', id => {
  peers[id]?.destroy();
  delete peers[id];
});

socket.on('viewers-count', count => {
  if (viewersCountLabel) {
    viewersCountLabel.textContent = `👥 ${count} Viewer${count !== 1 ? 's' : ''}`;
  }
});
