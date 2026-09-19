import { rmsToDb } from "./vad";

// Speech energy lives roughly between 250 Hz and 3.8 kHz. Band-passing the mic
// before measuring it drops rumble (HVAC, traffic, handling noise) and hiss, so
// steady low-frequency noise no longer looks like a voice to the detector.
const VOICE_BAND_HZ = { low: 250, high: 3800 };

export type MicMeter = {
  /** RMS (0..1) of the voice band right now */
  readRms: () => number;
  disconnect: () => void;
};

export function createMicMeter(ctx: AudioContext, stream: MediaStream): MicMeter {
  const source = ctx.createMediaStreamSource(stream);
  const highpass = ctx.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = VOICE_BAND_HZ.low;
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = VOICE_BAND_HZ.high;
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;

  source.connect(highpass);
  highpass.connect(lowpass);
  lowpass.connect(analyser);

  // Float samples: the byte variant quantizes to ~-48 dB, too coarse to see a quiet room's floor.
  const buffer = new Float32Array(analyser.fftSize);

  return {
    readRms() {
      analyser.getFloatTimeDomainData(buffer);
      let sum = 0;
      for (let i = 0; i < buffer.length; i++) sum += buffer[i] * buffer[i];
      return Math.sqrt(sum / buffer.length);
    },
    disconnect() {
      try {
        source.disconnect();
        highpass.disconnect();
        lowpass.disconnect();
        analyser.disconnect();
      } catch {
        /* already disconnected */
      }
    },
  };
}

/** Samples the room's ambient level (dB) for `durationMs`, stopping early if cancelled. */
export function sampleAmbientDb(meter: MicMeter, durationMs: number, isCancelled: () => boolean): Promise<number[]> {
  return new Promise((resolve) => {
    const samples: number[] = [];
    const startedAt = performance.now();
    const id = setInterval(() => {
      samples.push(rmsToDb(meter.readRms()));
      if (isCancelled() || performance.now() - startedAt >= durationMs) {
        clearInterval(id);
        resolve(samples);
      }
    }, 20);
  });
}
