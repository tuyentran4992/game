// Spawner — deterministic fish population from seed (DATA-MODEL §2, §6 RNG order 1-2).
import { SEA_TOP, SEA_BOTTOM, depthMToPx } from '../data/world.ts';
import { FISH_DEFS, bandCount, type FishDef } from '../data/fishData.ts';
import { BANDS } from '../data/world.ts';
import type { FishInstance } from '../core/types.ts';
import { makeRng } from '../core/rng.ts';

const centerM = (def: FishDef): number => (def.bandTopM + def.bandBotM) / 2;

// Fish species living in band i (assigned by each species' mid-depth)
export const speciesInBand = (bandIndex: number): FishDef[] => {
  const band = BANDS[bandIndex]!;
  return FISH_DEFS.filter((d) => centerM(d) >= band.topM && centerM(d) < band.botM);
};

export const bandIndexFor = (y: number): number => {
  const m = y - SEA_TOP;
  for (let i = 0; i < BANDS.length; i++) {
    const b = BANDS[i]!;
    if (m >= b.topM && m < b.botM) return i;
  }
  return BANDS.length - 1;
};

interface SpawnCell {
  state: number;
}

// Full initial population, deterministic from seed (GC-01: same seed -> identical array).
// RNG order: (1) shuffle species/positions, (2) pulse phase per fish.
export const spawnAll = (seed: number): { fish: FishInstance[]; rngState: number } => {
  const cell: SpawnCell = { state: seed | 0 };
  const rng = makeRng(cell);
  const fish: FishInstance[] = [];
  let uid = 1;

  for (let b = 0; b < BANDS.length; b++) {
    const band = BANDS[b]!;
    const species = speciesInBand(b);
    if (species.length === 0) continue;
    const count = bandCount(band.topM);
    // (1) shuffle species order once, then round-robin so slots differ
    const order = rng.shuffle([...species]);
    for (let i = 0; i < count; i++) {
      const def = order[i % order.length]!;
      const yM = rng.range(def.bandTopM, Math.min(def.bandBotM, band.botM));
      const x = rng.range(60, 420);
      const dir = rng.next() < 0.5 ? -1 : 1;
      // (2) pulse phase offset per fish
      const phase = rng.range(0, def.pulsePeriod);
      fish.push({
        uid: uid++,
        defId: def.id,
        x,
        y: depthMToPx(yM),
        vx: dir * (30 + def.weight * 0.4),
        phase,
        alive: true,
      });
    }
  }
  return { fish, rngState: cell.state };
};

// Swim update: bounce horizontally, keep fish inside its home band vertically.
export const moveFish = (fish: FishInstance[], dt: number): void => {
  for (const f of fish) {
    if (!f.alive) continue;
    f.x += f.vx * dt;
    if (f.x < 40) {
      f.x = 40;
      f.vx = Math.abs(f.vx);
    } else if (f.x > 440) {
      f.x = 440;
      f.vx = -Math.abs(f.vx);
    }
    // gentle vertical bob within +/-20px of spawn line
    f.y += Math.sin(f.phase + f.x * 0.02) * 6 * dt;
    f.y = Math.max(SEA_TOP + 10, Math.min(SEA_BOTTOM, f.y));
  }
};
