// Context chia sẻ — chứa engine logic thuần (tách testable) + SDK + best-score store.
import { sdk } from './sdk-instance';
import { MergeEngine } from './logic/merge-engine';
import { ScoreStore, type SaveAdapter } from './logic/save';
import { CONFIG } from './logic/config';

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
    // Seed from config (M3-04): deterministic when set, else default 1.
    const seed = CONFIG.seed ?? 1;
    this.engine = new MergeEngine(seed);
    this.score = new ScoreStore(new SdkSaveAdapter());
  }

  /** Load persisted best score before play (M3-08). Idempotent, never throws. */
  async load(): Promise<void> {
    await this.score.load();
    // Mirror the loaded best into engine state so Gameplay/GameOver read one place.
    this.engine.state.bestScore = this.score.bestScore;
  }

  /** Called on game over: persist + report a new best if this run beat it (M3-08).
   *  Takes the score explicitly so a fast Retry (which zeroes state) can't race the
   *  async save and persist a 0. */
  async onGameOver(score: number): Promise<number> {
    const best = await this.score.onGameOver(score);
    this.engine.state.bestScore = best;
    return best;
  }

  /** Start a fresh turn on Retry (M3-04): a brand-new random seed for run variety
   *  + a clean engine reset (score=0, playCount=0, continue available again).
   *  Math.random is fine in the runtime — the deterministic-seed rule is for the
   *  pure logic tests, not the live game. Gameplay.create also calls
   *  startNewGame, so this is a no-op-safe superset of it. */
  startNewTurn(): void {
    const seed = (Math.floor(Math.random() * 0x100000000)) >>> 0;
    this.engine.reseed(seed);
    this.engine.startNewGame();
  }
}

export const ctx = new GameContext();
