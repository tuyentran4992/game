/**
 * Neon Grid — Theme
 *
 * Implements GameTheme interface with neon cyberpunk palette.
 * Mỗi game có 1 theme riêng, không share token.
 */
import type { GameTheme } from '@game/core';

export const neonGridTheme: GameTheme = {
  name: 'Neon Grid',

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
};

// Block colors (indexed 0-6) — game-specific, not part of GameTheme
export const blockColors = [
  { fill: 0x00f5ff, glow: 0x00f5ff, name: 'Cyan' },
  { fill: 0xff00ff, glow: 0xff00ff, name: 'Magenta' },
  { fill: 0xffdd00, glow: 0xffdd00, name: 'Yellow' },
  { fill: 0x00ff88, glow: 0x00ff88, name: 'Green' },
  { fill: 0xff6600, glow: 0xff6600, name: 'Orange' },
  { fill: 0xff2244, glow: 0xff2244, name: 'Red' },
  { fill: 0x4488ff, glow: 0x4488ff, name: 'Blue' },
];

export function getBlockColor(index: number) {
  return blockColors[index % blockColors.length];
}