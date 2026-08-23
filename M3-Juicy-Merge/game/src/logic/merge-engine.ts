// M3 Juicy Merge — MergeEngine (logic THUẦN, testable)
// SPEC: chain 12 trái, merge 2 cùng loại → bậc kế, score, RNG deterministic, game-over khi settle & trái trên vạch.
// Đây là HỢP ĐỒNG logic — Claude code theo SPEC này + TEST-CASES (GC-01..14).
// Nguồn sự thật runtime: `config.ts` (phản ánh games/juicy-merge.yaml §mechanics).

import { CONFIG } from './config';

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
  gameOver: boolean;
  continueUsed: boolean;
  continueMax: number; // <=1 rewards tiếp tục/lượt (M3-05)
  playCount: number;   // số lượt (cho interstitial từ lần 2+)
  seed: number;
}

export class MergeEngine {
  state: MergeState;

  constructor(seed = 1) {
    this.state = {
      score: 0, bestScore: 0, comboCount: 0, lastMergeTime: 0,
      gameOver: false, continueUsed: false, continueMax: 1, playCount: 0, seed,
    };
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

  canContinue(): boolean { return !this.state.continueUsed && this.state.continueMax > 0; }
  useContinue(): void { this.state.continueUsed = true; this.state.gameOver = false; }

  shouldShowInterstitial(): boolean { return this.state.playCount >= 2; }

  startNewGame(): void {
    this.state.score = 0;
    this.state.comboCount = 0;
    this.state.continueUsed = false;
    this.state.gameOver = false;
    this.state.playCount = 0; // lượt mới → interstitial lại từ đầu
  }
}