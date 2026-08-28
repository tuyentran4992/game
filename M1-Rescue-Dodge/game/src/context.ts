// Game context dùng chung giữa các scene — giữ GameEngine + best score tải từ SDK.
import { GameEngine, Quest } from './logic/GameEngine';
import { MECHANICS } from './logic/mechanics';
import { sdk } from '@game/sdk';

class GameContext {
  engine: GameEngine;
  bestScoreLoaded = false;

  constructor() {
    this.engine = new GameEngine(MECHANICS, { bestScore: 0 });
  }

  async loadBest(): Promise<number> {
    if (this.bestScoreLoaded) return this.engine.bestScore;
    try {
      await sdk.initialize();
      const raw = await sdk.loadData();
      let data: any = raw;
      if (typeof raw === 'string') {
        try { data = JSON.parse(raw); } catch { /* ignore */ }
      }

      if (data && typeof data === 'object') {
        const best = typeof data.best_score === 'number' ? data.best_score : (typeof data.bestScore === 'number' ? data.bestScore : 0);
        const fish = typeof data.total_fish === 'number' ? data.total_fish : (typeof data.totalFish === 'number' ? data.totalFish : 0);
        const played = typeof data.total_games_played === 'number' ? data.total_games_played : (typeof data.totalGamesPlayed === 'number' ? data.totalGamesPlayed : this.engine.totalGamesPlayed);
        const skins = Array.isArray(data.unlocked_skins) ? data.unlocked_skins : (Array.isArray(data.unlockedSkins) ? data.unlockedSkins : undefined);
        const selSkin = typeof data.selected_skin === 'string' ? data.selected_skin : (typeof data.selectedSkin === 'string' ? data.selectedSkin : undefined);
        const quests = Array.isArray(data.quests) ? data.quests : undefined;

        this.engine = new GameEngine(MECHANICS, {
          bestScore: best,
          totalFish: fish,
          totalGamesPlayed: played,
          unlockedSkins: skins,
          selectedSkin: selSkin,
          quests: quests,
        });
      }
    } catch (e) {
      console.warn('[Context] loadBest error:', e);
    }
    this.bestScoreLoaded = true;
    return this.engine.bestScore;
  }

  async saveBest(): Promise<void> {
    try {
      await sdk.initialize();
      await sdk.saveData({
        schema_version: 2,
        best_score: this.engine.bestScore,
        bestScore: this.engine.bestScore,
        total_fish: this.engine.totalFish,
        totalFish: this.engine.totalFish,
        level: this.engine.getLevel(),
        total_games_played: this.engine.totalGamesPlayed,
        totalGamesPlayed: this.engine.totalGamesPlayed,
        unlocked_skins: this.engine.unlockedSkins,
        unlockedSkins: this.engine.unlockedSkins,
        selected_skin: this.engine.selectedSkin,
        selectedSkin: this.engine.selectedSkin,
        quests: this.engine.quests,
        last_updated_ts: Date.now(),
      });
    } catch (e) {
      console.warn('[Context] saveBest error:', e);
    }
  }
}

export const ctx = new GameContext();
