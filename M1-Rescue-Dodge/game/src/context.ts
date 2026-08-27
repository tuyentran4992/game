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
    const data = await sdk.loadData() as {
      best_score?: number;
      total_fish?: number;
      total_games_played?: number;
      unlocked_skins?: string[];
      selected_skin?: string;
      quests?: Quest[];
    } | null;

    if (data && (typeof data.best_score === 'number' || typeof data.total_fish === 'number')) {
      this.engine = new GameEngine(MECHANICS, {
        bestScore: data.best_score ?? 0,
        totalFish: data.total_fish ?? 0,
        totalGamesPlayed: data.total_games_played ?? this.engine.totalGamesPlayed,
        unlockedSkins: data.unlocked_skins,
        selectedSkin: data.selected_skin,
        quests: data.quests,
      });
    }
    this.bestScoreLoaded = true;
    return this.engine.bestScore;
  }

  async saveBest(): Promise<void> {
    await sdk.saveData({
      schema_version: 2,
      best_score: this.engine.bestScore,
      total_fish: this.engine.totalFish,
      level: this.engine.getLevel(),
      total_games_played: this.engine.totalGamesPlayed,
      unlocked_skins: this.engine.unlockedSkins,
      selected_skin: this.engine.selectedSkin,
      quests: this.engine.quests,
      last_updated_ts: Date.now(),
    });
  }
}

export const ctx = new GameContext();
