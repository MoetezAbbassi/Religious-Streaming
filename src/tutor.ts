import { Signaling } from './signaling';
import { getMedia } from './client';

const loginEl = document.getElementById('login')!;
const tutorUI = document.getElementById('tutor-ui')!;
const preview = document.getElementById('preview') as HTMLVideoElement;
const pwInput = document.getElementById('pw') as HTMLInputElement;
const loginBtn = document.getElementById('login-btn')!;

let pc: RTCPeerConnection;
const signaling = new Signaling();

loginBtn.addEventListener('click', async () => {
  const pw = pwInput.value;

  const res = await fetch('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: pw })
  });

  const { ok } = await res.json();
  if (!ok) {
    alert('❌ Incorrect password.');
    return;
  }

  loginEl.style.display = 'none';
  tutorUI.style.display = 'block';

  await startTutor();
});

async function startTutor() {
  const stream = await getMedia();
  preview.srcObject = stream;

  pc = new RTCPeerConnection();
  stream.getTracks().forEach(t => pc.addTrack(t, stream));

  pc.onicecandidate = e => {
    if (e.candidate) signaling.send({ type: 'ice', candidate: e.candidate });
  };

  signaling.send({ type: 'login', password: 'ok' });

  signaling.on(async msg => {
    if (msg.type === 'answer') await pc.setRemoteDescription(msg.desc);
    if (msg.type === 'ice') pc.addIceCandidate(msg.candidate);
  });

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  signaling.send({ type: 'offer', desc: offer });
}

document.getElementById('share-btn')!.onclick = async () => {
  const screen = await navigator.mediaDevices.getDisplayMedia({ video: true });
  const track = screen.getVideoTracks()[0];
  const sender = pc.getSenders().find(s => s.track?.kind === 'video');
  if (sender) sender.replaceTrack(track);
};

document.getElementById('mic-btn')!.onclick = () => {
  const tracks = (preview.srcObject as MediaStream).getAudioTracks();
  tracks.forEach(t => (t.enabled = !t.enabled));
};
