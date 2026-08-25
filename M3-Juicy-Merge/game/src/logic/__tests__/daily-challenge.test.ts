import { describe, it, expect } from 'vitest';
import {
  getTodayDateString,
  getDailySeed,
  isDailyCompletedToday,
  createDailyChallengeState,
  evaluateDailyVictory,
  getDailyDifficulty,
  getUnlockedMilestoneTiers,
  checkMilestoneJustUnlocked,
  DAILY_FRUIT_LIMIT,
  DAILY_TARGET_SCORE,
} from '../daily-challenge';

describe('Daily Challenge Logic: Seed, Progressive Difficulty & Milestones', () => {
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

  it('getDailyDifficulty scales up difficulty from Day 1 to Day 12+', () => {
    const day1 = getDailyDifficulty(0); // 0 completed -> Day 1
    expect(day1.dayLevel).toBe(1);
    expect(day1.fruitLimit).toBe(50);
    expect(day1.targetScore).toBe(350);

    const day3 = getDailyDifficulty(2); // 2 completed -> Day 3
    expect(day3.dayLevel).toBe(3);
    expect(day3.targetScore).toBe(400);
    expect(day3.unlockedLegendaryTier).toBe(12);

    const day6 = getDailyDifficulty(5); // 5 completed -> Day 6
    expect(day6.dayLevel).toBe(6);
    expect(day6.fruitLimit).toBe(46);
    expect(day6.targetScore).toBe(500);
    expect(day6.unlockedLegendaryTier).toBe(13);

    const day12 = getDailyDifficulty(11); // 11 completed -> Day 12
    expect(day12.dayLevel).toBe(12);
    expect(day12.fruitLimit).toBe(42);
    expect(day12.targetScore).toBe(700);
    expect(day12.unlockedLegendaryTier).toBe(14);
  });

  it('milestone checker unlocks dragonfruit (tier 12) at day 3, durian (tier 13) at day 6, galaxy (tier 14) at day 12', () => {
    expect(getUnlockedMilestoneTiers(2)).toEqual([]);
    expect(getUnlockedMilestoneTiers(3)).toEqual([12]);
    expect(getUnlockedMilestoneTiers(5)).toEqual([12]);
    expect(getUnlockedMilestoneTiers(6)).toEqual([12, 13]);
    expect(getUnlockedMilestoneTiers(12)).toEqual([12, 13, 14]);

    expect(checkMilestoneJustUnlocked(3)?.name).toContain('Dragon Fruit');
    expect(checkMilestoneJustUnlocked(6)?.name).toContain('Durian');
    expect(checkMilestoneJustUnlocked(12)?.name).toContain('Galaxy Watermelon');
    expect(checkMilestoneJustUnlocked(4)).toBeNull();
  });

  it('createDailyChallengeState initializes with progressive difficulty', () => {
    const state = createDailyChallengeState('2026-08-23', 0);
    expect(state.isDailyMode).toBe(true);
    expect(state.dayLevel).toBe(1);
    expect(state.fruitsRemaining).toBe(DAILY_FRUIT_LIMIT);
    expect(state.targetScore).toBe(DAILY_TARGET_SCORE);
    expect(state.isVictory).toBe(false);
  });

  it('evaluateDailyVictory returns true when score reaches target', () => {
    expect(evaluateDailyVictory(300, 350)).toBe(false);
    expect(evaluateDailyVictory(350, 350)).toBe(true);
    expect(evaluateDailyVictory(550, 350)).toBe(true);
  });
});
