/**
 * M7 Skip King — audioMapper (TẦNG A pure TS — CONTRACT mục 1): events → params plop 3 lớp.
 * - Lực (impact 0..1) → trầm/cao: baseFreq 70Hz (mềm) → 190Hz (mạnh).
 * - Tiến độ (số nảy) → pitch +1 semitone/bounce, WRAP quãng 8 (mod 12).
 * - Trúng (bounce nảy tiếp) / hụt (splash chìm) → công thức lớp KHÁC âm.
 * - PERFECT → lớp đầu sáng hơn (+3 semitones — cùng wrap quãng 8).
 * Tầng B (plopSynth) chỉ PHÁT theo params ở đây — 0 magic number âm thanh trong scene.
 * 0 import Phaser/DOM — test được không cần render.
 */

/** Số lớp oscillator của plop (CONTRACT mục 5: "oscillator 3 lớp"). */
export const PLOP_LAYERS = 3;

/** Trần quãng 8 — pitch wrap mod 12 semitones (CONTRACT mục 5). */
const OCTAVE_WRAP = 12;

export type PlopLayerType = 'sine' | 'triangle' | 'square';

export interface PlopLayer {
  /** Hz — tần số nền của lớp (đã gồm semitone wrap + perfect boost). */
  freqHz: number;
  /** s — dài tiếng lớp (CONTRACT: plop 80–120ms). */
  durationS: number;
  /** Loại sóng — trúng/hụt khác âm. */
  type: PlopLayerType;
  /** 0..1 — độ lớn lớp so master. */
  level: number;
}

export interface PlopParams {
  /** Đã map xong — tầng B nối graph và phát đúng 3 lớp này. */
  layers: PlopLayer[];
  /** 0..1 — gain master tổng (envelope attack+release do tầng B vẽ). */
  masterGain: number;
  /** s — tổng thời gian tiếng (trần 120ms). */
  totalDurationS: number;
}

/** Hz tần số nền theo lực chạm — impact 0 trầm, impact 1 cao (đơn vị Hz, dải plop nước thật). */
export function baseFreqHz(impact: number): number {
  const i = Math.min(1, Math.max(0, impact));
  return 70 + i * 120; // 70..190 Hz — [PLACEHOLDER] feel-tune sau playtest boss
}

/** Semitone theo tiến độ nảy — +1/bounce, wrap quãng 8 (mod 12). */
export function semitoneForBounces(bounces: number): number {
  return ((bounces % OCTAVE_WRAP) + OCTAVE_WRAP) % OCTAVE_WRAP;
}

/** Giây dài 1 lớp plop — 80–120ms (CONTRACT mục 5). */
const LAYER_MIN_S = 0.08;
const LAYER_MAX_S = 0.12;

/**
 * Map 1 event engine → params plop 3 lớp.
 * ev: { bounces — số nảy đã thực hiện của run, impact — lực chạm 0..1, hit — nảy tiếp (true) / chìm (false), perfect }.
 */
export function plopParams(ev: {
  bounces: number;
  impact: number;
  hit: boolean;
  perfect?: boolean;
}): PlopParams {
  const base = baseFreqHz(ev.impact);
  const semi = semitoneForBounces(ev.bounces);
  const perfectBoost = ev.perfect ? 3 : 0; // semitones — cú PERFECT sáng hơn
  const freq0 = base * Math.pow(2, ((semi + perfectBoost) % OCTAVE_WRAP) / OCTAVE_WRAP);

  // Trúng (hit) vs hụt (splash) KHÁC ÂM: trúng = nền ấm (sine/triangle/sine),
  // hụt = đục dội (triangle/sine/square + pitch tụt 1 quãng dưới).
  const types: PlopLayerType[] = ev.hit
    ? ['sine', 'triangle', 'sine']
    : ['triangle', 'sine', 'square'];
  const detune = ev.hit ? 1 : 0.5; // hụt → các lớp tụt xuống trầm đục
  const levels: [number, number, number] = ev.hit ? [1, 0.5, 0.32] : [0.85, 0.45, 0.4];

  const layers: PlopLayer[] = [0, 1, 2].map((i) => ({
    freqHz: i === 0 ? freq0 : freq0 * (i === 1 ? 2 * detune : 3 * detune),
    durationS: LAYER_MAX_S - i * 0.015, // 0.12 / 0.105 / 0.09 — lớp bổng tắt nhanh hơn
    type: types[i],
    level: levels[i],
  }));

  const masterGain = 0.35 + Math.min(1, Math.max(0, ev.impact)) * 0.4; // 0.35..0.75 — ∝ lực
  return { layers, masterGain, totalDurationS: LAYER_MAX_S };
}

export { LAYER_MIN_S, LAYER_MAX_S };
