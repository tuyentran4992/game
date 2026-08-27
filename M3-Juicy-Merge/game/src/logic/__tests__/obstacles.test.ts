import { describe, it, expect } from "vitest";
import {
  createObstacle,
  damageObstacle,
  evaluateObstacleDamageOnMerge,
  getActiveObstacleCount,
  areAllObstaclesCleared,
  calculateDistance,
} from "../obstacles";

describe("Obstacles Logic (GC-17, GC-18)", () => {
  it("creates ice, crate, and bubble obstacles with proper defaults", () => {
    const ice = createObstacle({ id: 1, type: "ice", xRatio: 0.5, yRatio: 0.8 });
    expect(ice.id).toBe(1);
    expect(ice.type).toBe("ice");
    expect(ice.hp).toBe(1);
    expect(ice.isDestroyed).toBe(false);

    const crate = createObstacle({ id: 2, type: "crate", xRatio: 0.3, yRatio: 0.85, hp: 2 });
    expect(crate.hp).toBe(2);
    expect(crate.maxHp).toBe(2);

    const bubble = createObstacle({
      id: 3,
      type: "bubble",
      xRatio: 0.5,
      yRatio: 0.5,
      containedFruitTier: 4,
    });
    expect(bubble.containedFruitTier).toBe(4);
  });

  it("damages obstacle and flags destruction when hp reaches 0", () => {
    const crate = createObstacle({ id: 1, type: "crate", xRatio: 0.5, yRatio: 0.5, hp: 2 });

    const step1 = damageObstacle(crate, 1);
    expect(step1.wasDestroyed).toBe(false);
    expect(crate.hp).toBe(1);
    expect(crate.isDestroyed).toBe(false);

    const step2 = damageObstacle(crate, 1);
    expect(step2.wasDestroyed).toBe(true);
    expect(crate.hp).toBe(0);
    expect(crate.isDestroyed).toBe(true);
  });

  it("evaluates merge shockwave damage to nearby obstacles", () => {
    const obs1 = createObstacle({ id: 1, type: "ice", xRatio: 0.5, yRatio: 0.5 });
    const obs2 = createObstacle({ id: 2, type: "ice", xRatio: 0.9, yRatio: 0.9 });
    const obstacles = [obs1, obs2];

    const worldPositions = new Map<number, { x: number; y: number }>();
    worldPositions.set(1, { x: 300, y: 500 });
    worldPositions.set(2, { x: 600, y: 900 });

    // Merge at (320, 510), distance to obs1 is sqrt(20^2 + 10^2) = ~22px <= 130px radius
    const result = evaluateObstacleDamageOnMerge(
      { x: 320, y: 510 },
      obstacles,
      worldPositions,
      130
    );

    expect(result.damaged.length).toBe(1);
    expect(result.damaged[0].id).toBe(1);
    expect(result.destroyed.length).toBe(1);
    expect(obs1.isDestroyed).toBe(true);
    expect(obs2.isDestroyed).toBe(false);
  });

  it("calculates active obstacle count and full clearance state", () => {
    const obs1 = createObstacle({ id: 1, type: "ice", xRatio: 0.5, yRatio: 0.5 });
    const obs2 = createObstacle({ id: 2, type: "ice", xRatio: 0.5, yRatio: 0.5 });
    const list = [obs1, obs2];

    expect(getActiveObstacleCount(list)).toBe(2);
    expect(areAllObstaclesCleared(list)).toBe(false);

    damageObstacle(obs1, 1);
    expect(getActiveObstacleCount(list)).toBe(1);
    expect(areAllObstaclesCleared(list)).toBe(false);

    damageObstacle(obs2, 1);
    expect(getActiveObstacleCount(list)).toBe(0);
    expect(areAllObstaclesCleared(list)).toBe(true);
  });
});
