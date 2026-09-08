// Core rules — state machine (DATA-MODEL §5). Pure TS, no Phaser, seeded RNG only (TB-04).
// NOTE: state is updated in place for sim performance; determinism comes from fixed RNG
// order (spawn shuffle -> pulse phase -> shark -> whale timer) and pure step functions.
import {
  SURFACE_Y, WORLD_W, HEARTS, FUEL_COST, DIVE_COOLDOWN, TAP_BUFFER, depthMToPx,
} from '../data/world.ts';
import { FISH_DEFS, fishById } from '../data/fishData.ts';
import { PICKUP_DEFS } from '../data/upgrades.ts';
import type { GameState, HookMode } from './types.ts';
import { spawnAll, bandIndexFor } from '../systems/spawner.ts';
import { sellHooked, resetHearts, loseEvent } from '../systems/economy.ts';
import { winCheck } from '../systems/whale.ts';
import { makeRng } from './rng.ts';

export const createGame = (seed: number): GameState => {
  const { fish, rngState } = spawnAll(seed);
  const state: GameState = {
    seed, rngState, phase: 'title', money: 600, hearts: HEARTS, breaks: 0, combo: 0,
    usedContinue: false, loseReason: null, rank: null, sessionTime: 0, deepestM: 0,
    diveCount: 0, diveTime: 0, diveStartCooldown: 0, awaitingDive: false,
    hookX: WORLD_W / 2, hookY: SURFACE_Y + 2, hookMode: 'idle', tapBuffer: 0, holdTime: 0,
    air: 45, tension: 0, strain: 0, hooked: [], attachLock: 0,
    doubleHook: false, sonarCharges: 0, sonarTimer: 0,
    fish, pickups: [], nextUid: 1000,
    sharkX: 240, sharkY: depthMToPx(1050), sharkDir: 1,
    hintControl: false, hintTension: false, hintAir: false, struggleCd: 0,
    whaleUid: null, whaleSpawnTimer: 8, whaleHooked: false, whaleTossTimer: 0, whaleStruggles: 0,
    events: [],
  };
  // pickups: deterministic positions right after the fish spawn (RNG order kept fixed)
  const cell = { state: state.rngState };
  const rng = makeRng(cell);
  for (const def of PICKUP_DEFS) {
    state.pickups.push({
      uid: state.nextUid++,
      defId: def.id,
      x: rng.range(210, 270), // mid-channel so a descend through the band can grab it
      y: depthMToPx(rng.range(def.bandTopM, def.bandBotM)),
      taken: false,
    });
  }
  state.rngState = cell.state;
  return state;
};

export const startDive = (state: GameState): GameState => {
  if (state.phase !== 'title' && state.phase !== 'dive') return state;
  if (state.hookMode === 'idle' && state.diveCount > 0 && state.money < FUEL_COST) return state;
  state.money -= FUEL_COST;
  state.diveCount += 1;
  state.diveTime = 0;
  state.diveStartCooldown = DIVE_COOLDOWN;
  state.awaitingDive = false;
  state.hookY = SURFACE_Y + 2;
  state.hookX = WORLD_W / 2;
  state.hookMode = 'idle';
  state.air = 45;
  state.tension = 0;
  state.phase = 'dive';
  state.events.push({ type: 'dive-start' });
  return state;
};

const hookedWeight = (state: GameState): number => {
  let w = 0;
  for (const uid of state.hooked) {
    const f = state.fish.find((fi) => fi.uid === uid);
    const def = f ? fishById(f.defId) : undefined;
    if (def) w += def.weight;
  }
  return w;
};
export { hookedWeight };

// respawn one fish in the band the old one came from (rng order slots 1-2)
export const respawnFish = (state: GameState, bandIdx: number): void => {
  const bandTopM = [0, 250, 600, 950][bandIdx]!;
  const bandBotM = [250, 600, 950, 1200][bandIdx]!;
  const pool = FISH_DEFS.filter(
    (d) => (d.bandTopM + d.bandBotM) / 2 >= bandTopM && (d.bandTopM + d.bandBotM) / 2 < bandBotM,
  );
  if (pool.length === 0) return;
  const cell = { state: state.rngState };
  const rng = makeRng(cell);
  const def = rng.shuffle([...pool])[0]!;
  const yM = rng.range(Math.max(def.bandTopM, bandTopM), Math.min(def.bandBotM, bandBotM));
  const x = rng.range(60, 420);
  const phase = rng.range(0, def.pulsePeriod);
  state.rngState = cell.state;
  state.fish.push({
    uid: state.nextUid++, defId: def.id, x, y: depthMToPx(yM),
    vx: (rng.next() < 0.5 ? -1 : 1) * (30 + def.weight * 0.4), phase, alive: true,
  });
};

