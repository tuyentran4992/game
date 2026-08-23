// M3 Juicy Merge — RNG + DropQueue (logic THUẦN, testable)
// SPEC M3-04 / DATA-MODEL §5: seeded PRNG (mulberry32), ONE instance per session,
// deterministic → same seed + same drop actions ⇒ same fruit sequence (replay testable).
// The next-fruit queue shows 2 upcoming fruits ("next" preview). The spawn pool is
// drop-count-scaled (config.dropSpawnPool): low tiers dominate early; higher tiers
// unlock as the player drops more fruit. Tier convention is 0-based (0 = cherry).

import { CONFIG, type DropSpawnBand, type DropTierWeight } from './config';

/**
 * Seeded PRNG (mulberry32). Deterministic for a given 32-bit seed.
 * A session must use a single instance (no mid-session re-seed) to stay replayable.
 */
export class SeededRng {
  private state: number;

  constructor(seed: number) {
    // Force to a 32-bit unsigned int so any numeric seed (incl. 0) is well-defined.
    this.state = seed >>> 0;
  }

  /** Next float in [0, 1). Pure: advances internal state, returns deterministic value. */
  next(): number {
    // mulberry32 — no Math.random dependency, fully seed-driven.
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Next integer in [min, max] inclusive. */
  nextInt(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** Reset to a new seed (keeps the same instance — for "Retry" → new run). */
  reseed(seed: number): void {
    this.state = seed >>> 0;
  }
}

/**
 * Drop queue: pre-generates the next 2 fruits for the "next" preview and yields
 * them one at a time on {@link nextFruit}. The active spawn band is chosen by the
 * number of fruits generated so far, so the pool level-scales with progression.
 *
 * Deterministic: two {@link DropQueue} instances with the same seed (and pool)
 * produce an identical fruit sequence.
 */
export class DropQueue {
  private readonly rng: SeededRng;
  private readonly pool: readonly DropSpawnBand[];
  private readonly queue: number[] = []; // length 2: the upcoming tiers
  private generated = 0; // fruits generated so far (drives band selection)

  constructor(seed: number, pool: readonly DropSpawnBand[] = CONFIG.dropSpawnPool) {
    this.rng = new SeededRng(seed);
    this.pool = pool;
    // Pre-fill the 2-fruit preview. Uses band for generated indices 0 and 1.
    this.queue.push(this.generate());
    this.queue.push(this.generate());
  }

  /** Snapshot of the next 2 upcoming tiers (preview). Does not advance state.
   *  Returns a copy so callers cannot mutate the live queue. */
  peek(): readonly number[] {
    return [...this.queue];
  }

  /** Consume the front fruit and refill the back; returns the dropped tier. */
  nextFruit(): number {
    const tier = this.queue.shift() as number;
    this.queue.push(this.generate());
    return tier;
  }

  /** Rebuild the queue from a fresh seed (used on "Retry" → new run, M3 §7). */
  reseed(seed: number): void {
    // Re-initialise in place so callers holding this reference stay wired.
    this.rng.reseed(seed);
    this.generated = 0;
    this.queue.length = 0;
    this.queue.push(this.generate());
    this.queue.push(this.generate());
  }

  private generate(): number {
    const band = this.activeBand(this.generated);
    this.generated++;
    return this.pickWeighted(band.weights);
  }

  private activeBand(drops: number): DropSpawnBand {
    // Largest minDrops that is <= drops. Pool is assumed sorted ascending.
    let active = this.pool[0];
    for (const band of this.pool) {
      if (band.minDrops <= drops) active = band;
      else break;
    }
    return active;
  }

  private pickWeighted(weights: readonly DropTierWeight[]): number {
    const total = weights.reduce((sum, w) => sum + w.weight, 0);
    let r = this.rng.next() * total;
    for (const w of weights) {
      r -= w.weight;
      if (r < 0) return w.tier;
    }
    return weights[weights.length - 1].tier;
  }
}
