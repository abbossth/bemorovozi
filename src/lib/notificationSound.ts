import type { Severity } from "@/lib/ai/types";

// Synthesized beeps via Web Audio — no audio asset to host, and the tone/urgency
// scales with severity: "yuqori" gets two sharp high beeps, "orta" one mid beep,
// "past" a single soft, quiet tone so low-priority volume doesn't cause fatigue.
let ctx: AudioContext | null = null;

function getContext() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AudioCtx();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

function beep(frequency: number, startAt: number, durationMs: number, volume: number) {
  const audio = getContext();
  if (!audio) return;

  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  gain.gain.value = volume;

  oscillator.connect(gain);
  gain.connect(audio.destination);

  const t = audio.currentTime + startAt;
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + durationMs / 1000);
  oscillator.start(t);
  oscillator.stop(t + durationMs / 1000 + 0.02);
}

export function playSeverityAlert(severity: Severity) {
  try {
    if (severity === "yuqori") {
      beep(880, 0, 140, 0.18);
      beep(880, 0.18, 140, 0.18);
    } else if (severity === "orta") {
      beep(660, 0, 160, 0.14);
    } else {
      beep(480, 0, 140, 0.07);
    }
  } catch {
    // Audio can fail (autoplay policy, unsupported browser) — never block the UI for it.
  }
}
