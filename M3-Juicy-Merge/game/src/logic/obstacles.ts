// M3 Juicy Merge — Obstacles Logic (Pure TS, zero Phaser dependencies)
// Manages Ice Blocks, Wooden Crates, and Bubble Fruits for Stage Mode.

export type ObstacleType = "ice" | "crate" | "bubble";

export interface ObstacleState {
  readonly id: number;
  readonly type: ObstacleType;
  /** Normalized X position within bucket (0 = left wall, 1 = right wall) or world px */
  readonly xRatio: number;
  /** Normalized Y position within bucket (0 = top, 1 = bottom) or world px */
  readonly yRatio: number;
  readonly width: number;
  readonly height: number;
  hp: number;
  readonly maxHp: number;
  isDestroyed: boolean;
  /** Fruit tier trapped inside if this is a bubble obstacle */
  readonly containedFruitTier?: number | undefined;
}

export interface ObstacleInitConfig {
  id: number;
  type: ObstacleType;
  xRatio: number;
  yRatio: number;
  width?: number;
  height?: number;
  hp?: number;
  containedFruitTier?: number;
}

export const DEFAULT_OBSTACLE_SIZES: Record<ObstacleType, { width: number; height: number; defaultHp: number }> = {
  ice: { width: 72, height: 72, defaultHp: 1 },
  crate: { width: 80, height: 80, defaultHp: 2 },
  bubble: { width: 76, height: 76, defaultHp: 1 },
};

export const DEFAULT_MERGE_DAMAGE_RADIUS = 130;

export function createObstacle(config: ObstacleInitConfig): ObstacleState {
  const defaults = DEFAULT_OBSTACLE_SIZES[config.type];
  const maxHp = config.hp ?? defaults.defaultHp;
  return {
    id: config.id,
    type: config.type,
    xRatio: Math.max(0, Math.min(1, config.xRatio)),
    yRatio: Math.max(0, Math.min(1, config.yRatio)),
    width: config.width ?? defaults.width,
    height: config.height ?? defaults.height,
    hp: maxHp,
    maxHp,
    isDestroyed: false,
    containedFruitTier: config.containedFruitTier,
  };
}

export function damageObstacle(
  obstacle: ObstacleState,
  damage = 1
): { obstacle: ObstacleState; wasDestroyed: boolean } {
  if (obstacle.isDestroyed) {
    return { obstacle, wasDestroyed: false };
  }

  obstacle.hp = Math.max(0, obstacle.hp - damage);
  const wasDestroyed = obstacle.hp === 0;
  if (wasDestroyed) {
    obstacle.isDestroyed = true;
  }

  return { obstacle, wasDestroyed };
}

export function calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Checks for obstacles near a merge event and applies damage to them.
 * When fruits merge, the resulting shockwave damages nearby ice, crates, and bubbles.
 */
export function evaluateObstacleDamageOnMerge(
  mergePos: { x: number; y: number },
  obstacles: ObstacleState[],
  obstacleWorldPositions: Map<number, { x: number; y: number }>,
  damageRadius = DEFAULT_MERGE_DAMAGE_RADIUS
): {
  damaged: ObstacleState[];
  destroyed: ObstacleState[];
} {
  const damaged: ObstacleState[] = [];
  const destroyed: ObstacleState[] = [];

  for (const obs of obstacles) {
    if (obs.isDestroyed) continue;

    const pos = obstacleWorldPositions.get(obs.id);
    if (!pos) continue;

    const dist = calculateDistance(mergePos.x, mergePos.y, pos.x, pos.y);
    if (dist <= damageRadius) {
      const { wasDestroyed } = damageObstacle(obs, 1);
      damaged.push(obs);
      if (wasDestroyed) {
        destroyed.push(obs);
      }
    }
  }

  return { damaged, destroyed };
}

export function getActiveObstacleCount(obstacles: ObstacleState[]): number {
  return obstacles.filter((obs) => !obs.isDestroyed).length;
}

export function areAllObstaclesCleared(obstacles: ObstacleState[]): boolean {
  return obstacles.every((obs) => obs.isDestroyed);
}
