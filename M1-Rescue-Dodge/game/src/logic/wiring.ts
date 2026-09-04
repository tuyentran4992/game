// wiring.ts — TẦNG A (pure TS, 0 import Phaser/DOM) — CONTRACT K0 §6.
// Hằng [MIRROR] literal từ scenes/Gameplay.ts @ d0011c1, gom về tầng A để
// lead/boss chỉnh số không đọc code scene (ROLE-RULES fe-dev: tuning 1 chỗ).
// Scene (tầng B) chỉ import + truyền qua constructor SpawnDirector.
// Lưu ý: đưa thẳng vào MechanicsConfig cần sửa types.ts (CẤM với card này,
// scope T1a/T1c) — card riêng của lead sẽ hợp nhất.

/** Hằng cadence spawn — mirror công thức max(0.38, 1.35 - (speed-start)*0.0035 - (level-1)*0.10). */
export const WIRING = {
  spawnIntervalBase: 1.35,
  spawnSpeedFactor: 0.0035,
  spawnLevelFactor: 0.10,
  spawnIntervalFloor: 0.38,
  /** Delay scene hẹn tạo con ong thứ 2 của double-spawn (ms). */
  doubleSpawnDelayMs: 280,
} as const;

/** Hằng loại ong — mirror speedMult trong spawnBee/createFatBeeEntity. */
export const BEES = {
  speedyMult: 1.18,
  normalMult: 1.0,
  fatSpeedMult: 0.72,
} as const;
