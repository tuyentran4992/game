// GC-02/03/04/10 — merge rule + combo (M3-02, §4.4)
// Tier convention is 0-based: 0 = cherry ... 10 = melon, 11 = watermelon (max).
// TEST-CASES.md uses 1-based "bậc" in prose; tests here use the engine's 0-based tier.
import { describe, it, expect } from 'vitest';
import { MergeEngine, SCORE_TIER, CHAIN12 } from '../merge-engine';
import { CONFIG } from '../config';

describe('GC-02: merge 2 same-tier → tier+1 + score', () => {
  it('two cherries (tier 0) → strawberry (tier 1), score += scorePerTier[1]', () => {
    const e = new MergeEngine();
    const r = e.merge(0, 0);
    expect(r).not.toBeNull();
    expect(r!.tier).toBe(1);
    expect(r!.scoreGain).toBe(SCORE_TIER[1]);
    expect(e.state.score).toBe(SCORE_TIER[1]);
    expect(CHAIN12[r!.tier]).toBe('strawberry');
  });

  it('two oranges (tier 5) → apple (tier 6), score += scorePerTier[6]', () => {
    const e = new MergeEngine();
    const r = e.merge(5, 5);
    expect(r!.tier).toBe(6);
    expect(r!.scoreGain).toBe(SCORE_TIER[6]);
    expect(e.state.score).toBe(SCORE_TIER[6]);
  });

  it('order does not matter: merge(b, a) === merge(a, b)', () => {
    const e = new MergeEngine();
    const r1 = e.merge(3, 3);
    expect(r1!.tier).toBe(4);
    expect(r1!.scoreGain).toBe(SCORE_TIER[4]);
  });
});

describe('GC-03: merge 2 different-tier → null, no score change', () => {
  it('tier 0 vs tier 1 (cherry vs strawberry) → null', () => {
    const e = new MergeEngine();
    const before = e.state.score;
    expect(e.merge(0, 1)).toBeNull();
    expect(e.state.score).toBe(before);
  });

  it('tier 4 vs tier 7 → null, score untouched, combo untouched', () => {
    const e = new MergeEngine();
    const beforeScore = e.state.score;
    const beforeCombo = e.state.comboCount;
    expect(e.merge(4, 7)).toBeNull();
    expect(e.state.score).toBe(beforeScore);
    expect(e.state.comboCount).toBe(beforeCombo);
  });
});

describe('GC-04: top tier — watermelon merges up to galaxy_watermelon (tier 14)', () => {
  it('two melons (tier 10) → watermelon (tier 11) + jackpot 100', () => {
    const e = new MergeEngine();
    const r = e.merge(10, 10);
    expect(r).not.toBeNull();
    expect(r!.tier).toBe(11);
    expect(CHAIN12[11]).toBe('watermelon');
    expect(r!.scoreGain).toBe(100);
    expect(e.state.score).toBe(100);
  });

  it('two watermelons (tier 11) → dragonfruit (tier 12) + 150', () => {
    const e = new MergeEngine();
    const r = e.merge(11, 11);
    expect(r).not.toBeNull();
    expect(r!.tier).toBe(12);
    expect(CHAIN12[12]).toBe('dragonfruit');
    expect(r!.scoreGain).toBe(150);
  });

  it('two durians (tier 13) → galaxy_watermelon (tier 14) + 500', () => {
    const e = new MergeEngine();
    const r = e.merge(13, 13);
    expect(r).not.toBeNull();
    expect(r!.tier).toBe(14);
    expect(CHAIN12[14]).toBe('galaxy_watermelon');
    expect(r!.scoreGain).toBe(500);
  });

  it('two galaxy watermelons (tier 14) → null (max tier, no further merge)', () => {
    const e = new MergeEngine();
    const before = e.state.score;
    expect(e.merge(14, 14)).toBeNull();
    expect(e.state.score).toBe(before);
  });

  it('CONFIG.maxTier is the galaxy_watermelon index (14)', () => {
    expect(CONFIG.maxTier).toBe(14);
    expect(CHAIN12[CONFIG.maxTier]).toBe('galaxy_watermelon');
  });
});

