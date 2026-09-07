// Slice Studio — core/scoring.ts (Tier A, pure TS, no Phaser)
// Star thresholds application + GHOST CUT streak (>=95%).

import type { SliceLevel } from '../level/levels';

export interface Award {
  stars: 0 | 1 | 2 | 3;
  ghost: boolean;
  /** short feedback key for the HUD (Tier B renders text/icons from these). */
  label: 'perfect' | 'great' | 'good' | 'chunk-lost' | 'keep-going';
}

export const GHOST_PCT = 95;

/**
 * Apply level thresholds to an accuracy pct.
 * M2 (reveal) levels already carry +5 on their 3-star threshold (levels.ts).
 * Early release never fails (onboarding rule) but caps at 1 star.
 * No-go hit = chunk lost = 0 stars (score stays for retry).
 */
export function awardStars(
  pct: number,
  level: SliceLevel,
  flags: { releasedEarly: boolean; noGoHit: boolean },
): Award {
  if (flags.noGoHit) return { stars: 0, ghost: false, label: 'chunk-lost' };
  const [t1, t2, t3] = level.thresholds;
  let stars: 0 | 1 | 2 | 3 = 0;
  if (pct >= t1) stars = 1;
  if (pct >= t2) stars = 2;
  if (pct >= t3) stars = 3;
  if (flags.releasedEarly && stars > 1) stars = 1;
  const ghost = pct >= GHOST_PCT && stars === 3 && !flags.releasedEarly;
  const label: Award['label'] =
    flags.releasedEarly && stars <= 1 ? 'keep-going' : stars === 3 ? (ghost ? 'perfect' : 'great') : stars >= 1 ? 'good' : 'keep-going';
  return { stars, ghost, label };
}

/** Streak bookkeeping across levels. Pure: returns the next state. */
export function nextStreak(streak: number, ghost: boolean): number {
  return ghost ? streak + 1 : 0;
}

/** Total stars for the end screen. */
export function totalStars(awards: readonly { stars: number }[]): number {
  return awards.reduce((s, a) => s + a.stars, 0);
}
