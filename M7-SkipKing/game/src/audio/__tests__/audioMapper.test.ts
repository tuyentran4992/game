// FUN2-C1 TDD-A RED-FIRST — audioMapper (tầng A pure): events → params plop 3 lớp tonal + slap.
// Bản tổng hợp quyết định (comment 267 card t_af145f89): slap transient 1.5–4kHz = lớp CHỦ ĐẠO —
// skip-stone thật nghe "thíp" + xì nước, KHÔNG phải trầm. Dải fundamental 180–320Hz (cũ 70–190
// không nghe được trên loa mobile), envelope tổng 150–250ms, masterGain 0.5–0.9.
// GIỮ pitch ladder +1 semitone/bounce wrap quãng 8 + perfect +3 (đã duyệt T4).
// Mọi số [PLACEHOLDER] tới khi boss playtest.
import { describe, it, expect } from 'vitest';
import {
  plopParams,
  baseFreqHz,
  semitoneForBounces,
  slapFreqHz,
  whooshParams,
} from '../../logic/audioMapper';

describe('audioMapper — fundamental 180–320Hz (đo được trên loa mobile/laptop)', () => {
  it('lực→trầm/cao: impact 0 trầm hơn impact 1, cả hai trong dải [180,320]Hz', () => {
    expect(baseFreqHz(0)).toBeGreaterThanOrEqual(180);
    expect(baseFreqHz(0)).toBeLessThan(baseFreqHz(1));
    expect(baseFreqHz(1)).toBeLessThanOrEqual(320);
  });

  it('tiến độ→pitch +1 semitone/bounce, wrap quãng 8 (mod 12) — GIỮ nguyên T4', () => {
    expect(semitoneForBounces(0)).toBe(0);
    expect(semitoneForBounces(5)).toBe(5);
    expect(semitoneForBounces(11)).toBe(11);
    expect(semitoneForBounces(12)).toBe(0);
    expect(semitoneForBounces(14)).toBe(2);
  });

  it('wrap quãng 8: bounces 13 và 1 cùng semitone → cùng tần số — GIỮ nguyên T4', () => {
    const f = (b: number) => baseFreqHz(0.8) * Math.pow(2, semitoneForBounces(b) / 12);
    expect(f(13)).toBeCloseTo(f(1), 9);
  });

  it('PERFECT sáng hơn: perfect=true nâng tần số lớp đầu (+3 semitone — GIỮ T4)', () => {
    const normal = plopParams({ bounces: 4, impact: 0.8, hit: true, perfect: false });
    const perf = plopParams({ bounces: 4, impact: 0.8, hit: true, perfect: true });
    expect(perf.layers[0].freqHz).toBeGreaterThan(normal.layers[0].freqHz);
  });
});

describe('audioMapper — slap layer CHỦ ĐẠO 1.5–4kHz (bản tổng hợp quyết định)', () => {
  it('PlopParams.slap: freqHz trong [1500,4000]Hz — dải loa mobile tái tạo được', () => {
    for (const impact of [0, 0.2, 0.5, 0.85, 1]) {
      const hit = plopParams({ bounces: 1, impact, hit: true });
      expect(hit.slap.freqHz).toBeGreaterThanOrEqual(1500);
      expect(hit.slap.freqHz).toBeLessThanOrEqual(4000);
      const miss = plopParams({ bounces: 1, impact, hit: false });
      expect(miss.slap.freqHz).toBeGreaterThanOrEqual(1500);
      expect(miss.slap.freqHz).toBeLessThanOrEqual(4000);
    }
  });

  it('slap level CAO NHẤT trong các lớp (trên mọi lớp tonal) — trúng lẫn hụt', () => {
    for (const hit of [true, false]) {
      const p = plopParams({ bounces: 2, impact: 0.7, hit });
      const maxTonal = Math.max(...p.layers.map((l) => l.level));
      expect(p.slap.level).toBeGreaterThan(maxTonal);
    }
  });

  it('slap = transient ngắn (≤80ms) — tiếng "thíp", không phải đuôi dài', () => {
    const p = plopParams({ bounces: 1, impact: 0.6, hit: true });
    expect(p.slap.durationS).toBeGreaterThan(0);
    expect(p.slap.durationS).toBeLessThanOrEqual(0.08);
  });

  it('trúng/hụt slap KHÁC nhau (hụt đục hơn) + impact mạnh → slap cao hơn', () => {
    const hitSoft = slapFreqHz(0.2, true);
    const hitHard = slapFreqHz(0.9, true);
    const missHard = slapFreqHz(0.9, false);
    expect(hitHard).toBeGreaterThan(hitSoft);
    expect(missHard).not.toBe(hitHard);
  });
});

