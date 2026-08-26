/**
 * Juicy Merge — Game Context for Reddit Devvit
 * Connects pure engine logic with Devvit Server (/api/score, /api/leaderboard).
 */
import { MergeEngine } from "./logic/merge-engine";
import { ScoreStore, type SaveAdapter, type SavePayload } from "./logic/save";
import { CONFIG } from "./logic/config";
import { checkNewFruitUnlocked, type FruitInfo } from "./logic/album";
import {
  getDailySeed,
  getTodayDateString,
  isDailyCompletedToday,
  getDailyDifficulty,
  checkMilestoneJustUnlocked,
  type MilestoneReward,
  type DailyDifficulty,
} from "./logic/daily-challenge";
import type { LeaderboardEntry } from "../shared/api";

/**
 * Generates or retrieves a persistent client ID for Reddit Devvit sessions.
 */
function getClientId(): string {
  try {
    const existing = window.localStorage?.getItem("jm_devvit_user_id");
    if (existing) return existing;
    const generated = `u_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36)}`;
    window.localStorage?.setItem("jm_devvit_user_id", generated);
    return generated;
  } catch {
    return `u_player_${Date.now().toString(36)}`;
  }
}

/**
 * SaveAdapter communicating with Devvit Hono backend (/api/score).
 */
class DevvitSaveAdapter implements SaveAdapter {
  constructor(readonly userId: string) {}

  async loadData(): Promise<unknown | null> {
    try {
      const res = await fetch(`/api/score/${encodeURIComponent(this.userId)}`);
      if (!res.ok) return null;
      const data = await res.json();
      return (
        data?.payload ??
        (typeof data?.score === "number" ? { best_score: data.score } : null)
      );
    } catch (e) {
      console.warn("Failed to load score from Devvit backend:", e);
      return null;
    }
  }

  async saveData(data: unknown): Promise<boolean> {
    try {
      const payload = data as Partial<SavePayload>;
      const score = payload?.best_score ?? 0;
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score,
          userId: this.userId,
          payload,
        }),
      });
      return res.ok;
    } catch (e) {
      console.warn("Failed to save progress to Devvit backend:", e);
      return false;
    }
  }

  sendScore(score: number): void {
    void fetch("/api/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        score,
        userId: this.userId,
      }),
    }).catch((e) => console.warn("Failed to report score:", e));
  }
}

export interface LeaderboardResult {
  entries: { name: string; score: number; rank: number; isUser?: boolean }[];
  userEntry?: { rank: number; score: number };
}

class GameContext {
  readonly engine: MergeEngine;
  readonly score: ScoreStore;
  readonly userId: string;
  isDailyMode = false;
  private audioEnabled = true;

  constructor() {
    this.userId = getClientId();
    const seed = CONFIG.seed ?? 1;
    this.engine = new MergeEngine(seed);
    this.score = new ScoreStore(new DevvitSaveAdapter(this.userId));
  }

  async load(): Promise<void> {
    await this.score.load();
    this.engine.state.bestScore = this.score.bestScore;
  }

  async onGameOver(score: number): Promise<number> {
    const best = await this.score.onGameOver(score);
    this.engine.state.bestScore = best;
    return best;
  }

  async discoverFruit(
    tier: number,
  ): Promise<{ isNew: boolean; info: FruitInfo }> {
    const unlocked = this.score.getUnlockedTiers();
    const { isNewDiscovery, fruitInfo } = checkNewFruitUnlocked(tier, unlocked);
    if (isNewDiscovery) {
      await this.score.saveProgress();
    }
    return { isNew: isNewDiscovery, info: fruitInfo };
  }

  getCurrentDailyDifficulty(): DailyDifficulty {
    return getDailyDifficulty(this.score.dailyStreakCount);
  }

  startDailyChallenge(): void {
    this.isDailyMode = true;
    const todayStr = getTodayDateString();
    const seed = getDailySeed(todayStr);
    const diff = this.getCurrentDailyDifficulty();
    this.engine.setDailyMode(true, diff.fruitLimit);
    this.engine.reseed(seed);
    this.engine.startNewGame();
  }

  startClassicMode(): void {
    this.isDailyMode = false;
    this.engine.setDailyMode(false);
    this.startNewTurn();
  }

  async recordDailyVictory(
    score: number,
  ): Promise<{
    milestoneReward: MilestoneReward | null;
    currentStreak: number;
  }> {
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

  startNewTurn(): void {
    if (this.isDailyMode) {
      this.startDailyChallenge();
      return;
    }
    const seed = Math.floor(Math.random() * 0x100000000) >>> 0;
    this.engine.reseed(seed);
    this.engine.startNewGame();
  }

  saveSession(): void {
    void this.score.saveProgress();
  }

  isAudioEnabled(): boolean {
    return this.audioEnabled;
  }

  setAudioEnabled(enabled: boolean): void {
    this.audioEnabled = enabled;
  }

  // --- Leaderboard Bridge for LeaderboardModal ---
  async getLeaderboardEntries(
    limit = 10,
    userBestScore = 0,
  ): Promise<LeaderboardResult> {
    try {
      const res = await fetch("/api/leaderboard");
      if (!res.ok) throw new Error("API request failed");
      const data: LeaderboardEntry[] = await res.json();

      const entries = data.map((item) => {
        const isUser = item.userId === this.userId;
        return {
          name: item.username,
          score: item.score,
          rank: item.rank,
          isUser,
        };
      });

      let userRank = 1;
      const userInList = entries.find((e) => e.isUser);
      if (userInList) {
        userRank = userInList.rank;
      } else if (entries.length > 0) {
        userRank = entries.length + 1;
      }

      return {
        entries: entries.slice(0, limit),
        userEntry: {
          rank: userRank,
          score: userBestScore,
        },
      };
    } catch (e) {
      console.warn("Failed to load leaderboard from Devvit backend:", e);
      return {
        entries: [
          { name: "JuicyKing", score: 3500, rank: 1 },
          { name: "WatermelonPro", score: 2800, rank: 2 },
          { name: "BerryMaster", score: 2100, rank: 3 },
          { name: "FruitNinja", score: 1600, rank: 4 },
          { name: "You", score: userBestScore, rank: 5, isUser: true },
        ],
        userEntry: {
          rank: 5,
          score: userBestScore,
        },
      };
    }
  }

  // Devvit Booster handlers (replacing external ads)
  async refillPowerupsViaAd(): Promise<boolean> {
    this.engine.powerups.swapCount += 2;
    this.engine.powerups.shakeCount += 2;
    return true;
  }

  async grantDailyExtraDropsViaAd(): Promise<boolean> {
    this.engine.state.dailyDropsRemaining += 15;
    return true;
  }

  async doubleFinalScoreViaAd(currentScore: number): Promise<number | null> {
    const doubled = currentScore * 2;
    this.engine.state.score = doubled;
    await this.onGameOver(doubled);
    return doubled;
  }

  async triggerSmartInterstitial(): Promise<void> {
    // No-op for Reddit Devvit Webview
  }
}

export const ctx = new GameContext();
