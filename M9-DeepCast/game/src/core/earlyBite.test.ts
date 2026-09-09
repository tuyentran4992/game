// Stage C — early-reward gate: the FIRST fish of every run (the dive-1 greeter
// pinned to the descent corridor by spawnAll) must bite within 6s under a rookie
// policy: hold to descend ~2-3s, then park with a NIN rhythm. Pure core sim.
import { describe, it, expect } from 'vitest';
import { createGame, startDive } from './rules.ts';
import { applyDiveTick as tick } from './tick.ts';
import { SEA_TOP } from '../data/world.ts';

const DT = 1 / 60;

describe('Stage C early bite (first fish in 4-6s)', () => {
  it('dive 1: first attach <= 6s for all 40 seeds (descend ~2s, release, then NIN)', () => {
    const times: number[] = [];
    for (let seed = 1; seed <= 40; seed++) {
      const state = createGame(seed);
      startDive(state);
      let firstBite: number | null = null;
      // rookie policy mirroring the title demo: hold down to ~280m, one 0.5s
      // release, then keep the bait STILL (NIN) and wait for the bite
      let crossedAt = -1;
      for (let i = 0; i < 30 / DT && firstBite === null; i++) {
        const depthM = state.hookY - SEA_TOP;
        if (crossedAt < 0 && depthM >= 280) crossedAt = i;
        // hold down to 280m, one 0.5s release, then keep the bait STILL (NIN) forever
        const holding = crossedAt < 0 ? true : i >= crossedAt + 30;
        const before = state.events.length;
        tick(state, DT, { holding });
        if (state.events.slice(before).some((e) => e.type === 'attach')) {
          firstBite = state.diveTime;
        }
      }
      expect(firstBite).not.toBeNull();
      expect(firstBite!).toBeLessThanOrEqual(6);
      times.push(firstBite!);
    }
    const median = [...times].sort((a, b) => a - b)[20]!;
    expect(median).toBeGreaterThanOrEqual(1); // sanity: not an instant freebie at t=0
  });
});
