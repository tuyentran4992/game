// GameEngine — LOGIC GAMEPLAY THUẦN (KHÔNG phụ thuộc Phaser).
// Bao gồm: score (+1/né, +1/s), combo streak (+5 mỗi 5 né, reset khi chạm),
// level = floor(score/10)+1 + đổi palette (vòng lại 3), best record, difficulty curve.
// Testable độc lập (xem __tests__/GameEngine.test.ts).

import { MechanicsConfig } from './mechanics';

export interface DodgeResult {
  scoreDelta: number;
  comboBonus: number;
  comboTriggered: boolean;
  levelUp: boolean;
  newLevel: number;
  paletteIndex: number;
}

export interface TickResult {
  scoreDelta: number;
}

export interface DifficultyResult {
  speed: number;
  spawnCount: number;
}

export interface EndGameResult {
  score: number;
  bestScore: number;
  level: number;
  isNewRecord: boolean;
}

export interface GameEngineOptions {
  bestScore?: number;
  totalGamesPlayed?: number;
}

export class GameEngine {
  private cfg: MechanicsConfig;

  // state phiên hiện tại
  score = 0;
  streak = 0;
  elapsed = 0;

  // state bền vững (qua phiên)
  bestScore: number;
  totalGamesPlayed: number;

  // cờ phiên
  recordShownThisSession = false;
  private continueUsed = false;

  constructor(cfg: MechanicsConfig, opts: GameEngineOptions = {}) {
    this.cfg = cfg;
    this.bestScore = opts.bestScore ?? 0;
    this.totalGamesPlayed = opts.totalGamesPlayed ?? 0;
  }

  startNewGame(): void {
    this.score = 0;
    this.streak = 0;
    this.elapsed = 0;
    this.recordShownThisSession = false;
    this.continueUsed = false;
    this.totalGamesPlayed += 1;
  }

  // --- Level / palette ---
  getLevel(score = this.score): number {
    return Math.floor(score / this.cfg.milestoneInterval) + 1;
  }

  getPaletteIndex(level: number = this.getLevel()): number {
    const n = this.cfg.palettes.length;
    return ((level - 1) % n + n) % n;
  }

  get paletteIndex(): number {
    return this.getPaletteIndex(this.getLevel());
  }

  // --- Score: né ong ---
  registerDodge(): DodgeResult {
    let comboBonus = 0;
    let comboTriggered = false;

    this.score += this.cfg.pointsPerDodge;
    this.streak += 1;

    if (this.streak > 0 && this.streak % this.cfg.comboPer === 0) {
      comboBonus = this.cfg.comboBonus;
      comboTriggered = true;
      this.score += comboBonus;
    }

    const newLevel = this.getLevel();
    const prevScore = this.score - this.cfg.pointsPerDodge - comboBonus;
    const prevLevel = Math.floor(prevScore / this.cfg.milestoneInterval) + 1;
    const levelUp = newLevel > prevLevel;

    return {
      scoreDelta: this.cfg.pointsPerDodge + comboBonus,
      comboBonus,
      comboTriggered,
      levelUp,
      newLevel,
      paletteIndex: this.getPaletteIndex(newLevel),
    };
  }

  registerHit(): void {
    this.streak = 0; // BR-15 reset combo khi chạm ong
  }

  // --- Score: thời gian ---
  tickSecond(): TickResult {
    this.score += this.cfg.pointsPerSecond;
    this.elapsed += 1;
    return { scoreDelta: this.cfg.pointsPerSecond };
  }

  // --- Difficulty curve (BR-17) ---
  difficulty(elapsedSec = this.elapsed, level = this.getLevel()): DifficultyResult {
    const warm = this.cfg.warmupSeconds;
    let ramp = 0;
    if (elapsedSec > warm) {
      ramp = this.cfg.speedIncreasePerSec * (elapsedSec - warm);
    }
    const levelBonus = this.cfg.levelSpeedStep * (level - 1);
    const speed = this.cfg.startSpeed + ramp + levelBonus;

    // spawn count: 1 base; tăng sau warmup; +bậc level; chặn max
    let spawn = 1;
    if (elapsedSec > warm) {
      spawn += this.cfg.spawnIncrease * (elapsedSec - warm);
    }
    spawn += 0.5 * (level - 1); // nhảy bậc spawn theo level
    spawn = Math.min(spawn, this.cfg.spawnRateMax);
    spawn = Math.max(1, spawn);

    return { speed, spawnCount: Math.ceil(spawn) };
  }

  // --- Kỷ lục + kết thúc ---
  checkRecord(): boolean {
    if (this.score > this.bestScore && !this.recordShownThisSession) {
      this.recordShownThisSession = true;
      return true;
    }
    return false;
  }

  endGame(): EndGameResult {
    const isNewRecord = this.score > this.bestScore;
    if (isNewRecord) {
      this.bestScore = this.score;
      this.recordShownThisSession = true;
    }
    return {
      score: this.score,
      bestScore: this.bestScore,
      level: this.getLevel(),
      isNewRecord,
    };
  }

  // --- Continue (rewarded) BR-10 ---
  canContinue(): boolean {
    return !this.continueUsed;
  }

  useContinue(): void {
    this.continueUsed = true;
  }

  // --- Interstitial BR-09: từ lượt thứ N (interstitialDelayGames) ---
  shouldShowInterstitial(): boolean {
    return this.totalGamesPlayed >= this.cfg.interstitialDelayGames;
  }
}
