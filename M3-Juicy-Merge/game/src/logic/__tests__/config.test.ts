// GC-01 — config is the runtime source of truth (games/juicy-merge.yaml §mechanics)
import { describe, it, expect } from 'vitest';
import { CONFIG } from '../config';

describe('GC-01: chain + score_per_tier match SPEC (15 tiers)', () => {
  it('chain has 15 fruits in order cherry → galaxy_watermelon', () => {
    expect(CONFIG.chain).toEqual([
      'cherry', 'strawberry', 'grape', 'dekopon', 'pomegranate', 'orange',
      'apple', 'pear', 'peach', 'pineapple', 'melon', 'watermelon',
      'dragonfruit', 'durian', 'galaxy_watermelon',
    ]);
    expect(CONFIG.chain).toHaveLength(15);
    expect(CONFIG.chainLength).toBe(15);
  });

  it('score_per_tier matches the table (15 values)', () => {
    expect(CONFIG.scorePerTier).toEqual([1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 66, 100, 150, 250, 500]);
    expect(CONFIG.scorePerTier).toHaveLength(15);
  });

  it('galaxy_watermelon is the max tier (index 14) with jackpot 500', () => {
    expect(CONFIG.maxTier).toBe(14);
    expect(CONFIG.chain[CONFIG.maxTier]).toBe('galaxy_watermelon');
    expect(CONFIG.scorePerTier[CONFIG.maxTier]).toBe(500);
  });

  it('chain length equals score table length', () => {
    expect(CONFIG.chain.length).toBe(CONFIG.scorePerTier.length);
  });
});
