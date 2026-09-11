// GameEngine — LOGIC GAMEPLAY THUẦN (KHÔNG phụ thuộc Phaser).
// Bao gồm: score (+1/né, +1/s), combo streak (+5 mỗi 5 né, reset khi chạm),
// level = floor(score/10)+1 + đổi palette (vòng lại 3), best record, difficulty curve.
// Testable độc lập (xem __tests__/GameEngine.test.ts).

import type {
  MechanicsConfig,
  BeeType,
  DodgeResult,
  FishResult,
  NearMissResult,
  SwarmSurviveResult,
  TickResult,
  DifficultyResult,
  EndGameResult,
  CatSkin,
  Quest,
  GameEngineOptions,
  DebutType,
  DebutWindow,
  StageStats,
  StageClearResult,
} from './types';
import { CAT_SKINS, INITIAL_QUESTS } from '../config';
import { DebutBeat } from './DebutBeat';

export {
  type DodgeResult,
  type FishResult,
  type NearMissResult,
  type SwarmSurviveResult,
  type TickResult,
  type DifficultyResult,
  type EndGameResult,
  type CatSkin,
  type Quest,
  type GameEngineOptions,
  type StageStats,
  type StageClearResult,
  CAT_SKINS,
  INITIAL_QUESTS,
};

export class GameEngine {
  private cfg: MechanicsConfig;

  // state phiên hiện tại
  score = 0;
  streak = 0;
  elapsed = 0;
  fish = 0;

  // --- Stage & Level progression (Stage 1: Level 1 -> 10, mỗi level 60s) ---
  stage = 1;
  stageLevel = 1;
  levelElapsed = 0;
  stageScore = 0;
  stageFish = 0;
  stageDodges = 0;
  stageMaxCombo = 0;
  stageShieldLost = false;
  stageCleared = false;
  stageStartElapsed = 0;

  // power-ups & fever
  shieldActive = false;
  magnetTimeRemaining = 0;
  fever = 0; // 0 - 100%
  feverActive = false;
  feverTimeRemaining = 0;

  // state bền vững (qua phiên)
  bestScore: number;
  bestStage: number;
  totalFish: number;
  totalGamesPlayed: number;
  unlockedSkins: string[];
  selectedSkin: string;
  quests: Quest[];

  // cờ phiên & fat bee breather progression (Phương trình: L(k) = 20 + 15k + 5k^2)
  recordShownThisSession = false;
  private continueUsed = false;
  fatBeeSpawnCount = 0;

  // D-A2: rng injectable — mọi roll spawn/type logic phải đi qua đây (default Math.random).
  private readonly rngFn: () => number;

  // UPG2-P1a: state debut beat ủy quyền cho DebutBeat (1 class 1 trách nhiệm — chống god-file).
  private debut: DebutBeat;

  constructor(cfg: MechanicsConfig, opts: GameEngineOptions = {}) {
    this.cfg = cfg;
    this.rngFn = opts.rng ?? Math.random;
    this.debut = new DebutBeat(cfg);
    this.bestScore = opts.bestScore ?? 0;
    this.bestStage = opts.bestStage ?? 1;
    this.totalFish = opts.totalFish ?? 0;
    this.totalGamesPlayed = opts.totalGamesPlayed ?? 0;
    this.unlockedSkins = opts.unlockedSkins && opts.unlockedSkins.length > 0 ? opts.unlockedSkins : ['ginger'];
    this.selectedSkin = opts.selectedSkin ?? 'ginger';
    this.quests = opts.quests && opts.quests.length > 0 ? opts.quests : JSON.parse(JSON.stringify(INITIAL_QUESTS));
  }

  startNewGame(): void {
    this.score = 0;
    this.streak = 0;
    this.elapsed = 0;
    this.stageStartElapsed = 0;
    this.fish = 0;
    this.stage = 1;
    this.stageLevel = 1;
    this.levelElapsed = 0;
    this.stageScore = 0;
    this.stageFish = 0;
    this.stageDodges = 0;
    this.stageMaxCombo = 0;
    this.stageShieldLost = false;
    this.stageCleared = false;
    this.shieldActive = false;
    this.magnetTimeRemaining = 0;
    this.fever = 0;
    this.feverActive = false;
    this.feverTimeRemaining = 0;
    this.recordShownThisSession = false;
    this.continueUsed = false;
    this.fatBeeSpawnCount = 0;
    // UPG2-P1a: debut 1 lần/PHIÊN — ván mới reset toàn bộ firstSeen.
    this.debut.clear();
    this.totalGamesPlayed += 1;
  }

