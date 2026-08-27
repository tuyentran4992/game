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
} from './types';
import { CAT_SKINS, INITIAL_QUESTS } from '../config';

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
  unlockedSkins: string[];
  selectedSkin: string;
  quests: Quest[];

  // cờ phiên & fat bee breather progression (Phương trình: L(k) = 20 + 15k + 5k^2)
  recordShownThisSession = false;
  private continueUsed = false;
  fatBeeSpawnCount = 0;

  constructor(cfg: MechanicsConfig, opts: GameEngineOptions = {}) {
    this.cfg = cfg;
    this.bestScore = opts.bestScore ?? 0;
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
    this.fish = 0;
    this.shieldActive = false;
    this.magnetTimeRemaining = 0;
    this.fever = 0;
    this.feverActive = false;
    this.feverTimeRemaining = 0;
    this.recordShownThisSession = false;
    this.continueUsed = false;
    this.fatBeeSpawnCount = 0;
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

  shouldTriggerFatBeeBreather(level = this.getLevel()): boolean {
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

  getPaletteIndex(level: number = this.getLevel()): number {
    if (level < 10) return 0; // Ban ngày (Level 1..9)
    if (level < 20) return 1; // Hoàng hôn (Level 10..19)
    return 2;                 // Đêm (Level 20+)
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
    this.incrementQuest('dodge_30', 1);

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
    this.incrementQuest('collect_8_fish', 1);

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
    };
  }

  // --- Enemy Variety (Phân phối loại ong thường/nhanh/zigzag theo tiến trình) ---
  rollBeeType(elapsedSec = this.elapsed, level = this.getLevel()): BeeType {
    if (elapsedSec < this.cfg.warmupSeconds && level === 1) {
      return 'normal';
    }

    const roll = Math.random();
    if (level < 10) {
      // Level 1-9 (Ban ngày): 75% thường, 25% nhanh
      return roll < 0.25 ? 'speedy' : 'normal';
    } else {
      // Level 10+ (Hoàng hôn & Đêm): 50% thường, 30% nhanh, 20% zigzag
      if (roll < 0.30) return 'speedy';
      if (roll < 0.50) return 'zigzag';
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
    const prevLevel = this.getLevel();
    this.score += points;
    this.elapsed += 1;
    const newLevel = this.getLevel();
    return {
      scoreDelta: points,
      levelUp: newLevel > prevLevel,
      newLevel,
    };
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

    // Phương án 2: Dưới mốc 440 px/s giữ nguyên; trên 440 px/s tăng siêu chậm theo hàm căn bậc hai (K = 1.5)
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
    this.updateQuestMax('score_100', this.score);
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

