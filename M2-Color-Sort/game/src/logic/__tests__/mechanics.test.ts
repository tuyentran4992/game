import { describe, expect, it } from 'vitest';
import { MECHANICS, rampForLevel, colorsForLevel } from '../mechanics';

// Design-spec §7 / AUDIT §B5-5: no two colours used in the same level may be
// perceptually too close (delta-E > 30). Guard lives in colorsForLevel.
function deltaE(hexA: string, hexB: string): number {
  const lab = (h: string) => {
    const raw = parseInt(h.slice(1), 16);
    const l = (t: number) => (t > 0.04045 ? Math.pow((t + 0.055) / 1.055, 2.4) : t / 12.92);
    const r = l(((raw >> 16) & 255) / 255), g = l(((raw >> 8) & 255) / 255), b = l((raw & 255) / 255);
    let X = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
    const Y = r * 0.2126 + g * 0.7152 + b * 0.0722;
    let Z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
    const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
    const fx = f(X), fy = f(Y), fz = f(Z);
    return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
  };
  const A = lab(hexA), B = lab(hexB);
  return Math.hypot(A.L - B.L, A.a - B.a, A.b - B.b);
}

describe('mechanics colorsForLevel delta-E guard', () => {
  it('returns exactly the ramp color count for each level', () => {
    for (let level = 1; level <= 40; level++) {
      expect(colorsForLevel(MECHANICS, level).length).toBe(rampForLevel(MECHANICS, level).colors);
    }
  });

  it('never yields a pair of colours with delta-E <= 30 in a level', () => {
    for (let level = 1; level <= 40; level++) {
      const cols = colorsForLevel(MECHANICS, level);
      for (let i = 0; i < cols.length; i++) {
        for (let j = i + 1; j < cols.length; j++) {
          expect(deltaE(cols[i].hex, cols[j].hex) > 30).toBe(true);
        }
      }
    }
  });

  it('palette provides at least 12 distinct colours (design-spec §1.3)', () => {
    expect(MECHANICS.palette.length).toBeGreaterThanOrEqual(12);
  });
});
