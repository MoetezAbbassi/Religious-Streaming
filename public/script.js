let micStream, screenStream, combinedStream;
let micOn = false, screenOn = false;

const micBtn = document.getElementById('micBtn');
const screenBtn = document.getElementById('screenBtn');
const video = document.getElementById('preview');

micBtn.onclick = async () => {
  if (!micOn) {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    micOn = true;
    micBtn.className = 'mic-on';
    micBtn.textContent = 'Mic On';
  } else {
    micStream.getTracks().forEach(track => track.stop());
    micStream = null;
    micOn = false;
    micBtn.className = 'mic-off';
    micBtn.textContent = 'Mic Off';
  }
  updatePreview();
};

screenBtn.onclick = async () => {
  if (!screenOn) {
    screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    screenOn = true;
    screenBtn.className = 'screen-on';
    screenBtn.textContent = 'Screen On';
  } else {
    screenStream.getTracks().forEach(track => track.stop());
    screenStream = null;
    screenOn = false;
    screenBtn.className = 'screen-off';
    screenBtn.textContent = 'Screen Off';
  }
  updatePreview();
};

function updatePreview() {
  const tracks = [];
  if (screenStream) tracks.push(...screenStream.getTracks());
  if (micStream) tracks.push(...micStream.getTracks());

  if (tracks.length) {
    combinedStream = new MediaStream(tracks);
    video.srcObject = combinedStream;
  } else {
    video.srcObject = null;
  }
}
