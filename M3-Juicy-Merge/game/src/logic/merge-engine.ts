// M3 Juicy Merge — MergeEngine (logic THUẦN, testable)
// SPEC: chain 12 trái, merge 2 cùng loại → bậc kế, score, RNG deterministic, game-over khi settle & trái trên vạch.
// Đây là HỢP ĐỒNG logic — Claude code theo SPEC này + TEST-CASES (GC-01..14).
// Nguồn sự thật runtime: `config.ts` (phản ánh games/juicy-merge.yaml §mechanics).

import { CONFIG } from './config';
import { DropQueue } from './rng';
import {
  type PowerupState,
  createInitialPowerupState,
  canSwapFruit,
  consumeSwap,
  canShakeBucket,
  consumeShake,
  grantSwap,
  grantShake,
  evaluateComboReward,
  evaluateScoreMilestoneReward,
  evaluateRecordBroken,
} from './powerups';

export interface FruitSpec {
  tier: number;      // 0..11 (bậc 1..12)
  chain: string[];   // tên trái theo bậc (from config)
  score: number[];   // điểm tạo trái bậc i
}

// Re-export chain + score table from the config source of truth (no duplicate literals).
export const CHAIN12: readonly string[] = CONFIG.chain;
export const SCORE_TIER: readonly number[] = CONFIG.scorePerTier;

export interface MergeState {
  score: number;
  bestScore: number;
  comboCount: number;
  lastMergeTime: number;
  lastDropTime: number;  // timestamp of the most recent drop (ms); -Infinity = never
  gameOver: boolean;
  continueUsed: boolean;
  continueMax: number; // <=1 rewards tiếp tục/lượt (M3-05)
  playCount: number;   // số lượt (cho interstitial từ lần 2+)
  seed: number;
  isDailyMode: boolean;
  dailyDropsRemaining: number;
}

export class MergeEngine {
  state: MergeState;
  powerups: PowerupState;
  // Seeded RNG + next-fruit queue — one instance per session (M3-04). Same seed
  // ⇒ same fruit sequence, so the run is replayable/deterministic.
  private dropQueue: DropQueue;

  constructor(seed = 1) {
    this.state = {
      score: 0, bestScore: 0, comboCount: 0, lastMergeTime: 0,
      lastDropTime: Number.NEGATIVE_INFINITY,
      gameOver: false, continueUsed: false, continueMax: 1, playCount: 0, seed,
      isDailyMode: false, dailyDropsRemaining: 50,
    };
    this.powerups = createInitialPowerupState();
    this.dropQueue = new DropQueue(seed);
  }

  // --- RNG / drop queue (M3-04) ------------------------------------------------
  /** Snapshot of the next 2 upcoming fruit tiers (preview). Pure: no state side effect beyond queue advance. */
  peekNext(): readonly number[] { return this.dropQueue.peek(); }

  /** Consume the next fruit tier to drop and refill the queue. */
  nextFruit(): number { return this.dropQueue.nextFruit(); }

  // --- Drop cooldown gate (M3-01) -------------------------------------------
  /** Pure gate: true iff enough time has passed since the last drop AND not game-over.
   *  No side effect — caller must call {@link recordDrop} when it actually drops. */
  canDrop(nowMs: number): boolean {
    if (this.state.gameOver) return false;
    return nowMs - this.state.lastDropTime >= CONFIG.dropCooldownMs;
  }

  /** Record that a drop happened at {@link nowMs} (advances the cooldown timer). */
  recordDrop(nowMs: number): void {
    this.state.lastDropTime = nowMs;
    if (this.state.isDailyMode && this.state.dailyDropsRemaining > 0) {
      this.state.dailyDropsRemaining--;
    }
  }

  setDailyMode(enabled: boolean, fruitLimit = 50): void {
    this.state.isDailyMode = enabled;
    this.state.dailyDropsRemaining = fruitLimit;
  }

  /** New run with a fresh seed (Retry, M3 §7). Defaults to the stored seed. */
  reseed(seed = this.state.seed): void {
    this.state.seed = seed;
    this.dropQueue.reseed(seed);
  }

