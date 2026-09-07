// Slice Studio — S1-T1: theme-config là data thuần (TEST-CASES §S1-T1)
// 0 Phaser import, hex NHẬN nguyên giá trị THEMES levels.ts, đủ 8 field interface Theme.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ART, ATLAS_KEYS, CHAPTER_THEMES, interiorMaskPts, mulberry32, polygonArea } from '../config/theme-config';
import { LEVELS } from '../level/levels';

// bit-giống THEMES (freeze) levels.ts — anchor deep-equal
const THEMES_EXPECT: Record<number, Record<string, number>> = {
  1: { bg: 0x0f172a, silhouette: 0x1e3a5f, silhouetteEdge: 0x38bdf8, path: 0x7dd3fc, core: 0x0ea5e9, coreEdge: 0xe0f2fe, noGo: 0xff2d3d, accent: 0x38bdf8 },
  2: { bg: 0x1f1033, silhouette: 0x4c1d95, silhouetteEdge: 0xc084fc, path: 0xf0abfc, core: 0xf59e0b, coreEdge: 0xfef3c7, noGo: 0xff2d3d, accent: 0xc084fc },
  3: { bg: 0x0d2818, silhouette: 0x14532d, silhouetteEdge: 0x4ade80, path: 0xbbf7d0, core: 0xfacc15, coreEdge: 0xfef9c3, noGo: 0xff2d3d, accent: 0x4ade80 },
  4: { bg: 0x22090c, silhouette: 0x7f1d1d, silhouetteEdge: 0xfb923c, path: 0xfed7aa, core: 0x38bdf8, coreEdge: 0xe0f2fe, noGo: 0xff2d3d, accent: 0xfb923c },
};

describe('S1-T1 theme-config = data thuần', () => {
  it('không import Phaser (grep source file)', () => {
    const src = readFileSync('src/config/theme-config.ts', 'utf8');
    expect(/from\s+['"]phaser['"]/.test(src)).toBe(false);
    expect(/import\s+\*\s+as\s+Phaser/.test(src)).toBe(false);
  });

  it('đủ 8 field Theme, mọi giá trị là number', () => {
    const fields: Array<keyof import('../level/levels').Theme> = ['bg', 'silhouette', 'silhouetteEdge', 'path', 'core', 'coreEdge', 'noGo', 'accent'];
    for (const ch of [1, 2, 3, 4] as const) {
      const theme = CHAPTER_THEMES[ch];
      expect(Object.keys(theme).sort()).toEqual([...fields].sort());
      for (const f of fields) expect(typeof theme[f]).toBe('number');
    }
  });

  it('hex NHẬN nguyên giá trị THEMES levels.ts (deep-equal từng chương)', () => {
    for (const ch of [1, 2, 3, 4] as const) {
      expect({ ...CHAPTER_THEMES[ch] }).toEqual(THEMES_EXPECT[ch]);
    }
  });

  it('anchor chéo với LEVELS thực (theme theo milestone)', () => {
    for (const l of LEVELS) {
      expect({ ...CHAPTER_THEMES[l.milestone] }).toEqual({ ...l.theme });
    }
  });

  it('atlas keys Latin đúng schema atlas-m1..4', () => {
    expect(ATLAS_KEYS[1]).toMatch(/^atlas-m1$/);
    expect(Object.values(ATLAS_KEYS)).toEqual(['atlas-m1', 'atlas-m2', 'atlas-m3', 'atlas-m4']);
  });
});

describe('S1 helpers pure (mask/area/rng)', () => {
  it('interiorMaskPts: deterministic, đủ steps, luôn TRONG hit-shape ellipse', () => {
    const shape = { cx: 360, cy: 470, rx: 250, ry: 150 };
    const a = interiorMaskPts(shape, 1);
    const b = interiorMaskPts(shape, 1);
    expect(a.length).toBe(ART.mask.steps);
    expect(a).toEqual(b); // same seed → identical mask
    const EPS = 1e-9; // float-space tolerance — intended geometry is exactly on/inside (j ≤ 0)
    for (const p of a) {
      const q = ((p.x - shape.cx) / shape.rx) ** 2 + ((p.y - shape.cy) / shape.ry) ** 2;
      expect(q).toBeLessThanOrEqual(1 + EPS); // never bulges outside the hit-shape
    }
  });

  it('mulberry32 khớp reference python (drift-guard với gen script)', () => {
    // first 8 outputs for seed 1101 — verified against scripts/gen_slice_sprites.py (node + python3)
    const expected = [0.295873967, 0.762694262, 0.774594619, 0.999686006, 0.705829202, 0.973852065, 0.410041329, 0.563932648];
    const r = mulberry32(1101);
    for (const e of expected) expect(r()).toBeCloseTo(e, 8);
  });

  it('polygonArea: hình chữ nhật 100x50 = 5000', () => {
    const rect = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 50 }, { x: 0, y: 50 }];
    expect(polygonArea(rect)).toBeCloseTo(5000);
  });
});