  /**
   * Phương trình tự động tính mốc Level xuất hiện Ong Béo lần thứ (k+1):
   * L(k) = 20 + 15k + 5k^2
   * k = 0 -> Level 20
   * k = 1 -> Level 40 (+20)
   * k = 2 -> Level 70 (+30)
   * k = 3 -> Level 110 (+40)
   * k = 4 -> Level 160 (+50)...
   */
  getNextFatBeeTargetLevel(k = this.fatBeeSpawnCount): number {
    return 20 + 15 * k + 5 * k * k;
  }

  getProgressionLevel(): number {
    const maxLvs = this.cfg.stageMaxLevels ?? 10;
    return (this.stage - 1) * maxLvs + (this.stageLevel ?? 1);
  }

  shouldTriggerFatBeeBreather(level = this.getProgressionLevel()): boolean {
    const target = this.getNextFatBeeTargetLevel();
    return level >= target;
  }

  consumeFatBeeBreather(): void {
    this.fatBeeSpawnCount++;
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

  getPaletteIndex(level?: number): number {
    if (level !== undefined) {
      if (level < 10) return 0; // Ban ngày (Level 1..9)
      if (level < 20) return 1; // Hoàng hôn (Level 10..19)
      return 2;                 // Đêm (Level 20+)
    }
    if (this.stage === 1) return 0; // Stage 1: Ban ngày
    if (this.stage === 2) return 1; // Stage 2: Hoàng hôn
    if (this.stage >= 3) return 2;  // Stage 3+: Đêm
    return 0;
  }


  get paletteIndex(): number {
    return this.getPaletteIndex(this.getLevel());
  }

  // --- Stage & Level progression (Stage 1: Level 1 -> 10, mỗi level 60s) ---
  getStageTarget(stage: number = this.stage): number {
    const base = this.cfg.stageBaseTarget ?? 20;
    const step = this.cfg.stageTargetStep ?? 5;
    return base + (stage - 1) * step;
  }

  isLevelComplete(): boolean {
    const duration = this.cfg.levelDurationSec ?? 60;
    return this.levelElapsed >= duration;
  }

  isStageComplete(): boolean {
    const maxLvs = this.cfg.stageMaxLevels ?? 10;
    return this.stageLevel >= maxLvs && this.isLevelComplete();
  }

  getStageStars(): number {
    let stars = 1;
    // Sống sót 60s: 1 sao cơ bản
    if (this.stageMaxCombo >= (this.cfg.comboPer ?? 5) || this.stageFish >= 1) {
      stars = 2; // Nhặt ít nhất 1 cá hoặc combo >= 5
    }
    if (this.stageMaxCombo >= (this.cfg.comboPer ?? 5) * 2 && !this.stageShieldLost) {
      stars = 3; // Combo >= 10 và không vỡ khiên
    }
    return stars;
  }

  completeLevel(): StageClearResult {
    const maxLvs = this.cfg.stageMaxLevels ?? 10;
    if (this.stageLevel >= maxLvs) {
      return this.completeStage();
    }
    this.stageCleared = true;
    const stars = this.getStageStars();
    const stats: StageStats = {
      stage: this.stage,
      level: this.stageLevel,
      stageScore: this.stageScore,
      stageFish: this.stageFish,
      stageDodges: this.stageDodges,
      maxCombo: this.stageMaxCombo,
      shieldLost: this.stageShieldLost,
      stars,
      levelElapsed: this.levelElapsed,
    };
    return {
      stage: this.stage,
      level: this.stageLevel,
      nextLevel: this.stageLevel + 1,
      isStageComplete: false,
      nextStage: this.stage,
      stats,
      totalScore: this.score,
      paletteIndex: this.stage === 1 ? 0 : this.getPaletteIndex(this.stageLevel),
    };
  }

  completeStage(): StageClearResult {
    this.stageCleared = true;
    const stars = this.getStageStars();
    const stats: StageStats = {
      stage: this.stage,
      level: this.stageLevel,
      stageScore: this.stageScore,
      stageFish: this.stageFish,
      stageDodges: this.stageDodges,
      maxCombo: this.stageMaxCombo,
      shieldLost: this.stageShieldLost,
      stars,
      levelElapsed: this.levelElapsed,
    };
    const isVictory = this.stage >= 3;
    const nextStage = isVictory ? 3 : this.stage + 1;
    if (nextStage > this.bestStage) {
      this.bestStage = nextStage;
    }
    return {
      stage: this.stage,
      level: this.stageLevel,
      nextLevel: 1,
      isStageComplete: true,
      isVictory,
      nextStage,
      stats,
      totalScore: this.score,
      paletteIndex: this.stage === 1 ? 0 : this.getPaletteIndex(this.stageLevel),
    };
  }

  advanceToNextLevel(): void {
    const maxLvs = this.cfg.stageMaxLevels ?? 10;
    if (this.stageLevel >= maxLvs) {
      this.advanceToNextStage();
    } else {
      this.stageLevel += 1;
      this.levelElapsed = 0;
      this.stageScore = 0;
      this.stageFish = 0;
      this.stageDodges = 0;
      this.stageMaxCombo = 0;
      this.stageShieldLost = false;
      this.stageCleared = false;
    }
  }

  advanceToNextStage(): void {
    if (this.stage >= 3) {
      // Đã hoàn thành Stage 3 (Victory) — không tăng lên Stage 4 mà giữ nguyên Stage 3
      this.stageLevel = 1;
      this.levelElapsed = 0;
      this.stageScore = 0;
      this.stageFish = 0;
      this.stageDodges = 0;
      this.stageMaxCombo = 0;
      this.stageShieldLost = false;
      this.stageCleared = false;
      this.stageStartElapsed = this.elapsed;
      return;
    }
    this.stage += 1;
    this.stageLevel = 1;
    this.levelElapsed = 0;
    this.stageScore = 0;
    this.stageFish = 0;
    this.stageDodges = 0;
    this.stageMaxCombo = 0;
    this.stageShieldLost = false;
    this.stageCleared = false;
    this.stageStartElapsed = this.elapsed;
    if (this.stage > this.bestStage) {
      this.bestStage = this.stage;
    }
  }

  getStageBaseElapsed(stage = this.stage): number {
    if (stage === 1) return 0;
    if (stage === 2) return Math.max(this.stageStartElapsed, 120);
    if (stage >= 3) return Math.max(this.stageStartElapsed, 240);
    return Math.max(this.stageStartElapsed, 0);
  }

  recordStageStart(stage: number, elapsed: number): void {
    this.stage = stage;
    this.stageStartElapsed = elapsed;
    this.elapsed = elapsed;
  }

  retryCurrentLevel(): void {
    this.score = Math.max(0, this.score - this.stageScore);
    this.fish = Math.max(0, this.fish - this.stageFish);
    this.totalFish = Math.max(0, this.totalFish - this.stageFish);
    this.levelElapsed = 0;
    this.stageScore = 0;
    this.stageFish = 0;
    this.stageDodges = 0;
    this.stageMaxCombo = 0;
    this.stageShieldLost = false;
    this.stageCleared = false;
    this.streak = 0;
  }

  retryCurrentStage(): void {
    // Vẫn giữ stage hiện tại, chỉ reset level về 1
    this.stageLevel = 1;
    this.retryCurrentLevel();
    // Giữ nguyên tốc độ mốc của Stage hiện tại (không bị hãm về tốc độ 0 của màn đầu)
    this.elapsed = this.getStageBaseElapsed();
    this.fever = 0;
    this.feverActive = false;
    this.feverTimeRemaining = 0;
    this.shieldActive = false;
    this.magnetTimeRemaining = 0;
    this.continueUsed = false;
    this.recordShownThisSession = false;
    this.fatBeeSpawnCount = 0;
    this.debut.clear();
    this.totalGamesPlayed += 1;
  }


  private checkStageProgress(): { stageClear: boolean; stageClearResult?: StageClearResult } {
    return { stageClear: false };
  }

  // --- Score: né ong ---
  registerDodge(): DodgeResult {
    let comboBonus = 0;
    let comboTriggered = false;

    const basePoints = this.isFeverActive() ? this.cfg.pointsPerDodge * 2 : this.cfg.pointsPerDodge;
    this.score += basePoints;
    this.stageScore += basePoints;
    this.streak += 1;
    this.stageDodges += 1;
    if (this.streak > this.stageMaxCombo) {
      this.stageMaxCombo = this.streak;
    }
    this.incrementQuest('dodge_30', 1);

    if (this.streak > 0 && this.streak % this.cfg.comboPer === 0) {
      comboBonus = this.isFeverActive() ? this.cfg.comboBonus * 2 : this.cfg.comboBonus;
      comboTriggered = true;
      this.score += comboBonus;
      this.stageScore += comboBonus;
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
      stageClear: false,
    };
  }

  registerHit(): void {
    this.streak = 0;
  }

  // --- Pickups: Cá Vàng ---
  collectFish(): FishResult {
    this.fish += 1;
    this.totalFish += 1;
    this.stageFish += 1;
    this.incrementQuest('collect_8_fish', 1);

    const basePoints = this.isFeverActive() ? this.cfg.pointsPerFish * 2 : this.cfg.pointsPerFish;
    this.score += basePoints;
    this.stageScore += basePoints;

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
      stageClear: false,
    };
  }

