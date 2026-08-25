// Pentatonic scale helpers (PURE — no Phaser / no WebAudio).
// Dùng cho "SEAL moment": mỗi ống được niêm phong (1 màu duy nhất, đầy ống) phát 1 nốt
// CAO DẦN theo thang ngũ cung → clear level = 1 đoạn melody nhỏ tự giải quyết.
// Test: __tests__/pentatonic.test.ts

/** Bậc bán cung của thang ngũ cung trưởng (major pentatonic): C D E G A */
export const PENTATONIC_SEMITONES = [0, 2, 4, 7, 9] as const;

/** C4 = 261.63Hz — gốc mặc định của thang. */
export const BASE_HZ = 261.63;

/**
 * Tần số của bậc thứ `step` (0-based) trong thang ngũ cung, tự lên octave sau mỗi 5 bậc.
 * Luôn TĂNG DẦN theo step (đảm bảo cảm giác "đi lên").
 */
export function pentatonicFreq(step: number, baseHz: number = BASE_HZ): number {
  const s = Math.max(0, Math.floor(step));
  const octave = Math.floor(s / PENTATONIC_SEMITONES.length);
  const degree = PENTATONIC_SEMITONES[s % PENTATONIC_SEMITONES.length];
  return baseHz * Math.pow(2, (octave * 12 + degree) / 12);
}

/**
 * Melody kết (level clear): `count` nốt đi lên liên tiếp bắt đầu từ `fromStep`,
 * cộng 1 nốt "resolve" ở octave trên (đóng câu nhạc).
 */
export function risingMelody(count: number, fromStep = 0, baseHz: number = BASE_HZ): number[] {
  const n = Math.max(1, Math.floor(count));
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(pentatonicFreq(fromStep + i, baseHz));
  out.push(pentatonicFreq(fromStep + n + PENTATONIC_SEMITONES.length - 1, baseHz));
  return out;
}
