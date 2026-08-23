// GC-08/09 — RNG deterministic + DropQueue (M3-04, DATA-MODEL §5)
// Tier convention is 0-based: 0 = cherry ... 11 = watermelon (max).
// TEST-CASES.md uses 1-based "bậc" in prose; tests here use 0-based tier.
// GC-09 prose "bậc 1–4" == 0-based tiers 0..3 (cherry..dekopon).
import { describe, it, expect } from 'vitest';
import { SeededRng, DropQueue } from '../rng';
import { CONFIG } from '../config';
import { MergeEngine } from '../merge-engine';

const SEQUENCE_LEN = 50;

describe('GC-08: RNG deterministic — same seed ⇒ same sequence', () => {
  it('SeededRng: two instances with the same seed produce identical next() values', () => {
    const a = new SeededRng(42);
    const b = new SeededRng(42);
    for (let i = 0; i < SEQUENCE_LEN; i++) {
      expect(a.next()).toBe(b.next());
    }
  });

  it('SeededRng: next() stays in [0, 1) and varies across draws (not constant)', () => {
    const rng = new SeededRng(7);
    const vals = Array.from({ length: SEQUENCE_LEN }, () => rng.next());
    for (const v of vals) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
    // not all identical — the PRNG actually moves
    const distinct = new Set(vals);
    expect(distinct.size).toBeGreaterThan(1);
  });

  it('DropQueue: two queues with the same seed produce the same 50-fruit sequence', () => {
    const q1 = new DropQueue(42, CONFIG.dropSpawnPool);
    const q2 = new DropQueue(42, CONFIG.dropSpawnPool);
    const seq1 = Array.from({ length: SEQUENCE_LEN }, () => q1.nextFruit());
    const seq2 = Array.from({ length: SEQUENCE_LEN }, () => q2.nextFruit());
    expect(seq1).toEqual(seq2);
  });

  it('DropQueue: peek() shows the next 2 fruits and matches the next 2 nextFruit() calls', () => {
    const q = new DropQueue(99, CONFIG.dropSpawnPool);
    const peeked = q.peek();
    expect(peeked.length).toBe(2);
    expect(q.nextFruit()).toBe(peeked[0]);
    expect(q.nextFruit()).toBe(peeked[1]);
  });

  it('DropQueue: swapFront swaps front item with current tier and updates peek()', () => {
    const q = new DropQueue(99, CONFIG.dropSpawnPool);
    const initialFront = q.peek()[0];
    const initialSecond = q.peek()[1];
    const myCurrentTier = 4; // Dekopon
    const returnedTier = q.swapFront(myCurrentTier);

    expect(returnedTier).toBe(initialFront);
    expect(q.peek()[0]).toBe(myCurrentTier);
    expect(q.peek()[1]).toBe(initialSecond);
  });

  it('MergeEngine wires seed → DropQueue: two engines same seed ⇒ identical next-fruit chain', () => {
    const e1 = new MergeEngine(42);
    const e2 = new MergeEngine(42);
    expect(e1.peekNext()).toEqual(e2.peekNext());
    const s1 = Array.from({ length: SEQUENCE_LEN }, () => e1.nextFruit());
    const s2 = Array.from({ length: SEQUENCE_LEN }, () => e2.nextFruit());
    expect(s1).toEqual(s2);
  });
});

describe('GC-09: RNG — different seeds ⇒ different sequences; early pool is low-tier only', () => {
  it('two DropQueues with different seeds produce different 50-fruit sequences', () => {
    const q1 = new DropQueue(42, CONFIG.dropSpawnPool);
    const q2 = new DropQueue(1337, CONFIG.dropSpawnPool);
    const seq1 = Array.from({ length: SEQUENCE_LEN }, () => q1.nextFruit());
    const seq2 = Array.from({ length: SEQUENCE_LEN }, () => q2.nextFruit());
    expect(seq1).not.toEqual(seq2);
  });

  it('first 10 dropped fruits are only tiers 0..3 (bậc 1–4) under the early pool band', () => {
    const q = new DropQueue(2026, CONFIG.dropSpawnPool);
    const first10 = Array.from({ length: 10 }, () => q.nextFruit());
    for (const tier of first10) {
      expect(tier).toBeGreaterThanOrEqual(0);
      expect(tier).toBeLessThanOrEqual(3);
    }
    // sanity: they are not all the same tier (weighted pool varies)
    const distinct = new Set(first10);
    expect(distinct.size).toBeGreaterThan(1);
  });

  it('early band weights cover only tiers 0..3 (no higher tier can spawn at game start)', () => {
    const startBand = CONFIG.dropSpawnPool[0];
    expect(startBand.minDrops).toBe(0);
    const tiers = startBand.weights.map((w) => w.tier);
    for (const t of tiers) expect(t).toBeLessThanOrEqual(3);
  });

  it('the spawn pool never drops watermelon-tier or above the configured max spawn tier', () => {
    // Pool must stay within chain bounds; Suika-style: never drop the top fruits.
    const allTiers = CONFIG.dropSpawnPool.flatMap((b) => b.weights.map((w) => w.tier));
    const maxSpawn = Math.max(...allTiers);
    expect(maxSpawn).toBeLessThan(CONFIG.maxTier);
    expect(maxSpawn).toBeLessThanOrEqual(5); // sensible cap: orange (tier 5) at most
  });
});
