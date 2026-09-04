// [BALANCE-M1] Cân bằng cửa 30→60s cho policy người mới (QA-REPORT t_662df9e4/FIX-ROUND-1-PROGRESS1.md)
// Tiêu chí card: tỉ lệ SỐNG của bot newbie (reaction 300ms, đổi lane khi ong vào lane mình,
// scan 15Hz) trong cửa t=30→60s ≥50% với difficulty BR-17. Nếu <50% → chỉnh ramp
// (giữ khung CEO duyệt D-A2: warmup/ramp/step — chỉ đổi hệ số).

import { describe, expect, it } from 'vitest';
import { MECHANICS } from '../../config/mechanics';
import { runNewbieGame, simulateWindow, NEWBIE_POLICY } from './newbieBotSim';

const N = 40; // 40 ván/seed — đủ phân giải 5% (cổng card) và tái lập deterministic

describe('BALANCE-M1 — newbie bot survival (BR-17 curve)', () => {
  it('bot tái lập: cùng seed → cùng kết quả (rng injectable, 0 Math.random thô)', () => {
    const a = runNewbieGame(7, 45);
    const b = runNewbieGame(7, 45);
    expect(a).toEqual(b);
  });

  it('smoke: bot đứng yên chắc chắn chết trong warmup-ramp (detector hoạt động)', () => {
    const idle = { ...NEWBIE_POLICY, reactionMs: 1e9 }; // không bao giờ kịp phản xạ
    const r = runNewbieGame(3, 60, idle);
    expect(r.deathT).not.toBeNull();
  });

  it(`ONBOARD-1 giữ nguyên: 10/10 ván sống hết warmup 30s`, () => {
    const w = simulateWindow(10, 0, 30);
    // simulateWindow(0..30): survived = sống tới 30
    const diedBefore30 = w.deaths.filter(d => d.t < 30);
    expect(diedBefore30.length).toBe(0);
  });

  it(`CỔNG CARD: newbie bot sống cửa 30→60s ≥50% (${N} ván)`, () => {
    const w = simulateWindow(N, 30, 60);
    console.log(`[BALANCE] survive 30→60s: ${w.survived}/${w.total} = ${(w.ratio * 100).toFixed(0)}%`,
      'deaths:', w.deaths.slice(0, 12).map(d => `s${d.seed}@${d.t.toFixed(1)}s`).join(' '));
    expect(w.ratio).toBeGreaterThanOrEqual(0.5);
  });

  it(`PROGRESS-1 hỗ trợ: bot phải sống nổi tới 90s ≥20% (cửa 3 phút cần ramp mượt hơn)`, () => {
    const w = simulateWindow(N, 30, 90);
    console.log(`[BALANCE] survive 30→90s: ${w.survived}/${w.total} = ${(w.ratio * 100).toFixed(0)}%`);
    expect(w.ratio).toBeGreaterThanOrEqual(0.2);
  });
});
