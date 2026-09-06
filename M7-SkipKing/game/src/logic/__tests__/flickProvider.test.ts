import { describe, it, expect } from 'vitest';
import { MECHANICS } from '../../config/mechanics';
import { HumanFlickProvider, ScriptedFlickProvider } from '../flickProvider';
import { simulateFlickDetailed } from '../physicsEngine';

describe('ScriptedFlickProvider — beats B1/B2/B3 chọn từ sim (CÙNG FlickInput schema, CONTRACT §3)', () => {
  it('B1: plop đầu ≤3s — firstBounceTime ≤ 3.0 và có ≥1 nảy', () => {
    const p = new ScriptedFlickProvider(MECHANICS);
    const d = p.detailForBeat('B1');
    expect(d.firstBounceTime).not.toBeNull();
    expect(d.firstBounceTime!).toBeLessThanOrEqual(3.0);
    expect(d.bounces).toBeGreaterThanOrEqual(1);
  });

  it('B2: 2 nảy chìm — bounces == 2 và terminal splash (hụt bình thường, KHÔNG Game Over là việc scene)', () => {
    const p = new ScriptedFlickProvider(MECHANICS);
    const d = p.detailForBeat('B2');
    expect(d.bounces).toBe(2);
    expect(d.terminal).toBe('splash');
  });

  it('B3: PERFECT ~7 nảy — judgedPerfect và bounces ≥ perfectMinBounces', () => {
    const p = new ScriptedFlickProvider(MECHANICS);
    const d = p.detailForBeat('B3');
    expect(d.judgedPerfect).toBe(true);
    expect(d.bounces).toBeGreaterThanOrEqual(MECHANICS.perfectMinBounces);
  });

  it('detailForBeat khớp simulateFlickDetailed cùng seed (provider không biến đổi input)', () => {
    const p = new ScriptedFlickProvider(MECHANICS);
    for (const beat of ['B1', 'B2', 'B3'] as const) {
      const d = p.detailForBeat(beat);
      const again = simulateFlickDetailed(MECHANICS, p.flickForBeat(beat), p.seedForBeat(beat));
      expect(JSON.stringify(again)).toBe(JSON.stringify(d));
    }
  });

  it('nextFlick() lần lượt B1→B2→B3 rồi lặp B3 (demo loop)', () => {
    const p = new ScriptedFlickProvider(MECHANICS);
    const b1 = p.flickForBeat('B1');
    expect(p.nextFlick()).toEqual(b1);
    expect(p.nextFlick()).toEqual(p.flickForBeat('B2'));
    expect(p.nextFlick()).toEqual(p.flickForBeat('B3'));
    expect(p.nextFlick()).toEqual(p.flickForBeat('B3'));
  });

  it('deterministic: 2 provider cùng config → cùng flick + cùng seed từng beat', () => {
    const a = new ScriptedFlickProvider(MECHANICS);
    const b = new ScriptedFlickProvider(MECHANICS);
    for (const beat of ['B1', 'B2', 'B3'] as const) {
      expect(a.flickForBeat(beat)).toEqual(b.flickForBeat(beat));
      expect(a.seedForBeat(beat)).toBe(b.seedForBeat(beat));
    }
  });

  it('seed tìm được nằm trong trần 1800 (sweep space CONTRACT)', () => {
    const p = new ScriptedFlickProvider(MECHANICS);
    for (const beat of ['B1', 'B2', 'B3'] as const) {
      const s = p.seedForBeat(beat);
      expect(s).toBeGreaterThanOrEqual(1);
      expect(s).toBeLessThanOrEqual(1800);
    }
  });
});

describe('HumanFlickProvider — input người chơi qua cùng đường sim', () => {
  it('xuả input theo hàng đợi FIFO', () => {
    const p = new HumanFlickProvider([
      { dirX: 0, dirZ: -1, power: 0.7 },
      { dirX: 0.2, dirZ: -0.9, power: 0.5 },
    ]);
    expect(p.nextFlick()).toEqual({ dirX: 0, dirZ: -1, power: 0.7 });
    expect(p.nextFlick()).toEqual({ dirX: 0.2, dirZ: -0.9, power: 0.5 });
  });

  it('hết queue → lỗi rõ ràng (đường chết khai minh bạch, không trả input rác)', () => {
    const p = new HumanFlickProvider([{ dirX: 0, dirZ: -1, power: 0.7 }]);
    p.nextFlick();
    expect(() => p.nextFlick()).toThrow(/hết input/);
    expect(p.hasNext()).toBe(false);
  });
});