  // --- Near-Miss (Né sát sạt) ---
  registerNearMiss(): NearMissResult {
    const baseBonus = this.isFeverActive() ? this.cfg.nearMissBonus * 2 : this.cfg.nearMissBonus;
    this.score += baseBonus;
    this.stageScore += baseBonus;
    const feverTriggered = this.addFever(this.cfg.feverPerNearMiss);

    return {
      scoreDelta: baseBonus,
      feverTriggered,
      stageClear: false,
    };
  }

  // --- Power-ups: Khiên (Shield) ---
  activateShield(): void {
    this.shieldActive = true;
  }

  tryUseShield(): boolean {
    if (this.shieldActive) {
      this.shieldActive = false;
      this.stageShieldLost = true;
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
    this.stageScore += this.cfg.feverKillBonus;
    return { scoreDelta: this.cfg.feverKillBonus };
  }

  // --- Swarm Wave (Bão Ong) ---
  registerSwarmSurvive(): SwarmSurviveResult {
    const baseBonus = this.isFeverActive() ? this.cfg.swarmBonus * 2 : this.cfg.swarmBonus;
    this.score += baseBonus;
    this.stageScore += baseBonus;
    const feverTriggered = this.addFever(this.cfg.feverPerSwarm);
    this.incrementQuest('survive_swarm', 1);

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
      stageClear: false,
    };
  }

