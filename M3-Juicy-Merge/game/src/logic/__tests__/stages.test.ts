import { describe, it, expect } from "vitest";
import {
  STAGES,
  getStageConfig,
  getAllStages,
  evaluateStageProgress,
  calculateTotalStars,
} from "../stages";

describe("Stage Mode Logic (GC-15, GC-16)", () => {
  it("defines exactly 30 handcrafted stages with unique IDs and valid maxDrops", () => {
    const stages = getAllStages();
    expect(stages.length).toBe(30);

    const ids = new Set<number>();
    for (const stage of stages) {
      expect(stage.id).toBeGreaterThanOrEqual(1);
      expect(stage.id).toBeLessThanOrEqual(30);
      expect(ids.has(stage.id)).toBe(false);
      ids.add(stage.id);

      expect(stage.maxDrops).toBeGreaterThanOrEqual(10);
      expect(stage.goals.length).toBeGreaterThan(0);
      expect(stage.starScores.length).toBe(3);
    }
  });

  it("can lookup stage config by ID", () => {
    const stage1 = getStageConfig(1);
    expect(stage1).toBeDefined();
    expect(stage1?.name).toBe("First Harvest");
    expect(stage1?.maxDrops).toBe(12);

    const nonExistent = getStageConfig(999);
    expect(nonExistent).toBeUndefined();
  });

  it("evaluates fruit target goal correctly", () => {
    const stage = getStageConfig(1)!;
    const tierCounts = new Map<number, number>();

    // 0 dekopon created -> not completed
    const res1 = evaluateStageProgress(stage, 5, 30, tierCounts, 0);
    expect(res1.isCompleted).toBe(false);
    expect(res1.isFailed).toBe(false);

    // 1 dekopon created -> completed!
    tierCounts.set(3, 1);
    const res2 = evaluateStageProgress(stage, 5, 30, tierCounts, 0);
    expect(res2.isCompleted).toBe(true);
    expect(res2.isFailed).toBe(false);
    expect(res2.stars).toBeGreaterThanOrEqual(1);
  });

  it("evaluates obstacle clearance goal correctly", () => {
    const stage = getStageConfig(6)!; // Ice Thaw: 2 ice blocks
    const tierCounts = new Map<number, number>();

    // 1 ice remaining -> not complete
    const res1 = evaluateStageProgress(stage, 10, 200, tierCounts, 1);
    expect(res1.isCompleted).toBe(false);

    // 0 ice remaining -> complete
    const res2 = evaluateStageProgress(stage, 10, 200, tierCounts, 0);
    expect(res2.isCompleted).toBe(true);
    expect(res2.stars).toBeGreaterThanOrEqual(1);
  });

  it("evaluates stage failure when maxDrops is reached without meeting goals", () => {
    const stage = getStageConfig(1)!;
    const tierCounts = new Map<number, number>();

    const res = evaluateStageProgress(stage, 12, 5, tierCounts, 0);
    expect(res.isCompleted).toBe(false);
    expect(res.isFailed).toBe(true);
    expect(res.stars).toBe(0);
  });

  it("calculates total stars accurately across all completed stages", () => {
    const starsRecord: Record<number, number> = {
      1: 3,
      2: 2,
      3: 3,
      4: 1,
    };
    const total = calculateTotalStars(starsRecord);
    expect(total).toBe(9);
  });
});
