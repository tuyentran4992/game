import { describe, it, expect } from 'vitest';
import { SKINS, getSkinById } from '../logic/skins';

describe('Skins System', () => {
  it('should define 7 unique skins', () => {
    expect(SKINS.length).toBe(7);
    const ids = SKINS.map(s => s.id);
    expect(new Set(ids).size).toBe(7);
  });

  it('should have Neon Cyan unlocked by default with id 0', () => {
    const skin0 = getSkinById(0);
    expect(skin0.name).toBe('Neon Cyan');
    expect(skin0.requiredAchievementId).toBeNull();
  });

  it('should provide complete 7 block colors for each skin palette', () => {
    SKINS.forEach(skin => {
      expect(skin.palette.blockColors.length).toBe(7);
      expect(typeof skin.palette.gridColor).toBe('number');
      expect(typeof skin.palette.scoreColor).toBe('number');
    });
  });
});