  // --- Enemy Variety (Stage 1: normal + speedy; Stage 2: + zigzag; Stage 3: + stalker) ---
  rollBeeType(elapsedSec = this.elapsed, level = this.getLevel()): BeeType {
    // Warmup 30s chỉ áp dụng cho người mới chơi ở Stage 1; Stage 2 & 3 xuất hiện đầy đủ các loại ong ngay từ Level 1
    if (this.stage === 1 && elapsedSec < this.cfg.warmupSeconds) {
      return 'normal';
    }

    const roll = this.rngFn();

    // Stage 3+: Ban đêm (Night Garden) — Thêm Stalker Bee
    if (this.stage >= 3 || level >= 20) {
      const stalkerRatio = this.cfg.stalkerRatioStage3 ?? 0.25;
      if (roll < 0.25) return 'speedy';
      if (roll < 0.45) return 'zigzag';
      if (roll < 0.45 + stalkerRatio) return 'stalker';
      return 'normal';
    }

    // Stage 2: Hoàng hôn (Sunset Sprint) hoặc Level 10+ legacy — Thêm Zigzag Bee
    if (this.stage === 2 || level >= 10) {
      if (roll < 0.30) return 'speedy';
      if (roll < 0.50) return 'zigzag';
      return 'normal';
    }

    // Stage 1: Ban ngày (Morning Garden) — Chỉ có ong vàng và ong đỏ
    const currentLv = this.stageLevel ?? level;
    const speedyRatio = currentLv <= 2 ? 0.20 : currentLv <= 5 ? 0.28 : 0.35;
    return roll < speedyRatio ? 'speedy' : 'normal';
  }

  // --- Debut beat (UPG2-P1a, t_6035fb14) — ủy quyền DebutBeat, CONTRACT §3.3 ---
  /** Ghi lần đầu xuất hiện của 1 loại trong phiên (spawn/swarm gọi; normal bị bỏ qua). */
  noteDebut(type: DebutType, atElapsedSec: number): void {
    this.debut.note(type, atElapsedSec);
  }

