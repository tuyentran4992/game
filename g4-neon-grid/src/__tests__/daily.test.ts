import { describe, it, expect } from 'vitest';
import { createDailyChallenge, getDailyGoalLines, isDailyAvailableToday } from '../logic/daily';
import { dateToSeed, createMulberry32 } from '../logic/prng';
import { pickPieces } from '../logic/shapes';

describe('Daily Challenge System', () => {
  it('should generate deterministic seeds and PRNG sequence for a specific date', () => {
    const fixedDate = new Date(2026, 7, 26); // Aug 26, 2026
    const seed1 = dateToSeed(fixedDate);
    const seed2 = dateToSeed(fixedDate);
    expect(seed1).toBe(seed2);

    const rng1 = createMulberry32(seed1);
    const rng2 = createMulberry32(seed2);

    const pieces1 = pickPieces(rng1);
    const pieces2 = pickPieces(rng2);

    expect(pieces1).toEqual(pieces2);
  });

  it('should calculate target lines between 10 and 17', () => {
    const date = new Date();
    const goal = getDailyGoalLines(date);
    expect(goal).toBeGreaterThanOrEqual(10);
    expect(goal).toBeLessThanOrEqual(17);
  });

  it('should indicate daily is available when not yet completed', () => {
    expect(isDailyAvailableToday(undefined)).toBe(true);
    expect(isDailyAvailableToday({ lastDate: '2026-01-01', completed: true })).toBe(true);
  });
});
