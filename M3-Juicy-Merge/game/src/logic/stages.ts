// M3 Juicy Merge — Stage Mode Progression (Pure TS, zero Phaser dependencies)
// Defines 30 handcrafted levels with diverse goals, obstacles, and star thresholds.

import { type ObstacleInitConfig } from "./obstacles";
import { type ActionPowerupType } from "./action-powerups";

export type StageGoalType = "target_fruit" | "target_score" | "clear_obstacles";

export interface StageGoal {
  readonly type: StageGoalType;
  /** Fruit tier index (0: cherry, 1: strawberry ... 11: watermelon) */
  readonly targetTier?: number;
  /** Target count of fruit or obstacles */
  readonly targetCount?: number;
  /** Target score to achieve */
  readonly targetScore?: number;
}

export interface StageConfig {
  readonly id: number;
  readonly name: string;
  readonly description: string;
  readonly maxDrops: number;
  readonly goals: readonly StageGoal[];
  readonly obstacles?: readonly ObstacleInitConfig[];
  readonly starScores: readonly [number, number, number];
  readonly rewardPowerup?: ActionPowerupType;
  readonly rewardCount?: number;
}

/**
 * 30 Handcrafted stages designed for progression, depth, and variety.
 */
export const STAGES: readonly StageConfig[] = [
  // --- Zone 1: The Orchard Basics (Levels 1 - 5) ---
  {
    id: 1,
    name: "First Harvest",
    description: "Merge fruits to create 1 Dekopon (🍊 Tier 3).",
    maxDrops: 12,
    goals: [{ type: "target_fruit", targetTier: 3, targetCount: 1 }],
    starScores: [30, 50, 80],
    rewardPowerup: "hammer",
    rewardCount: 1,
  },
  {
    id: 2,
    name: "Pomegranate Garden",
    description: "Grow a rich Pomegranate (Tier 4) in 16 drops.",
    maxDrops: 16,
    goals: [{ type: "target_fruit", targetTier: 4, targetCount: 1 }],
    starScores: [50, 90, 140],
    rewardPowerup: "hammer",
    rewardCount: 1,
  },
  {
    id: 3,
    name: "Citrus Grove",
    description: "Merge fruits to create an Orange (Tier 5).",
    maxDrops: 20,
    goals: [{ type: "target_fruit", targetTier: 5, targetCount: 1 }],
    starScores: [80, 130, 190],
    rewardPowerup: "bomb",
    rewardCount: 1,
  },
  {
    id: 4,
    name: "Points Collector",
    description: "Reach 80 points before running out of fruit.",
    maxDrops: 16,
    goals: [{ type: "target_score", targetScore: 80 }],
    starScores: [80, 120, 170],
    rewardPowerup: "rainbow",
    rewardCount: 1,
  },
  {
    id: 5,
    name: "Apple Orchard",
    description: "Merge a crisp Apple (Tier 6) to conquer Zone 1!",
    maxDrops: 24,
    goals: [{ type: "target_fruit", targetTier: 6, targetCount: 1 }],
    starScores: [120, 180, 260],
    rewardPowerup: "bomb",
    rewardCount: 1,
  },

  // --- Zone 2: Frosty Valley - Ice Obstacles (Levels 6 - 10) ---
  {
    id: 6,
    name: "Ice Thaw",
    description: "Merge fruit near the 2 Ice Blocks to melt them.",
    maxDrops: 16,
    goals: [{ type: "clear_obstacles" }],
    obstacles: [
      { id: 1, type: "ice", xRatio: 0.25, yRatio: 0.85 },
      { id: 2, type: "ice", xRatio: 0.75, yRatio: 0.85 },
    ],
    starScores: [60, 100, 150],
    rewardPowerup: "hammer",
    rewardCount: 1,
  },
  {
    id: 7,
    name: "Frozen Orange",
    description: "Melt the ice and create 1 Orange (Tier 5).",
    maxDrops: 20,
    goals: [
      { type: "clear_obstacles" },
      { type: "target_fruit", targetTier: 5, targetCount: 1 },
    ],
    obstacles: [
      { id: 1, type: "ice", xRatio: 0.5, yRatio: 0.8 },
    ],
    starScores: [90, 140, 200],
    rewardPowerup: "rainbow",
    rewardCount: 1,
  },
  {
    id: 8,
    name: "Ice Wall",
    description: "Clear 3 Ice Blocks blocking the floor.",
    maxDrops: 20,
    goals: [{ type: "clear_obstacles" }],
    obstacles: [
      { id: 1, type: "ice", xRatio: 0.2, yRatio: 0.88 },
      { id: 2, type: "ice", xRatio: 0.5, yRatio: 0.88 },
      { id: 3, type: "ice", xRatio: 0.8, yRatio: 0.88 },
    ],
    starScores: [100, 150, 220],
    rewardPowerup: "bomb",
    rewardCount: 1,
  },
  {
    id: 9,
    name: "Crisp Apple",
    description: "Grow 1 Apple (Tier 6) with cold ice obstacles.",
    maxDrops: 24,
    goals: [{ type: "target_fruit", targetTier: 6, targetCount: 1 }],
    obstacles: [
      { id: 1, type: "ice", xRatio: 0.35, yRatio: 0.75 },
      { id: 2, type: "ice", xRatio: 0.65, yRatio: 0.75 },
    ],
    starScores: [130, 190, 270],
    rewardPowerup: "hammer",
    rewardCount: 2,
  },
  {
    id: 10,
    name: "Glacier Peak",
    description: "Clear 4 Ice Blocks and reach 150 points.",
    maxDrops: 30,
    goals: [
      { type: "clear_obstacles" },
      { type: "target_score", targetScore: 150 },
    ],
    obstacles: [
      { id: 1, type: "ice", xRatio: 0.25, yRatio: 0.8 },
      { id: 2, type: "ice", xRatio: 0.75, yRatio: 0.8 },
      { id: 3, type: "ice", xRatio: 0.35, yRatio: 0.9 },
      { id: 4, type: "ice", xRatio: 0.65, yRatio: 0.9 },
    ],
    starScores: [150, 220, 300],
    rewardPowerup: "rainbow",
    rewardCount: 2,
  },

  // --- Zone 3: Timber Woods - Wooden Crates (Levels 11 - 15) ---
  {
    id: 11,
    name: "Crate Breaker",
    description: "Smash 2 Wooden Crates with merges or bombs.",
    maxDrops: 20,
    goals: [{ type: "clear_obstacles" }],
    obstacles: [
      { id: 1, type: "crate", xRatio: 0.3, yRatio: 0.85, hp: 2 },
      { id: 2, type: "crate", xRatio: 0.7, yRatio: 0.85, hp: 2 },
    ],
    starScores: [100, 160, 230],
    rewardPowerup: "bomb",
    rewardCount: 1,
  },
  {
    id: 12,
    name: "Sweet Pear",
    description: "Grow 1 Pear (Tier 7) in a crate-filled bucket.",
    maxDrops: 28,
    goals: [{ type: "target_fruit", targetTier: 7, targetCount: 1 }],
    obstacles: [
      { id: 1, type: "crate", xRatio: 0.5, yRatio: 0.85, hp: 2 },
    ],
    starScores: [180, 260, 360],
    rewardPowerup: "hammer",
    rewardCount: 2,
  },
  {
    id: 13,
    name: "Heavy Storage",
    description: "Break 3 Crates and score 200 points.",
    maxDrops: 30,
    goals: [
      { type: "clear_obstacles" },
      { type: "target_score", targetScore: 200 },
    ],
    obstacles: [
      { id: 1, type: "crate", xRatio: 0.25, yRatio: 0.88, hp: 2 },
      { id: 2, type: "crate", xRatio: 0.5, yRatio: 0.88, hp: 2 },
      { id: 3, type: "crate", xRatio: 0.75, yRatio: 0.88, hp: 2 },
    ],
    starScores: [200, 280, 380],
    rewardPowerup: "rainbow",
    rewardCount: 2,
  },
  {
    id: 14,
    name: "Sweet Peach",
    description: "Grow 1 juicy Peach (Tier 8).",
    maxDrops: 40,
    goals: [{ type: "target_fruit", targetTier: 8, targetCount: 1 }],
    obstacles: [
      { id: 1, type: "crate", xRatio: 0.35, yRatio: 0.8, hp: 2 },
      { id: 2, type: "crate", xRatio: 0.65, yRatio: 0.8, hp: 2 },
    ],
    starScores: [250, 360, 490],
    rewardPowerup: "bomb",
    rewardCount: 2,
  },
  {
    id: 15,
    name: "Pineapple Rush",
    description: "Merge up to 1 Pineapple (Tier 9) to conquer Zone 3!",
    maxDrops: 45,
    goals: [{ type: "target_fruit", targetTier: 9, targetCount: 1 }],
    starScores: [330, 480, 650],
    rewardPowerup: "rainbow",
    rewardCount: 2,
  },

  // --- Zone 4: Bubble Lagoon (Levels 16 - 20) ---
  {
    id: 16,
    name: "Bubble Float",
    description: "Pop the trapped fruit bubbles.",
    maxDrops: 20,
    goals: [{ type: "clear_obstacles" }],
    obstacles: [
      { id: 1, type: "bubble", xRatio: 0.3, yRatio: 0.6, containedFruitTier: 3 },
      { id: 2, type: "bubble", xRatio: 0.7, yRatio: 0.6, containedFruitTier: 4 },
    ],
    starScores: [110, 170, 250],
    rewardPowerup: "hammer",
    rewardCount: 2,
  },
  {
    id: 17,
    name: "Ice & Bubbles",
    description: "Clear mixed obstacles and score 250 points.",
    maxDrops: 26,
    goals: [
      { type: "clear_obstacles" },
      { type: "target_score", targetScore: 250 },
    ],
    obstacles: [
      { id: 1, type: "ice", xRatio: 0.25, yRatio: 0.85 },
      { id: 2, type: "ice", xRatio: 0.75, yRatio: 0.85 },
      { id: 3, type: "bubble", xRatio: 0.5, yRatio: 0.55, containedFruitTier: 5 },
    ],
    starScores: [250, 350, 480],
    rewardPowerup: "bomb",
    rewardCount: 2,
  },
  {
    id: 18,
    name: "Juicy Melon",
    description: "Grow 1 giant Melon (Tier 10) with bubble help.",
    maxDrops: 34,
    goals: [{ type: "target_fruit", targetTier: 10, targetCount: 1 }],
    obstacles: [
      { id: 1, type: "bubble", xRatio: 0.5, yRatio: 0.7, containedFruitTier: 6 },
    ],
    starScores: [380, 540, 720],
    rewardPowerup: "rainbow",
    rewardCount: 2,
  },
  {
    id: 19,
    name: "Crate Archipelago",
    description: "Clear 4 obstacles and merge 1 Melon (Tier 10).",
    maxDrops: 36,
    goals: [
      { type: "clear_obstacles" },
      { type: "target_fruit", targetTier: 10, targetCount: 1 },
    ],
    obstacles: [
      { id: 1, type: "crate", xRatio: 0.2, yRatio: 0.85, hp: 2 },
      { id: 2, type: "crate", xRatio: 0.8, yRatio: 0.85, hp: 2 },
      { id: 3, type: "ice", xRatio: 0.4, yRatio: 0.85 },
      { id: 4, type: "ice", xRatio: 0.6, yRatio: 0.85 },
    ],
    starScores: [420, 600, 800],
    rewardPowerup: "hammer",
    rewardCount: 2,
  },
  {
    id: 20,
    name: "Watermelon Lagoon",
    description: "Create your legendary Watermelon (Tier 11)!",
    maxDrops: 38,
    goals: [{ type: "target_fruit", targetTier: 11, targetCount: 1 }],
    obstacles: [
      { id: 1, type: "bubble", xRatio: 0.3, yRatio: 0.55, containedFruitTier: 7 },
      { id: 2, type: "bubble", xRatio: 0.7, yRatio: 0.55, containedFruitTier: 8 },
    ],
    starScores: [500, 720, 980],
    rewardPowerup: "rainbow",
    rewardCount: 2,
  },

  // --- Zone 5: Cosmic Tropics - Advanced Puzzles (Levels 21 - 25) ---
  {
    id: 21,
    name: "Dragon Fruit Awakening",
    description: "Reach the mythical Dragonfruit (Tier 12).",
    maxDrops: 38,
    goals: [{ type: "target_fruit", targetTier: 12, targetCount: 1 }],
    obstacles: [
      { id: 1, type: "bubble", xRatio: 0.5, yRatio: 0.65, containedFruitTier: 8 },
      { id: 2, type: "ice", xRatio: 0.3, yRatio: 0.85 },
      { id: 3, type: "ice", xRatio: 0.7, yRatio: 0.85 },
    ],
    starScores: [650, 920, 1250],
    rewardPowerup: "bomb",
    rewardCount: 2,
  },
  {
    id: 22,
    name: "Obstacle Fortress",
    description: "Clear all 6 obstacles guarding the bottom.",
    maxDrops: 32,
    goals: [{ type: "clear_obstacles" }],
    obstacles: [
      { id: 1, type: "ice", xRatio: 0.18, yRatio: 0.88 },
      { id: 2, type: "crate", xRatio: 0.38, yRatio: 0.88, hp: 2 },
      { id: 3, type: "crate", xRatio: 0.62, yRatio: 0.88, hp: 2 },
      { id: 4, type: "ice", xRatio: 0.82, yRatio: 0.88 },
      { id: 5, type: "bubble", xRatio: 0.35, yRatio: 0.65, containedFruitTier: 5 },
      { id: 6, type: "bubble", xRatio: 0.65, yRatio: 0.65, containedFruitTier: 6 },
    ],
    starScores: [350, 500, 700],
    rewardPowerup: "rainbow",
    rewardCount: 2,
  },
  {
    id: 23,
    name: "Giant Score",
    description: "Achieve 450 points in 30 drops.",
    maxDrops: 30,
    goals: [{ type: "target_score", targetScore: 450 }],
    starScores: [450, 620, 850],
    rewardPowerup: "hammer",
    rewardCount: 2,
  },
  {
    id: 24,
    name: "High Voltage Score",
    description: "Achieve 600 points with careful moves.",
    maxDrops: 34,
    goals: [{ type: "target_score", targetScore: 600 }],
    obstacles: [
      { id: 1, type: "bubble", xRatio: 0.5, yRatio: 0.65, containedFruitTier: 7 },
    ],
    starScores: [600, 820, 1100],
    rewardPowerup: "bomb",
    rewardCount: 2,
  },
  {
    id: 25,
    name: "King Durian",
    description: "Unlock the royal King Durian (Tier 13)!",
    maxDrops: 40,
    goals: [{ type: "target_fruit", targetTier: 13, targetCount: 1 }],
    obstacles: [
      { id: 1, type: "bubble", xRatio: 0.3, yRatio: 0.6, containedFruitTier: 8 },
      { id: 2, type: "bubble", xRatio: 0.7, yRatio: 0.6, containedFruitTier: 9 },
    ],
    starScores: [850, 1200, 1650],
    rewardPowerup: "rainbow",
    rewardCount: 3,
  },

  // --- Zone 6: Galaxy Masters (Levels 26 - 30) ---
  {
    id: 26,
    name: "Zero Gravity Box",
    description: "Pop 4 bubbles and achieve 650 points.",
    maxDrops: 34,
    goals: [
      { type: "clear_obstacles" },
      { type: "target_score", targetScore: 650 },
    ],
    obstacles: [
      { id: 1, type: "bubble", xRatio: 0.25, yRatio: 0.5, containedFruitTier: 5 },
      { id: 2, type: "bubble", xRatio: 0.75, yRatio: 0.5, containedFruitTier: 5 },
      { id: 3, type: "bubble", xRatio: 0.35, yRatio: 0.7, containedFruitTier: 6 },
      { id: 4, type: "bubble", xRatio: 0.65, yRatio: 0.7, containedFruitTier: 6 },
    ],
    starScores: [650, 900, 1250],
    rewardPowerup: "hammer",
    rewardCount: 2,
  },
  {
    id: 27,
    name: "Twin Melons",
    description: "Create 2 Melons (Tier 10) in 36 drops.",
    maxDrops: 36,
    goals: [{ type: "target_fruit", targetTier: 10, targetCount: 2 }],
    starScores: [700, 980, 1350],
    rewardPowerup: "bomb",
    rewardCount: 2,
  },
  {
    id: 28,
    name: "The Titanium Grid",
    description: "Clear all 5 heavy obstacles and reach 750 score.",
    maxDrops: 38,
    goals: [
      { type: "clear_obstacles" },
      { type: "target_score", targetScore: 750 },
    ],
    obstacles: [
      { id: 1, type: "crate", xRatio: 0.2, yRatio: 0.88, hp: 2 },
      { id: 2, type: "crate", xRatio: 0.5, yRatio: 0.88, hp: 2 },
      { id: 3, type: "crate", xRatio: 0.8, yRatio: 0.88, hp: 2 },
      { id: 4, type: "ice", xRatio: 0.35, yRatio: 0.75 },
      { id: 5, type: "ice", xRatio: 0.65, yRatio: 0.75 },
    ],
    starScores: [750, 1050, 1450],
    rewardPowerup: "rainbow",
    rewardCount: 3,
  },
  {
    id: 29,
    name: "Grand Slam",
    description: "Create 1 Watermelon + 1 Dragonfruit.",
    maxDrops: 40,
    goals: [
      { type: "target_fruit", targetTier: 11, targetCount: 1 },
      { type: "target_fruit", targetTier: 12, targetCount: 1 },
    ],
    obstacles: [
      { id: 1, type: "bubble", xRatio: 0.5, yRatio: 0.6, containedFruitTier: 9 },
    ],
    starScores: [900, 1300, 1800],
    rewardPowerup: "rainbow",
    rewardCount: 3,
  },
  {
    id: 30,
    name: "Galaxy Watermelon",
    description: "The Ultimate Challenge: Create the Galaxy Watermelon (Tier 14)!",
    maxDrops: 42,
    goals: [{ type: "target_fruit", targetTier: 14, targetCount: 1 }],
    obstacles: [
      { id: 1, type: "bubble", xRatio: 0.3, yRatio: 0.6, containedFruitTier: 10 },
      { id: 2, type: "bubble", xRatio: 0.7, yRatio: 0.6, containedFruitTier: 11 },
    ],
    starScores: [1200, 1750, 2500],
    rewardPowerup: "rainbow",
    rewardCount: 5,
  },
];

