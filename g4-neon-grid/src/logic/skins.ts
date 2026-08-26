/**
 * Neon Grid — Skins System
 *
 * 7 Unique Cyberpunk Skin Palettes (SKIN-00 to SKIN-06).
 */

import type { Skin } from './types';

export const SKINS: Skin[] = [
  {
    id: 0,
    name: 'Neon Cyan',
    unlockCondition: 'Default Skin',
    requiredAchievementId: null,
    palette: {
      name: 'Neon Cyan',
      gridColor: 0x00f5ff,
      gridBg: 0x0d0d26,
      hudBg: 0x151535,
      hudBorder: 0x282855,
      scoreColor: 0x00f5ff,
      blockColors: [
        { fill: 0x00f5ff, light: 0x70ffff, dark: 0x0099bb, glow: 0x00f5ff, name: 'Cyan' },
        { fill: 0xff00ff, light: 0xff77ff, dark: 0xbb00bb, glow: 0xff00ff, name: 'Magenta' },
        { fill: 0xffd000, light: 0xfffa77, dark: 0xcc9900, glow: 0xffd000, name: 'Yellow' },
        { fill: 0x00ff88, light: 0x88ffcc, dark: 0x00bb55, glow: 0x00ff88, name: 'Green' },
        { fill: 0xff6600, light: 0xffaa55, dark: 0xcc4400, glow: 0xff6600, name: 'Orange' },
        { fill: 0xff2255, light: 0xff7799, dark: 0xbb1133, glow: 0xff2255, name: 'Red' },
        { fill: 0x3d7eff, light: 0x8ab6ff, dark: 0x2055cc, glow: 0x3d7eff, name: 'Blue' },
      ],
    },
  },
  {
    id: 1,
    name: 'Magenta Dream',
    unlockCondition: 'Score ≥ 1,000 pts (ACH-02)',
    requiredAchievementId: 'ACH-02',
    palette: {
      name: 'Magenta Dream',
      gridColor: 0xff00ff,
      gridBg: 0x1f0b29,
      hudBg: 0x2b1038,
      hudBorder: 0x5a1e75,
      scoreColor: 0xff55ff,
      blockColors: [
        { fill: 0xff00bb, light: 0xff77dd, dark: 0x990077, glow: 0xff00bb, name: 'Hot Pink' },
        { fill: 0xcc00ff, light: 0xdd77ff, dark: 0x770099, glow: 0xcc00ff, name: 'Purple' },
        { fill: 0xff33aa, light: 0xff88cc, dark: 0xaa1166, glow: 0xff33aa, name: 'Rose' },
        { fill: 0xaa44ff, light: 0xcc88ff, dark: 0x6611aa, glow: 0xaa44ff, name: 'Violet' },
        { fill: 0xff66bb, light: 0xffaadd, dark: 0xbb2277, glow: 0xff66bb, name: 'Blush' },
        { fill: 0xff0066, light: 0xff5599, dark: 0x990033, glow: 0xff0066, name: 'Crimson' },
        { fill: 0xee88ff, light: 0xffccff, dark: 0x9944aa, glow: 0xee88ff, name: 'Lavender' },
      ],
    },
  },
  {
    id: 2,
    name: 'Golden Era',
    unlockCondition: 'Score ≥ 50,000 pts (ACH-04)',
    requiredAchievementId: 'ACH-04',
    palette: {
      name: 'Golden Era',
      gridColor: 0xffd700,
      gridBg: 0x221a08,
      hudBg: 0x30240a,
      hudBorder: 0x664d14,
      scoreColor: 0xffd700,
      blockColors: [
        { fill: 0xffcc00, light: 0xffee66, dark: 0xaa8800, glow: 0xffcc00, name: 'Gold' },
        { fill: 0xff9900, light: 0xffbb55, dark: 0xbb6600, glow: 0xff9900, name: 'Amber' },
        { fill: 0xffea55, light: 0xffffaa, dark: 0xbbaa22, glow: 0xffea55, name: 'Sunlight' },
        { fill: 0xdd7700, light: 0xffaa33, dark: 0x884400, glow: 0xdd7700, name: 'Bronze' },
        { fill: 0xffbb33, light: 0xffdd77, dark: 0xaa7711, glow: 0xffbb33, name: 'Topaz' },
        { fill: 0xff6600, light: 0xff9944, dark: 0xaa3300, glow: 0xff6600, name: 'Copper' },
        { fill: 0xffe066, light: 0xfff5aa, dark: 0xaa9522, glow: 0xffe066, name: 'Champagne' },
      ],
    },
  },
  {
    id: 3,
    name: 'Ocean Deep',
    unlockCondition: 'Clear 100 lines total (ACH-09)',
    requiredAchievementId: 'ACH-09',
    palette: {
      name: 'Ocean Deep',
      gridColor: 0x0088ff,
      gridBg: 0x051428,
      hudBg: 0x0a1e3b,
      hudBorder: 0x144075,
      scoreColor: 0x00d4ff,
      blockColors: [
        { fill: 0x0077ff, light: 0x55aaff, dark: 0x0044aa, glow: 0x0077ff, name: 'Deep Blue' },
        { fill: 0x00d4ff, light: 0x77eeff, dark: 0x0088aa, glow: 0x00d4ff, name: 'Aqua' },
        { fill: 0x0044cc, light: 0x4488ff, dark: 0x002288, glow: 0x0044cc, name: 'Navy' },
        { fill: 0x00ffcc, light: 0x77ffee, dark: 0x00aa88, glow: 0x00ffcc, name: 'Teal' },
        { fill: 0x3366ff, light: 0x7799ff, dark: 0x1133aa, glow: 0x3366ff, name: 'Cobalt' },
        { fill: 0x00aaff, light: 0x66ccff, dark: 0x0066aa, glow: 0x00aaff, name: 'Sky' },
        { fill: 0x55ffff, light: 0xaaffff, dark: 0x22aaaa, glow: 0x55ffff, name: 'Ice' },
      ],
    },
  },
  {
    id: 4,
    name: 'Retro Arcade',
    unlockCondition: 'Complete 7 Daily Challenges (ACH-12)',
    requiredAchievementId: 'ACH-12',
    palette: {
      name: 'Retro Arcade',
      gridColor: 0x00ff44,
      gridBg: 0x081c0d,
      hudBg: 0x0e2b14,
      hudBorder: 0x1a5928,
      scoreColor: 0x00ff66,
      blockColors: [
        { fill: 0x00ff44, light: 0x77ff99, dark: 0x00aa22, glow: 0x00ff44, name: 'Matrix Green' },
        { fill: 0x33ff00, light: 0x88ff66, dark: 0x22aa00, glow: 0x33ff00, name: 'Lime' },
        { fill: 0x00cc66, light: 0x55ffaa, dark: 0x008844, glow: 0x00cc66, name: 'Jade' },
        { fill: 0x66ff33, light: 0xaaff88, dark: 0x44aa11, glow: 0x66ff33, name: 'Neon Green' },
        { fill: 0x00ff88, light: 0x66ffbb, dark: 0x00aa55, glow: 0x00ff88, name: 'Emerald' },
        { fill: 0xaaff00, light: 0xccff66, dark: 0x66aa00, glow: 0xaaff00, name: 'Chartreuse' },
        { fill: 0x00ee44, light: 0x66ff88, dark: 0x009922, glow: 0x00ee44, name: 'CRT Green' },
      ],
    },
  },
  {
    id: 5,
    name: 'Midnight',
    unlockCondition: 'Reach Combo x3 (ACH-06)',
    requiredAchievementId: 'ACH-06',
    palette: {
      name: 'Midnight',
      gridColor: 0x8800ff,
      gridBg: 0x120824,
      hudBg: 0x1c0d38,
      hudBorder: 0x421a80,
      scoreColor: 0xb366ff,
      blockColors: [
        { fill: 0x8800ff, light: 0xbb66ff, dark: 0x5500aa, glow: 0x8800ff, name: 'Indigo' },
        { fill: 0x6600cc, light: 0x9944ff, dark: 0x3d007a, glow: 0x6600cc, name: 'Deep Purple' },
        { fill: 0xaa22ff, light: 0xcc77ff, dark: 0x6e0eb0, glow: 0xaa22ff, name: 'Electric Violet' },
        { fill: 0x5500ff, light: 0x8844ff, dark: 0x3300aa, glow: 0x5500ff, name: 'Nightshade' },
        { fill: 0xcc44ff, light: 0xdd88ff, dark: 0x8811bb, glow: 0xcc44ff, name: 'Orchid' },
        { fill: 0x7711dd, light: 0xaa55ff, dark: 0x440088, glow: 0x7711dd, name: 'Amethyst' },
        { fill: 0xbb55ff, light: 0xdd99ff, dark: 0x7722bb, glow: 0xbb55ff, name: 'Lilac' },
      ],
    },
  },
  {
    id: 6,
    name: 'Rainbow',
    unlockCondition: 'Use all 13 shapes (ACH-08)',
    requiredAchievementId: 'ACH-08',
    palette: {
      name: 'Rainbow',
      gridColor: 0xff0088,
      gridBg: 0x140a1c,
      hudBg: 0x241030,
      hudBorder: 0x541c70,
      scoreColor: 0xffdd00,
      blockColors: [
        { fill: 0xff0044, light: 0xff6688, dark: 0xaa0022, glow: 0xff0044, name: 'Red' },
        { fill: 0xff7700, light: 0xffaa55, dark: 0xaa4400, glow: 0xff7700, name: 'Orange' },
        { fill: 0xffdd00, light: 0xffee66, dark: 0xaa9900, glow: 0xffdd00, name: 'Yellow' },
        { fill: 0x00ff66, light: 0x77ffaa, dark: 0x00aa33, glow: 0x00ff66, name: 'Green' },
        { fill: 0x00d4ff, light: 0x77eeff, dark: 0x0088aa, glow: 0x00d4ff, name: 'Cyan' },
        { fill: 0x7700ff, light: 0xaa55ff, dark: 0x4400aa, glow: 0x7700ff, name: 'Blue' },
        { fill: 0xff00cc, light: 0xff77ee, dark: 0xaa0088, glow: 0xff00cc, name: 'Magenta' },
      ],
    },
  },
];

export function getSkinById(id: number): Skin {
  return SKINS.find(s => s.id === id) || SKINS[0];
}
