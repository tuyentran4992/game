// wiring.ts — TẦNG A (pure TS, 0 import Phaser/DOM) — CONTRACT K0 §6.
// UPG2-N1 (t_79d2b77d): WIRING/BEES ĐÃ HỢP NHẤT về MechanicsConfig (types.ts mở sau
// T1 chain — đúng kế hoạch lead). File này còn là SHIM backward-compat cho import cũ
// (Gameplay.ts + test T1a): số đọc từ MECHANICS, KHÔNG giữ literal riêng.
// Còn lại ở đây duy nhất doubleSpawnDelayMs — delay hẹn của scene cho con ong thứ 2
// (double-spawn), thuộc wiring scene chứ không phải luật spawn của director.

import { MECHANICS } from '../config/mechanics';

/** Hằng cadence spawn — SHIM đọc từ MechanicsConfig (nguồn thật, sửa 1 chỗ). */
export const WIRING = {
  get spawnIntervalBase() { return MECHANICS.spawnIntervalBase; },
  get spawnSpeedFactor() { return MECHANICS.spawnSpeedFactor; },
  get spawnLevelFactor() { return MECHANICS.spawnLevelFactor; },
  get spawnIntervalFloor() { return MECHANICS.spawnIntervalFloor; },
  /** Delay scene hẹn tạo con ong thứ 2 của double-spawn (ms). */
  doubleSpawnDelayMs: 280,
} as const;

/** Hằng loại ong — SHIM đọc từ MechanicsConfig (nguồn thật, sửa 1 chỗ). */
export const BEES = {
  get speedyMult() { return MECHANICS.speedyMult; },
  get normalMult() { return MECHANICS.normalMult; },
  get fatSpeedMult() { return MECHANICS.fatSpeedMult; },
} as const;
