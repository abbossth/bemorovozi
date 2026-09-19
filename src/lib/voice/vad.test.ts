import { describe, expect, it } from "vitest";
import { SpeechDetector, type VadEventType } from "./vad";

const FRAME_MS = 16;

type Segment = { ms: number; level: (tMs: number) => number };

// Deterministic jitter so runs are repeatable.
const jitter = (i: number, amp: number) => Math.sin(i * 12.9898) * amp;

/** Steady background sound at `db` (fan, hall noise): almost no level variation. */
const steady = (db: number): Segment["level"] => (t) => db + jitter(Math.round(t / FRAME_MS), 0.4);

/** Speech-like level: ~5 Hz syllable modulation of ±8 dB around `centerDb`. */
const speech =
  (centerDb: number): Segment["level"] =>
  (t) =>
    centerDb + 8 * Math.sin((2 * Math.PI * 5 * t) / 1000) + jitter(Math.round(t / FRAME_MS), 0.5);

function run(detector: SpeechDetector, segments: Segment[]) {
  const events: { type: VadEventType; at: number }[] = [];
  let voicedFrames = 0;
  let now = 1000;
  for (const seg of segments) {
    const segStart = now;
    for (let t = 0; t < seg.ms; t += FRAME_MS) {
      now += FRAME_MS;
      const frame = detector.update(seg.level(now - segStart), now);
      if (frame.voiced) voicedFrames++;
      if (frame.event) events.push({ type: frame.event, at: now - 1000 });
    }
  }
  return { events, voicedFrames, types: events.map((e) => e.type) };
}

function calibrated(ambientDb: number) {
  const d = new SpeechDetector();
  d.calibrate(Array.from({ length: 25 }, (_, i) => ambientDb + jitter(i, 0.4)));
  d.reset();
  return d;
}

describe("SpeechDetector", () => {
  it("detects speech in a quiet room and ends it after the pause", () => {
    const { types } = run(calibrated(-62), [
      { ms: 800, level: steady(-62) },
      { ms: 1800, level: speech(-28) },
      { ms: 2000, level: steady(-62) },
    ]);
    expect(types).toEqual(["speech_start", "speech_end"]);
  });

  it("never treats steady background noise as speech, even when it is loud", () => {
    const { types, voicedFrames } = run(calibrated(-45), [{ ms: 15000, level: steady(-45) }]);
    expect(types).toEqual([]);
    expect(voicedFrames).toBe(0);
  });

  it("does not auto-end while nobody has spoken yet (silence before speech is fine)", () => {
    const { types } = run(calibrated(-62), [{ ms: 10000, level: steady(-62) }]);
    expect(types).toEqual([]);
  });

  it("still ends speech normally when the room is noisy", () => {
    const { types } = run(calibrated(-45), [
      { ms: 800, level: steady(-45) },
      { ms: 2000, level: speech(-26) },
      { ms: 2500, level: steady(-45) },
    ]);
    expect(types).toEqual(["speech_start", "speech_end"]);
  });

  it("cancels a sudden loud steady noise (TV switched on) instead of recording it as speech", () => {
    const { types } = run(calibrated(-62), [
      { ms: 500, level: steady(-62) },
      { ms: 8000, level: steady(-30) },
    ]);
    expect(types).not.toContain("speech_end");
    expect(types[types.length - 1]).toBe("noise_cancel");
  });

  it("adapts to the new noise level afterwards, so speech over it is still caught", () => {
    const { types } = run(calibrated(-62), [
      { ms: 500, level: steady(-62) },
      { ms: 7000, level: steady(-42) },
      { ms: 1800, level: speech(-24) },
      { ms: 2500, level: steady(-42) },
    ]);
    expect(types[types.length - 2]).toBe("speech_start");
    expect(types[types.length - 1]).toBe("speech_end");
  });

  it("ignores a very short click or door slam", () => {
    const { types } = run(calibrated(-62), [
      { ms: 600, level: steady(-62) },
      { ms: 64, level: steady(-20) },
      { ms: 3000, level: steady(-62) },
    ]);
    expect(types).toEqual([]);
  });

  it("drops a brief noise burst that is too short to be speech", () => {
    const { types } = run(calibrated(-62), [
      { ms: 600, level: steady(-62) },
      { ms: 240, level: speech(-25) },
      { ms: 2500, level: steady(-62) },
    ]);
    expect(types).toEqual(["speech_start", "noise_burst"]);
  });

  it("keeps a real utterance together across short pauses between words", () => {
    const { types } = run(calibrated(-62), [
      { ms: 600, level: steady(-62) },
      { ms: 900, level: speech(-28) },
      { ms: 500, level: steady(-62) },
      { ms: 900, level: speech(-28) },
      { ms: 2000, level: steady(-62) },
    ]);
    expect(types).toEqual(["speech_start", "speech_end"]);
  });

  it("keeps the learned noise floor between turns", () => {
    const d = calibrated(-48);
    const floorBefore = d.noiseFloorDb;
    d.reset();
    expect(d.noiseFloorDb).toBe(floorBefore);
  });
});
