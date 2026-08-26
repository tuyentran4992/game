/**
 * Neon Grid — Save Data Manager
 *
 * Handles Save Schema v1 persistence, stat accumulation, and sync with @game/sdk.
 */

import { sdk } from '@game/sdk';
import type { SaveSchemaV1, GameStats } from './types';
import { getDateString } from './prng';

export const SAVE_KEY = 'neon_grid_save_v1';

export const DEFAULT_STATS: GameStats = {
  totalScore: 0,
  totalLines: 0,
  totalGames: 0,
  maxCombo: 0,
  shapesUsed: new Array(13).fill(0),
  powerUpsUsed: {
    undo: 0,
    shuffle: 0,
    bomb: 0,
    extraSlot: 0,
  },
};

export const DEFAULT_SAVE_DATA: SaveSchemaV1 = {
  version: 1,
  score: 0,
  achievements: {},
  skins: {
    unlocked: [0], // Neon Cyan unlocked by default
    activeSkin: 0,
  },
  daily: {
    lastDate: getDateString(),
    completed: false,
    attemptsUsed: 0,
  },
  stats: { ...DEFAULT_STATS },
};

class SaveManager {
  private data: SaveSchemaV1 = { ...DEFAULT_SAVE_DATA };

  constructor() {
    this.load();
  }

  public load(): SaveSchemaV1 {
    if (typeof localStorage === 'undefined') {
      return this.data;
    }

    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          this.data = this.migrate(parsed);
          return this.data;
        }
      }
    } catch {
      // Fallback
    }

    // Check legacy game_save format
    try {
      const legacyRaw = localStorage.getItem('game_save');
      if (legacyRaw) {
        const legacyParsed = JSON.parse(legacyRaw);
        if (legacyParsed?.score) {
          this.data.score = legacyParsed.score;
        }
      }
    } catch {
      // ignore
    }

    return this.data;
  }

  private migrate(parsed: Record<string, unknown>): SaveSchemaV1 {
    return {
      version: 1,
      score: typeof parsed.score === 'number' ? parsed.score : 0,
      achievements: (parsed.achievements as Record<string, boolean>) || {},
      skins: {
        unlocked: Array.isArray((parsed.skins as any)?.unlocked) ? (parsed.skins as any).unlocked : [0],
        activeSkin: typeof (parsed.skins as any)?.activeSkin === 'number' ? (parsed.skins as any).activeSkin : 0,
      },
      daily: {
        lastDate: typeof (parsed.daily as any)?.lastDate === 'string' ? (parsed.daily as any).lastDate : getDateString(),
        completed: Boolean((parsed.daily as any)?.completed),
        attemptsUsed: typeof (parsed.daily as any)?.attemptsUsed === 'number' ? (parsed.daily as any).attemptsUsed : 0,
      },
      stats: {
        totalScore: typeof (parsed.stats as any)?.totalScore === 'number' ? (parsed.stats as any).totalScore : 0,
        totalLines: typeof (parsed.stats as any)?.totalLines === 'number' ? (parsed.stats as any).totalLines : 0,
        totalGames: typeof (parsed.stats as any)?.totalGames === 'number' ? (parsed.stats as any).totalGames : 0,
        maxCombo: typeof (parsed.stats as any)?.maxCombo === 'number' ? (parsed.stats as any).maxCombo : 0,
        shapesUsed: Array.isArray((parsed.stats as any)?.shapesUsed) && (parsed.stats as any).shapesUsed.length === 13
          ? (parsed.stats as any).shapesUsed
          : new Array(13).fill(0),
        powerUpsUsed: {
          undo: typeof (parsed.stats as any)?.powerUpsUsed?.undo === 'number' ? (parsed.stats as any).powerUpsUsed.undo : 0,
          shuffle: typeof (parsed.stats as any)?.powerUpsUsed?.shuffle === 'number' ? (parsed.stats as any).powerUpsUsed.shuffle : 0,
          bomb: typeof (parsed.stats as any)?.powerUpsUsed?.bomb === 'number' ? (parsed.stats as any).powerUpsUsed.bomb : 0,
          extraSlot: typeof (parsed.stats as any)?.powerUpsUsed?.extraSlot === 'number' ? (parsed.stats as any).powerUpsUsed.extraSlot : 0,
        },
      },
    };
  }

  public save(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
        localStorage.setItem('game_save', JSON.stringify({ score: this.data.score }));
      } catch {
        // ignore
      }
    }

    try {
      sdk.saveData(this.data as unknown as Record<string, unknown>);
    } catch {
      // ignore
    }
  }

  public getData(): SaveSchemaV1 {
    return this.data;
  }

  public getBestScore(): number {
    return this.data.score;
  }

  public setBestScore(score: number): void {
    if (score > this.data.score) {
      this.data.score = score;
      this.save();
    }
  }

  public getActiveSkinId(): number {
    return this.data.skins.activeSkin;
  }

  public setActiveSkinId(skinId: number): void {
    this.data.skins.activeSkin = skinId;
    if (!this.data.skins.unlocked.includes(skinId)) {
      this.data.skins.unlocked.push(skinId);
    }
    this.save();
  }

  public unlockSkin(skinId: number): boolean {
    if (!this.data.skins.unlocked.includes(skinId)) {
      this.data.skins.unlocked.push(skinId);
      this.save();
      return true;
    }
    return false;
  }

  public isSkinUnlocked(skinId: number): boolean {
    return skinId === 0 || this.data.skins.unlocked.includes(skinId);
  }

  public unlockAchievement(achievementId: string): boolean {
    if (!this.data.achievements[achievementId]) {
      this.data.achievements[achievementId] = true;
      this.save();
      return true;
    }
    return false;
  }

  public getUnlockedAchievementsCount(): number {
    return Object.keys(this.data.achievements).filter(k => this.data.achievements[k]).length;
  }

  public recordGameStats(lines: number, score: number, combo: number): void {
    this.data.stats.totalGames++;
    this.data.stats.totalLines += lines;
    this.data.stats.totalScore += score;
    if (combo > this.data.stats.maxCombo) {
      this.data.stats.maxCombo = combo;
    }
    this.save();
  }

  public recordShapeUsage(shapeIndex: number): void {
    if (shapeIndex >= 0 && shapeIndex < 13) {
      this.data.stats.shapesUsed[shapeIndex] = (this.data.stats.shapesUsed[shapeIndex] || 0) + 1;
      this.save();
    }
  }

  public recordPowerUpUsage(type: 'undo' | 'shuffle' | 'bomb' | 'extraSlot'): void {
    this.data.stats.powerUpsUsed[type] = (this.data.stats.powerUpsUsed[type] || 0) + 1;
    this.save();
  }

  public markDailyComplete(): void {
    this.data.daily.lastDate = getDateString();
    this.data.daily.completed = true;
    this.save();
  }
}

export const saveManager = new SaveManager();
