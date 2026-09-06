import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { MECHANICS } from '../../config/mechanics';
import type { MechanicsConfig } from '../../config/mechanics';
import { PerfectWindowFitter, flickFromSeed, perfectRate, sweep, SWEEP_SEED_COUNT } from '../perfectWindow';
import { judgePerfect } from '../perfectWindow';
import { throwAngleDeg } from '../mechanics';
import type { FlickInput } from '../types';

const SEEDS = Array.from({ length: SWEEP_SEED_COUNT }, (_, i) => i + 1);
const PTS = sweep(MECHANICS, SEEDS);

const rad = (deg: number) => (deg * Math.PI) / 180;
const makeInput = (angleDeg: number, power: number): FlickInput => ({
  dirX: Math.sin(rad(angleDeg)),
  dirZ: -Math.cos(rad(angleDeg)),
  power,
});

describe('G2-3 perfect-rate — config-là-nguồn-duy-nhất', () => {
  it('judgePerfect đọc window TỪ MechanicsConfig (vector trong window → true, ngoài → false)', () => {
    const w = MECHANICS.perfectWindow;
    const midA = (w.angleMinDeg + w.angleMaxDeg) / 2;
    const midP = (w.powerMin + w.powerMax) / 2;
    expect(judgePerfect(makeInput(midA, midP), MECHANICS)).toBe(true);
    expect(judgePerfect(makeInput(w.angleMinDeg - 20, midP), MECHANICS)).toBe(false);
    expect(judgePerfect(makeInput(midA, Math.max(0, w.powerMin - 0.2)), MECHANICS)).toBe(false);
    expect(judgePerfect(makeInput(midA, Math.min(1, w.powerMax + 0.15)), MECHANICS)).toBe(false);
  });

  it('P(PERFECT) của window khóa trong MECHANICS ∈ [0.20, 0.45] trên sweep 1800 seed 1..1800', () => {
    const p = perfectRate(MECHANICS, MECHANICS.perfectWindow, PTS);
    // eslint-disable-next-line no-console
    console.log('[T2] P(PERFECT)=', p.toFixed(4), 'window=', JSON.stringify(MECHANICS.perfectWindow));
    expect(p).toBeGreaterThanOrEqual(0.2);
    expect(p).toBeLessThanOrEqual(0.45);
  }, 30_000);

  it('mutate config → P đổi → chứng tỏ judge đọc config (không hardcode)', () => {
    const pBase = perfectRate(MECHANICS, MECHANICS.perfectWindow, PTS);
    const mutated: MechanicsConfig = {
      ...MECHANICS,
      perfectWindow: {
        ...MECHANICS.perfectWindow,
        angleMinDeg: MECHANICS.perfectWindow.angleMinDeg - 30,
        angleMaxDeg: MECHANICS.perfectWindow.angleMaxDeg + 30,
      },
    };
    const pMut = perfectRate(mutated, mutated.perfectWindow, PTS);
    expect(pMut).not.toBe(pBase);
  }, 30_000);

  it('số trong MECHANICS.perfectWindow == output PerfectWindowFitter trên sweep 1800 (config = sweep, không tay)', () => {
    const fit = new PerfectWindowFitter().fit(PTS, { minBounces: MECHANICS.perfectMinBounces });
    // eslint-disable-next-line no-console
    console.log(
      '[T2] fit: window=', JSON.stringify(fit.window),
      'P=', fit.p.toFixed(4), 'areaFrac=', fit.areaFrac.toFixed(4),
      'qualifying=', fit.qualifyingCount, 'fallback=', fit.fallback,
    );
    expect(fit.window).toEqual(MECHANICS.perfectWindow);
  }, 60_000);

  it('mechanics.ts ghi comment "sweep 1800 seed 1..1800" (nguồn số khai minh bạch)', () => {
    const src = readFileSync(new URL('../../config/mechanics.ts', import.meta.url), 'utf8');
    expect(src).toContain('sweep 1800 seed 1..1800');
  });

  it('fitter deterministic: 2 lần fit cùng sweep → cùng window', () => {
    const a = new PerfectWindowFitter().fit(PTS, { minBounces: MECHANICS.perfectMinBounces });
    const b = new PerfectWindowFitter().fit(PTS, { minBounces: MECHANICS.perfectMinBounces });
    expect(a.window).toEqual(b.window);
    expect(a.p).toBe(b.p);
  }, 60_000);

  it('sweep đủ 1800 cú, mỗi cú có (seed, angleDeg, power, bounces) — seed 1..1800 nguyên vẹn', () => {
    expect(PTS).toHaveLength(1800);
    expect(PTS[0].seed).toBe(1);
    expect(PTS[1799].seed).toBe(1800);
    for (const pt of PTS.slice(0, 50)) {
      expect(pt.angleDeg).toBeGreaterThanOrEqual(-60);
      expect(pt.angleDeg).toBeLessThanOrEqual(60);
      expect(pt.power).toBeGreaterThanOrEqual(0);
      expect(pt.power).toBeLessThan(1);
      expect(pt.bounces).toBeGreaterThanOrEqual(0);
    }
    // FlickInput sinh từ seed đúng schema đường sim
    const f = flickFromSeed(1);
    expect(throwAngleDeg(f)).toBeGreaterThanOrEqual(-60);
    expect(throwAngleDeg(f)).toBeLessThanOrEqual(60);
  });
});
