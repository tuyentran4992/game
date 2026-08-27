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
  speedIncreasePerSec: number;   // Acceleration rate per second
  levelSpeedStep: number;        // Speed boost per level
  spawnIncrease: number;         // Spawn rate acceleration
  spawnRateMax: number;          // Maximum concurrent bees on screen
  warmupSeconds: number;         // Initial gentle onboarding duration (10s)
  continueMaxPerGameOver: number;// Maximum rewarded continues per game over (1)
  interstitialDelayGames: number;// Interstitial delay count
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
}
