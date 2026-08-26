import { describe, it, expect, beforeEach } from 'vitest';
import { saveManager, DEFAULT_SAVE_DATA } from '../logic/save-manager';

// In-memory localStorage mock for node environment
const store: Record<string, string> = {};
globalThis.localStorage = {
  getItem: (key: string) => store[key] || null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); },
  length: 0,
  key: (i: number) => null,
} as unknown as Storage;

describe('Save Manager', () => {
  beforeEach(() => {
    localStorage.clear();
    saveManager.load();
  });

  it('should initialize with default save data', () => {
    const data = saveManager.getData();
    expect(data.version).toBe(1);
    expect(data.skins.unlocked).toContain(0);
    expect(saveManager.isSkinUnlocked(0)).toBe(true);
  });

  it('should unlock and switch active skin', () => {
    expect(saveManager.unlockSkin(1)).toBe(true);
    expect(saveManager.isSkinUnlocked(1)).toBe(true);

    saveManager.setActiveSkinId(1);
    expect(saveManager.getActiveSkinId()).toBe(1);
  });

  it('should record game stats and achievement progress', () => {
    saveManager.recordGameStats(5, 500, 2);
    const data = saveManager.getData();
    expect(data.stats.totalLines).toBe(5);
    expect(data.stats.totalScore).toBe(500);
    expect(data.stats.maxCombo).toBe(2);

    expect(saveManager.unlockAchievement('ACH-01')).toBe(true);
    expect(saveManager.getUnlockedAchievementsCount()).toBe(1);
  });
});
