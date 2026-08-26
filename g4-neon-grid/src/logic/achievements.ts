/**
 * Neon Grid — Achievement System
 *
 * 15 Achievements with progress evaluation and skin unlock mapping.
 */

import type { Achievement, GameStats } from './types';

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'ACH-01', name: 'First Blood', description: 'Score ≥ 100 points', rewardSkinId: null },
  { id: 'ACH-02', name: 'Century', description: 'Score ≥ 1,000 points', rewardSkinId: 1 },
  { id: 'ACH-03', name: 'Neon Master', description: 'Score ≥ 10,000 points', rewardSkinId: null },
  { id: 'ACH-04', name: 'Grid Legend', description: 'Score ≥ 50,000 points', rewardSkinId: 2 },
  { id: 'ACH-05', name: 'Clean Sweep', description: 'Clear 3 lines in 1 move', rewardSkinId: null },
  { id: 'ACH-06', name: 'Combo King', description: 'Reach Combo ×3', rewardSkinId: 5 },
  { id: 'ACH-07', name: 'Perfect Clear', description: 'All-clear (completely empty grid)', rewardSkinId: null },
  { id: 'ACH-08', name: 'Shape Collector', description: 'Use all 13 shapes at least once', rewardSkinId: 6 },
  { id: 'ACH-09', name: 'Line Worker', description: 'Clear 100 lines total', rewardSkinId: 3 },
  { id: 'ACH-10', name: 'Marathon', description: 'Score ≥ 25,000 in a single game', rewardSkinId: null },
  { id: 'ACH-11', name: 'Daily Player', description: 'Complete 1 Daily Challenge', rewardSkinId: null },
  { id: 'ACH-12', name: 'Week Warrior', description: 'Complete 7 Daily Challenges', rewardSkinId: 4 },
  { id: 'ACH-13', name: 'Bomb User', description: 'Use Bomb power-up 5 times', rewardSkinId: null },
  { id: 'ACH-14', name: 'Shuffler', description: 'Use Shuffle power-up 5 times', rewardSkinId: null },
  { id: 'ACH-15', name: 'No More Moves', description: 'Place all 3 pieces in a set perfectly', rewardSkinId: null },
];

export interface RunSummary {
  score: number;
  maxCombo: number;
  maxLinesInSingleMove: number;
  hadAllClear: boolean;
  totalLinesThisGame: number;
  isDailyCompleted?: boolean;
  usedAll3Pieces?: boolean;
}

export function evaluateAchievements(
  stats: GameStats,
  currentRun: RunSummary,
  unlockedAchievements: Record<string, boolean>,
  dailyChallengesCompletedCount: number = 0
): Achievement[] {
  const newUnlocks: Achievement[] = [];

  const check = (id: string, condition: boolean) => {
    if (!unlockedAchievements[id] && condition) {
      const ach = ACHIEVEMENTS.find(a => a.id === id);
      if (ach) {
        newUnlocks.push(ach);
      }
    }
  };

  // ACH-01: Score >= 100
  check('ACH-01', currentRun.score >= 100 || stats.totalScore >= 100);

  // ACH-02: Score >= 1000
  check('ACH-02', currentRun.score >= 1000 || stats.totalScore >= 1000);

  // ACH-03: Score >= 10000
  check('ACH-03', currentRun.score >= 10000 || stats.totalScore >= 10000);

  // ACH-04: Score >= 50000
  check('ACH-04', currentRun.score >= 50000 || stats.totalScore >= 50000);

  // ACH-05: Clear 3 lines in 1 move
  check('ACH-05', currentRun.maxLinesInSingleMove >= 3);

  // ACH-06: Combo x3
  check('ACH-06', currentRun.maxCombo >= 3 || stats.maxCombo >= 3);

  // ACH-07: All-clear
  check('ACH-07', currentRun.hadAllClear);

  // ACH-08: Use all 13 shapes
  const allShapesUsed = stats.shapesUsed.length >= 13 && stats.shapesUsed.slice(0, 13).every(count => count > 0);
  check('ACH-08', allShapesUsed);

  // ACH-09: Clear 100 lines total
  check('ACH-09', stats.totalLines >= 100);

  // ACH-10: Score >= 25000 in 1 game
  check('ACH-10', currentRun.score >= 25000);

  // ACH-11: Complete 1 daily challenge
  check('ACH-11', dailyChallengesCompletedCount >= 1 || !!currentRun.isDailyCompleted);

  // ACH-12: Complete 7 daily challenges
  check('ACH-12', dailyChallengesCompletedCount >= 7);

  // ACH-13: Bomb used 5 times
  check('ACH-13', stats.powerUpsUsed.bomb >= 5);

  // ACH-14: Shuffle used 5 times
  check('ACH-14', stats.powerUpsUsed.shuffle >= 5);

  // ACH-15: Perfect set placement
  check('ACH-15', !!currentRun.usedAll3Pieces);

  return newUnlocks;
}
