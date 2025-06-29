import { Signaling, WSMessage } from './signaling';

const loginArea = document.getElementById('login-area')!;
const tutorArea = document.getElementById('tutor-area')!;

const signaling = new Signaling();
let pc: RTCPeerConnection;
const attendees = new Set<string>();

// 🔹 Hook login button
document.getElementById('login-btn')?.addEventListener('click', () => {
  const pw = (document.getElementById('pw') as HTMLInputElement).value;
  login(pw);
});

async function login(pw: string) {
  console.log('Attempting login with password:', pw);  // Debug line
  const res = await fetch('/login', {
    method: 'POST',
    body: JSON.stringify({ password: pw }),
    headers: { 'Content-Type': 'application/json' }
  });
  const { ok } = await res.json();
  if (!ok) return alert('Wrong password');

  loginArea.style.display = 'none';
  tutorArea.style.display = 'block';
  initPeer();
}

function initPeer() {
  pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
  pc.onicecandidate = e => e.candidate && signaling.send({ type: 'ice', candidate: e.candidate });
  signaling.send({ type: 'login', password: (document.getElementById('pw') as HTMLInputElement).value });

  signaling.on(async msg => {
    if (msg.type === 'offer') {
      await pc.setRemoteDescription(msg.desc);
      const ans = await pc.createAnswer();
      await pc.setLocalDescription(ans);
      signaling.send({ type: 'answer', desc: ans });
    }
    if (msg.type === 'ice') pc.addIceCandidate(msg.candidate);
  });
}
