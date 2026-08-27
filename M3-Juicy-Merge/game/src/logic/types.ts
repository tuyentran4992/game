// M3 Juicy Merge — Core Domain Types
// Canonical type definitions and shared interfaces across the game logic.

export type {
  PhysicsConfig,
  MechanicsConfig,
  DropTierWeight,
  DropSpawnBand,
} from './config';

export type {
  FruitSpec,
  MergeState,
} from './merge-engine';

export type {
  PowerupState,
} from './powerups';

export type {
  ActionPowerupType,
  ActionPowerupInventory,
} from './action-powerups';

export type {
  ObstacleType,
  ObstacleState,
  ObstacleInitConfig,
} from './obstacles';

export type {
  StageGoalType,
  StageGoal,
  StageConfig,
  StageProgressResult,
} from './stages';

export type {
  DailyDifficulty,
  MilestoneReward,
  DailyChallengeState,
} from './daily-challenge';

export type {
  FruitInfo,
  AlbumProgress,
} from './album';

export type {
  SaveAdapter,
  SavePayload,
} from './save';
