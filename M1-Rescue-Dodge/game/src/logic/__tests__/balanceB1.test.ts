// [UPG2-B1] Re-sim khóa curve sau tuning CEO chốt #78-Y2 (mắt xích cuối PRE, sau P1b debut beat)
// Gate: BLOCK(1) 30→60s sống ≥50% (gate cũ giữ, không nới) · BLOCK(2) 30→90s sống ≥40% @N=100.
// WARN: P50(deathT) + p50_death_t ghi JSON báo cáo (không assert — CEO #78: số là BÁO CÁO).
// Sim giữ nguyên 2 cửa item sau debut beat (CURVE-FROZEN UX#73) — chỉ tuning 2 cửa TRƯỚC debut.

import { describe, expect, it } from 'vitest';
import { MECHANICS } from '../../config/mechanics';
import { GameEngine } from '../GameEngine';
import { runNewbieGame, simulateWindow, NEWBIE_POLICY } from './newbieBotSim';

const N = 100; // pass-criteria B1: @N=100 seed (probe KT: 0.38s/vòng)

describe('UPG2-B1 — curve tuning khung #78-Y2 (newbie bot 300ms, BR-17)', () => {
  it('khóa config tuning B1: ramp 0.85 + cap mật độ + nhịp swarm (thay khóa 1.2 cũ)', () => {
    // B1 khóa lại 3 số tuning gốc — theo điều khoản card: test cũ khóa giá trị cũ → test MỚI khóa giá trị mới.
    // Cờ diff-test (BLOCK 3): [1.2→0.85, 4→2, 22→44] = đúng 3 thay đổi, không có "nới assert" nào.
    expect(MECHANICS.earlyRampPerSec).toBe(0.85);
    expect(MECHANICS.spawnRateMax).toBe(2);
    expect(MECHANICS.swarmIntervalSec).toBe(44);
    // khung D-A2 giữ nguyên: warmup + tốc độ muộn + softcap + ramp muộn không đụng
    expect(MECHANICS.earlyRampUntilSec).toBe(90);
    expect(MECHANICS.warmupSeconds).toBe(30);
    expect(MECHANICS.speedIncreasePerSec).toBe(5.0);
    expect(MECHANICS.maxSpeed).toBe(440);
  });

  it('khóa curve-chung (giá trị dẫn xuất, không phải số gốc — không đụng test cũ GameEngine D-A2)', () => {
    // speed tại 90s = startSpeed + earlyRampPerSec * (90-30) = 160 + 0.85*60 = 211 —
    // công thức D-A2 giữ nguyên, chỉ hệ số đầu vào đổi theo config B1
    const e = new GameEngine(MECHANICS, { rng: () => 0.5 });
    e.startNewGame();
    expect(e.difficulty(90).speed).toBe(160 + 0.85 * 60);
    expect(e.difficulty(90.001).speed).toBeCloseTo(e.difficulty(90).speed, 1); // liên tục tại mốc
  });

  it(`BLOCK(2): 30→90s sống ≥40% @N=${N} seed`, () => {
    const w = simulateWindow(N, 30, 90);
    console.log('[B1-REPORT]', JSON.stringify({
      gate: 'B1-30to90', survived: w.survived, total: w.total, ratio: +w.ratio.toFixed(3),
    }));
    expect(w.ratio).toBeGreaterThanOrEqual(0.40);
  });

  it(`BLOCK(1) gate cũ giữ nguyên: 30→60s sống ≥50% @N=${N}`, () => {
    const w = simulateWindow(N, 30, 60);
    console.log('[B1-REPORT]', JSON.stringify({
      gate: 'old-30to60', survived: w.survived, total: w.total, ratio: +w.ratio.toFixed(3),
    }));
    expect(w.ratio).toBeGreaterThanOrEqual(0.50);
  });

  it('deterministic: cùng seed → cùng kết quả (rng injectable, 0 Math.random thô)', () => {
    expect(runNewbieGame(7, 90)).toEqual(runNewbieGame(7, 90));
    expect(runNewbieGame(123, 90, NEWBIE_POLICY)).toEqual(runNewbieGame(123, 90, NEWBIE_POLICY));
  });

  it('WARN báo cáo: P50(deathT) + histogram chết trong 90s (JSON, không assert)', () => {
    const deaths: number[] = [];
    for (let s = 1; s <= N; s++) {
      const r = runNewbieGame(s, 90);
      if (r.deathT !== null && r.deathT < 90 - 1e-9) deaths.push(r.deathT);
    }
    deaths.sort((a, b) => a - b);
    const p50 = deaths.length ? +deaths[Math.floor(deaths.length / 2)].toFixed(1) : null;
    const hist = deaths.reduce((acc: Record<string, number>, t) => {
      const b = Math.floor(t / 10) * 10;
      acc[`${b}-${b + 10}`] = (acc[`${b}-${b + 10}`] || 0) + 1;
      return acc;
    }, {});
    console.log('[B1-REPORT]', JSON.stringify({ p50_death_t: p50, deaths_in_90: deaths.length, hist }));
  });
});
