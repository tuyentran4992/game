// GameEngine — LOGIC GAMEPLAY THUẦN (KHÔNG phụ thuộc Phaser).
// Bao gồm: score (+1/né, +1/s), combo streak (+5 mỗi 5 né, reset khi chạm),
// level = floor(score/10)+1 + đổi palette (vòng lại 3), best record, difficulty curve.
// Testable độc lập (xem __tests__/GameEngine.test.ts).

import { MechanicsConfig, BeeType } from './mechanics';

export interface DodgeResult {
  scoreDelta: number;
  comboBonus: number;
  comboTriggered: boolean;
  feverTriggered: boolean;
  levelUp: boolean;
  newLevel: number;
  paletteIndex: number;
}

export interface FishResult {
  scoreDelta: number;
  fishCount: number;
  totalFish: number;
  feverTriggered: boolean;
  levelUp: boolean;
  newLevel: number;
  paletteIndex: number;
}

export interface NearMissResult {
  scoreDelta: number;
  feverTriggered: boolean;
}

export interface SwarmSurviveResult {
  scoreDelta: number;
  feverTriggered: boolean;
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
  fish: number;
  totalFish: number;
  isNewRecord: boolean;
}

export interface GameEngineOptions {
  bestScore?: number;
  totalFish?: number;
  totalGamesPlayed?: number;
}

export class GameEngine {
  private cfg: MechanicsConfig;

  // state phiên hiện tại
  score = 0;
  streak = 0;
  elapsed = 0;
  fish = 0;

  // power-ups & fever
  shieldActive = false;
  magnetTimeRemaining = 0;
  fever = 0; // 0 - 100%
  feverActive = false;
  feverTimeRemaining = 0;

  // state bền vững (qua phiên)
  bestScore: number;
  totalFish: number;
  totalGamesPlayed: number;

  // cờ phiên
  recordShownThisSession = false;
  private continueUsed = false;

  constructor(cfg: MechanicsConfig, opts: GameEngineOptions = {}) {
    this.cfg = cfg;
    this.bestScore = opts.bestScore ?? 0;
    this.totalFish = opts.totalFish ?? 0;
    this.totalGamesPlayed = opts.totalGamesPlayed ?? 0;
  }

  startNewGame(): void {
    this.score = 0;
    this.streak = 0;
    this.elapsed = 0;
    this.fish = 0;
    this.shieldActive = false;
    this.magnetTimeRemaining = 0;
    this.fever = 0;
    this.feverActive = false;
    this.feverTimeRemaining = 0;
    this.recordShownThisSession = false;
    this.continueUsed = false;
    this.totalGamesPlayed += 1;
  }

  resumeGame(): void {
    // Giữ nguyên score, fish, totalFish khi xem quảng cáo tiếp tục (Continue)
    this.streak = 0;
    this.shieldActive = true; // Cấp khiên bảo hộ hồi sinh
    this.continueUsed = true;
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

    const basePoints = this.isFeverActive() ? this.cfg.pointsPerDodge * 2 : this.cfg.pointsPerDodge;
    this.score += basePoints;
    this.streak += 1;

    if (this.streak > 0 && this.streak % this.cfg.comboPer === 0) {
      comboBonus = this.isFeverActive() ? this.cfg.comboBonus * 2 : this.cfg.comboBonus;
      comboTriggered = true;
      this.score += comboBonus;
    }

    const feverTriggered = this.addFever(this.cfg.feverPerDodge);

    const newLevel = this.getLevel();
    const prevScore = this.score - basePoints - comboBonus;
    const prevLevel = Math.floor(prevScore / this.cfg.milestoneInterval) + 1;
    const levelUp = newLevel > prevLevel;

    return {
      scoreDelta: basePoints + comboBonus,
      comboBonus,
      comboTriggered,
      feverTriggered,
      levelUp,
      newLevel,
      paletteIndex: this.getPaletteIndex(newLevel),
    };
  }

  registerHit(): void {
    this.streak = 0;
  }

  // --- Pickups: Cá Vàng ---
  collectFish(): FishResult {
    this.fish += 1;
    this.totalFish += 1;

    const basePoints = this.isFeverActive() ? this.cfg.pointsPerFish * 2 : this.cfg.pointsPerFish;
    this.score += basePoints;

    const feverTriggered = this.addFever(this.cfg.feverPerFish);

    const newLevel = this.getLevel();
    const prevScore = this.score - basePoints;
    const prevLevel = Math.floor(prevScore / this.cfg.milestoneInterval) + 1;
    const levelUp = newLevel > prevLevel;

    return {
      scoreDelta: basePoints,
      fishCount: this.fish,
      totalFish: this.totalFish,
      feverTriggered,
      levelUp,
      newLevel,
      paletteIndex: this.getPaletteIndex(newLevel),
    };
  }

  // --- Near-Miss (Né sát sạt) ---
  registerNearMiss(): NearMissResult {
    const baseBonus = this.isFeverActive() ? this.cfg.nearMissBonus * 2 : this.cfg.nearMissBonus;
    this.score += baseBonus;
    const feverTriggered = this.addFever(this.cfg.feverPerNearMiss);

    return {
      scoreDelta: baseBonus,
      feverTriggered,
    };
  }