  // merge 2 trái cùng loại → trả tier mới + điểm cộng; khác loại → null (M3-02)
  merge(aTier: number, bTier: number, nowMs = 0): { tier: number; scoreGain: number } | null {
    if (aTier !== bTier) return null;
    const next = aTier + 1;
    if (next > CONFIG.maxTier) return null; // watermelon max, không merge tiếp (M3-02)
    const gain = SCORE_TIER[next];
    this.state.score += gain;
    // combo — window from config (M3 §4.3)
    if (nowMs - this.state.lastMergeTime <= CONFIG.comboWindowMs) this.state.comboCount++;
    else this.state.comboCount = 1;
    this.state.lastMergeTime = nowMs;
    return { tier: next, scoreGain: gain };
  }

  // game over: settle() + trái nằm trên vạch danger (M3-03)
  // logic vật lý/settle do scene quyết; engine chỉ check score/continue
  setGameOver(onDanger: boolean, settled: boolean): boolean {
    if (onDanger && settled) {
      this.state.gameOver = true;
      this.state.playCount++;
      if (this.state.score > this.state.bestScore) this.state.bestScore = this.state.score;
    }
    return this.state.gameOver;
  }

  // Rewarded "Continue" (M3-05): ≤1 earned continue per turn. Available iff we
  // are AT a game over this turn AND the single continue has not been consumed.
  // Requiring gameOver keeps the offer tied to a game-over moment (not mid-play).
  canContinue(): boolean {
    return this.state.gameOver && !this.state.continueUsed && this.state.continueMax > 0;
  }

  /** Consume the rewarded continue (earned): clear game over, resume play. Marks
   *  continueUsed so a 2nd game-over this turn falls through to interstitial. */
  useContinue(): void { this.state.continueUsed = true; this.state.gameOver = false; }

  /** Interstitial only from the 2nd game-over onward within a turn (M3-07).
   *  playCount resets each new turn (startNewGame), so a fresh run never starts
   *  with an interstitial. */
  shouldShowInterstitial(): boolean { return this.state.playCount >= 2; }

  // --- Strategic Power-ups & Enhancements (Phase 2) --------------------------
  canSwap(): boolean {
    return canSwapFruit(this.powerups);
  }

  swapGhost(currentGhostTier: number): { success: boolean; newGhostTier: number } {
    if (!consumeSwap(this.powerups)) {
      return { success: false, newGhostTier: currentGhostTier };
    }
    const newGhostTier = this.dropQueue.swapFront(currentGhostTier);
    return { success: true, newGhostTier };
  }

  canShake(): boolean {
    return canShakeBucket(this.powerups);
  }

  useShake(): boolean {
    return consumeShake(this.powerups);
  }

  addSwap(count = 1): number {
    return grantSwap(this.powerups, count);
  }

  addShake(count = 1): number {
    return grantShake(this.powerups, count);
  }

  /**
   * Process rewards after each merge:
   * - Combo reward (x3 -> Swap, x5 -> Shake)
   * - Score milestone reward (every 1000 pts -> Shake)
   * - High Score milestone check (first time current score > past best score)
   */
  processMergeMilestones(): {
    reward: 'swap' | 'shake' | null;
    isNewRecordBroken: boolean;
  } {
    // 1. Combo reward
    let reward = evaluateComboReward(this.state.comboCount);
    if (reward === 'swap') grantSwap(this.powerups, 1);
    else if (reward === 'shake') grantShake(this.powerups, 1);

    // 2. Score milestone reward
    const milestoneRes = evaluateScoreMilestoneReward(
      this.state.score,
      this.powerups.lastScoreMilestone,
    );
    if (milestoneRes.reward) {
      this.powerups.lastScoreMilestone = milestoneRes.newMilestone;
      grantShake(this.powerups, 1);
      reward = reward ?? 'shake';
    }

    // 3. New record broken
    let isNewRecordBroken = false;
    if (evaluateRecordBroken(this.state.score, this.state.bestScore, this.powerups.hasBrokenRecordThisGame)) {
      this.powerups.hasBrokenRecordThisGame = true;
      isNewRecordBroken = true;
    }

    return { reward, isNewRecordBroken };
  }

  startNewGame(): void {
    this.state.score = 0;
    this.state.comboCount = 0;
    this.state.lastDropTime = Number.NEGATIVE_INFINITY;
    this.state.continueUsed = false;
    this.state.gameOver = false;
    this.state.playCount = 0; // lượt mới → interstitial lại từ đầu
    this.powerups = createInitialPowerupState();
    // Reset the fruit queue so a fresh run starts from the beginning of the
    // seed's sequence. Caller may pass a new seed via reseed() for true variety.
    this.dropQueue.reseed(this.state.seed);
  }
}