export async function getMedia(screen = true) {
  const screenStream = screen
    ? await navigator.mediaDevices.getDisplayMedia({ video: true })
    : null;

  const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });

  const stream = new MediaStream([
    ...(screenStream?.getVideoTracks() || []),
    ...audioStream.getAudioTracks(),
  ]);

  return stream;
}
