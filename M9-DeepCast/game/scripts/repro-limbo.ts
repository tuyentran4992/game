// Tái hiện limbo: hold 2.5s roi tha toi khi idle — in moi transition hookMode
import { createGame, startDive } from '../src/core/rules.ts';
import { applyDiveTick } from '../src/core/tick.ts';
import { SURFACE_Y } from '../src/data/world.ts';

const s = createGame(1);
startDive(s);
let lastMode = s.hookMode;

const DT = 1 / 20;
let t = 0;
for (let i = 0; i < 20 * 400; i++) {
  const holding = t < 2.5;
  applyDiveTick(s, DT, { holding });
  t += DT;
  if (s.hookMode !== lastMode) {
    console.log(`t=${t.toFixed(1)} ${lastMode} -> ${s.hookMode} @ y=${s.hookY.toFixed(0)} surf=${SURFACE_Y} air=${s.air.toFixed(1)} $=${Math.round(s.money)} hearts=${s.hearts} phase=${s.phase}`);
    lastMode = s.hookMode;
  }
  if (s.phase !== 'dive') {
    console.log(`KET THUC phase=${s.phase} tai t=${t.toFixed(1)}: ${s.loseReason ?? ''}`);
    break;
  }
  if (t > 60) {
    console.log(`t=60 VAN CON: mode=${s.hookMode} y=${s.hookY.toFixed(0)} air=${s.air.toFixed(1)} — LIMBO?`);
    break;
  }
}
