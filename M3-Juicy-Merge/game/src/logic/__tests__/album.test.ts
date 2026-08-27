import { describe, it, expect } from 'vitest';
import {
  FRUIT_ENCYCLOPEDIA,
  checkNewFruitUnlocked,
  getAlbumProgress,
} from '../album';

describe('Album Logic: Fruit Encyclopedia & Progress', () => {
  it('contains all 15 tiers of fruits with full info', () => {
    expect(FRUIT_ENCYCLOPEDIA.length).toBe(15);
    expect(FRUIT_ENCYCLOPEDIA[0].name).toBe('Cherry');
    expect(FRUIT_ENCYCLOPEDIA[4].name).toBe('Pomegranate');
    expect(FRUIT_ENCYCLOPEDIA[5].name).toBe('Orange');
    expect(FRUIT_ENCYCLOPEDIA[6].name).toBe('Apple');
    expect(FRUIT_ENCYCLOPEDIA[10].name).toBe('Melon');
    expect(FRUIT_ENCYCLOPEDIA[11].name).toBe('Watermelon');
    expect(FRUIT_ENCYCLOPEDIA[12].name).toBe('Dragon Fruit');
    expect(FRUIT_ENCYCLOPEDIA[13].name).toBe('Durian');
    expect(FRUIT_ENCYCLOPEDIA[14].name).toBe('Galaxy Watermelon');
  });

  it('checkNewFruitUnlocked detects first-time discovered fruits and updates set', () => {
    const unlocked = new Set<number>([0, 1]); // Cherry, Strawberry already unlocked
    
    // Check strawberry again -> not new
    const res1 = checkNewFruitUnlocked(1, unlocked);
    expect(res1.isNewDiscovery).toBe(false);
    expect(unlocked.size).toBe(2);

    // Check peach (tier 8) -> new discovery!
    const res2 = checkNewFruitUnlocked(8, unlocked);
    expect(res2.isNewDiscovery).toBe(true);
    expect(res2.fruitInfo.name).toBe('Peach');
    expect(unlocked.has(8)).toBe(true);
    expect(unlocked.size).toBe(3);
  });

  it('getAlbumProgress calculates progress percentage and assigns appropriate titles', () => {
    const emptyProgress = getAlbumProgress([]);
    expect(emptyProgress.percentage).toBe(0);
    expect(emptyProgress.title).toBe('Novice Planter 🌱');
    expect(emptyProgress.isComplete).toBe(false);

    const midProgress = getAlbumProgress([0, 1, 2, 3, 4, 5]);
    expect(midProgress.unlockedCount).toBe(6);
    expect(midProgress.percentage).toBe(40);
    expect(midProgress.title).toBe('Hardworking Farmer 🍎');
    expect(midProgress.isComplete).toBe(false);

    const twelveProgress = getAlbumProgress(Array.from({ length: 12 }, (_, i) => i));
    expect(twelveProgress.unlockedCount).toBe(12);
    expect(twelveProgress.percentage).toBe(80);
    expect(twelveProgress.title).toBe('Master Harvester 👑');

    const fullTiers = Array.from({ length: 15 }, (_, i) => i);
    const completeProgress = getAlbumProgress(fullTiers);
    expect(completeProgress.unlockedCount).toBe(15);
    expect(completeProgress.percentage).toBe(100);
    expect(completeProgress.title).toBe('Cosmic Fruit King 🌌');
    expect(completeProgress.isComplete).toBe(true);
  });
});
