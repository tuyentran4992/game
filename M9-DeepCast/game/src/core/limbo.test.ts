// BUG-1 limbo regression (TEST-CASES §A addendum). Pure sim, no Phaser.
// Old behavior: after the first surface the hook descended for FREE (no FUEL_COST,
// no air refill, diveCount frozen) and a session could never reach win|lose.
// New contract: every descent goes through startDive — the single source of truth.
import { describe, it, expect } from 'vitest';
import { createGame, startDive } from './rules.ts';
import { applyDiveTick } from './tick.ts';

const DT = 1 / 60;
const MAX_S = 400; // supervisor gate: every session must end (win|lose) under 400s sim-time

describe('BUG-1 limbo regression', () => {
  it('hold 2.5s -> release -> surface; later holds start PAID dives until OUT OF FUEL < 400s', () => {
    const state = createGame(1);
    startDive(state); // dive 1 (fuel paid by the UI, as GameScene.beginDive does)
    let t = 0;
    let diveStarts = 1; // dive 1 already counted
    let surfaces = 0;
    let chestCount = 0;
    let firstSurfaceAt: number | null = null;
    let pendingSurfaceDeadline: number | null = null; // anti-limbo: surface must lead to a paid dive
    let lostAt = Number.POSITIVE_INFINITY;

    while (t < MAX_S && state.phase === 'dive') {
      // minimal player policy:
      //  - scripted first gesture: hold 2.5s, then release (repro sequence)
      //  - at the surface (idle): keep holding -> must trigger a PAID re-dive
      //  - underwater: hold until air nearly gone, then lift to reel home
      const holding = t < 2.5
        || state.hookMode === 'idle'
        || state.air > 3;
      // applyDiveTick resets state.events each tick — after the call it holds exactly
      // this tick's events (slicing with a stale offset would silently drop rows)
      applyDiveTick(state, DT, { holding });
      t += DT;
      for (const e of state.events) {
        if (e.type === 'dive-start') {
          diveStarts += 1;
          pendingSurfaceDeadline = null;
        }
        if (e.type === 'surface') {
          surfaces += 1;
          if (firstSurfaceAt === null) firstSurfaceAt = t;
          // the hook came home — the next hold must begin a paid dive within 1s
          pendingSurfaceDeadline = t + 1.0;
        }
        if (e.type === 'pickup' && e.text === 'chest150') chestCount += 1;
        if (e.type === 'lose') lostAt = t;
      }
      if (pendingSurfaceDeadline !== null && t > pendingSurfaceDeadline && state.phase === 'dive') {
        throw new Error(`limbo: no paid dive within 1s of surfacing (t=${t.toFixed(1)})`);
      }
    }

    // the repro sequence really came home first (old repro hit the surface at ~7.2s)
    expect(firstSurfaceAt).not.toBeNull();
    expect(firstSurfaceAt!).toBeGreaterThan(5);
    // session ENDED — no idle limbo at the surface, no free-dive air loop
    expect(state.phase).toBe('lose');
    expect(state.loseReason).toBe('OUT OF FUEL');
    expect(lostAt).toBeLessThan(MAX_S);
    // every descent was paid through startDive: one dive per surface + the opening dive
    expect(state.diveCount).toBe(diveStarts);
    expect(diveStarts).toBe(surfaces);
    // exact fuel bookkeeping: 600 start + chests - 150 per dive
    expect(state.money).toBe(600 + 150 * chestCount - 150 * state.diveCount);
    expect(state.money).toBeLessThan(150);
  });
});
