// Mechanic config M2 "Neon Sort: Galaxy Pour" — mirror games/neon-sort.yaml.
// Runtime giữ khỏi parser YAML (bundle nhỏ). Khi yaml đổi, cập nhật file này cho khớp.

export interface PaletteColor { id: string; hex: string; }

export interface RampStep {
  atLevel: number;   // áp dụng từ level này trở đi cho tới step kế tiếp
  tubes: number;     // tổng số ống (kể cả ống trống workspace)
  colors: number;    // số màu (mỗi màu chiếm đúng capacity lát)
  capacity: number;  // số lát tối đa mỗi ống
  empty: number;     // số ống trống workspace
  scramble?: number; // số bước xáo trộn (độ sâu)
}

export interface MechanicsConfig {
  tubeCountStart: number;
  capacity: number;
  emptyTubesStart: number;
  palette: PaletteColor[];
  levelRamp: RampStep[];
  shuffleBackSteps: number;
  reward: {
    hint: { costAd: boolean; hintOncePerLevel: boolean };
    extraTube: { costAd: boolean; maxExtra: number };
  };
  ad: { interstitialAfterClear: boolean };
}

export const MECHANICS: MechanicsConfig = {
  tubeCountStart: 3,
  capacity: 4,
  emptyTubesStart: 1,
  palette: [
    { id: 'neon_cyan',      hex: '#00E5FF' }, // 1. Electric Cyan
    { id: 'neon_pink',      hex: '#FF2A8D' }, // 2. Neon Flamingo Pink
    { id: 'neon_yellow',    hex: '#FFD600' }, // 3. Sunburst Yellow
    { id: 'neon_lime',      hex: '#00E676' }, // 4. Vibrant Apple Lime
    { id: 'neon_blue',      hex: '#2979FF' }, // 5. Royal Sapphire Blue
    { id: 'neon_orange',    hex: '#FF6D00' }, // 6. Juicy Tangerine Orange
    { id: 'neon_violet',    hex: '#AA00FF' }, // 7. Cosmic Amethyst Violet
    { id: 'neon_red',       hex: '#FF1744' }, // 8. Vivid Ruby Red
    { id: 'neon_emerald',   hex: '#00BFA5' }, // 9. Mint Emerald Green
    { id: 'neon_white',     hex: '#FFFFFF' }, // 10. Pure Crystal White
    { id: 'neon_bronze',    hex: '#FFAB00' }, // 11. Amber Gold
    { id: 'neon_lavender',  hex: '#7986CB' }, // 12. Starry Sky Lavender
  ],
  levelRamp: [
    // 🟢 Level 1–2: Khởi động siêu dễ (2 màu, 3 ống, 1 trống) -> Giải ~2-3 bước
    { atLevel: 1,  tubes: 3,  colors: 2, capacity: 4, empty: 1, scramble: 5 },

    // 🟢 Level 3–5: Làm quen gom màu (3 màu, 4 ống, 1 trống) -> Giải ~4-5 bước
    { atLevel: 3,  tubes: 4,  colors: 3, capacity: 4, empty: 1, scramble: 10 },

    // 🟡 Level 6–8: Bắt đầu tính toán thứ tự (4 màu, 5 ống, 1 trống) -> Giải ~7-9 bước
    { atLevel: 6,  tubes: 5,  colors: 4, capacity: 4, empty: 1, scramble: 18 },

    // 🟠 Level 9–11: Thử thách trung cấp (5 màu, 6 ống, 1 trống) -> Giải ~10-13 bước
    { atLevel: 9,  tubes: 6,  colors: 5, capacity: 4, empty: 1, scramble: 28 },

    // 🔴 Level 12–15: "BẮT ĐẦU NHỨC ĐẦU" (6 màu, 7 ống, CHỈ 1 TRỐNG) -> Cực kỳ thử thách, giải ~14-18 bước
    { atLevel: 12, tubes: 7,  colors: 6, capacity: 4, empty: 1, scramble: 40 },

    // 🔴 Level 16–20: Rất khó (7 màu, 9 ống, 2 trống) -> Đa tầng phức tạp, giải ~16-22 bước
    { atLevel: 16, tubes: 9,  colors: 7, capacity: 4, empty: 2, scramble: 50 },

    // 🟣 Level 21–29: Cấp độ Master (8 màu, 10 ống, 2 trống, capacity 5) -> Giải ~20-28 bước
    { atLevel: 21, tubes: 10, colors: 8, capacity: 5, empty: 2, scramble: 60 },

    // 🟣 Level 30+: Insane Challenge (10 màu, 12 ống, 2 trống, capacity 5) -> Giải ~25-35 bước
    { atLevel: 30, tubes: 12, colors: 10, capacity: 5, empty: 2, scramble: 70 },
  ],
  shuffleBackSteps: 60,
  reward: {
    hint:      { costAd: true, hintOncePerLevel: true },
    extraTube: { costAd: true, maxExtra: 1 },
  },
  ad: { interstitialAfterClear: true },
};

// Tìm ramp step áp dụng cho 1 level (step có atLevel cao nhất mà <= level).
export function rampForLevel(cfg: MechanicsConfig, level: number): RampStep {
  let step = cfg.levelRamp[0];
  for (const s of cfg.levelRamp) {
    if (s.atLevel <= level) step = s;
  }
  return step;
}

// ── Perceptual colour guard (DESIGN-SPEC §7 / AUDIT §B5-5): delta-E > 30, assoc §4.3.
// CIE76 in L*a*b — "cấm dùng 2 màu quá giống nhau trong cùng level".
function hexToLab(hex: string): { L: number; a: number; b: number } {
  const raw = parseInt(hex.slice(1), 16);
  const sr = ((raw >> 16) & 255) / 255;
  const sg = ((raw >> 8) & 255) / 255;
  const sb = (raw & 255) / 255;
  const ls = (t: number) => (t > 0.04045 ? Math.pow((t + 0.055) / 1.055, 2.4) : t / 12.92);
  const r = ls(sr), g = ls(sg), b = ls(sb);
  let X = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
  const Y = r * 0.2126 + g * 0.7152 + b * 0.0722;
  let Z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(X), fy = f(Y), fz = f(Z);
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

function deltaE(hexA: string, hexB: string): number {
  const A = hexToLab(hexA), B = hexToLab(hexB);
  return Math.hypot(A.L - B.L, A.a - B.a, A.b - B.b);
}

/** DESIGN-SPEC §7: mỗi level chỉ dùng subset màu KHÔNG có cặp quá giống (delta-E > 30). */
export function colorsForLevel(cfg: MechanicsConfig, level: number): PaletteColor[] {
  const step = rampForLevel(cfg, level);
  const need = step.colors;
  const out: PaletteColor[] = [];
  for (const c of cfg.palette) {
    if (out.every((o) => deltaE(c.hex, o.hex) >= 30)) out.push(c);
    if (out.length >= need) break;
  }
  // fallback an toàn nếu palette thiếu màu phân biệt (append theo thứ tự còn thiếu).
  for (const c of cfg.palette) {
    if (out.length >= need) break;
    if (out.indexOf(c) >= 0) continue;
    out.push(c);
  }
  return out;
}
