// Stage C metric: first-bite time on dive 1 across 40 seeds (rookie policy as tested)
import { createGame, startDive } from '../src/core/rules.ts';
import { applyDiveTick as tick } from '../src/core/tick.ts';
import { SEA_TOP } from '../src/data/world.ts';

const DT = 1 / 60;
const times: number[] = [];
for (let seed = 1; seed <= 40; seed++) {
  const state = createGame(seed);
  startDive(state);
  let firstBite = -1;
  let crossedAt = -1;
  for (let i = 0; i < 30 / DT && firstBite < 0; i++) {
    const depthM = state.hookY - SEA_TOP;
    if (crossedAt < 0 && depthM >= 280) crossedAt = i;
    const holding = crossedAt < 0 ? true : i >= crossedAt + 30;
    const before = state.events.length;
    tick(state, DT, { holding });
    if (state.events.slice(before).some((e) => e.type === 'attach')) firstBite = state.diveTime;
  }
  times.push(firstBite < 0 ? 99 : firstBite);
}
times.sort((a, b) => a - b);
const q = (p: number): number => times[Math.floor(times.length * p)]!;
console.log(`first-bite: min ${times[0]!.toFixed(2)}s / median ${q(0.5).toFixed(2)}s / p90 ${q(0.9).toFixed(2)}s / max ${times[39]!.toFixed(2)}s`);
