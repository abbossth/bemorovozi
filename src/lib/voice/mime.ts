/** File name to hand to a provider for a given audio MIME type (providers key off the extension too). */
export function audioFileName(mimeType: string) {
  const type = mimeType.toLowerCase();
  if (type.includes("wav")) return "voice.wav";
  if (type.includes("ogg")) return "voice.ogg";
  if (type.includes("mpeg") || type.includes("mp3")) return "voice.mp3";
  if (type.includes("flac")) return "voice.flac";
  if (type.includes("mp4") || type.includes("m4a") || type.includes("aac")) return "voice.m4a";
  return "voice.webm";
}
