import { describe, it, expect } from 'vitest';
import { RunLifecycle, memoryStorage } from '../runLifecycle';
import type { KvStorage } from '../runLifecycle';

const run = (score: number, bounces: number) => ({ score, bounces, best: score });

describe('G2-5 run lifecycle — score/bounces/best qua RunLifecycle', () => {
  it('score/bounces cộng dồn qua các run; best = max run đơn (PERFECT ×2 đã nằm trong run.score từ engine)', () => {
    const lc = new RunLifecycle(memoryStorage());
    lc.applyRun(run(5, 5));
    expect(lc.score).toBe(5);
    expect(lc.best).toBe(5);
    lc.applyRun(run(3, 3));
    expect(lc.score).toBe(8);
    expect(lc.bounces).toBe(8);
    expect(lc.best).toBe(5);
    lc.applyRun(run(14, 7)); // PERFECT ×2: 7 nảy → 14 điểm
    expect(lc.score).toBe(22);
    expect(lc.bounces).toBe(15);
    expect(lc.best).toBe(14);
  });

  it('best bền qua storage inject: instance mới cùng storage → giữ best, score phiên mới reset', () => {
    const st = memoryStorage();
    const a = new RunLifecycle(st);
    a.applyRun(run(14, 7));
    const b = new RunLifecycle(st);
    expect(b.best).toBe(14);
    expect(b.score).toBe(0);
    expect(b.bounces).toBe(0);
  });

  it('stage demo: cộng score/bounces phiên nhưng KHÔNG ghi best/storage (demo không bẩn best người chơi)', () => {
    const st = memoryStorage();
    const demo = new RunLifecycle(st, { stage: 'demo' });
    demo.applyRun(run(99, 50));
    expect(demo.score).toBe(99);
    expect(demo.best).toBe(0);
    const fresh = new RunLifecycle(st);
    expect(fresh.best).toBe(0);
    // best thật sự vẫn ghi được sau đó trên cùng storage
    const local = new RunLifecycle(st);
    local.applyRun(run(6, 6));
    expect(new RunLifecycle(st).best).toBe(6);
  });

  it('best khởi tạo đọc từ storage key mặc định sk_best', () => {
    const st = memoryStorage();
    st.setItem('sk_best', '7');
    expect(new RunLifecycle(st).best).toBe(7);
  });

  it('storage tùy chỉnh key qua opts.key', () => {
    const st = memoryStorage();
    const lc = new RunLifecycle(st, { key: 'sk_best_demo' });
    lc.applyRun(run(9, 9));
    expect(st.getItem('sk_best_demo')).toBe('9');
    expect(st.getItem('sk_best')).toBeNull();
  });

  it('memoryStorage hoạt động như KvStorage đầy đủ (fallback khi không có localStorage)', () => {
    const st: KvStorage = memoryStorage();
    expect(st.getItem('x')).toBeNull();
    st.setItem('x', '1');
    expect(st.getItem('x')).toBe('1');
    st.setItem('x', '2');
    expect(st.getItem('x')).toBe('2');
  });
});