  // --- Power-ups: Khiên (Shield) ---
  activateShield(): void {
    this.shieldActive = true;
  }

  tryUseShield(): boolean {
    if (this.shieldActive) {
      this.shieldActive = false;
      return true; // Đã bảo vệ thành công
    }
    return false;
  }

  // --- Power-ups: Nam châm (Magnet) ---
  activateMagnet(duration = this.cfg.magnetDurationSec): void {
    this.magnetTimeRemaining = duration;
  }

  isMagnetActive(): boolean {
    return this.magnetTimeRemaining > 0;
  }

  // --- Fever Mode ---
  addFever(amount: number): boolean {
    if (this.isFeverActive()) return false;
    this.fever = Math.min(100, this.fever + amount);
    if (this.fever >= 100) {
      this.feverActive = true;
      this.feverTimeRemaining = this.cfg.feverDurationSec;
      return true; // Kích hoạt Fever!
    }
    return false;
  }

  isFeverActive(): boolean {
    return this.feverActive && this.feverTimeRemaining > 0;
  }

  destroyBeeInFever(): { scoreDelta: number } {
    this.score += this.cfg.feverKillBonus;
    return { scoreDelta: this.cfg.feverKillBonus };
  }

  // --- Swarm Wave (Bão Ong) ---
  registerSwarmSurvive(): SwarmSurviveResult {
    const baseBonus = this.isFeverActive() ? this.cfg.swarmBonus * 2 : this.cfg.swarmBonus;
    this.score += baseBonus;
    const feverTriggered = this.addFever(this.cfg.feverPerSwarm);

    const newLevel = this.getLevel();
    const prevScore = this.score - baseBonus;
    const prevLevel = Math.floor(prevScore / this.cfg.milestoneInterval) + 1;
    const levelUp = newLevel > prevLevel;

    return {
      scoreDelta: baseBonus,
      feverTriggered,
      levelUp,
      newLevel,
      paletteIndex: this.getPaletteIndex(newLevel),
    };
  }

  // --- Enemy Variety (Phân phối loại ong theo tiến trình) ---
  rollBeeType(elapsedSec = this.elapsed, level = this.getLevel()): BeeType {
    if (elapsedSec < this.cfg.warmupSeconds && level === 1) {
      return 'normal';
    }

    const roll = Math.random();
    if (level === 1) {
      // Level 1 sau 10s: 80% thường, 20% nhanh
      return roll < 0.20 ? 'speedy' : 'normal';
    } else if (level === 2) {
      // Level 2: 60% thường, 25% nhanh, 15% ong béo
      if (roll < 0.25) return 'speedy';
      if (roll < 0.40) return 'fat';
      return 'normal';
    } else {
      // Level 3+: 45% thường, 25% nhanh, 15% béo, 15% zigzag
      if (roll < 0.25) return 'speedy';
      if (roll < 0.40) return 'fat';
      if (roll < 0.55) return 'zigzag';
      return 'normal';
    }
  }

  // --- Update Timers theo dt ---
  updateTimers(dt: number): { feverEnded: boolean } {
    let feverEnded = false;

    if (this.magnetTimeRemaining > 0) {
      this.magnetTimeRemaining = Math.max(0, this.magnetTimeRemaining - dt);
    }

    if (this.feverActive) {
      this.feverTimeRemaining -= dt;
      if (this.feverTimeRemaining <= 0) {
        this.feverActive = false;
        this.feverTimeRemaining = 0;
        this.fever = 0;
        feverEnded = true;
      }
    }

    return { feverEnded };
  }

  // --- Score: thời gian ---
  tickSecond(): TickResult {
    const points = this.isFeverActive() ? this.cfg.pointsPerSecond * 2 : this.cfg.pointsPerSecond;
    this.score += points;
    this.elapsed += 1;
    return { scoreDelta: points };
  }

  // --- Difficulty curve (BR-17) ---
  difficulty(elapsedSec = this.elapsed, level = this.getLevel()): DifficultyResult {
    const warm = this.cfg.warmupSeconds;
    let ramp = 0;
    if (elapsedSec > warm) {
      ramp = this.cfg.speedIncreasePerSec * (elapsedSec - warm);
    }
    const levelBonus = this.cfg.levelSpeedStep * (level - 1);
    const rawSpeed = this.cfg.startSpeed + ramp + levelBonus;
    const speed = Math.min(this.cfg.maxSpeed, rawSpeed);

    let spawn = 1;
    if (elapsedSec > warm) {
      spawn += this.cfg.spawnIncrease * (elapsedSec - warm);
    }
    spawn += 0.5 * (level - 1);
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
      fish: this.fish,
      totalFish: this.totalFish,
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

  // --- Interstitial BR-09 ---
  shouldShowInterstitial(): boolean {
    return this.totalGamesPlayed >= this.cfg.interstitialDelayGames;
  }
}

