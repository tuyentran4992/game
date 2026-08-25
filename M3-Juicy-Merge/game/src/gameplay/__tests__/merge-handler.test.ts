// Step 10 — merge-through-collision decision layer (GC-02 regression + dedup guard).
// The Gameplay scene turns each Matter `collisionstart` event into a batch of
// colliding fruit pairs; this module is the pure, testable core that decides
// WHICH pairs merge. Engine.merge (GC-02) still owns the score/combo mutation —
// this layer only adds the per-event "a fruit merges into one neighbor" guard so
// a fruit wedged between two same-tier neighbors does not double-merge.
//
// Tier convention is 0-based (0 = cherry ... 11 = watermelon).
import { describe, it, expect } from 'vitest';
import { resolveMergeBatch, type CollidingFruit } from '../merge-handler';
import { MergeEngine, SCORE_TIER } from '../../logic/merge-engine';

const fruit = (id: number, tier: number): CollidingFruit => ({ id, tier });

describe('resolveMergeBatch — GC-02 path (collision -> merge)', () => {
  it('one pair of same-tier fruits -> one merge plan to tier+1', () => {
    const e = new MergeEngine();
    const plans = resolveMergeBatch([[fruit(1, 0), fruit(2, 0)]], 0, e);
    expect(plans).toHaveLength(1);
    expect(plans[0]).toEqual({ aId: 1, bId: 2, newTier: 1, scoreGain: SCORE_TIER[1] });
    expect(e.state.score).toBe(SCORE_TIER[1]);
  });

  it('two melons (tier 10) -> watermelon (tier 11) +100', () => {
    const e = new MergeEngine();
    const plans = resolveMergeBatch([[fruit(7, 10), fruit(8, 10)]], 0, e);
    expect(plans).toHaveLength(1);
    expect(plans[0].newTier).toBe(11);
    expect(plans[0].scoreGain).toBe(100);
    expect(e.state.score).toBe(100);
  });

  it('two galaxy watermelons (tier 14) -> no plan (max tier, no further merge)', () => {
    const e = new MergeEngine();
    const plans = resolveMergeBatch([[fruit(1, 14), fruit(2, 14)]], 0, e);
    expect(plans).toHaveLength(0);
    expect(e.state.score).toBe(0);
  });

  it('different-tier pair -> no plan, score untouched', () => {
    const e = new MergeEngine();
    const plans = resolveMergeBatch([[fruit(1, 0), fruit(2, 1)]], 0, e);
    expect(plans).toHaveLength(0);
    expect(e.state.score).toBe(0);
  });

  it('a fruit claimed by an earlier pair this event is not re-merged', () => {
    // cherry #1 collides with both cherry #2 and cherry #3 in the same event:
    // only the first pair merges; #1 is already claimed.
    const e = new MergeEngine();
    const plans = resolveMergeBatch(
      [[fruit(1, 0), fruit(2, 0)], [fruit(1, 0), fruit(3, 0)]],
      0, e,
    );
    expect(plans).toHaveLength(1);
    expect(plans[0].aId).toBe(1);
    expect(plans[0].bId).toBe(2);
    expect(e.state.score).toBe(SCORE_TIER[1]);
  });

  it('two disjoint same-tier pairs in one event -> two merge plans', () => {
    const e = new MergeEngine();
    const plans = resolveMergeBatch(
      [[fruit(1, 0), fruit(2, 0)], [fruit(3, 0), fruit(4, 0)]],
      0, e,
    );
    expect(plans).toHaveLength(2);
    expect(e.state.score).toBe(SCORE_TIER[1] * 2);
  });

  it('mixed batch: merges same-tier pairs, skips different-tier ones', () => {
    const e = new MergeEngine();
    const plans = resolveMergeBatch(
      [
        [fruit(1, 0), fruit(2, 1)], // skip (different tier)
        [fruit(3, 2), fruit(4, 2)], // merge -> tier 3
        [fruit(5, 14), fruit(6, 14)], // skip (max tier)
      ],
      0, e,
    );
    expect(plans).toHaveLength(1);
    expect(plans[0]).toEqual({ aId: 3, bId: 4, newTier: 3, scoreGain: SCORE_TIER[3] });
    expect(e.state.score).toBe(SCORE_TIER[3]);
  });
});

describe('resolveMergeBatch — combo across collision events (M3 §4.3)', () => {
  it('merges from consecutive events within the combo window increment comboCount', () => {
    const e = new MergeEngine();
    resolveMergeBatch([[fruit(1, 0), fruit(2, 0)]], 0, e);
    expect(e.state.comboCount).toBe(1);
    resolveMergeBatch([[fruit(3, 1), fruit(4, 1)]], 500, e);
    expect(e.state.comboCount).toBe(2);
  });

  it('an event past the combo window resets combo to 1', () => {
    const e = new MergeEngine();
    resolveMergeBatch([[fruit(1, 0), fruit(2, 0)]], 0, e);
    expect(e.state.comboCount).toBe(1);
    resolveMergeBatch([[fruit(3, 1), fruit(4, 1)]], 3000, e); // past 2000ms
    expect(e.state.comboCount).toBe(1);
  });
});

describe('resolveMergeBatch — purity / edge cases', () => {
  it('empty batch -> no plans, no state change', () => {
    const e = new MergeEngine();
    expect(resolveMergeBatch([], 0, e)).toEqual([]);
    expect(e.state.score).toBe(0);
    expect(e.state.comboCount).toBe(0);
  });

  it('does not mutate the input pairs array', () => {
    const e = new MergeEngine();
    const pairs: [CollidingFruit, CollidingFruit][] = [[fruit(1, 0), fruit(2, 0)]];
    const snapshot = pairs.map(([a, b]) => [a.id, a.tier, b.id, b.tier]);
    resolveMergeBatch(pairs, 0, e);
    const after = pairs.map(([a, b]) => [a.id, a.tier, b.id, b.tier]);
    expect(after).toEqual(snapshot);
  });
});
