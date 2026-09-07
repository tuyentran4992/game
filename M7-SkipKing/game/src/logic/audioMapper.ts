/**
 * M7 Skip King — audioMapper (TẦNG A pure TS): events → params plop 3 lớp tonal + slap.
 * Bản tổng hợp quyết định (comment 267 card t_af145f89 — FUN2-C1): slap transient 1.5–4kHz
 * = lớp CHỦ ĐẠO — skip-stone thật nghe "thíp" + xì nước, không phải trầm. Đo thật (card cha):
 * wiring KHÔNG hỏng — dải cũ 70–190Hz/centroid 234–495Hz loa mobile không tái tạo được, nên:
 * - Fundamental tonal 180–320Hz (vẫn giữ cảm giác "nước"),
 * - Slap 1.5–4kHz level CAO NHẤT — dòng nghe thấy chính trên loa mobile/laptop,
 * - Envelope tổng 150–250ms, masterGain 0.5–0.9.
 * GIỮ pitch ladder +1 semitone/bounce wrap quãng 8 + perfect +3 (đã duyệt T4).
 * Tầng B (plopSynth) chỉ PHÁT theo params ở đây — 0 magic number âm thanh trong scene.
 * 0 import Phaser/DOM — test được không cần render.
 */

/** Số lớp oscillator TONAL của plop (CONTRACT mục 5: "oscillator 3 lớp" — giữ nguyên). */
export const PLOP_LAYERS = 3;

/** Trần quãng 8 — pitch wrap mod 12 semitones (CONTRACT mục 5). */
const OCTAVE_WRAP = 12;

export type PlopLayerType = 'sine' | 'triangle' | 'square';

export interface PlopLayer {
  /** Hz — tần số nền của lớp (đã gồm semitone wrap + perfect boost). */
  freqHz: number;
  /** s — dài tiếng lớp. */
  durationS: number;
  /** Loại sóng — trúng/hụt khác âm. */
  type: PlopLayerType;
  /** 0..1 — độ lớn lớp so master. */
  level: number;
}

/** Lớp slap transient — "thíp" nước thật, dải loa mobile tái tạo được. */
export interface SlapParams {
  /** Hz — tần số đỉnh bandpass slap (1500–4000). */
  freqHz: number;
  /** s — transient ngắn (≤80ms). */
  durationS: number;
  /** 0..1 — CAO NHẤT trong các lớp (lớp chủ đạo). */
  level: number;
}

export interface PlopParams {
  /** Đã map xong — tầng B nối graph và phát đúng 3 lớp tonal này. */
  layers: PlopLayer[];
  /** Lớp slap chủ đạo — tầng B phát qua đường bandpass RIÊNG (không qua lowpass tonal). */
  slap: SlapParams;
  /** 0..1 — gain master tổng (envelope attack+release do tầng B vẽ). */
  masterGain: number;
  /** s — tổng thời gian tiếng (150–250ms). */
  totalDurationS: number;
}

/** Whoosh lúc ném (noise-burst bandpass sweep — tầng B phát bằng oscillator có sẵn). */
export interface WhooshParams {
  /** Hz — đầu sweep bandpass. */
  bandStartHz: number;
  /** Hz — cuối sweep bandpass (đi lên = "vút" đi). */
  bandEndHz: number;
  /** s — dài whoosh. */
  durationS: number;
  /** 0..1 — độ lớn ∝ lực ném. */
  level: number;
}

/** Hz tần số nền tonal theo lực chạm — impact 0 trầm, impact 1 cao [PLACEHOLDER] tới playtest boss. */
export function baseFreqHz(impact: number): number {
  const i = Math.min(1, Math.max(0, impact));
  return 180 + i * 140; // 180..320 Hz — [PLACEHOLDER] feel-tune sau playtest boss
}

/** Semitone theo tiến độ nảy — +1/bounce, wrap quãng 8 (mod 12). */
export function semitoneForBounces(bounces: number): number {
  return ((bounces % OCTAVE_WRAP) + OCTAVE_WRAP) % OCTAVE_WRAP;
}

/** Hz đỉnh slap theo lực + trúng/hụt — trong dải [1500,4000] loa mobile tái tạo được. */
export function slapFreqHz(impact: number, hit: boolean): number {
  const i = Math.min(1, Math.max(0, impact));
  // 1500→3200Hz trúng (thíp gọn), 1800→4000Hz hụt (xì nước đục hơn) — [PLACEHOLDER]
  return hit ? 1500 + i * 1700 : 1800 + i * 2200;
}

/** Giây dài 1 lớp tonal — thân tiếng chính. */
const LAYER_MIN_S = 0.08;
const LAYER_MAX_S = 0.16;

/**
 * Map 1 event engine → params plop (3 lớp tonal + slap chủ đạo).
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
  const levels: [number, number, number] = ev.hit ? [0.7, 0.42, 0.3] : [0.6, 0.4, 0.36];

  const layers: PlopLayer[] = [0, 1, 2].map((i) => ({
    freqHz: i === 0 ? freq0 : freq0 * (i === 1 ? 2 * detune : 3 * detune),
    durationS: LAYER_MAX_S - i * 0.015, // 0.16 / 0.145 / 0.13 — lớp bổng tắt nhanh hơn
    type: types[i],
    level: levels[i],
  }));

  // Slap CHỦ ĐẠO: level cao nhất (trên mọi lớp tonal) — dòng tiếng chính trên loa mobile.
  const slap: SlapParams = {
    freqHz: slapFreqHz(ev.impact, ev.hit),
    durationS: 0.055 + Math.min(1, Math.max(0, ev.impact)) * 0.02, // 55..75ms — transient [PLACEHOLDER]
    level: ev.hit ? 0.95 : 0.85, // trúng hơi to hơn hụt — [PLACEHOLDER]
  };

  const i = Math.min(1, Math.max(0, ev.impact));
  const masterGain = 0.55 + i * 0.35; // 0.55..0.9 — ∝ lực, trần 0.9 [PLACEHOLDER]
  // Envelope tổng 150–250ms ∝ lực: cú mạnh vang đuôi dài hơn [PLACEHOLDER].
  const totalDurationS = 0.15 + i * 0.1;
  return { layers, slap, masterGain, totalDurationS };
}

/** Whoosh lúc ném — power 0..1 → sweep bandpass đi lên, level ∝ lực. [PLACEHOLDER] feel-tune. */
export function whooshParams(power: number): WhooshParams {
  const p = Math.min(1, Math.max(0, power));
  return {
    bandStartHz: 600 + p * 200, // 600..800Hz đầu sweep
    bandEndHz: 1800 + p * 2700, // 1800..4500Hz cuối — vút lên theo lực
    durationS: 0.18 - p * 0.05, // 130..180ms — cú mạnh gọn hơn
    level: 0.25 + p * 0.55, // 0.25..0.8 — ∝ lực ném
  };
}

export { LAYER_MIN_S, LAYER_MAX_S };