describe('audioMapper — envelope tổng 150–250ms + masterGain 0.5–0.9', () => {
  it('totalDurationS trong [150,250]ms', () => {
    for (const impact of [0, 0.4, 0.7, 1]) {
      const p = plopParams({ bounces: 1, impact, hit: true });
      expect(p.totalDurationS).toBeGreaterThanOrEqual(0.15);
      expect(p.totalDurationS).toBeLessThanOrEqual(0.25);
    }
  });

  it('cú mạnh đuôi dài hơn cú nhẹ (envelope ∝ impact)', () => {
    const soft = plopParams({ bounces: 1, impact: 0.2, hit: true });
    const hard = plopParams({ bounces: 1, impact: 0.9, hit: true });
    expect(hard.totalDurationS).toBeGreaterThanOrEqual(soft.totalDurationS);
  });

  it('masterGain trong [0.5,0.9] và ∝ lực chạm', () => {
    const soft = plopParams({ bounces: 1, impact: 0.2, hit: true });
    const hard = plopParams({ bounces: 1, impact: 0.9, hit: true });
    expect(soft.masterGain).toBeGreaterThanOrEqual(0.5);
    expect(hard.masterGain).toBeLessThanOrEqual(0.9);
    expect(hard.masterGain).toBeGreaterThan(soft.masterGain);
  });

  it('vẫn ĐỦ 3 lớp tonal, duration mỗi lớp trong [80,160]ms, trúng/hụt khác âm', () => {
    const hit = plopParams({ bounces: 2, impact: 0.8, hit: true });
    const miss = plopParams({ bounces: 2, impact: 0.8, hit: false });
    expect(hit.layers).toHaveLength(3);
    for (const l of hit.layers) {
      expect(l.durationS).toBeGreaterThanOrEqual(0.08);
      expect(l.durationS).toBeLessThanOrEqual(0.16);
    }
    expect(hit.layers.map((l) => l.type)).not.toEqual(miss.layers.map((l) => l.type));
    expect(hit.layers.map((l) => l.freqHz)).not.toEqual(miss.layers.map((l) => l.freqHz));
  });
});

describe('audioMapper — whooshParams(power): sweep ném đá (tầng A map — tầng B chỉ phát)', () => {
  it('dải band trong vùng nghe được [500,4500]Hz, sweep đi lên, dài 100–250ms', () => {
    for (const power of [0, 0.4, 0.8, 1]) {
      const w = whooshParams(power);
      expect(w.bandStartHz).toBeGreaterThanOrEqual(500);
      expect(w.bandEndHz).toBeLessThanOrEqual(4500);
      expect(w.bandEndHz).toBeGreaterThan(w.bandStartHz);
      expect(w.durationS).toBeGreaterThanOrEqual(0.1);
      expect(w.durationS).toBeLessThanOrEqual(0.25);
    }
  });

  it('cú mạnh whoosh to hơn cú nhẹ (level ∝ power, luôn > 0)', () => {
    const soft = whooshParams(0.1);
    const hard = whooshParams(0.9);
    expect(hard.level).toBeGreaterThan(soft.level);
    expect(soft.level).toBeGreaterThan(0);
    expect(hard.level).toBeLessThanOrEqual(0.9);
  });
});
