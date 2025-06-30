const video = document.getElementById('viewer');
const fullBtn = document.getElementById('fullscreenBtn');

fullBtn.onclick = () => {
  if (video.requestFullscreen) video.requestFullscreen();
  else if (video.webkitRequestFullscreen) video.webkitRequestFullscreen();
  else if (video.msRequestFullscreen) video.msRequestFullscreen();
};

