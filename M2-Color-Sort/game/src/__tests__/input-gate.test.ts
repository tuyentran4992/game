// Unit test PRE-ROLL INPUT GATE (AUDIT-COMMERCIAL §B2 — pre-roll):
// không tap nào được nhận trước khi game sẵn sàng, và trong lúc platform pause
// (pre-roll / interstitial / tab ẩn).
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { inputGate } from '../input-gate';

beforeEach(() => {
  inputGate.resetForTest();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('inputGate', () => {
  it('mặc định ĐÓNG (chưa ready) → tap trên màn loading/pre-roll bị bỏ', () => {
    expect(inputGate.enabled).toBe(false);
    expect(inputGate.isReady).toBe(false);
  });

  it('markReady() mở cổng; idempotent', () => {
    inputGate.markReady();
    inputGate.markReady();
    expect(inputGate.enabled).toBe(true);
  });

  it('pause (pre-roll/ad) đóng cổng, resume mở lại', () => {
    inputGate.markReady();
    inputGate.setPaused(true);
    expect(inputGate.enabled).toBe(false);
    inputGate.setPaused(false);
    expect(inputGate.enabled).toBe(true);
  });

  it('pause TRƯỚC khi ready → vẫn đóng sau markReady, chỉ mở khi resume', () => {
    inputGate.setPaused(true);
    inputGate.markReady();
    expect(inputGate.enabled).toBe(false);
    inputGate.setPaused(false);
    expect(inputGate.enabled).toBe(true);
  });

  it('onChange nhận trạng thái hiện tại ngay + mọi lần đổi', () => {
    const seen: boolean[] = [];
    inputGate.onChange((e) => seen.push(e));
    inputGate.markReady();
    inputGate.setPaused(true);
    inputGate.setPaused(true);   // không đổi → không phát lại
    inputGate.setPaused(false);
    expect(seen).toEqual([false, true, false, true]);
  });

  it('listener ném lỗi KHÔNG làm sập cổng', () => {
    const seen: boolean[] = [];
    inputGate.onChange(() => { throw new Error('boom'); });
    inputGate.onChange((e) => seen.push(e));
    expect(() => inputGate.markReady()).not.toThrow();
    expect(seen).toEqual([false, true]);
  });
});
