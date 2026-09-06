// T4 TDD-B — audioMapper (tầng A pure — CONTRACT mục 1+5): events → params plop 3 lớp.
// lực(impact)→trầm/cao · tiến độ(bounces)→pitch +1 semitone wrap quãng 8 · trúng/hụt khác âm.
import { describe, it, expect } from 'vitest';
import { plopParams, baseFreqHz, semitoneForBounces } from '../../logic/audioMapper';

describe('audioMapper — events → params plop 3 lớp (0 magic number ở tầng B)', () => {
  it('lực→trầm/cao: impact 0 trầm hơn impact 1, cả hai trong dải plop thật [70,190]Hz', () => {
    expect(baseFreqHz(0)).toBeLessThan(baseFreqHz(1));
    expect(baseFreqHz(0)).toBeGreaterThanOrEqual(70);
    expect(baseFreqHz(1)).toBeLessThanOrEqual(190);
  });

  it('tiến độ→pitch +1 semitone/bounce, wrap quãng 8 (mod 12)', () => {
    expect(semitoneForBounces(0)).toBe(0);
    expect(semitoneForBounces(5)).toBe(5);
    expect(semitoneForBounces(11)).toBe(11);
    expect(semitoneForBounces(12)).toBe(0);
    expect(semitoneForBounces(14)).toBe(2);
  });

  it('ĐỦ 3 lớp, duration mỗi lớp trong 80–120ms', () => {
    const p = plopParams({ bounces: 3, impact: 0.7, hit: true });
    expect(p.layers).toHaveLength(3);
    for (const l of p.layers) {
      expect(l.durationS).toBeGreaterThanOrEqual(0.08);
      expect(l.durationS).toBeLessThanOrEqual(0.12);
    }
  });

  it('trúng/hụt khác âm — công thức layer khác (type + tần số)', () => {
    const hit = plopParams({ bounces: 2, impact: 0.8, hit: true });
    const miss = plopParams({ bounces: 2, impact: 0.8, hit: false });
    expect(hit.layers.map((l) => l.type)).not.toEqual(miss.layers.map((l) => l.type));
    expect(hit.layers.map((l) => l.freqHz)).not.toEqual(miss.layers.map((l) => l.freqHz));
  });

  it('PERFECT sáng hơn: perfect=true nâng tần số lớp đầu (cùng bounces/impact)', () => {
    const normal = plopParams({ bounces: 4, impact: 0.8, hit: true, perfect: false });
    const perf = plopParams({ bounces: 4, impact: 0.8, hit: true, perfect: true });
    expect(perf.layers[0].freqHz).toBeGreaterThan(normal.layers[0].freqHz);
  });

  it('impact → gain lớn hơn (master envelope ∝ lực chạm)', () => {
    const soft = plopParams({ bounces: 1, impact: 0.2, hit: true });
    const hard = plopParams({ bounces: 1, impact: 0.9, hit: true });
    expect(hard.masterGain).toBeGreaterThan(soft.masterGain);
  });

  it('wrap quãng 8: bounces 13 và 1 cùng semitone → cùng tần số', () => {
    const f = (b: number) => baseFreqHz(0.8) * Math.pow(2, semitoneForBounces(b) / 12);
    expect(f(13)).toBeCloseTo(f(1), 9);
  });
});
