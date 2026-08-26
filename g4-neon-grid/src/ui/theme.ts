/**
 * Neon Grid — Theme & Skin Integration
 *
 * Provides dynamic skin palette resolution from active skin selection.
 */

import { getSkinById } from '../logic/skins';
import { saveManager } from '../logic/save-manager';
import type { SkinPalette } from '../logic/types';

export function getActiveSkinPalette(): SkinPalette {
  const activeSkinId = saveManager.getActiveSkinId();
  const skin = getSkinById(activeSkinId);
  return skin.palette;
}

export const theme = {
  // Canvas & Background
  bgDark: 0x080816,
  bgLight: 0x12122b,

  // Grid Board
  gridBg: 0x0d0d26,
  gridCellEmpty: 0x151538,
  gridLine: 0x1e1e4a,
  gridLineGlow: 0x00f5ff,
  gridBorder: 0x2a2a60,

  // Default block colors (indexed 0-6)
  blockColors: [
    { fill: 0x00f5ff, light: 0x70ffff, dark: 0x0099bb, glow: 0x00f5ff, name: 'Cyan' },
    { fill: 0xff00ff, light: 0xff77ff, dark: 0xbb00bb, glow: 0xff00ff, name: 'Magenta' },
    { fill: 0xffd000, light: 0xfffa77, dark: 0xcc9900, glow: 0xffd000, name: 'Yellow' },
    { fill: 0x00ff88, light: 0x88ffcc, dark: 0x00bb55, glow: 0x00ff88, name: 'Green' },
    { fill: 0xff6600, light: 0xffaa55, dark: 0xcc4400, glow: 0xff6600, name: 'Orange' },
    { fill: 0xff2255, light: 0xff7799, dark: 0xbb1133, glow: 0xff2255, name: 'Red' },
    { fill: 0x3d7eff, light: 0x8ab6ff, dark: 0x2055cc, glow: 0x3d7eff, name: 'Blue' },
  ],

  // HUD & UI
  hudBg: 0x151535,
  hudBorder: 0x282855,
  scoreColor: 0x00f5ff,
  bestColor: 0xffd000,
  titleColor: 0xffffff,
  flameColor: 0xff5500,

  // Clear effects & VFX
  clearLaserColor: 0x00ffff,
  clearParticleColor: 0x00f5ff,
  clearFlashColor: 0xffffff,
};

/** Get block color by index (0-6) from active skin */
export function getBlockColor(index: number, skinPalette?: SkinPalette) {
  const palette = skinPalette || getActiveSkinPalette();
  return palette.blockColors[index % palette.blockColors.length];
}