// GC-01 — config is the runtime source of truth (games/juicy-merge.yaml §mechanics)
import { describe, it, expect } from 'vitest';
import { CONFIG } from '../config';

describe('GC-01: chain + score_per_tier match SPEC §4.4', () => {
  it('chain has 12 fruits in order cherry → watermelon', () => {
    expect(CONFIG.chain).toEqual([
      'cherry', 'strawberry', 'grape', 'dekopon', 'pomegranate', 'orange',
      'apple', 'pear', 'peach', 'pineapple', 'melon', 'watermelon',
    ]);
    expect(CONFIG.chain).toHaveLength(12);
    expect(CONFIG.chainLength).toBe(12);
  });

  it('score_per_tier matches the §4.4 table (12 values)', () => {
    expect(CONFIG.scorePerTier).toEqual([1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 66, 100]);
    expect(CONFIG.scorePerTier).toHaveLength(12);
  });

  it('watermelon is the max tier (index 11) with jackpot 100', () => {
    expect(CONFIG.maxTier).toBe(11);
    expect(CONFIG.chain[CONFIG.maxTier]).toBe('watermelon');
    expect(CONFIG.scorePerTier[CONFIG.maxTier]).toBe(100);
  });

  it('chain length equals score table length', () => {
    expect(CONFIG.chain.length).toBe(CONFIG.scorePerTier.length);
  });
});
