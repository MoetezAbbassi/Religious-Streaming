async function startStream() {
  const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
  const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  
  const combinedTracks = [...stream.getTracks(), ...audioStream.getAudioTracks()];
  const combinedStream = new MediaStream(combinedTracks);

  const video = document.createElement('video');
  video.srcObject = combinedStream;
  video.autoplay = true;
  document.body.appendChild(video);

  // Placeholder: this is where WebRTC streaming logic will go
}
