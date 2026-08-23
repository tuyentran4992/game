// Context chia sẻ — chứa engine logic thuần (tách testable) + SDK + best-score store.
import { sdk } from './sdk-instance';
import { MergeEngine } from './logic/merge-engine';
import { ScoreStore, type SaveAdapter } from './logic/save';

/** SaveAdapter backed by the Playables SDK (BR-11). Injected into ScoreStore so
 *  the logic layer has no SDK import — tests inject a mock adapter instead. */
class SdkSaveAdapter implements SaveAdapter {
  loadData(): Promise<unknown | null> { return sdk.loadData(); }
  saveData(data: unknown): Promise<boolean> { return sdk.saveData(data); }
  sendScore(score: number): void { sdk.sendScore(score); }
}

class GameContext {
  readonly engine: MergeEngine;
  readonly sdk = sdk;
  readonly score: ScoreStore;

  constructor() {
    this.engine = new MergeEngine();
    this.score = new ScoreStore(new SdkSaveAdapter());
  }

  /** Load persisted best score before play (M3-08). Idempotent, never throws. */
  async load(): Promise<void> {
    await this.score.load();
    // Mirror the loaded best into engine state so Gameplay/GameOver read one place.
    this.engine.state.bestScore = this.score.bestScore;
  }

  /** Called on game over: persist + report a new best if this run beat it (M3-08). */
  async onGameOver(): Promise<number> {
    const best = await this.score.onGameOver(this.engine.state.score);
    this.engine.state.bestScore = best;
    return best;
  }
}

export const ctx = new GameContext();
