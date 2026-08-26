/**
 * Neon Grid — Types Definition
 *
 * Pure TypeScript types for game logic, achievements, skins, daily challenge,
 * power-ups, and persistence schema.
 */

export interface Achievement {
  id: string; // ACH-01 ... ACH-15
  name: string;
  description: string;
  rewardSkinId: number | null;
  unlocked?: boolean;
}

export interface SkinPalette {
  name: string;
  gridColor: number;
  gridBg: number;
  hudBg: number;
  hudBorder: number;
  scoreColor: number;
  blockColors: Array<{
    fill: number;
    light: number;
    dark: number;
    glow: number;
    name: string;
  }>;
}

export interface Skin {
  id: number; // 0-6
  name: string;
  unlockCondition: string;
  requiredAchievementId: string | null;
  palette: SkinPalette;
}

export interface DailyChallengeState {
  dateStr: string; // YYYY-MM-DD
  seed: number;
  goalLines: number;
  linesCleared: number;
  completed: boolean;
  attemptsUsed: number;
  rewardSkinId: number;
}

export interface PowerUpState {
  undoRemainingFree: number;
  shuffleCount: number;
  bombCount: number;
}

export interface GameStats {
  totalScore: number;
  totalLines: number;
  totalGames: number;
  maxCombo: number;
  shapesUsed: number[]; // count per shape index (0-12)
  powerUpsUsed: {
    undo: number;
    shuffle: number;
    bomb: number;
    extraSlot: number;
  };
}

export interface SaveSchemaV1 {
  version: 1;
  score: number; // Best score
  achievements: Record<string, boolean>; // ACH-xx: true
  skins: {
    unlocked: number[]; // skin IDs [0, 1, ...]
    activeSkin: number; // current skin ID
  };
  daily: {
    lastDate: string; // YYYY-MM-DD
    completed: boolean;
    attemptsUsed: number;
  };
  stats: GameStats;
}
