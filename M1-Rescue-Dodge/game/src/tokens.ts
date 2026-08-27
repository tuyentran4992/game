// Design tokens — tham chiếu docs/DESIGN-SYSTEM.md (dấu chấm).
// Mọi màu/type/nhịp trong scene BẮT BUỘC dùng token, KHÔNG hardcode HEX tùy tiện.
// Art-theme (color.primary/bg/grass/lane) + multi-palette theo level: xem DESIGN-SPEC §1.1.

import type Phaser from 'phaser';

export const color = {
  // art-theme mặc định level 1 (override per-level qua palettes)
  bg: { top: '#7EC8FF', bottom: '#B8E6A8' },
  grass: '#5ED07A',
  lane: '#FFFFFF',
  primary: '#FF9F1C',
  primaryDark: '#E8820F',
  accent: '#E8820F',
  // semantic + surface/text (lock hệ thống, KHÔNG đổi theo level)
  surface: '#FFFFFF',
  surfaceDim: '#9ED8FF',
  textPrimary: '#3A2E39',
  textSecondary: '#64748B',
  textOnAccent: '#FFFFFF',
  textOnPrimary: '#FFFFFF',
  success: '#2ECC71',
  danger: '#E74C3C',
  warning: '#FFC048',
  overlay: '#000000',
  shadow: '#000000',
} as const;

export const type = {
  display: { size: '44px', weight: '900', lh: 1.1 },
  h1: { size: '36px', weight: '800', lh: 1.15 },
  h2: { size: '28px', weight: '800', lh: 1.2 },
  body: { size: '24px', weight: '700', lh: 1.3 },
  small: { size: '18px', weight: '600', lh: 1.3 },
  score: { size: '30px', weight: '800', lh: 1.0 },
} as const;

export const sp = { 1: 4, 2: 8, 3: 12, 4: 16, 6: 24, 8: 32 } as const;

export const radius = { sm: 12, md: 20, lg: 32, full: 'half' } as const;

export const shadow = {
  btn: { dx: 0, dy: 6, blur: 12, alpha: 0.30 },
  panel: { dx: 0, dy: 10, blur: 24, alpha: 0.35 },
  char: { dx: 0, dy: 4, blur: 8, alpha: 0.25 },
} as const;

export const dur = {
  fast: 80,
  tn: 120,
  scene: 300,
  pop: 320,
  level: 380,
  hold: 1000,
  slow: 1500,
  banner: 1600,
  spinner: 900,
} as const;

export const z = {
  bg: 0,
  actor: 10,
  hud: 20,
  tutorial: 30,
  overlay: 40,
  panel: 50,
  dialog: 100,
} as const;

// Multi-palette theo level (BR-14) — DESIGN-SPEC §1.1 bảng level
export interface LevelPalette {
  bgTop: string; bgBottom: string; grass: string; lane: string;
}

export const LEVEL_PALETTES: LevelPalette[] = [
  // Level 1 — ban ngày
  { bgTop: '#7EC8FF', bgBottom: '#B8E6A8', grass: '#5ED07A', lane: '#FFFFFF' },
  // Level 2 — hoàng hôn
  { bgTop: '#FFB578', bgBottom: '#FF8E7A', grass: '#C97B5D', lane: '#FFE4C2' },
  // Level 3 — đêm tím
  { bgTop: '#2B3A67', bgBottom: '#4A3B8C', grass: '#3D6B8E', lane: '#A9C6FF' },
];

export function paletteForLevel(level: number): LevelPalette {
  if (level < 10) return LEVEL_PALETTES[0]; // Ban ngày (Level 1..9)
  if (level < 20) return LEVEL_PALETTES[1]; // Hoàng hôn (Level 10..19)
  return LEVEL_PALETTES[2];                 // Đêm (Level 20+)
}

// Helper: fontStyle từ token
export function fontStyle(token: { size: string; weight: string; lh: number }, colorStr: string): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    fontSize: token.size,
    fontStyle: 'bold',
    color: colorStr,
    align: 'center',
  } as Phaser.Types.GameObjects.Text.TextStyle;
}

// Helper: convert hex string (#RRGGBB) → number cho Graphics.fillStyle/lineStyle
export function toColor(hex: string): number {
  if (hex.startsWith('#')) return parseInt(hex.slice(1), 16);
  if (hex.startsWith('0x')) return parseInt(hex, 16);
  return parseInt(hex, 16) || 0;
}
