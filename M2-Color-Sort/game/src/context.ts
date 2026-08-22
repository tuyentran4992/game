// Game context M2 — giữ level/best-level/best-moves tải/lưu qua SDK (M2-08).
import { sdk } from './sdk-instance';

interface SavedGame {
  schema_version: number;
  best_level: number;
  current_level: number;
  best_moves: number;
  last_updated_ts: number;
  flags?: { tutorial_seen?: boolean };
}

class GameContext {
  bestLevel = 0;
  currentLevel = 1;
  bestMoves = 0;
  tutorialSeen = false;
  private loaded = false;

  async load(): Promise<void> {
    if (this.loaded) return;
    try {
      const data = await sdk.loadData() as Partial<SavedGame> | null;
      if (data) {
        this.bestLevel = typeof data.best_level === 'number' ? data.best_level : 0;
        this.currentLevel = typeof data.current_level === 'number' ? Math.max(1, data.current_level) : 1;
        this.bestMoves = typeof data.best_moves === 'number' ? data.best_moves : 0;
        this.tutorialSeen = !!data.flags?.tutorial_seen;
      }
    } catch (e) {
      console.warn('loadData failed, starting fresh', e);
    }
    this.loaded = true;
  }

  async save(): Promise<void> {
    try {
      await sdk.saveData({
        schema_version: 1,
        best_level: this.bestLevel,
        current_level: this.currentLevel,
        best_moves: this.bestMoves,
        last_updated_ts: Date.now(),
        flags: { tutorial_seen: this.tutorialSeen },
      } as SavedGame);
    } catch (e) {
      console.warn('saveData failed', e);
    }
  }

  // Gọi khi clear 1 level → cập nhật best + sang level kế (M2-08).
  onLevelClear(level: number, moves: number): void {
    if (level > this.bestLevel) this.bestLevel = level;
    if (this.bestMoves === 0 || moves < this.bestMoves) this.bestMoves = moves;
    this.currentLevel = level + 1;
    sdk.sendScore(this.bestLevel);
  }
}

export const ctx = new GameContext();
