// Unit tests for pure functions in juice-effects.ts
import { describe, it, expect } from 'vitest';
import { computeComboDetune, getFruitJuiceColor, COMBO_DETUNE_STEPS } from '../juice-effects';
import { FRUIT_COLORS } from '../fruit-sprite';
import { toColor } from '../../tokens';

describe('juice-effects pure calculations', () => {
  describe('computeComboDetune', () => {
    it('returns 0 for combo <= 1', () => {
      expect(computeComboDetune(0)).toBe(0);
      expect(computeComboDetune(1)).toBe(0);
    });

    it('returns correct musical scale steps for combo 2 to 7', () => {
      expect(computeComboDetune(2)).toBe(200);
      expect(computeComboDetune(3)).toBe(400);
      expect(computeComboDetune(4)).toBe(500);
      expect(computeComboDetune(5)).toBe(700);
      expect(computeComboDetune(6)).toBe(900);
      expect(computeComboDetune(7)).toBe(1100);
    });

    it('clamps to octave (1200 cents) for high combo streaks', () => {
      expect(computeComboDetune(8)).toBe(1200);
      expect(computeComboDetune(15)).toBe(1200);
    });

    it('COMBO_DETUNE_STEPS has expected length', () => {
      expect(COMBO_DETUNE_STEPS).toHaveLength(8);
    });
  });

  describe('getFruitJuiceColor', () => {
    it('returns matching hex number for valid fruit tiers', () => {
      for (let tier = 0; tier < 12; tier++) {
        const expected = toColor(FRUIT_COLORS[tier]);
        expect(getFruitJuiceColor(tier)).toBe(expected);
      }
    });

    it('falls back gracefully on out-of-range tier', () => {
      const fallback = toColor(FRUIT_COLORS[0]);
      expect(getFruitJuiceColor(99)).toBe(fallback);
    });
  });
});