export function getStageConfig(stageId: number): StageConfig | undefined {
  return STAGES.find((s) => s.id === stageId);
}

export function getAllStages(): readonly StageConfig[] {
  return STAGES;
}

export interface StageProgressResult {
  isCompleted: boolean;
  isFailed: boolean;
  stars: number;
  progressSummary: string;
  goalsStatus: Array<{ goal: StageGoal; met: boolean; current: number; target: number }>;
}

export const FRUIT_TIER_NAMES: Record<number, string> = {
  0: "🍒 Cherry",
  1: "🍓 Strawberry",
  2: "🍇 Grape",
  3: "🍊 Dekopon",
  4: "🫐 Pomegranate",
  5: "🍊 Orange",
  6: "🍎 Apple",
  7: "🍐 Pear",
  8: "🍑 Peach",
  9: "🍍 Pineapple",
  10: "🍈 Melon",
  11: "🍉 Watermelon",
  12: "🐉 Dragonfruit",
  13: "👑 Durian",
  14: "🌌 Galaxy Melon",
};

export function evaluateStageProgress(
  stage: StageConfig,
  currentDrops: number,
  currentScore: number,
  tierCounts: Map<number, number>,
  remainingObstacles: number
): StageProgressResult {
  const goalsStatus = stage.goals.map((goal) => {
    let met = false;
    let current = 0;
    let target = 0;

    switch (goal.type) {
      case "target_fruit": {
        const tier = goal.targetTier ?? 0;
        target = goal.targetCount ?? 1;
        current = tierCounts.get(tier) ?? 0;
        // Also count higher tiers as fulfilling lower tier goal if created
        let totalAtOrAbove = 0;
        for (let t = tier; t <= 14; t++) {
          totalAtOrAbove += tierCounts.get(t) ?? 0;
        }
        current = Math.max(current, totalAtOrAbove);
        met = current >= target;
        break;
      }
      case "target_score": {
        target = goal.targetScore ?? 0;
        current = currentScore;
        met = current >= target;
        break;
      }
      case "clear_obstacles": {
        const initialCount = stage.obstacles?.length ?? 0;
        target = initialCount;
        current = initialCount - remainingObstacles;
        met = remainingObstacles === 0;
        break;
      }
    }

    return { goal, met, current, target };
  });

  const isCompleted = goalsStatus.every((g) => g.met);
  const isFailed = !isCompleted && currentDrops >= stage.maxDrops;

  let stars = 0;
  if (isCompleted) {
    stars = 1;
    // Score based star calculation
    if (currentScore >= stage.starScores[2]) {
      stars = 3;
    } else if (currentScore >= stage.starScores[1]) {
      stars = 2;
    } else {
      // Move efficiency bonus
      const movesLeft = stage.maxDrops - currentDrops;
      const moveRatio = movesLeft / stage.maxDrops;
      if (moveRatio >= 0.4) {
        stars = 3;
      } else if (moveRatio >= 0.2) {
        stars = 2;
      }
    }
  }

  const progressSummary = goalsStatus
    .map((g) => {
      if (g.goal.type === "target_fruit") {
        const fruitName = FRUIT_TIER_NAMES[g.goal.targetTier ?? 0] || `Tier ${g.goal.targetTier}`;
        return `${fruitName}: ${g.current}/${g.target}`;
      } else if (g.goal.type === "target_score") {
        return `Score: ${g.current}/${g.target}`;
      } else {
        return `Obstacles: ${g.current}/${g.target}`;
      }
    })
    .join(" • ");

  return {
    isCompleted,
    isFailed,
    stars,
    progressSummary,
    goalsStatus,
  };
}

export function calculateTotalStars(stageStars: Record<number, number>): number {
  let total = 0;
  for (const stars of Object.values(stageStars)) {
    total += Math.min(3, Math.max(0, stars || 0));
  }
  return total;
}
