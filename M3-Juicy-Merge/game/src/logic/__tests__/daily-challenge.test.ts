import { describe, it, expect } from 'vitest';
import {
  getTodayDateString,
  getDailySeed,
  isDailyCompletedToday,
  createDailyChallengeState,
  evaluateDailyVictory,
  DAILY_FRUIT_LIMIT,
  DAILY_TARGET_SCORE,
} from '../daily-challenge';

describe('Daily Challenge Logic: Seed & Victory rules', () => {
  it('getDailySeed produces deterministic seeds for same date string', () => {
    const seed1 = getDailySeed('2026-08-23');
    const seed2 = getDailySeed('2026-08-23');
    const seed3 = getDailySeed('2026-08-24');

    expect(seed1).toBe(seed2);
    expect(seed1).not.toBe(seed3);
    expect(seed1).toBeGreaterThan(0);
  });

  it('getTodayDateString formats dates as YYYY-MM-DD', () => {
    const mockDate = new Date(2026, 7, 23); // Aug 23, 2026
    expect(getTodayDateString(mockDate)).toBe('2026-08-23');
  });

  it('isDailyCompletedToday returns true only if lastCompletedDate matches today', () => {
    expect(isDailyCompletedToday('2026-08-23', '2026-08-23')).toBe(true);
    expect(isDailyCompletedToday('2026-08-22', '2026-08-23')).toBe(false);
    expect(isDailyCompletedToday(null, '2026-08-23')).toBe(false);
  });

  it('createDailyChallengeState initializes with 50 fruits and 1500 target score', () => {
    const state = createDailyChallengeState('2026-08-23');
    expect(state.isDailyMode).toBe(true);
    expect(state.fruitsRemaining).toBe(DAILY_FRUIT_LIMIT);
    expect(state.targetScore).toBe(DAILY_TARGET_SCORE);
    expect(state.isVictory).toBe(false);
  });

  it('evaluateDailyVictory returns true when score reaches target', () => {
    expect(evaluateDailyVictory(300, 400)).toBe(false);
    expect(evaluateDailyVictory(400, 400)).toBe(true);
    expect(evaluateDailyVictory(550, 400)).toBe(true);
  });
});
