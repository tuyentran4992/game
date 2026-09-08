// applyDiveTick — one simulation step (DATA-MODEL §5). Pure TS, fixed update order.
import {
  SEA_BOTTOM, SURFACE_Y, ATTACH_LOCK, descendSpeed, reelSpeed, depthPxToM, depthMToPx,
} from '../data/world.ts';
import { fishById, WHALE_DEF } from '../data/fishData.ts';
import type { GameState } from './types.ts';
import type { DiveInput } from './rules.ts';
import { stepMode, resolveSurface } from './rules.ts';
import { moveFish } from '../systems/spawner.ts';
import { tensionTarget, stepTension, stepStrain, dragTerm, isBreak } from '../systems/tension.ts';
import { airRateFor, drainAir } from '../systems/oxygen.ts';
import { applyWhaleEscape, tickWhaleSpawn, patrolWhale, isThrashing, WHALE_REEL_TIRED } from '../systems/whale.ts';
import { WHALE_TOSS_LIMIT, WHALE_TOSS_CYCLES } from '../data/upgrades.ts';

const HOOK_REACH = 30; // px attach radius (small fish)
const WHALE_REACH = 70; // px attach radius (whale)
const SHARK_REACH = 55; // px strike radius
const CURRENT_DRIFT = 20; // px/s sideways drift in the 850m+ current while descending

