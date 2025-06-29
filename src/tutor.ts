import { Signaling } from './signaling';
import { getMedia } from './client';

const loginEl = document.getElementById('login')!;
const uiEl = document.getElementById('tutor-ui')!;
const preview = document.getElementById('preview') as HTMLVideoElement;

let pc: RTCPeerConnection;
const signaling = new Signaling();

document.getElementById('login-btn')!.onclick = async () => {
  const pw = (document.getElementById('pw') as HTMLInputElement).value;
  const res = await fetch('/login', {
    method: 'POST',
    body: JSON.stringify({ password: pw }),
    headers: { 'Content-Type': 'application/json' }
  });

  const json = await res.json();
  if (!json.ok) return alert('Wrong password');
  loginEl.style.display = 'none';
  uiEl.style.display = 'block';
  initTutor();
};

async function initTutor() {
  const stream = await getMedia();
  preview.srcObject = stream;

  pc = new RTCPeerConnection();
  stream.getTracks().forEach(t => pc.addTrack(t, stream));

  signaling.send({ type: 'login', password: 'accepted' });
  signaling.on(async msg => {
    if (msg.type === 'answer') {
      await pc.setRemoteDescription(msg.desc);
    } else if (msg.type === 'ice') {
      pc.addIceCandidate(msg.candidate);
    }
  });

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  signaling.send({ type: 'offer', desc: offer });

  pc.onicecandidate = e => {
    if (e.candidate) signaling.send({ type: 'ice', candidate: e.candidate });
  };
}

document.getElementById('share-btn')!.onclick = async () => {
  const screen = await navigator.mediaDevices.getDisplayMedia({ video: true });
  const track = screen.getVideoTracks()[0];
  const sender = pc.getSenders().find(s => s.track?.kind === 'video');
  sender?.replaceTrack(track);
};

document.getElementById('mic-btn')!.onclick = () => {
  const tracks = (preview.srcObject as MediaStream).getAudioTracks();
  tracks.forEach(t => (t.enabled = !t.enabled));
};
