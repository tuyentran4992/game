import { describe, it, expect } from "vitest";
import {
  createDefaultActionInventory,
  canUseActionPowerup,
  consumeActionPowerup,
  grantActionPowerup,
  evaluateBombBlast,
  canRainbowMergeWith,
} from "../action-powerups";

describe("Action Powerups Logic (GC-19, GC-20)", () => {
  it("initializes inventory with default values and checks availability", () => {
    const inv = createDefaultActionInventory();
    expect(inv.hammer).toBe(3);
    expect(inv.bomb).toBe(2);
    expect(inv.rainbow).toBe(2);

    expect(canUseActionPowerup(inv, "hammer")).toBe(true);
    expect(canUseActionPowerup(inv, "bomb")).toBe(true);
    expect(canUseActionPowerup(inv, "rainbow")).toBe(true);
  });

  it("consumes powerups and prevents using when depleted", () => {
    const inv = { hammer: 1, bomb: 0, rainbow: 0 };

    expect(consumeActionPowerup(inv, "hammer")).toBe(true);
    expect(inv.hammer).toBe(0);

    // Try consuming when 0
    expect(consumeActionPowerup(inv, "hammer")).toBe(false);
    expect(consumeActionPowerup(inv, "bomb")).toBe(false);
  });

  it("grants powerups up to maximum limit", () => {
    const inv = { hammer: 0, bomb: 0, rainbow: 0 };
    grantActionPowerup(inv, "bomb", 3);
    expect(inv.bomb).toBe(3);
  });

  it("evaluates bomb blast radius and identifies affected fruits and obstacles", () => {
    const fruits = [
      { id: 1, x: 200, y: 300 }, // close (within 160px)
      { id: 2, x: 500, y: 800 }, // far
    ];
    const obstacles = [
      { id: 10, x: 250, y: 320 }, // close (within 160px)
      { id: 20, x: 700, y: 900 }, // far
    ];

    const result = evaluateBombBlast({ x: 210, y: 310 }, 160, fruits, obstacles);
    expect(result.affectedFruitIds).toContain(1);
    expect(result.affectedFruitIds).not.toContain(2);
    expect(result.affectedObstacleIds).toContain(10);
    expect(result.affectedObstacleIds).not.toContain(20);
  });

  it("validates rainbow wildcard merge eligibility", () => {
    expect(canRainbowMergeWith(0, 14)).toBe(true);
    expect(canRainbowMergeWith(10, 14)).toBe(true);
    expect(canRainbowMergeWith(13, 14)).toBe(true);
    expect(canRainbowMergeWith(14, 14)).toBe(false); // Max tier cannot merge higher
  });
});