const loseNow = (state: GameState, reason: 'OUT OF FUEL' | 'LINES BROKEN'): void => {
  if (state.phase === 'lose') return; // trigger exactly once (GC-11)
  state.phase = 'lose';
  state.loseReason = reason;
  state.events.push(loseEvent(reason));
};

export const applyContinue = (state: GameState): GameState => {
  // rewarded-continue: exactly once per session, only on lose (DATA-MODEL §5)
  if (state.phase !== 'lose' || state.usedContinue) return state;
  state.usedContinue = true;
  state.hearts = Math.max(1, state.hearts);
  state.money = Math.max(state.money, 150);
  state.loseReason = null;
  state.phase = 'dive';
  state.hookMode = 'idle';
  state.hookY = SURFACE_Y + 2;
  state.awaitingDive = true; // revived at the surface: next hold starts a paid dive
  return state;
};

export const resolveSurface = (state: GameState): void => {
  if (winCheck(state)) {
    state.phase = 'win';
    state.rank = state.breaks === 0 ? 'S' : state.hearts >= 2 ? 'A' : 'B';
    state.events.push({ type: 'win' });
    return;
  }
  if (state.hooked.length > 0) {
    const soldUids = [...state.hooked];
    const sold = sellHooked(state);
    state.money = sold.money;
    state.combo = sold.combo;
    // sold fish leave the world; respawn one in the band each came from (rng slots 1-2)
    for (const uid of soldUids) {
      const f = state.fish.find((fi) => fi.uid === uid);
      if (f) {
        respawnFish(state, bandIndexFor(f.y));
        state.fish = state.fish.filter((fi) => fi.uid !== uid);
      }
    }
    state.hooked = [];
    state.events.push({ type: 'surface', value: sold.gained });
  } else {
    state.events.push({ type: 'surface', value: 0 });
  }
  state.hookMode = 'idle';
  // lose checks in DATA-MODEL §5 order: fuel first, then broken hearts
  if (state.money < FUEL_COST) loseNow(state, 'OUT OF FUEL');
  if (state.hearts <= 0) loseNow(state, 'LINES BROKEN');
  // heart regen (+1 on coming home) only applies when the trip didn't end in loss
  if (state.phase !== 'lose') state.hearts = resetHearts(state.hearts);
  // still in the run: the next hold starts a PAID dive (limbo fix — see stepMode 'idle')
  if (state.phase === 'dive') state.awaitingDive = true;
};

export interface DiveInput {
  holding: boolean;
}

export const stepMode = (state: GameState, dt: number, holding: boolean): void => {
  const m: HookMode = state.hookMode;
  if (m === 'idle') {
    if (state.diveStartCooldown > 0) state.diveStartCooldown -= dt;
    if (holding && state.diveStartCooldown <= 0) {
      if (state.awaitingDive) {
        // LIMBO FIX: after a surface resolution the hook used to descend for free
        // (no FUEL_COST, no air refill, diveCount frozen) -> sessions could never end.
        // Every descent now goes through startDive — the single source of truth that
        // charges fuel, refills air and counts the dive. startDive refuses when the
        // next dive is unaffordable; the hold simply retries until lose fires elsewhere.
        startDive(state);
        return; // DIVE_COOLDOWN restarts; descent begins once it elapses (same as dive 1)
      }
      state.hookMode = 'descend';
      if (!state.hintControl) {
        state.hintControl = true;
        state.events.push({ type: 'hint-control' });
      }
    }
    return;
  }
  if (m === 'descend') {
    if (!holding) {
      // short blip release (< TAP_BUFFER) keeps descending; real release -> reel
      state.tapBuffer -= dt;
      if (state.tapBuffer <= 0) state.hookMode = 'reel';
    } else {
      state.tapBuffer = TAP_BUFFER;
    }
    return;
  }
  if (m === 'reel') {
    // holding while reeling -> NIN (ride out the fight)
    if (holding) state.hookMode = 'hold';
    return;
  }
  // hold (NIN): release -> reel again; keep holding to wait out the thrash (GC-07)
  if (!holding) state.hookMode = 'reel';
};
