// Voice-activity detector that tells human speech apart from background noise.
//
// The old check was a fixed RMS threshold: any sound above it counted as "the
// patient is talking". In a noisy ward that level never drops back, so the
// end-of-speech timer never fired and the call sat in "listening" until the hard
// cap — and in a silent room the patient got only ~1.4s to start speaking.
//
// This works on the dB level of the *voice band* (the caller band-passes the mic
// first) and decides relative to an adaptive noise floor:
//   1. a frame is "voiced" only if it is well above the tracked noise floor;
//   2. speech must be sustained (onset) — clicks and door slams never start it;
//   3. flat, unchanging loud sound (fan, TV, machinery) has no syllabic
//      variation, so it is absorbed into the floor instead of counted as speech;
//   4. a short burst that ends before enough voiced time is dropped as noise;
//   5. silence *before* speech never ends the recording — only silence after it.
// Pure logic (no DOM), so it is unit-tested with synthetic level sequences.

export type VadEventType = "speech_start" | "speech_end" | "noise_burst" | "noise_cancel";

export type VadConfig = {
  /** dB above the noise floor a frame needs to start counting as speech */
  onsetSnrDb: number;
  /** lower bar once speech is running, so brief syllable dips don't end it */
  releaseSnrDb: number;
  /** nothing quieter than this is ever speech, whatever the floor says */
  absMinDb: number;
  /** voiced time needed before speech is declared started */
  onsetMs: number;
  /** unvoiced gap tolerated while still confirming an onset */
  onsetGapMs: number;
  /** unvoiced time after speech that ends the utterance */
  endSilenceMs: number;
  /** an utterance with less voiced time than this is treated as a noise burst */
  minVoicedMs: number;
  floorDownTauMs: number;
  floorUpTauMs: number;
  floorMinDb: number;
  /** cap so an extremely loud room can't push the speech threshold out of reach */
  floorMaxDb: number;
  /** level variation window used to spot flat, non-speech sound */
  windowMs: number;
  /** std-dev (dB) below which a voiced level counts as flat */
  stationaryStdDb: number;
  /** how long it must stay flat before it is written off as noise */
  stationaryMs: number;
  stationaryAbsorbTauMs: number;
};

export const DEFAULT_VAD_CONFIG: VadConfig = {
  onsetSnrDb: 10,
  releaseSnrDb: 6,
  absMinDb: -55,
  onsetMs: 120,
  onsetGapMs: 150,
  endSilenceMs: 1200,
  minVoicedMs: 400,
  floorDownTauMs: 250,
  floorUpTauMs: 4000,
  floorMinDb: -75,
  floorMaxDb: -35,
  windowMs: 1000,
  stationaryStdDb: 1.5,
  stationaryMs: 1500,
  stationaryAbsorbTauMs: 500,
};

export type VadFrame = {
  /** this frame looks like speech (use it to drive the orb instead of raw noise) */
  voiced: boolean;
  /** an utterance is currently in progress */
  speaking: boolean;
  noiseFloorDb: number;
  event?: VadEventType;
};

