// Game context dùng chung giữa các scene — giữ GameEngine + best score tải từ SDK.
import { GameEngine } from './logic/GameEngine';
import { MECHANICS } from './logic/mechanics';
import { sdk } from './sdk-instance';

class GameContext {
  engine: GameEngine;
  bestScoreLoaded = false;

  constructor() {
    this.engine = new GameEngine(MECHANICS, { bestScore: 0 });
  }

  async loadBest(): Promise<number> {
    if (this.bestScoreLoaded) return this.engine.bestScore;
    const data = await sdk.loadData() as { best_score?: number } | null;
    if (data && typeof data.best_score === 'number') {
      this.engine = new GameEngine(MECHANICS, { bestScore: data.best_score, totalGamesPlayed: this.engine.totalGamesPlayed });
    }
    this.bestScoreLoaded = true;
    return this.engine.bestScore;
  }

  async saveBest(): Promise<void> {
    await sdk.saveData({
      schema_version: 1,
      best_score: this.engine.bestScore,
      level: this.engine.getLevel(),
      total_games_played: this.engine.totalGamesPlayed,
      last_updated_ts: Date.now(),
    });
  }
}

export const ctx = new GameContext();
