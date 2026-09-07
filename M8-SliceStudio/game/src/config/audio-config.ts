// Slice Studio - audio-config.ts (S3, card t_e5b58098)
// Pure data: 0 imports, 0 Phaser, 0 DOM (S3-T1) - the single tuning home for
// every audio number (DESIGN-SPEC S4/S6). All NEW voice values are
// [PLACEHOLDER] until playtest (boss ears + smoke bot "sound plays out").
//
// Groups marked "mirror" duplicate literals that are BYTE-FROZEN inside
// audio/synth.ts by the S3-T2 signature anchor (slice/reveal/ghost/blip keep
// their pre-polish bodies). Retuning them requires unanchoring via dev-lead -
// edit BOTH places or the S3-T1 limit walk and reality drift apart.
// Groups marked "used" are read by synth.ts directly (single source).

export const AUDIO = {
  master: { gain: 0.5 },
  // mirror - proto whoosh+snap (byte-frozen)
  slice: {
    dur: 0.16, f0: 4200, f1: 700, vol: 0.5,
    toneFreqBase: 300, toneFreqPerPct: 2, toneDur: 0.14, toneVol: 0.35,
  },
  // mirror - proto reveal chime (byte-frozen)
  reveal: {
    f1: 660, v1: 0.22, d1: 0.22, at1: 0.05,
    f2: 880, v2: 0.18, d2: 0.24, at2: 0.16,
    f3: 1320, v3: 0.14, d3: 0.3, at3: 0.27,
  },
  // mirror - proto GHOST CUT signature (byte-frozen)
  ghost: {
    f1: 1760, v1: 0.16, d1: 0.34, at1: 0.1,
    f2: 2340, v2: 0.1, d2: 0.4, at2: 0.22,
    noiseDur: 0.3, noiseF0: 6000, noiseF1: 9000, noiseVol: 0.12, noiseAt: 0.05,
  },
  // used - enriched no-go buzz: layer-1 keeps proto buzz, + layer-2 buzz + low thud
  chunkLost: {
    buzzF: 140, buzzSlideTo: 70, buzzDur: 0.22, buzzVol: 0.3,
    buzz2F: 96, buzz2Dur: 0.2, buzz2Vol: 0.16,
    noiseDur: 0.12, noiseF0: 300, noiseF1: 120, noiseVol: 0.3,
    thudF: 55, thudSlideTo: 38, thudDur: 0.3, thudVol: 0.4, thudAt: 0.02,
  },
  // used - split strum: rising notes, higher pct = higher pitch (DESIGN-SPEC S4)
  strum: {
    notes: 4, base: 220, octave: 1,
    r1: 1, r2: 1.25, r3: 1.5, r4: 2,
    noteDur: 0.18, vol: 0.16, step: 0.055,
  },
  // used - resume cue: two soft 880 Hz pings after releasing a red edge
  resumeCue: { f: 880, v1: 0.18, v2: 0.12, d: 0.14, gap: 0.18 },
  // used - chapter ambience: 2-osc sine pad, very quiet, mood per chapter palette
  ambience: {
    gain: 0.04, attack: 0.8, release: 0.5,
    pad1: 110, pad2: 165, pad3: 98, pad4: 82.5,
    f2Mul: 1.5, detune: 1.005,
  },
  // mirror - proto UI blip (byte-frozen)
  blip: { f: 520, dur: 0.06, vol: 0.15 },
} as const;

/** [min,max] mirror of every AUDIO number - S3-T1 walk asserts value in range. */
export const AUDIO_LIMITS = {
  master: { gain: [0.2, 1] },
  slice: {
    dur: [0.05, 0.5], f0: [1000, 12000], f1: [100, 2000], vol: [0.05, 1],
    toneFreqBase: [50, 600], toneFreqPerPct: [0, 10], toneDur: [0.05, 0.5], toneVol: [0.05, 1],
  },
  reveal: {
    f1: [200, 2000], v1: [0, 1], d1: [0.05, 0.6], at1: [0, 0.5],
    f2: [200, 2000], v2: [0, 1], d2: [0.05, 0.6], at2: [0, 0.5],
    f3: [200, 4000], v3: [0, 1], d3: [0.05, 0.6], at3: [0, 0.5],
  },
  ghost: {
    f1: [200, 4000], v1: [0, 1], d1: [0.05, 0.6], at1: [0, 0.5],
    f2: [200, 4000], v2: [0, 1], d2: [0.05, 0.6], at2: [0, 0.5],
    noiseDur: [0.05, 0.6], noiseF0: [2000, 12000], noiseF1: [2000, 12000], noiseVol: [0, 1], noiseAt: [0, 0.5],
  },
  chunkLost: {
    buzzF: [40, 300], buzzSlideTo: [20, 140], buzzDur: [0.05, 0.6], buzzVol: [0, 1],
    buzz2F: [40, 300], buzz2Dur: [0.05, 0.6], buzz2Vol: [0, 1],
    noiseDur: [0.05, 0.6], noiseF0: [100, 2000], noiseF1: [50, 2000], noiseVol: [0, 1],
    thudF: [30, 120], thudSlideTo: [20, 120], thudDur: [0.05, 0.6], thudVol: [0, 1], thudAt: [0, 0.5],
  },
  strum: {
    notes: [2, 8], base: [80, 440], octave: [0.5, 2],
    r1: [0.5, 2], r2: [0.6, 2.5], r3: [0.7, 3], r4: [0.8, 4],
    noteDur: [0.05, 0.5], vol: [0, 1], step: [0.01, 0.2],
  },
  resumeCue: { f: [400, 1600], v1: [0, 1], v2: [0, 1], d: [0.05, 0.5], gap: [0.05, 0.5] },
  ambience: {
    gain: [0.01, 0.1], attack: [0.1, 3], release: [0.1, 3],
    pad1: [50, 300], pad2: [50, 300], pad3: [50, 300], pad4: [50, 300],
    f2Mul: [1, 3], detune: [1, 1.05],
  },
  blip: { f: [200, 2000], dur: [0.01, 0.2], vol: [0, 1] },
} as const;
