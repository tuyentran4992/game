// M3 Juicy Merge — tokens (DESIGN-SPEC M3, art kawaii fruit)
// THAM CHIẾU design-system chung; override art-theme kawaii theo DESIGN-SPEC M3 §1.

import Phaser from 'phaser';

export type ColorKey =
  | 'bgTop' | 'bgBottom' | 'primary' | 'primaryDark' | 'primaryGrad'
  | 'accent' | 'success' | 'danger' | 'warning'
  | 'surface' | 'surfaceAlt' | 'overlay'
  | 'textPrimary' | 'textSecondary' | 'textOnPrimary' | 'textStroke'
  | 'shadow' | 'lane' | 'grass' | 'surfaceDim';

export const color: Record<ColorKey, string> = {
  // art-theme kawaii (override design-system)
  bgTop: '#FFF8E7',
  bgBottom: '#FFE4C4',
  primary: '#FF6B81',
  primaryDark: '#E8556F',
  primaryGrad: '#FF8FA3',
  accent: '#7ED957',
  success: '#2ECC71',
  danger: '#E74C3C',
  warning: '#FFC048',
  surface: '#FFFFFF',
  surfaceAlt: '#F5F7FA',
  surfaceDim: '#FFF3E0',
  overlay: 'rgba(0,0,0,0.55)',
  textPrimary: '#4A2C2A',
  textSecondary: '#8a6d6a',
  textOnPrimary: '#FFFFFF',
  textStroke: 'rgba(0,0,0,0.35)',
  shadow: '#000000',
  lane: '#7EC8FF',
  grass: '#B8E6A8',
};

export type TypeKey = 'display' | 'h1' | 'h2' | 'body' | 'small' | 'score';
export const type: Record<TypeKey, { size: number; weight: number }> = {
  display: { size: 44, weight: 900 },
  h1: { size: 36, weight: 800 },
  h2: { size: 28, weight: 800 },
  body: { size: 24, weight: 700 },
  small: { size: 18, weight: 600 },
  score: { size: 30, weight: 800 },
};

// spacing 4px grid
export const sp: Record<number, number> = {
  1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32, 7: 48, 8: 64,
};

export const radius = {
  sm: 12, md: 20, lg: 32, pill: 999,
};

// z-layering (design-system §1.7)
export const z = {
  bg: 0, actor: 10, hud: 20, tutorial: 30, overlay: 40, panel: 50,
};

// motion durations (design-system §1.6)
export const dur = {
  fast: 120, base: 200, slow: 400, pop: 250, hover: 180, tn: 200, scene: 200,
};

// toColor: hỗ trợ hex + rgba trong canvas graphics
export function toColor(v: string): number {
  if (v.startsWith('#')) {
    return Number.parseInt(v.replace('#', ''), 16);
  }
  // rgba fallback → đen
  return 0x000000;
}

// fontStyle: style text theo token type
export function fontStyle(t: { size: number; weight: number }, col: string): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: 'sans-serif',
    fontSize: `${t.size}px`,
    fontStyle: String(t.weight >= 800 ? 'bold' : t.weight >= 600 ? '600' : 'normal'),
    color: col,
  };
}