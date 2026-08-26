// M3 Juicy Merge — Best-score save/load (M3-08).
// Persists the best score through an injectable SaveAdapter so the engine stays
// pure (it never imports the SDK — the adapter is injected at the context edge).
//
// Payload shape (DATA-MODEL §1.3): { best_score, schema_version }.
// On load failure → default 0, never crash.

import { getUnlockedMilestoneTiers } from "./daily-challenge";

/** Edge-side persistence + score reporting. The SDK is one implementation; tests
 *  inject a mock. Keeping this an interface means the logic module has no SDK import. */
export interface SaveAdapter {
  loadData(): Promise<unknown | null>;
  saveData(data: unknown): Promise<boolean>;
  sendScore(score: number): void;
}

/** Persisted save payload (M3-08 + Phase 3 + Option A). Bumping schema_version enables migration later. */
export interface SavePayload {
  best_score: number;
  unlocked_tiers?: number[];
  daily_completed_date?: string;
  daily_best_score?: number;
  daily_streak_count?: number;
  schema_version: number;
}

/** Current save schema version. */
export const SAVE_SCHEMA_VERSION = 1;

/**
 * Best-score & Retention Progress store backed by an injectable {@link SaveAdapter}.
 */
export class ScoreStore {
  bestScore = 0;
  unlockedTiers?: Set<number> | undefined;
  dailyCompletedDate?: string | null | undefined;
  dailyBestScore?: number | undefined;
  dailyStreakCount = 0;
  private loaded = false;

  constructor(private readonly adapter: SaveAdapter) {}

  /** Load save payload from storage. Idempotent. Never throws (M3-08). */
  async load(): Promise<void> {
    if (this.loaded) return;
    try {
      const data =
        (await this.adapter.loadData()) as Partial<SavePayload> | null;
      this.bestScore =
        data && typeof data.best_score === "number" ? data.best_score : 0;
      if (data && Array.isArray(data.unlocked_tiers)) {
        this.unlockedTiers = new Set(data.unlocked_tiers);
      }
      this.dailyCompletedDate =
        data && typeof data.daily_completed_date === "string"
          ? data.daily_completed_date
          : null;
      this.dailyBestScore =
        data && typeof data.daily_best_score === "number"
          ? data.daily_best_score
          : 0;
      this.dailyStreakCount =
        data && typeof data.daily_streak_count === "number"
          ? data.daily_streak_count
          : 0;

      // Đồng bộ các quả Thần Thoại nếu streak đã đạt mốc
      if (this.dailyStreakCount > 0) {
        const milestoneTiers = getUnlockedMilestoneTiers(this.dailyStreakCount);
        const unlocked = this.getUnlockedTiers();
        for (const t of milestoneTiers) {
          unlocked.add(t);
        }
      }
    } catch (e) {
      // Corrupt storage / adapter error → start fresh, never crash (M3-08).
      console.warn("loadData failed, starting fresh", e);
      this.bestScore = 0;
      this.unlockedTiers = undefined;
      this.dailyCompletedDate = null;
      this.dailyBestScore = 0;
      this.dailyStreakCount = 0;
    }
    this.loaded = true;
  }

  /** Mark store as needing a reload (e.g. before a fresh load after a retry). */
  reset(): void {
    this.bestScore = 0;
    this.loaded = false;
  }

  getUnlockedTiers(): Set<number> {
    if (!this.unlockedTiers) {
      this.unlockedTiers = new Set<number>([0, 1]);
    }
    return this.unlockedTiers;
  }

  /**
   * Persist entire game progress (best score, album unlocked tiers, daily challenge).
   */
  async saveProgress(): Promise<boolean> {
    const payload: SavePayload = {
      best_score: this.bestScore,
      schema_version: SAVE_SCHEMA_VERSION,
    };
    if (this.unlockedTiers && this.unlockedTiers.size > 0) {
      payload.unlocked_tiers = Array.from(this.unlockedTiers);
    }
    if (this.dailyCompletedDate) {
      payload.daily_completed_date = this.dailyCompletedDate;
    }
    if (typeof this.dailyBestScore === "number" && this.dailyBestScore > 0) {
      payload.daily_best_score = this.dailyBestScore;
    }
    if (
      typeof this.dailyStreakCount === "number" &&
      this.dailyStreakCount > 0
    ) {
      payload.daily_streak_count = this.dailyStreakCount;
    }
    try {
      return await this.adapter.saveData(payload);
    } catch (e) {
      console.warn("saveData failed, keeping session state", e);
      return false;
    }
  }

  /** Called on game over. If score strictly beats best → persist + sendScore once. */
  async onGameOver(score: number): Promise<number> {
    if (score > this.bestScore) {
      this.bestScore = score;
      const payload: SavePayload = {
        best_score: this.bestScore,
        schema_version: SAVE_SCHEMA_VERSION,
      };
      if (this.unlockedTiers && this.unlockedTiers.size > 0) {
        payload.unlocked_tiers = Array.from(this.unlockedTiers);
      }
      if (this.dailyCompletedDate) {
        payload.daily_completed_date = this.dailyCompletedDate;
      }
      if (typeof this.dailyBestScore === "number" && this.dailyBestScore > 0) {
        payload.daily_best_score = this.dailyBestScore;
      }
      if (
        typeof this.dailyStreakCount === "number" &&
        this.dailyStreakCount > 0
      ) {
        payload.daily_streak_count = this.dailyStreakCount;
      }
      try {
        const saved = await this.adapter.saveData(payload);
        if (!saved) {
          console.warn("saveData returned false, keeping bestScore in session");
        }
      } catch (e) {
        console.warn("saveData failed, keeping session best", e);
      }
      try {
        this.adapter.sendScore(this.bestScore);
      } catch (e) {
        console.warn("sendScore failed", e);
      }
    }
    return this.bestScore;
  }
}
