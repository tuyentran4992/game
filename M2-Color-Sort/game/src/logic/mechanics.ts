// Mechanic config M2 "Neon Sort: Galaxy Pour" — mirror games/neon-sort.yaml.
// Runtime giữ khỏi parser YAML (bundle nhỏ). Khi yaml đổi, cập nhật file này cho khớp.

export interface PaletteColor { id: string; hex: string; }

export interface RampStep {
  atLevel: number;   // áp dụng từ level này trở đi cho tới step kế tiếp
  tubes: number;     // tổng số ống (kể cả ống trống workspace)
  colors: number;    // số màu (mỗi màu chiếm đúng capacity lát)
  capacity: number;  // số lát tối đa mỗi ống
  empty: number;     // số ống trống workspace
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
  tubeCountStart: 4,
  capacity: 4,
  emptyTubesStart: 1,
  palette: [
    { id: 'neon_cyan',      hex: '#00F0FF' }, // 1. Electric Cyan
    { id: 'neon_pink',      hex: '#FF1493' }, // 2. Hot Neon Pink
    { id: 'neon_yellow',    hex: '#FFE600' }, // 3. Sunburst Yellow
    { id: 'neon_lime',      hex: '#39FF14' }, // 4. Neon Lime Green
    { id: 'neon_blue',      hex: '#1E50FF' }, // 5. Royal Indigo Blue
    { id: 'neon_orange',    hex: '#FF6B00' }, // 6. Vivid Orange
    { id: 'neon_violet',    hex: '#9E00FF' }, // 7. Cosmic Violet Purple
    { id: 'neon_red',       hex: '#FF2A4D' }, // 8. Crimson Red
    { id: 'neon_emerald',   hex: '#00E5A3' }, // 9. Mint Emerald Green
    { id: 'neon_white',     hex: '#FFFFFF' }, // 10. Pure Snow White
    { id: 'neon_bronze',    hex: '#C98600' }, // 11. Gold Bronze
    { id: 'neon_lavender',  hex: '#A6B8FF' }, // 12. Sky Lavender
  ],
  levelRamp: [
    { atLevel: 1,  tubes: 4,  colors: 3, capacity: 4, empty: 1 },
    { atLevel: 3,  tubes: 5,  colors: 4, capacity: 4, empty: 1 },
    { atLevel: 6,  tubes: 6,  colors: 5, capacity: 4, empty: 1 },
    { atLevel: 10, tubes: 8,  colors: 6, capacity: 5, empty: 1 },
    { atLevel: 15, tubes: 10, colors: 7, capacity: 5, empty: 2 },
    { atLevel: 22, tubes: 12, colors: 9, capacity: 5, empty: 2 },
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

// Chọn `count` màu palette cho level
export function colorsForLevel(cfg: MechanicsConfig, level: number): PaletteColor[] {
  const step = rampForLevel(cfg, level);
  const need = step.colors;
  const out: PaletteColor[] = [];
  for (let i = 0; i < need; i++) {
    out.push(cfg.palette[i % cfg.palette.length]);
  }
  return out;
}
