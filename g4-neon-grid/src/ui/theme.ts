/**
 * Neon Grid — Theme
 *
 * Extends @game/core tokens with game-specific neon palette.
 */
import { palette as corePalette } from '@game/core/tokens';

export const theme = {
  // Grid
  gridBg: 0x0d0d2b,
  gridLine: 0x1a1a4e,
  gridLineGlow: 0x00f5ff,

  // Block colors (indexed 0-6)
  blockColors: [
    { fill: 0x00f5ff, glow: 0x00f5ff, name: 'Cyan' },    // 0
    { fill: 0xff00ff, glow: 0xff00ff, name: 'Magenta' },  // 1
    { fill: 0xffdd00, glow: 0xffdd00, name: 'Yellow' },   // 2
    { fill: 0x00ff88, glow: 0x00ff88, name: 'Green' },    // 3
    { fill: 0xff6600, glow: 0xff6600, name: 'Orange' },   // 4
    { fill: 0xff2244, glow: 0xff2244, name: 'Red' },      // 5
    { fill: 0x4488ff, glow: 0x4488ff, name: 'Blue' },     // 6
  ],

  // HUD
  scoreColor: 0x00f5ff,
  titleColor: 0xffffff,

  // Clear effects
  clearParticleColor: 0x00f5ff,
  clearFlashColor: 0xffffff,
} as const;

/** Get block color by index (0-6) */
export function getBlockColor(index: number) {
  return theme.blockColors[index % theme.blockColors.length];
}