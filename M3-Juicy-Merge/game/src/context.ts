// Context chia sẻ — chứa engine logic thuần (tách testable) + SDK + best-score store.
import { sdk } from './sdk-instance';
import { MergeEngine } from './logic/merge-engine';
import { ScoreStore, type SaveAdapter } from './logic/save';
import { CONFIG } from './logic/config';
import { checkNewFruitUnlocked, type FruitInfo } from './logic/album';
import { getDailySeed, getTodayDateString, isDailyCompletedToday } from './logic/daily-challenge';

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
  isDailyMode = false;

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

  /**
   * Khám phá quả mới trong Album.
   */
  async discoverFruit(tier: number): Promise<{ isNew: boolean; info: FruitInfo }> {
    const unlocked = this.score.getUnlockedTiers();
    const { isNewDiscovery, fruitInfo } = checkNewFruitUnlocked(tier, unlocked);
    if (isNewDiscovery) {
      await this.score.saveProgress();
    }
    return { isNew: isNewDiscovery, info: fruitInfo };
  }

  /**
   * Khởi động chế độ Daily Challenge.
   */
  startDailyChallenge(): void {
    this.isDailyMode = true;
    const todayStr = getTodayDateString();
    const seed = getDailySeed(todayStr);
    this.engine.setDailyMode(true);
    this.engine.reseed(seed);
    this.engine.startNewGame();
  }

  /**
   * Khởi động chế độ Cổ điển (Classic Mode).
   */
  startClassicMode(): void {
    this.isDailyMode = false;
    this.engine.setDailyMode(false);
    this.startNewTurn();
  }

  /**
   * Đánh dấu hoàn thành Daily Challenge hôm nay.
   */
  async recordDailyVictory(score: number): Promise<void> {
    const todayStr = getTodayDateString();
    this.score.dailyCompletedDate = todayStr;
    this.score.dailyBestScore = Math.max(this.score.dailyBestScore ?? 0, score);
    await this.score.saveProgress();
  }

  isDailyCompletedToday(): boolean {
    return isDailyCompletedToday(this.score.dailyCompletedDate);
  }

  /** Start a fresh turn on Retry (M3-04): a brand-new random seed for run variety
   *  + a clean engine reset (score=0, playCount=0, continue available again). */
  startNewTurn(): void {
    if (this.isDailyMode) {
      this.startDailyChallenge();
      return;
    }
    const seed = (Math.floor(Math.random() * 0x100000000)) >>> 0;
    this.engine.reseed(seed);
    this.engine.startNewGame();
  }
}

export const ctx = new GameContext();