export function rmsToDb(rms: number) {
  return 20 * Math.log10(Math.max(rms, 1e-5));
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export class SpeechDetector {
  private readonly cfg: VadConfig;
  private floor: number;
  private lastTs: number | null = null;
  private win: { t: number; db: number }[] = [];

  private inSpeech = false;
  private candidateSince: number | null = null;
  private candidateVoicedMs = 0;
  private lastCandidateVoicedAt = 0;
  private utteranceStart = 0;
  private lastVoicedAt = 0;
  private voicedMs = 0;
  private dynamicMs = 0;
  private flatMs = 0;

  constructor(config: Partial<VadConfig> = {}, initialFloorDb = -60) {
    this.cfg = { ...DEFAULT_VAD_CONFIG, ...config };
    this.floor = clamp(initialFloorDb, this.cfg.floorMinDb, this.cfg.floorMaxDb);
  }

  get noiseFloorDb() {
    return this.floor;
  }

  /** An onset is being confirmed — the caller should not discard audio right now. */
  get pending() {
    return this.candidateSince !== null;
  }

  /** Learn the room's noise level from ambient-only samples (dB), taken before anyone speaks. */
  calibrate(samplesDb: number[]) {
    if (samplesDb.length === 0) return;
    const sorted = [...samplesDb].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    this.floor = clamp(median, this.cfg.floorMinDb, this.cfg.floorMaxDb);
  }

  /** Start of a new listening turn. Keeps the learned noise floor. */
  reset() {
    this.lastTs = null;
    this.win = [];
    this.endUtterance();
  }

  update(db: number, now: number): VadFrame {
    const cfg = this.cfg;
    const dt = this.lastTs === null ? 0 : Math.min(now - this.lastTs, 100);
    this.lastTs = now;

    this.win.push({ t: now, db });
    while (this.win.length > 0 && now - this.win[0].t > cfg.windowMs) this.win.shift();
    const std = this.windowStd(now);

    const bar = Math.max(this.floor + (this.inSpeech ? cfg.releaseSnrDb : cfg.onsetSnrDb), cfg.absMinDb);
    let voiced = db > bar;
    let event: VadEventType | undefined;
    let absorbed = false;

    if (voiced && std < cfg.stationaryStdDb) this.flatMs += dt;
    else this.flatMs = 0;

    if (voiced && this.flatMs >= cfg.stationaryMs) {
      // Loud but flat for over a second: machinery, TV, a fan — not a voice.
      voiced = false;
      absorbed = true;
      this.floor = clamp(
        this.floor + (db - this.floor) * (1 - Math.exp(-dt / cfg.stationaryAbsorbTauMs)),
        cfg.floorMinDb,
        cfg.floorMaxDb
      );
      if (this.inSpeech && this.dynamicMs < cfg.minVoicedMs) {
        // Keep the "flat" streak so the same noise can't immediately re-trigger an onset.
        this.endUtterance({ keepFlat: true });
        event = "noise_cancel";
      }
    }

    if (!event) {
      if (voiced) {
        if (!this.inSpeech) {
          if (this.candidateSince === null) {
            this.candidateSince = now;
            this.candidateVoicedMs = 0;
          }
          this.candidateVoicedMs += dt;
          this.lastCandidateVoicedAt = now;
          if (this.candidateVoicedMs >= cfg.onsetMs) {
            this.inSpeech = true;
            this.utteranceStart = this.candidateSince;
            this.voicedMs = this.candidateVoicedMs;
            this.dynamicMs = 0;
            this.lastVoicedAt = now;
            this.candidateSince = null;
            event = "speech_start";
          }
        } else {
          this.voicedMs += dt;
          this.lastVoicedAt = now;
          // Only count evidence once the onset step has left the window, otherwise
          // the jump from silence to a loud steady noise would look like speech.
          if (now - this.utteranceStart > cfg.windowMs && std >= cfg.stationaryStdDb) this.dynamicMs += dt;
        }
      } else if (this.candidateSince !== null && now - this.lastCandidateVoicedAt > cfg.onsetGapMs) {
        this.candidateSince = null;
      }

      if (this.inSpeech && !voiced && now - this.lastVoicedAt >= cfg.endSilenceMs) {
        event = this.voicedMs >= cfg.minVoicedMs ? "speech_end" : "noise_burst";
        this.endUtterance();
      }
    }

    if (!voiced && !absorbed) {
      const tau = db < this.floor ? cfg.floorDownTauMs : cfg.floorUpTauMs;
      this.floor = clamp(this.floor + (db - this.floor) * (1 - Math.exp(-dt / tau)), cfg.floorMinDb, cfg.floorMaxDb);
    }

    return { voiced, speaking: this.inSpeech, noiseFloorDb: this.floor, event };
  }

  private endUtterance({ keepFlat = false }: { keepFlat?: boolean } = {}) {
    this.inSpeech = false;
    this.candidateSince = null;
    this.candidateVoicedMs = 0;
    this.voicedMs = 0;
    this.dynamicMs = 0;
    if (!keepFlat) this.flatMs = 0;
  }

  /** Level variation over the recent window; Infinity until the window is mostly full. */
  private windowStd(now: number) {
    if (this.win.length < 5 || now - this.win[0].t < this.cfg.windowMs * 0.8) return Infinity;
    let mean = 0;
    for (const s of this.win) mean += s.db;
    mean /= this.win.length;
    let variance = 0;
    for (const s of this.win) variance += (s.db - mean) ** 2;
    return Math.sqrt(variance / this.win.length);
  }
}