export const applyDiveTick = (state: GameState, dt: number, input: DiveInput): GameState => {
  if (state.phase !== 'dive') return state;
  state.events = [];
  state.sessionTime += dt;
  state.diveTime += dt;
  state.deepestM = Math.max(state.deepestM, Math.floor(depthPxToM(state.hookY)));

  stepMode(state, dt, input.holding);
  const t = state.sessionTime;
  const whale = state.fish.find((f) => f.uid === state.whaleUid);
  const whaleHooked = state.whaleHooked;

  // --- move hook ---
  if (state.hookMode === 'descend') {
    state.hookY += descendSpeed(depthPxToM(state.hookY)) * dt;
    if (depthPxToM(state.hookY) >= 850) {
      state.hookX = Math.max(40, Math.min(440, state.hookX + CURRENT_DRIFT * dt));
    }
    if (state.hookY > SEA_BOTTOM) state.hookY = SEA_BOTTOM;
  } else if (state.hookMode === 'reel' && !whaleHooked) {
    state.hookY -= reelSpeed(hookedWeightOf(state)) * dt;
    if (state.hookY < SURFACE_Y + 2) state.hookY = SURFACE_Y + 2;
  }

  // --- WHALE_TOSS (single call per tick, before the rest so 'pulled' applies now) ---
  if (state.whaleHooked) {
    const thrash = isThrashing(state, t);
    const reeling = state.hookMode === 'reel';
    // struggling the line = REELING CONTINUOUSLY >=0.5s while it thrashes; 3 of those = tear-off.
    // Brief hold/release flickers while riding the rhythm do not count ("NIN dung nhip").
    if (reeling && thrash) {
      state.struggleCd += dt;
      if (state.struggleCd >= 0.5) {
        state.whaleStruggles += 1;
        state.struggleCd = 0;
      }
    } else {
      state.struggleCd = 0;
    }
    state.whaleTossTimer += dt;
    if (state.whaleTossTimer >= WHALE_TOSS_LIMIT || state.whaleStruggles >= WHALE_TOSS_CYCLES) {
      applyWhaleEscape(state);
      state.events.push({ type: 'whale-escape' });
    } else if (reeling && !thrash) {
      state.hookY -= WHALE_REEL_TIRED * dt; // pull while it is tired
      if (state.hookY < SURFACE_Y + 2) state.hookY = SURFACE_Y + 2;
    }
  }
  // 'hold' and 'idle': hook stays put

  // --- oxygen ---
  if (!(state.hookMode === 'reel' && state.air <= 0)) {
    const rate = airRateFor(state.hookMode, hookedWeightOf(state), state.whaleHooked);
    state.air = drainAir(state.air, rate, dt);
  }
  if (state.air <= 0 && state.hooked.length > 0) {
    // air out while carrying: drop the catch, free float, no heart lost (SPEC §4)
    if (state.whaleHooked) {
      applyWhaleEscape(state);
      state.events.push({ type: 'whale-escape' });
    } else {
      state.hooked = [];
      state.combo = 0;
      state.events.push({ type: 'airout-drop' });
    }
    state.hookMode = 'reel';
  }
  if (state.air < 10 && !state.hintAir) {
    state.hintAir = true;
    state.events.push({ type: 'hint-air' });
  }

  // --- fish swim + hook attach (rng order 1-2 on respawn) ---
  state.fish = state.fish.filter((f) => f.alive);
  // bait attraction: fish on the same water layer steer toward the hook when close
  for (const f of state.fish) {
    if (!f.alive) continue;
    const dx = state.hookX - f.x;
    const dy = state.hookY - f.y;
    if (Math.abs(dy) <= 130 && Math.abs(dx) <= 150) {
      if (dx !== 0) f.vx = Math.sign(dx) * Math.abs(f.vx);
      if (Math.abs(dy) > 12) f.y += Math.sign(dy) * Math.abs(f.vx) * 0.6 * dt;
    }
  }
  moveFish(state.fish, dt);
  patrolWhale(state, dt);
  state.attachLock = Math.max(0, state.attachLock - dt);
  const maxSlots = state.doubleHook ? 2 : 1;
  // fish only bite a STILL bait (NIN); a heavy catch (>=40kg, the ATTACH_LOCK threshold)
  // scares other fish off, so a big fish never turns into a deadly double haul
  const heavyOnLine = hookedWeightOf(state) >= 40;
  const canBite = state.hookMode === 'hold' && !(state.hooked.length > 0 && heavyOnLine);
  if (canBite && state.hooked.length < maxSlots && state.attachLock <= 0 && !state.whaleHooked) {
    for (const f of state.fish) {
      const def = fishById(f.defId);
      if (!def || def.id === 'whale') continue;
      if (state.hooked.includes(f.uid)) continue; // already on the line
      const dx = f.x - state.hookX;
      const dy = f.y - state.hookY;
      if (dx * dx + dy * dy < HOOK_REACH * HOOK_REACH) {
        // fish stays in state.fish (kept alive, pinned to the hook) until sold
        state.hooked.push(f.uid);
        if (def.weight >= 40) state.attachLock = ATTACH_LOCK;
        state.events.push({ type: 'attach', value: def.weight });
        if (state.tension > 60 && !state.hintTension) {
          state.hintTension = true;
          state.events.push({ type: 'hint-tension' });
        }
        break;
      }
    }
  }
  if (whale && !whaleHooked && state.hookMode === 'hold' && state.hooked.length === 0 && state.attachLock <= 0) {
    const dx = whale.x - state.hookX;
    const dy = whale.y - state.hookY;
    if (dx * dx + dy * dy < WHALE_REACH * WHALE_REACH) {
      state.hooked.push(whale.uid);
      state.whaleHooked = true;
      state.whaleTossTimer = 0;
      state.whaleStruggles = 0;
      state.events.push({ type: 'whale-hook' });
    }
  }

  // --- pickups ---
  for (const p of state.pickups) {
    if (p.taken) continue;
    const dx = p.x - state.hookX;
    const dy = p.y - state.hookY;
    if (dx * dx + dy * dy < 30 * 30) {
      p.taken = true;
      state.events.push({ type: 'pickup', text: p.defId });
      if (p.defId === 'up-double') state.doubleHook = true;
      if (p.defId === 'up-sonar') state.sonarCharges += 2;
      if (p.defId === 'chest150') state.money += 150;
    }
  }

  // --- shark patrol (rng order 3) + strike ---
  state.sharkX += state.sharkDir * 60 * dt;
  if (state.sharkX < 30 || state.sharkX > 450) {
    state.sharkDir *= -1;
    state.sharkX = Math.max(30, Math.min(450, state.sharkX));
  }
  state.sharkY = depthMToPx(1050) + Math.sin(state.sessionTime * 0.7) * 80;
  if (state.hooked.length > 0 && !state.whaleHooked) {
    const dx = state.sharkX - state.hookX;
    const dy = state.sharkY - state.hookY;
    if (dx * dx + dy * dy < SHARK_REACH * SHARK_REACH) {
      state.hooked = [];
      state.hearts -= 1;
      state.breaks += 1;
      state.tension = 0;
      state.combo = 0;
      state.events.push({ type: 'shark-hit' });
    }
  }

  // --- tension ---
  const hookedDefs = state.hooked
    .map((uid) => state.fish.find((f) => f.uid === uid))
    .filter((f): f is NonNullable<typeof f> => Boolean(f))
    .map((f) => ({ def: f.defId === 'whale' ? WHALE_DEF : fishById(f.defId)!, phase: f.phase }));
  const drag = dragTerm(state.hooked.length, state.doubleHook, state.hookY, state.hookMode === 'descend');
  const base = tensionTarget(hookedDefs.map((h) => h.def), hookedDefs.map((h) => h.phase), t, drag);
  const reeling = state.hookMode === 'reel' && !state.whaleHooked;
  if (!state.whaleHooked) {
    state.strain = stepStrain(state.strain, base, reeling, state.hookMode === 'hold', dt);
  }
  const target = Math.min(120, base + state.strain);
  state.tension = stepTension(state.tension, target, state.hookMode === 'hold', dt);
  if (state.tension > 60 && !state.hintTension) {
    state.hintTension = true;
    state.events.push({ type: 'hint-tension' });
  }
  if (isBreak(state.tension) && !state.whaleHooked) {
    state.hooked = [];
    state.hearts -= 1;
    state.breaks += 1;
    state.tension = 0;
    state.strain = 0;
    state.combo = 0;
    state.events.push({ type: 'break' });
  }

  // --- whale spawn gate (rng order 4) ---
  tickWhaleSpawn(state, dt);

  // --- surface / win / lose ---
  if (state.hookY <= SURFACE_Y + 2 && state.hookMode !== 'idle') {
    resolveSurface(state);
  }
  return state;
};

// small local helper (mirrors rules.hookedWeight) to avoid circular import
import { hookedWeight as hookedWeightOf } from './rules.ts';
