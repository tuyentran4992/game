/**
 * Neon Grid — Theme & Skin Integration
 *
 * Implements @game/core GameTheme interface and provides
 * dynamic skin palette resolution from active skin selection.
 */

import type { GameTheme } from '@game/core/theme';
import { getSkinById } from '../logic/skins';
import { saveManager } from '../logic/save-manager';
import type { SkinPalette } from '../logic/types';

export function getActiveSkinPalette(): SkinPalette {
  const activeSkinId = saveManager.getActiveSkinId();
  const skin = getSkinById(activeSkinId);
  return skin.palette;
}

export const theme: GameTheme & {
  // Game-specific board & rendering tokens
  bgDark: number;
  bgLight: number;
  gridBg: number;
  gridCellEmpty: number;
  gridLine: number;
  gridLineGlow: number;
  gridBorder: number;
  hudBg: number;
  hudBorder: number;
  scoreColor: number;
  bestColor: number;
  titleColor: number;
  flameColor: number;
  clearLaserColor: number;
  clearParticleColor: number;
  clearFlashColor: number;
  blockColors: Array<{
    fill: number;
    light: number;
    dark: number;
    glow: number;
    name: string;
  }>;
} = {
  name: 'Neon Cyberpunk',

  colors: {
    bg: 0x0a0a1a,
    bgCard: 0x1a1a3e,
    bgOverlay: 0x000000,
    surface: 0x1e1e3f,
    surfaceLight: 0x2a2a5a,
    surfaceDark: 0x12122e,
    primary: 0x00f5ff,
    primaryDark: 0x0088cc,
    secondary: 0xff00ff,
    secondaryDark: 0xcc0088,
    accent: 0xffdd00,
    success: 0x00ff88,
    warning: 0xff6600,
    error: 0xff2244,
    textPrimary: 0xffffff,
    textSecondary: 0x8888bb,
    textMuted: 0x555577,
  },

  fonts: {
    display: 'Poppins',
    heading: 'Poppins',
    body: 'Poppins',
    mono: 'JetBrains Mono',
  },

  fontSizes: {
    title: 48,
    heading: 32,
    body: 22,
    small: 16,
    score: 36,
    button: 26,
    badge: 14,
  },

  radii: {
    sm: 6,
    md: 12,
    lg: 20,
    xl: 28,
    full: 999,
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },

  shadows: {
    button: { distance: 3, color: 0x000000, blur: 6, alpha: 0.5 },
    card: { distance: 4, color: 0x000000, blur: 12, alpha: 0.6 },
    modal: { distance: 8, color: 0x000000, blur: 24, alpha: 0.7 },
    glow: { distance: 0, color: 0x00f5ff, blur: 16, alpha: 0.6 },
  },

  gradients: {
    btnPrimary: { topLeft: 0x00f5ff, topRight: 0x00f5ff, bottomLeft: 0x0088cc, bottomRight: 0x0088cc },
    btnSecondary: { topLeft: 0xff00ff, topRight: 0xff00ff, bottomLeft: 0xcc0088, bottomRight: 0xcc0088 },
    panel: { topLeft: 0x1a1a3e, topRight: 0x1a1a3e, bottomLeft: 0x12122e, bottomRight: 0x12122e },
  },

  animation: {
    fast: 150,
    normal: 300,
    slow: 500,
    easeIn: 'Power2',
    easeOut: 'Power2',
    easeInOut: 'Sine.easeInOut',
    bounce: 'Bounce.easeOut',
  },

  // Game-specific values
  bgDark: 0x080816,
  bgLight: 0x12122b,

  gridBg: 0x0d0d26,
  gridCellEmpty: 0x151538,
  gridLine: 0x1e1e4a,
  gridLineGlow: 0x00f5ff,
  gridBorder: 0x2a2a60,

  blockColors: [
    { fill: 0x00f5ff, light: 0x70ffff, dark: 0x0099bb, glow: 0x00f5ff, name: 'Cyan' },
    { fill: 0xff00ff, light: 0xff77ff, dark: 0xbb00bb, glow: 0xff00ff, name: 'Magenta' },
    { fill: 0xffd000, light: 0xfffa77, dark: 0xcc9900, glow: 0xffd000, name: 'Yellow' },
    { fill: 0x00ff88, light: 0x88ffcc, dark: 0x00bb55, glow: 0x00ff88, name: 'Green' },
    { fill: 0xff6600, light: 0xffaa55, dark: 0xcc4400, glow: 0xff6600, name: 'Orange' },
    { fill: 0xff2255, light: 0xff7799, dark: 0xbb1133, glow: 0xff2255, name: 'Red' },
    { fill: 0x3d7eff, light: 0x8ab6ff, dark: 0x2055cc, glow: 0x3d7eff, name: 'Blue' },
  ],

  hudBg: 0x151535,
  hudBorder: 0x282855,
  scoreColor: 0x00f5ff,
  bestColor: 0xffd000,
  titleColor: 0xffffff,
  flameColor: 0xff5500,

  clearLaserColor: 0x00ffff,
  clearParticleColor: 0x00f5ff,
  clearFlashColor: 0xffffff,
};

// Export font helper objects for clean scene imports without @game/core/tokens
export const fonts = {
  display: { family: theme.fonts.display, weight: 800 },
  heading: { family: theme.fonts.heading, weight: 700 },
  body: { family: theme.fonts.body, weight: 500 },
  mono: { family: theme.fonts.mono, weight: 600 },
};

/** Get block color by index (0-6) from active skin */
export function getBlockColor(index: number, skinPalette?: SkinPalette) {
  const palette = skinPalette || getActiveSkinPalette();
  return palette.blockColors[index % palette.blockColors.length];
}