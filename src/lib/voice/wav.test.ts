import { describe, expect, it } from "vitest";
import { audioFileName } from "./mime";
import { encodeWav, needsWavConversion } from "./wav";

describe("encodeWav", () => {
  it("writes a valid 16 kHz mono 16-bit PCM WAV header and clamps samples", async () => {
    const wav = encodeWav(new Float32Array([0, 0.5, -0.5, 1, -1, 2]), 16000);
    const bytes = new Uint8Array(await wav.arrayBuffer());
    const view = new DataView(bytes.buffer);
    const text = (o: number, n: number) => String.fromCharCode(...bytes.slice(o, o + n));

    expect(wav.type).toBe("audio/wav");
    expect(text(0, 4)).toBe("RIFF");
    expect(text(8, 4)).toBe("WAVE");
    expect(text(36, 4)).toBe("data");
    expect(view.getUint32(4, true)).toBe(bytes.length - 8);
    expect(view.getUint16(20, true)).toBe(1); // PCM
    expect(view.getUint16(22, true)).toBe(1); // mono
    expect(view.getUint32(24, true)).toBe(16000);
    expect(view.getUint32(28, true)).toBe(32000); // byte rate
    expect(view.getUint16(34, true)).toBe(16);
    expect(view.getUint32(40, true)).toBe(12); // 6 samples × 2 bytes
    expect(view.getInt16(44 + 3 * 2, true)).toBe(32767); // 1.0 → max
    expect(view.getInt16(44 + 4 * 2, true)).toBe(-32768); // -1.0 → min
    expect(view.getInt16(44 + 5 * 2, true)).toBe(32767); // 2.0 clamped
  });
});

describe("needsWavConversion", () => {
  it("converts Safari's mp4 but leaves Chrome/Firefox recordings alone", () => {
    expect(needsWavConversion("audio/mp4")).toBe(true);
    expect(needsWavConversion("audio/mp4;codecs=mp4a.40.2")).toBe(true);
    expect(needsWavConversion("audio/aac")).toBe(true);
    expect(needsWavConversion("")).toBe(true); // unknown → be safe
    expect(needsWavConversion("audio/webm;codecs=opus")).toBe(false);
    expect(needsWavConversion("audio/ogg;codecs=opus")).toBe(false);
  });
});

describe("audioFileName", () => {
  it("names the upload after its real container", () => {
    expect(audioFileName("audio/wav")).toBe("voice.wav");
    expect(audioFileName("audio/ogg")).toBe("voice.ogg");
    expect(audioFileName("audio/mp4")).toBe("voice.m4a");
    expect(audioFileName("audio/webm;codecs=opus")).toBe("voice.webm");
    expect(audioFileName("")).toBe("voice.webm");
  });
});
