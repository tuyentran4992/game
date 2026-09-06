import { describe, it, expect } from 'vitest';
import { MECHANICS } from '../../config/mechanics';
import { assistFlick } from '../firstThrowAssist';
import { flickFromSeed } from '../perfectWindow';
import { simulateFlickDetailed } from '../physicsEngine';
import { ScriptedFlickProvider } from '../flickProvider';
import { throwAngleDeg } from '../mechanics';
import type { FlickInput } from '../types';

const rad = (deg: number) => (deg * Math.PI) / 180;
/** Đưa (góc deg, power) về FlickInput cùng schema đường sim (dirZ âm = kéo ngược). */
const makeInput = (angleDeg: number, power: number): FlickInput => ({
  dirX: Math.sin(rad(angleDeg)),
  dirZ: -Math.cos(rad(angleDeg)),
  power,
});

/** Scan độc lập trong test: seed đầu tiên thoả beat, trả nguyên FlickInput (chứng minh provider không đụng assist). */
const scanBeat = (beat: 'B1' | 'B2' | 'B3'): FlickInput => {
  for (let seed = 1; seed <= 1800; seed++) {
    const flick = flickFromSeed(seed);
    const d = simulateFlickDetailed(MECHANICS, flick, seed);
    const ok =
      beat === 'B1'
        ? d.firstBounceTime !== null && d.firstBounceTime <= 3.0 && d.bounces >= 1
        : beat === 'B2'
          ? d.bounces === 2 && d.terminal === 'splash'
          : d.judgedPerfect && d.bounces >= MECHANICS.perfectMinBounces;
    if (ok) return flick;
  }
  throw new Error(`scanBeat(${beat}): không tìm thấy seed nào ≤ 1800`);
};

describe('G2-2 Đ2 assist — 0/100 chìm cú đầu (pull-back CONTRACT §2)', () => {
  it('CỨNG: 100 seed MỚI (1..100), flick đầu có assist → 0/100 run 0-bounce (không chìm cú đầu)', () => {
    let duds = 0;
    const dudSeeds: number[] = [];
    for (let seed = 1; seed <= 100; seed++) {
      const assisted = assistFlick(flickFromSeed(seed), MECHANICS);
      const d = simulateFlickDetailed(MECHANICS, assisted, seed);
      if (d.bounces === 0) {
        duds++;
        dudSeeds.push(seed);
      }
    }
    expect({ duds, dudSeeds }).toEqual({ duds: 0, dudSeeds: [] });
  }, 30_000);

  it('assist không vượt trần CONTRACT §2: powerFloor ≤ 0.65, angleBandDeg ≤ 10, floor > 0', () => {
    expect(MECHANICS.firstThrowAssist.powerFloor).toBeGreaterThan(0);
    expect(MECHANICS.firstThrowAssist.powerFloor).toBeLessThanOrEqual(0.65);
    expect(MECHANICS.firstThrowAssist.angleBandDeg).toBeGreaterThan(0);
    expect(MECHANICS.firstThrowAssist.angleBandDeg).toBeLessThanOrEqual(10);
  });

  it('assistFlick: nâng power lên floor + clamp góc vào band quanh tâm window', () => {
    const w = MECHANICS.perfectWindow;
    const center = (w.angleMinDeg + w.angleMaxDeg) / 2;
    const out = assistFlick(makeInput(center + 40, 0.1), MECHANICS);
    expect(out.power).toBe(MECHANICS.firstThrowAssist.powerFloor);
    expect(throwAngleDeg(out)).toBeCloseTo(center + MECHANICS.firstThrowAssist.angleBandDeg, 6);
  });

  it('assistFlick không đụng cú đã trong vùng assist (idempotent với input tốt)', () => {
    const w = MECHANICS.perfectWindow;
    const center = (w.angleMinDeg + w.angleMaxDeg) / 2;
    const good = makeInput(center, MECHANICS.firstThrowAssist.powerFloor);
    expect(assistFlick(good, MECHANICS)).toEqual(good);
  });

  it('assist KHÔNG đụng cú demo script: ScriptedFlickProvider trả flick nguyên bản từ seed scan', () => {
    const provider = new ScriptedFlickProvider(MECHANICS);
    expect(provider.flickForBeat('B2')).toEqual(scanBeat('B2'));
    expect(provider.flickForBeat('B1')).toEqual(scanBeat('B1'));
    expect(provider.flickForBeat('B3')).toEqual(scanBeat('B3'));
  }, 60_000);
});
