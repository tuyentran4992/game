/**
 * M7 Skip King — mechanics.ts: công thức skip/throw/judge ĐỌC MechanicsConfig — 0 magic number
 * (CONTRACT mục 1: "tính skip/restitution/assists ĐỌC MechanicsConfig").
 * Tầng A pure TS — 0 import Phaser/DOM.
 */
import type { FlickInput, Stone } from './types';
import type { MechanicsConfig } from '../config/mechanics';

/** Góc ném tính từ trục +z (hướng ra horizon), deg — chưa kẹp (physics xử lý góc rộng qua skip-gate). */
export function throwAngleDeg(input: FlickInput): number {
  return Math.atan2(input.dirX, -input.dirZ) * (180 / Math.PI);
}

export function clampDeg(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/** power 0..1 (kẹp biên) → tốc độ phóng m/s (bảng tốc trong cfg.throw). */
export function powerToSpeed(cfg: MechanicsConfig, power: number): number {
  const p = Math.min(1, Math.max(0, power));
  return cfg.throw.minSpeed + p * (cfg.throw.maxSpeed - cfg.throw.minSpeed);
}

/**
 * Judge PERFECT thuần vector (CONTRACT §2: "đánh giá PERFECT theo vector thả (góc+lực) ∈ window").
 * Window = SỐ SWEEP khoá trong cfg.perfectWindow — nguồn duy nhất (không hardcode).
 * Hàm thuần: không sim, không rng — scene có thể judge ngay lúc thả.
 */
export function judgePerfect(input: FlickInput, cfg: MechanicsConfig): boolean {
  const w = cfg.perfectWindow;
  const angle = throwAngleDeg(input);
  return (
    angle >= w.angleMinDeg &&
    angle <= w.angleMaxDeg &&
    input.power >= w.powerMin &&
    input.power <= w.powerMax
  );
}

/** Ngưỡng impact bật hitstop + dải thời gian — [PLACEHOLDER] tới boss playtest (FUN2-C1). */
const HITSTOP_THRESHOLD = 0.6; // 0..1 — nảy từ lực này mới hitstop
const HITSTOP_MIN_MS = 33; // ms — sàn hitstop (1 nửa frame 60fps)
const HITSTOP_MAX_MS = 66; // ms — trần hitstop (~4 frame 60fps, không kẹt tay)

/**
 * Hitstop tầng A (FUN2-C1): impact ≥ ~0.6 → freeze 33–66ms ∝ lực — scene card C2 DIỄN
 * (card này chỉ xuất hàm + test). KHÔNG thêm field vào EngineEvent (anchor khóa event shape).
 * Nảy thường (< ngưỡng) → 0ms.
 */
export function hitstopMsFor(impact: number): number {
  const i = Math.min(1, Math.max(0, impact));
  if (i < HITSTOP_THRESHOLD) return 0;
  const t = (i - HITSTOP_THRESHOLD) / (1 - HITSTOP_THRESHOLD); // 0..1 trong vùng hitstop
  return Math.round(HITSTOP_MIN_MS + t * (HITSTOP_MAX_MS - HITSTOP_MIN_MS));
}

/**
 * FlickInput → Stone khởi đầu + tốc độ phóng (engine ghi lại để tính impact ratio).
 * dirX/dirZ đơn vị tự do (góc qua atan2); góc KHÔNG kẹp — góc rộng bị skip-gate loại tự nhiên.
 */
export function throwVector(
  cfg: MechanicsConfig,
  input: FlickInput,
): { stone: Stone; speed: number } {
  const angle = throwAngleDeg(input);
  const rad = (angle * Math.PI) / 180;
  const speed = powerToSpeed(cfg, input.power);
  const tiltRad = (cfg.throw.tiltDeg * Math.PI) / 180;
  const stone: Stone = {
    x: 0,
    y: cfg.throw.launchY,
    z: 0,
    vx: speed * Math.sin(rad),
    vy: -speed * Math.sin(tiltRad),
    vz: speed * Math.cos(rad),
  };
  return { stone, speed };
}
