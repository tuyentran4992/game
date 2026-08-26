import { describe, it, expect } from 'vitest';
import { ACHIEVEMENTS, evaluateAchievements } from '../logic/achievements';
import { DEFAULT_STATS } from '../logic/save-manager';

describe('Achievements System', () => {
  it('should define exactly 15 achievements', () => {
    expect(ACHIEVEMENTS.length).toBe(15);
  });

  it('should unlock ACH-01 when score is >= 100', () => {
    const stats = { ...DEFAULT_STATS };
    const run = {
      score: 150,
      maxCombo: 0,
      maxLinesInSingleMove: 1,
      hadAllClear: false,
      totalLinesThisGame: 1,
    };
    const unlocked = evaluateAchievements(stats, run, {});
    expect(unlocked.some(a => a.id === 'ACH-01')).toBe(true);
  });

  it('should unlock ACH-06 and ACH-02 with reward skins', () => {
    const stats = { ...DEFAULT_STATS };
    const run = {
      score: 1200,
      maxCombo: 3,
      maxLinesInSingleMove: 2,
      hadAllClear: false,
      totalLinesThisGame: 4,
    };
    const unlocked = evaluateAchievements(stats, run, {});
    expect(unlocked.some(a => a.id === 'ACH-02' && a.rewardSkinId === 1)).toBe(true);
    expect(unlocked.some(a => a.id === 'ACH-06' && a.rewardSkinId === 5)).toBe(true);
  });

  it('should unlock ACH-08 when all 13 shapes have been used', () => {
    const stats = {
      ...DEFAULT_STATS,
      shapesUsed: new Array(13).fill(2),
    };
    const run = {
      score: 50,
      maxCombo: 0,
      maxLinesInSingleMove: 0,
      hadAllClear: false,
      totalLinesThisGame: 0,
    };
    const unlocked = evaluateAchievements(stats, run, {});
    expect(unlocked.some(a => a.id === 'ACH-08')).toBe(true);
  });
});
