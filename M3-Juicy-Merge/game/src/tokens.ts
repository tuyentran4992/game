// M3 Juicy Merge — tokens (DESIGN-SPEC M3, Playgama / Poki-grade visual tokens)
import type Phaser from 'phaser';

export type ColorKey =
  | 'bgTop' | 'bgMid' | 'bgBottom' | 'primary' | 'primaryDark' | 'primaryGrad'
  | 'accent' | 'success' | 'danger' | 'warning'
  | 'surface' | 'surfaceAlt' | 'overlay'
  | 'textPrimary' | 'textSecondary' | 'textOnPrimary' | 'textStroke'
  | 'shadow' | 'lane' | 'grass' | 'surfaceDim'
  | 'woodLight' | 'woodDark' | 'gold' | 'goldDark' | 'goldLight' | 'goldShadow'
  | 'candyPink' | 'candyPinkDark' | 'candyCyan' | 'candyCyanDark'
  | 'candyPurple' | 'candyPurpleDark' | 'candyAmber' | 'candyAmberDark'
  | 'candyGreen' | 'candyGreenDark';

export const color: Record<ColorKey, string> = {
  // Vibrant Tropical Sunset & Radiant Skybox Palette
  bgTop: '#FF5E7E',        // Vibrant coral raspberry pink
  bgMid: '#FFA834',        // Warm honey amber orange
  bgBottom: '#FFF0B5',     // Soft sunshine cream yellow
  
  // 3D Candy Primary Action (Juicy Strawberry Pink)
  primary: '#FF4D6D',
  primaryDark: '#C9184A',
  primaryGrad: '#FF758F',
  
  // Vibrant Arcade Accents
  accent: '#06D6A0',       // Mint Cyan
  success: '#10B981',      // Emerald Green
  danger: '#EF4444',       // Vibrant Alert Red
  warning: '#F59E0B',      // Solar Amber Gold
  
  surface: '#FFFFFF',
  surfaceAlt: '#F8FAFC',
  surfaceDim: '#FFF7ED',
  overlay: 'rgba(15, 23, 42, 0.70)',
  
  textPrimary: '#1E293B',  // Slate Dark
  textSecondary: '#64748B',// Slate Muted
  textOnPrimary: '#FFFFFF',
  textStroke: '#0F172A',
  shadow: '#000000',
  lane: '#38BDF8',
  grass: '#10B981',
  
  // 3D Polished Wood & Royal Gold Tokens
  woodLight: '#9A6136',    // Cedar wood body
  woodDark: '#5C3414',     // Dark 3D bevel wood
  gold: '#F59E0B',         // 24K Solar Gold
  goldLight: '#FDE68A',    // Specular gold shine
  goldDark: '#D97706',     // Deep gold shadow
  goldShadow: '#78350F',   // Darkest gold stroke
  
  // 3D Candy Button Palettes
  candyPink: '#FF3366',
  candyPinkDark: '#B80036',
  candyCyan: '#06D6A0',
  candyCyanDark: '#048A66',
  candyPurple: '#8B5CF6',
  candyPurpleDark: '#5B21B6',
  candyAmber: '#F59E0B',
  candyAmberDark: '#B45309',
  candyGreen: '#10B981',
  candyGreenDark: '#047857',
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

// Spacing grid
export const sp: Record<number, number> = {
  1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32, 7: 48, 8: 64,
};

export const radius = {
  sm: 12, md: 20, lg: 32, pill: 999,
};

// z-layering
export const z = {
  bg: 0, bgSpotlight: 2, bgParticles: 5, actor: 10, bucketGlass: 8, bucketFrame: 14, hud: 20, tutorial: 30, overlay: 40, panel: 50,
};

// motion durations
export const dur = {
  fast: 120, base: 200, slow: 400, pop: 250, hover: 180, tn: 200, scene: 200,
};

// toColor: supports hex strings and converts to integer color value
export function toColor(v: string): number {
  if (v.startsWith('#')) {
    return Number.parseInt(v.replace('#', ''), 16);
  }
  return 0x000000;
}

// fontStyle helper
export function fontStyle(t: { size: number; weight: number }, col: string): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: 'sans-serif',
    fontSize: `${t.size}px`,
    fontStyle: String(t.weight >= 800 ? 'bold' : t.weight >= 600 ? '600' : 'normal'),
    color: col,
  };
}