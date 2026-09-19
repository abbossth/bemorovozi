// Browser-side audio normalisation. Safari (iPhone/iPad/macOS) records MediaRecorder audio as MP4,
// which the STT provider rejects ("The file field must be a file of type: mp3, wav, ogg, flac,
// m4a, webm" — it checks the file's actual content, so relabelling doesn't help). Anything that
// isn't webm/ogg is therefore decoded here and re-encoded as plain 16 kHz mono WAV, which every
// provider accepts and which is small enough (~32 KB/s) for a normal turn.

export const TARGET_SAMPLE_RATE = 16000;

/** 16-bit PCM mono WAV from float samples in [-1, 1]. */
export function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const dataSize = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeText = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };

  writeText(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeText(8, "WAVE");
  writeText(12, "fmt ");
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  writeText(36, "data");
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

/** Containers the provider takes as-is; everything else gets converted. */
export function needsWavConversion(mimeType: string) {
  return !/webm|ogg|wav|mpeg|mp3|flac/i.test(mimeType);
}

type AudioContextCtor = typeof AudioContext;
type OfflineCtor = typeof OfflineAudioContext;

/** Decodes any audio the browser can play and re-encodes it as 16 kHz mono WAV. */
export async function blobToWav(blob: Blob): Promise<Blob> {
  const w = window as unknown as {
    AudioContext?: AudioContextCtor;
    webkitAudioContext?: AudioContextCtor;
    OfflineAudioContext?: OfflineCtor;
    webkitOfflineAudioContext?: OfflineCtor;
  };
  const Ctx = w.AudioContext ?? w.webkitAudioContext;
  const Offline = w.OfflineAudioContext ?? w.webkitOfflineAudioContext;
  if (!Ctx || !Offline) throw new Error("Brauzer audio'ni qayta ishlay olmaydi");

  const bytes = await blob.arrayBuffer();
  const ctx = new Ctx();
  try {
    // The callback form is the one older Safari versions require.
    const decoded = await new Promise<AudioBuffer>((resolve, reject) => ctx.decodeAudioData(bytes, resolve, reject));
    const length = Math.max(1, Math.ceil(decoded.duration * TARGET_SAMPLE_RATE));
    // Rendering into a 1-channel context at the target rate mixes down and resamples in one step.
    const offline = new Offline(1, length, TARGET_SAMPLE_RATE);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start();
    const rendered = await offline.startRendering();
    return encodeWav(rendered.getChannelData(0), TARGET_SAMPLE_RATE);
  } finally {
    ctx.close().catch(() => {});
  }
}
