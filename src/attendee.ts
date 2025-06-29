import { Signaling } from './signaling';

const view = document.getElementById('view') as HTMLVideoElement;

const pc = new RTCPeerConnection();
const signaling = new Signaling();

pc.ontrack = e => {
  view.srcObject = e.streams[0];
};

signaling.on(async msg => {
  if (msg.type === 'offer') {
    await pc.setRemoteDescription(msg.desc);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    signaling.send({ type: 'answer', desc: answer });
  } else if (msg.type === 'ice') {
    pc.addIceCandidate(msg.candidate);
  }
});

pc.onicecandidate = e => {
  if (e.candidate) signaling.send({ type: 'ice', candidate: e.candidate });
};
