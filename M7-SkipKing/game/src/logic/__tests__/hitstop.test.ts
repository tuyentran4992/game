// FUN2-C1 TDD-A — hitstopMsFor(impact): hitstop tầng A (card C2 scene diễn — card này chỉ xuất hàm).
// KHÔNG thêm field vào EngineEvent (anchor tests khóa event shape) — scene C2 sẽ import hàm này.
// Hitstop = freeze vài chục ms lúc nảy mạnh — juice phổ biến, số [PLACEHOLDER] tới boss playtest.
import { describe, it, expect } from 'vitest';
import { hitstopMsFor } from '../mechanics';

describe('hitstopMsFor(impact) — hitstop tầng A (diễn ở card C2)', () => {
  it('impact dưới ngưỡng ~0.6 → 0ms (nảy thường không hitstop)', () => {
    expect(hitstopMsFor(0)).toBe(0);
    expect(hitstopMsFor(0.3)).toBe(0);
    expect(hitstopMsFor(0.59)).toBe(0);
  });

  it('impact ≥ ngưỡng → hitstop trong [33,66]ms, mạnh hơn = dài hơn', () => {
    const at = hitstopMsFor(0.6);
    const mid = hitstopMsFor(0.8);
    const hard = hitstopMsFor(1);
    expect(at).toBeGreaterThanOrEqual(33);
    expect(hard).toBeLessThanOrEqual(66);
    expect(mid).toBeGreaterThanOrEqual(at);
    expect(hard).toBeGreaterThanOrEqual(mid);
    expect(hard).toBeGreaterThan(at);
  });

  it('kẹp biên: impact âm/quá lớn không phá dải [0,66]ms', () => {
    expect(hitstopMsFor(-1)).toBe(0);
    expect(hitstopMsFor(2)).toBeLessThanOrEqual(66);
  });
});