  /** Cửa sổ telegraph đang mở tại `at` (typed DebutWindow — tầng B vẽ từ dữ liệu này) hoặc null. */
  debutAt(at: number): DebutWindow | null {
    return this.debut.activeAt(at);
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

  // --- Score & 60s Level Progression: thời gian ---
  tickSecond(): TickResult {
    const points = this.isFeverActive() ? this.cfg.pointsPerSecond * 2 : this.cfg.pointsPerSecond;
    const prevLevel = this.getLevel();
    this.score += points;
    this.stageScore += points;
    this.elapsed += 1;
    this.levelElapsed += 1;
    const newLevel = this.getLevel();

    const duration = this.cfg.levelDurationSec ?? 60;
    let levelClear = false;
    let stageClearResult: StageClearResult | undefined;

    if (this.levelElapsed >= duration && !this.stageCleared) {
      levelClear = true;
      stageClearResult = this.completeLevel();
    }

    return {
      scoreDelta: points,
      levelUp: newLevel > prevLevel,
      newLevel,
      stageClear: levelClear,
      stageClearResult,
      levelClear,
      levelElapsed: this.levelElapsed,
      levelDurationSec: duration,
    };
  }

  // --- Difficulty curve (D-A2 + Stage 1 level tuning) ---
  difficulty(elapsedSec = this.elapsed, level = this.getLevel()): DifficultyResult {
    const warm = this.cfg.warmupSeconds;
    let ramp = 0;
    if (elapsedSec > warm) {
      const earlySpan = Math.min(elapsedSec, this.cfg.earlyRampUntilSec) - warm;
      ramp = this.cfg.earlyRampPerSec * earlySpan;
      if (elapsedSec > this.cfg.earlyRampUntilSec) {
        ramp += this.cfg.speedIncreasePerSec * (elapsedSec - this.cfg.earlyRampUntilSec);
      }
    }
    const levelBonus = this.cfg.levelSpeedStep * (level - 1);
    const rawSpeed = this.cfg.startSpeed + ramp + levelBonus;

    const softCap = this.cfg.maxSpeed;
    let speed = rawSpeed;
    if (rawSpeed > softCap) {
      const delta = rawSpeed - softCap;
      speed = softCap + 1.5 * Math.sqrt(delta);
    }

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
    if (this.stage > this.bestStage) {
      this.bestStage = this.stage;
    }
    this.updateQuestMax('score_100', this.score);
    return {
      score: this.score,
      bestScore: this.bestScore,
      level: this.getLevel(),
      stage: this.stage,
      bestStage: this.bestStage,
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

  // --- Shop & Cat Skins ---
  getAvailableSkins(): CatSkin[] {
    return CAT_SKINS;
  }

  getSelectedSkin(): CatSkin {
    return CAT_SKINS.find(s => s.id === this.selectedSkin) ?? CAT_SKINS[0];
  }

  getSelectedSkinTexture(): string {
    return this.getSelectedSkin().textureKey;
  }

  isSkinUnlocked(skinId: string): boolean {
    return this.unlockedSkins.includes(skinId);
  }

  unlockSkin(skinId: string): boolean {
    const skin = CAT_SKINS.find(s => s.id === skinId);
    if (!skin) return false;
    if (this.isSkinUnlocked(skinId)) {
      this.selectSkin(skinId);
      return true;
    }
    if (this.totalFish < skin.price) return false;

    this.totalFish -= skin.price;
    this.unlockedSkins.push(skinId);
    this.selectedSkin = skinId;
    return true;
  }

  selectSkin(skinId: string): boolean {
    if (!this.isSkinUnlocked(skinId)) return false;
    this.selectedSkin = skinId;
    return true;
  }

  // --- Quests & Achievements ---
  getQuests(): Quest[] {
    return this.quests;
  }

  incrementQuest(questId: string, amount = 1): void {
    const q = this.quests.find(item => item.id === questId);
    if (q && !q.claimed) {
      q.progress = Math.min(q.target, q.progress + amount);
    }
  }

  updateQuestMax(questId: string, value: number): void {
    const q = this.quests.find(item => item.id === questId);
    if (q && !q.claimed) {
      q.progress = Math.max(q.progress, Math.min(q.target, value));
    }
  }

  claimQuest(questId: string): number {
    const q = this.quests.find(item => item.id === questId);
    if (!q || q.claimed || q.progress < q.target) return 0;
    q.claimed = true;
    this.totalFish += q.rewardFish;
    return q.rewardFish;
  }

  hasUnclaimedQuests(): boolean {
    return this.quests.some(q => !q.claimed && q.progress >= q.target);
  }

  // --- Interstitial BR-09 ---
  shouldShowInterstitial(): boolean {
    return this.totalGamesPlayed >= this.cfg.interstitialDelayGames;
  }
}

