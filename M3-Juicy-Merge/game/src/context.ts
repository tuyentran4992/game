// Context chia sẻ — chứa engine logic thuần (tách testable) + SDK + best-score store.
import { sdk } from '@game/sdk';
import { MergeEngine } from './logic/merge-engine';
import { ScoreStore, type SaveAdapter } from './logic/save';
import { CONFIG } from './logic/config';
import { checkNewFruitUnlocked, type FruitInfo } from './logic/album';
import {
  getDailySeed,
  getTodayDateString,
  isDailyCompletedToday,
  getDailyDifficulty,
  checkMilestoneJustUnlocked,
  type MilestoneReward,
  type DailyDifficulty,
} from './logic/daily-challenge';

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

  // Smart Interstitial Cooldown Tracker
  private lastInterstitialTime = 0;
  private gameplayStartTime = 0;

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
   * Lấy cấu hình độ khó hiện tại của Daily Challenge.
   */
  getCurrentDailyDifficulty(): DailyDifficulty {
    return getDailyDifficulty(this.score.dailyStreakCount);
  }

  /**
   * Khởi động chế độ Daily Challenge với độ khó tương ứng ngày hiện tại.
   */
  startDailyChallenge(): void {
    this.isDailyMode = true;
    this.recordGameplayStart();
    const todayStr = getTodayDateString();
    const seed = getDailySeed(todayStr);
    const diff = this.getCurrentDailyDifficulty();
    this.engine.setDailyMode(true, diff.fruitLimit);
    this.engine.reseed(seed);
    this.engine.startNewGame();
  }

  /**
   * Khởi động chế độ Cổ điển (Classic Mode).
   */
  startClassicMode(): void {
    this.isDailyMode = false;
    this.recordGameplayStart();
    this.engine.setDailyMode(false);
    this.startNewTurn();
  }

  /**
   * Đánh dấu hoàn thành Daily Challenge hôm nay và mở khóa phần thưởng mốc.
   */
  async recordDailyVictory(score: number): Promise<{ milestoneReward: MilestoneReward | null; currentStreak: number }> {
    const todayStr = getTodayDateString();
    const alreadyWonToday = this.isDailyCompletedToday();

    let milestoneReward: MilestoneReward | null = null;
    if (!alreadyWonToday) {
      this.score.dailyStreakCount = (this.score.dailyStreakCount || 0) + 1;
      milestoneReward = checkMilestoneJustUnlocked(this.score.dailyStreakCount);
      if (milestoneReward) {
        this.score.getUnlockedTiers().add(milestoneReward.tier);
      }
    }

    this.score.dailyCompletedDate = todayStr;
    this.score.dailyBestScore = Math.max(this.score.dailyBestScore ?? 0, score);
    await this.score.saveProgress();

    return { milestoneReward, currentStreak: this.score.dailyStreakCount };
  }

  isDailyCompletedToday(): boolean {
    return isDailyCompletedToday(this.score.dailyCompletedDate);
  }

  /** Start a fresh turn on Retry (M3-04): a brand-new random seed for run variety
   *  + a clean engine reset (score=0, playCount=0, continue available again). */
  startNewTurn(): void {
    this.recordGameplayStart();
    if (this.isDailyMode) {
      this.startDailyChallenge();
      return;
    }
    const seed = (Math.floor(Math.random() * 0x100000000)) >>> 0;
    this.engine.reseed(seed);
    this.engine.startNewGame();
  }

  /** Persist current best/progress when leaving gameplay (e.g. back to Start menu). */
  saveSession(): void {
    void this.score.saveProgress();
  }

  // --- Rewarded Ad Placements ------------------------------------------------

  /**
   * Xem quảng cáo để bơm thêm +2 lượt Swap và +2 lượt Shake ngay trong ván chơi.
   */
  async refillPowerupsViaAd(): Promise<boolean> {
    const earned = await this.sdk.requestRewardedAd('powerup_refill');
    if (earned) {
      this.engine.powerups.swapCount += 2;
      this.engine.powerups.shakeCount += 2;
      return true;
    }
    return false;
  }

  /**
   * Xem quảng cáo để nhân đôi điểm số cuối trận (2X Final Score).
   */
  async doubleFinalScoreViaAd(currentScore: number): Promise<number | null> {
    const earned = await this.sdk.requestRewardedAd('double_score');
    if (earned) {
      const doubled = currentScore * 2;
      this.engine.state.score = doubled;
      await this.onGameOver(doubled);
      return doubled;
    }
    return null;
  }

  /**
   * Xem quảng cáo nhận thêm +15 lượt thả trong Daily Challenge khi hết lượt.
   */
  async grantDailyExtraDropsViaAd(): Promise<boolean> {
    const earned = await this.sdk.requestRewardedAd('daily_extra_drops');
    if (earned) {
      this.engine.state.dailyDropsRemaining += 15;
      return true;
    }
    return false;
  }

  // --- Smart Interstitial Cooldown ------------------------------------------

  recordGameplayStart(): void {
    this.gameplayStartTime = Date.now();
  }

  /**
   * Kích hoạt Interstitial thông minh nếu đã chơi >= 40s và cách lần ad trước >= 80s.
   */
  async triggerSmartInterstitial(): Promise<void> {
    const now = Date.now();
    const playedDuration = now - this.gameplayStartTime;
    const cooldownDuration = now - this.lastInterstitialTime;

    if (playedDuration >= 40000 && cooldownDuration >= 80000) {
      this.lastInterstitialTime = now;
      await this.sdk.requestInterstitialAd();
    }
  }

  async getLeaderboardEntries(quantityTop = 10, userScore = 0) {
    return this.sdk.getLeaderboardEntries('best_score', quantityTop, userScore);
  }

  private audioEnabled = true;

  isAudioEnabled(): boolean {
    return this.audioEnabled && this.sdk.isAudioEnabled();
  }

  setAudioEnabled(enabled: boolean): void {
    this.audioEnabled = enabled;
  }
}

export const ctx = new GameContext();
