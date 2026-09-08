// BUG-1 repro: hold 2.5s roi tha toi khi surface — in moi transition hookMode.
// Sau fix: lan giu tay ke tiep tai surface phai la mot dive PAID qua startDive
// (fuel -150, air refill, diveCount++) -> van CHAM DUT bang lose OUT OF FUEL.
import { createGame, startDive } from '../src/core/rules.ts';
import { applyDiveTick } from '../src/core/tick.ts';
import { SURFACE_Y } from '../src/data/world.ts';

const s = createGame(1);
startDive(s);
let lastMode = s.hookMode;

const DT = 1 / 20;
let t = 0;
let dives = 1;
let surfaces = 0;
while (t < 400 && s.phase === 'dive') {
  // player policy: hold 2.5s first; afterwards keep holding — at the surface that
  // must start a PAID dive, underwater it descends until air runs low
  const holding = t < 2.5 || s.hookMode === 'idle' || s.air > 3;
  // applyDiveTick resets state.events each tick, so after the call it holds exactly
  // this tick's events — no index slicing (an offset from the previous array drops rows)
  applyDiveTick(s, DT, { holding });
  t += DT;
  for (const e of s.events) {
    if (e.type === 'dive-start') dives += 1;
    if (e.type === 'surface') surfaces += 1;
    if (e.type === 'lose') console.log(`LOSE tai t=${t.toFixed(1)}: ${e.text ?? ''}`);
  }
  if (s.hookMode !== lastMode) {
    console.log(`t=${t.toFixed(1)} ${lastMode} -> ${s.hookMode} @ y=${s.hookY.toFixed(0)} surf=${SURFACE_Y} air=${s.air.toFixed(1)} $=${Math.round(s.money)} hearts=${s.hearts} phase=${s.phase}`);
    lastMode = s.hookMode;
  }
}

console.log(`--- KET QUA: phase=${s.phase} reason=${s.loseReason ?? '-'} t=${t.toFixed(1)}s dives=${dives} surfaces=${surfaces} $=${Math.round(s.money)}`);
if (s.phase === 'dive') {
  console.log('t=400 VAN CON phase=dive — LIMBO (FAIL)');
  process.exitCode = 1;
}
