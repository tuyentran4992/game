/**
 * Neon Grid — Scoring
 *
 * Pure TS scoring logic.
 */

export interface ScoreEvent {
  linesCleared: number;
  rowsCleared: number;
  colsCleared: number;
  combo: number;
  pointsEarned: number;
}

/**
 * Calculate points for clearing lines.
 *
 * Base: 100 per line
 * Combo bonus: +50% per consecutive clear
 * All-clear bonus (full grid empty): x2
 */
export function calculatePoints(
  linesCleared: number,
  combo: number,
  isAllClear: boolean,
): number {
  if (linesCleared === 0) return 0;

  let base = linesCleared * 100;

  // Combo multiplier
  base = Math.floor(base * (1 + combo * 0.5));

  // All-clear bonus
  if (isAllClear) {
    base *= 2;
  }

  return base;
}

/**
 * Calculate score for a single placement (with cleared lines result).
 */
export function scorePlacement(
  clearedRows: number[],
  clearedCols: number[],
  combo: number,
  gridEmpty: boolean,
): ScoreEvent {
  const totalLines = clearedRows.length + clearedCols.length;
  return {
    linesCleared: totalLines,
    rowsCleared: clearedRows.length,
    colsCleared: clearedCols.length,
    combo,
    pointsEarned: calculatePoints(totalLines, combo, gridEmpty),
  };
}

/**
 * Calculate level from score.
 */
export function getLevel(score: number): number {
  return Math.floor(score / 500) + 1;
}

/**
 * Format score with commas.
 */
export function formatScore(score: number): string {
  return score.toLocaleString('en-US');
}