describe('GC-10: cumulative score = sum(scorePerTier) across merges', () => {
  it('one merge per tier 0→14 yields total = sum(scorePerTier[1..14])', () => {
    const e = new MergeEngine();
    let expected = 0;
    for (let k = 0; k <= 13; k++) {
      const r = e.merge(k, k);
      expect(r).not.toBeNull();
      expect(r!.tier).toBe(k + 1);
      expected += SCORE_TIER[k + 1];
    }
    expect(e.state.score).toBe(expected);
    // sum of [3,6,10,15,21,28,36,45,55,66,100,150,250,500] = 1285
    expect(expected).toBe(1285);
  });

  it('building one watermelon from a full binary merge tree scores every merge', () => {
    // To produce 1 watermelon (tier 11) from cherries (tier 0), you perform
    // 2^(10-k) merges at each level k → k+1. Each merge grants scorePerTier[k+1].
    const e = new MergeEngine();
    let expected = 0;
    for (let k = 0; k <= 10; k++) {
      const merges = 2 ** (10 - k);
      for (let i = 0; i < merges; i++) {
        const r = e.merge(k, k);
        expect(r).not.toBeNull();
        expect(r!.scoreGain).toBe(SCORE_TIER[k + 1]);
        expected += SCORE_TIER[k + 1];
      }
    }
    expect(e.state.score).toBe(expected);
  });
});

describe('GC-11: drop cooldown gate (M3-01, config-driven)', () => {
  it('uses CONFIG.dropCooldownMs (not a hardcoded literal)', () => {
    expect(CONFIG.dropCooldownMs).toBe(250);
  });

  it('first drop is always allowed (no prior drop recorded)', () => {
    const e = new MergeEngine();
    expect(e.canDrop(0)).toBe(true);
    expect(e.canDrop(100)).toBe(true);
  });

  it('a second drop within dropCooldownMs is blocked', () => {
    const e = new MergeEngine();
    e.recordDrop(0);
    expect(e.canDrop(100)).toBe(false);   // 100 < 250
    expect(e.canDrop(249)).toBe(false);   // 249 < 250
  });

  it('a second drop at >= dropCooldownMs is allowed', () => {
    const e = new MergeEngine();
    e.recordDrop(0);
    expect(e.canDrop(250)).toBe(true);    // 250 >= 250
    expect(e.canDrop(1000)).toBe(true);   // well past cooldown
  });

  it('cooldown is measured from the most recent drop, not the first', () => {
    const e = new MergeEngine();
    e.recordDrop(0);
    e.recordDrop(500);                    // second drop resets the timer
    expect(e.canDrop(600)).toBe(false);    // 100ms since last drop → blocked
    expect(e.canDrop(750)).toBe(true);     // 250ms since last drop → ok
  });

  it('blocks all drops once gameOver is set', () => {
    const e = new MergeEngine();
    e.recordDrop(0);
    e.setGameOver(true, true);
    expect(e.state.gameOver).toBe(true);
    // even well past the cooldown, gameOver locks the gate
    expect(e.canDrop(99999)).toBe(false);
  });

  it('unblocks after continue clears gameOver', () => {
    const e = new MergeEngine();
    e.recordDrop(0);
    e.setGameOver(true, true);
    expect(e.canDrop(99999)).toBe(false);
    e.useContinue();                       // clears gameOver (M3-05)
    expect(e.state.gameOver).toBe(false);
    // cooldown still applies to the pre-continue drop, but far future is ok
    expect(e.canDrop(99999)).toBe(true);
  });

  it('recordDrop has no score side effect (pure timer bookkeeping)', () => {
    const e = new MergeEngine();
    const before = e.state.score;
    e.recordDrop(123);
    expect(e.state.score).toBe(before);
  });
});

describe('Combo: consecutive merges within comboWindowMs (config-driven, M3 §4.3)', () => {
  it('uses CONFIG.comboWindowMs (not a hardcoded literal)', () => {
    expect(CONFIG.comboWindowMs).toBe(2000);
  });

  it('merges within the window increment comboCount', () => {
    const e = new MergeEngine();
    e.merge(0, 0, 0);
    expect(e.state.comboCount).toBe(1);
    e.merge(1, 1, 500);
    expect(e.state.comboCount).toBe(2);
    e.merge(2, 2, 900);
    expect(e.state.comboCount).toBe(3);
  });

  it('a merge past the window resets combo to 1', () => {
    const e = new MergeEngine();
    e.merge(0, 0, 0);
    e.merge(1, 1, 500);
    expect(e.state.comboCount).toBe(2);
    // beyond comboWindowMs (2000)
    e.merge(2, 2, 3000);
    expect(e.state.comboCount).toBe(1);
  });
});
