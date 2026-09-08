// Whale (Blue Whale) — spawn gate, WHALE_TOSS state machine (DATA-MODEL §3, SPEC §6).
import { SEA_BOTTOM, SURFACE_Y } from '../data/world.ts';
import { WHALE_SPAWN_INTERVAL, WHALE_TOSS_LIMIT, WHALE_TOSS_CYCLES } from '../data/upgrades.ts';
import { WHALE_DEF } from '../data/fishData.ts';
import { pulseEnvelope } from './tension.ts';
import type { GameState } from '../core/types.ts';
import { makeRng } from '../core/rng.ts';

// Reel speed while the whale is tired (pulse < 0.5). DATA-MODEL reelSpeed(400kg) = 11.7px/s
// would make the 20s toss unwinnable (needs ~1096px) — WHALE_TOSS uses its own pull speed.
export const WHALE_REEL_TIRED = 100; // px/s
export const THRASH_ENV = 0.7; // main-pulse envelope >= 0.7 = whale is thrashing (hook pinned)

// Whale spawns every 8s while average tension stays <= 50 (SPEC §6). RNG order slot 4.
export const tickWhaleSpawn = (state: GameState, dt: number): void => {
  if (state.whaleUid !== null || state.whaleHooked) return;
  if (state.tension > 50) return;
  state.whaleSpawnTimer -= dt;
  if (state.whaleSpawnTimer <= 0) {
    const cell = { state: state.rngState };
    const rng = makeRng(cell);
    const x = rng.range(120, 360);
    state.rngState = cell.state;
    state.whaleUid = state.nextUid++;
    state.fish.push({
      uid: state.whaleUid,
      defId: 'whale',
      x,
      y: SEA_BOTTOM,
      vx: 40,
      phase: 0,
      alive: true,
    });
    state.whaleSpawnTimer = WHALE_SPAWN_INTERVAL;
  }
};

export const whaleAlive = (state: GameState): boolean =>
  state.whaleUid !== null && state.fish.some((f) => f.uid === state.whaleUid && f.alive);

// Patrol 1140-1200m while free.
export const patrolWhale = (state: GameState, dt: number): void => {
  if (!state.whaleHooked && state.whaleUid !== null) {
    const w = state.fish.find((f) => f.uid === state.whaleUid);
    if (w && w.alive) {
      w.x += w.vx * dt;
      if (w.x < 100) {
        w.x = 100;
        w.vx = Math.abs(w.vx);
      } else if (w.x > 380) {
        w.x = 380;
        w.vx = -Math.abs(w.vx);
      }
      w.y = Math.max(1140 + 96, Math.min(SEA_BOTTOM, w.y + Math.sin(w.phase + w.x * 0.01) * 10 * dt));
    }
  }
};

export const isThrashing = (state: GameState, t: number): boolean => {
  const w = state.fish.find((f) => f.uid === state.whaleUid);
  if (!w) return false;
  return pulseEnvelope(WHALE_DEF, w.phase, t) >= THRASH_ENV;
};

// WHALE_TOSS tick: hook locked, no tension-break; escape only via 20s timer or 3 bad reels.
// Returns events appended to state.events by the caller (rules).
export const tickWhaleToss = (
  state: GameState,
  dt: number,
  t: number,
  reeling: boolean,
): { pulled: boolean; escaped: boolean; struggle: boolean } => {
  if (!state.whaleHooked) return { pulled: false, escaped: false, struggle: false };
  state.whaleTossTimer += dt;

  const thrash = isThrashing(state, t);
  let struggle = false;
  if (reeling && thrash) {
    // reeling while it thrashes: bully the line -> counted struggle, 3 = tear-off
    state.whaleStruggles += 1;
    struggle = true;
  }

  let escaped = false;
  if (state.whaleTossTimer >= WHALE_TOSS_LIMIT || state.whaleStruggles >= WHALE_TOSS_CYCLES) {
    escaped = true;
  }
  // pulled = tired window -> hook may rise at WHALE_REEL_TIRED
  const pulled = !thrash && !escaped;
  return { pulled, escaped, struggle };
};

// Escape: whale sinks back to the bottom, respawn 8s later (no dead-end, SPEC §6 edge).
export const applyWhaleEscape = (state: GameState): void => {
  const w = state.fish.find((f) => f.uid === state.whaleUid);
  if (w) w.alive = false;
  state.hooked = state.hooked.filter((uid) => uid !== state.whaleUid);
  state.whaleUid = null;
  state.whaleHooked = false;
  state.whaleTossTimer = 0;
  state.whaleStruggles = 0;
  state.whaleSpawnTimer = WHALE_SPAWN_INTERVAL;
  state.combo = 0;
};

export const winCheck = (state: GameState): boolean =>
  state.whaleHooked && state.hookY <= SURFACE_Y + 2;
