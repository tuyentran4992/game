// M1 Rescue Dodge — Domain Types (Pure TypeScript, 0 Phaser dependency).

export interface Palette {
  key: string;
  level: number;
  bgTop: string;
  bgBottom: string;
  grass: string;
  laneColor: string;
  primary: string;
  accent: string;
}

export type BeeType = 'normal' | 'speedy' | 'fat' | 'zigzag';

export type ItemType = 'fish' | 'shield' | 'magnet';

export interface MechanicsConfig {
  laneCount: number;
  milestoneInterval: number;     // points per level increase (BR-14)
  comboPer: number;              // consecutive dodges required for combo bonus (BR-15)
  comboBonus: number;            // combo bonus points (BR-15)
  pointsPerDodge: number;        // +1 point per dodge
  pointsPerSecond: number;       // +1 point per second survived
  pointsPerFish: number;         // +2 points per golden fish collected
  feverPerDodge: number;         // +6% Fever gauge per dodge
  feverPerFish: number;          // +12% Fever gauge per fish
  feverPerNearMiss: number;      // +18% Fever gauge per close dodge
  nearMissBonus: number;         // +2 bonus points on near miss
  feverDurationSec: number;      // Duration of Fever Mode in seconds (4.5s)
  magnetDurationSec: number;     // Duration of Magnet Powerup in seconds (6.0s)
  feverKillBonus: number;        // +5 bonus points per bee smashed in Fever Mode
  swarmIntervalSec: number;      // Time between bee swarm raids in seconds (22s)
  swarmBonus: number;            // Bonus points upon surviving swarm raid (+10)
  feverPerSwarm: number;         // +30% Fever gauge upon surviving swarm raid
  startSpeed: number;            // Initial bee speed in pixels/s (warmup)
  maxSpeed: number;              // Maximum capped bee speed in pixels/s
  speedIncreasePerSec: number;   // Acceleration rate per second (khúc sau earlyRampUntilSec)
  earlyRampPerSec: number;       // Gentle ramp px/s từ hết warmup đến earlyRampUntilSec (D-A2)
  earlyRampUntilSec: number;     // Hết khúc ramp sớm (giây), sau đó dùng speedIncreasePerSec
  levelSpeedStep: number;        // Speed boost per level
  spawnIncrease: number;         // Spawn rate acceleration
  spawnRateMax: number;          // Maximum concurrent bees on screen
  warmupSeconds: number;         // Initial gentle onboarding duration (30s, D-A2)
  continueMaxPerGameOver: number;// Maximum rewarded continues per game over (1)
  interstitialDelayGames: number;// Interstitial delay count

  // --- Input-feel: lane-switch tween (UPG2-N1, card t_79d2b77d) — [PLACEHOLDER] tới playtest boss ---
  laneMoveMs: number;            // Duration tween đổi làn của mèo (ms, cũ dur.tn = 120)
  laneMoveDelayMs: number;       // Delay tween bóng đổ bám nhịp nhảy (ms, cũ 35)
  laneMoveEase: string;          // Ease tween đổi làn (Phaser ease name, cũ 'cubic.out')
  laneMoveSettleMs: number;      // Tween dựng dậy scale/angle sau khi tới làn (ms, cũ 80)
  inputBufferMs: number;         // Buffer input đổi làn (ms, 0 = phản hồi tức thì)

  // --- Cadence spawn (SCOPE+ T1a: 4 hằng từng [MIRROR] literal) — công thức:
  // max(floor, base - (speed-startSpeed)*speedFactor - (level-1)*levelFactor) ---
  spawnIntervalBase: number;     // Interval spawn ở speed bắt đầu, level 1 (giây, cũ 1.35)
  spawnIntervalFloor: number;    // Sàn interval spawn (giây, cũ 0.38)
  spawnSpeedFactor: number;      // Co speed: mỗi px/s tốc độ rút ngắn interval (cũ 0.0035)
  spawnLevelFactor: number;      // Co level: mỗi level rút ngắn interval (cũ 0.10)

  // --- Juice: hit-stop + camera punch (UPG2-J1, card t_cc6c390d) — [PLACEHOLDER] tới playtest boss ---
  // Điều kiện UX#63: hit-stop ≤120ms; KHÔNG băng HUD tween/input buffer (freeze áp dt=0
  // cho world, không đụng timeScale toàn cục). Camera punch: zoom out-then-in theo lực va.
  hitStopShieldMs: number;       // Đóng băng world khi khiên đỡ đòn (ms, lực va nhỏ nhất)
  hitStopHitMs: number;          // Đóng băng world khi va chạm thường (ms)
  hitStopDeathMs: number;        // Đóng băng world khi chết (ms, ≤120 theo UX#63)
  punchHitZoom: number;          // Biên zoom camera punch khi va chạm thường (0.04 = +4%)
  punchDeathZoom: number;        // Biên zoom camera punch khi chết (0.07 = +7%, mạnh hơn)
  punchHoldMs: number;           // Thời gian giữ điểm đáy zoom trước khi hồi (ms)

  // --- SpeedMult loại ong (SCOPE+ round 2: hợp nhất WIRING/BEES vào MechanicsConfig) ---
  speedyMult: number;            // Ong speedy bay nhanh hơn (cũ BEES.speedyMult = 1.18)
  normalMult: number;            // Ong thường (cũ BEES.normalMult = 1.0)
  fatSpeedMult: number;          // Ong to bay chậm (cũ BEES.fatSpeedMult = 0.72)

  palettes: Palette[];
}

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
  levelUp?: boolean;
  newLevel?: number;
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

export interface CatSkin {
  id: string;
  name: string;
  price: number;
  textureKey: string;
  desc: string;
}

export interface Quest {
  id: string;
  title: string;
  desc: string;
  target: number;
  rewardFish: number;
  progress: number;
  claimed: boolean;
}

export interface GameEngineOptions {
  bestScore?: number;
  totalFish?: number;
  totalGamesPlayed?: number;
  unlockedSkins?: string[];
  selectedSkin?: string;
  quests?: Quest[];
  rng?: () => number;            // Injectable RNG cho deterministic test (default Math.random)
}
