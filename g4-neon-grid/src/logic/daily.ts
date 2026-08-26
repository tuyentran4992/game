/**
 * Neon Grid — Daily Challenge Logic
 *
 * Seeded daily challenge generation, target calculation, and completion status.
 */

import { dateToSeed, getDateString, createMulberry32 } from './prng';
import type { DailyChallengeState } from './types';

export function getDailyGoalLines(date: Date = new Date()): number {
  const dayOfWeek = date.getDay(); // 0 (Sun) - 6 (Sat)
  // Base 10 lines + dayOfWeek (10 to 16 lines)
  return 10 + (dayOfWeek === 0 ? 7 : dayOfWeek);
}

export function createDailyChallenge(date: Date = new Date(), savedDaily?: { lastDate: string; completed: boolean; attemptsUsed: number }): DailyChallengeState {
  const dateStr = getDateString(date);
  const seed = dateToSeed(date);
  const goalLines = getDailyGoalLines(date);

  const isToday = savedDaily?.lastDate === dateStr;
  const completed = isToday ? (savedDaily?.completed ?? false) : false;
  const attemptsUsed = isToday ? (savedDaily?.attemptsUsed ?? 0) : 0;

  // Reward rotates through locked skins (1 to 6) based on seed
  const rewardSkinId = 1 + (seed % 6);

  return {
    dateStr,
    seed,
    goalLines,
    linesCleared: 0,
    completed,
    attemptsUsed,
    rewardSkinId,
  };
}

export function isDailyAvailableToday(savedDaily?: { lastDate: string; completed: boolean }): boolean {
  const todayStr = getDateString(new Date());
  if (!savedDaily || savedDaily.lastDate !== todayStr) {
    return true; // New day, uncompleted
  }
  return !savedDaily.completed;
}
