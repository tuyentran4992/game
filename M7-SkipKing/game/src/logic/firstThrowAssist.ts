/**
 * M7 Skip King — Đ2 firstThrowAssist: CHỈ flick ĐẦU của người chơi trong run ĐẦU
 * (CONTRACT §2): power floor + angle clamp về sweet band. KHÔNG đụng physics cú sau,
 * KHÔNG đụng cú demo script — hàm thuần trên FlickInput, đọc số từ MechanicsConfig.
 * Tầng A pure TS — 0 import Phaser/DOM.
 */
import type { FlickInput } from './types';
import type { MechanicsConfig } from '../config/mechanics';
import { throwAngleDeg } from './mechanics';

/**
 * Áp assist lên 1 FlickInput:
 * - power: max(power, cfg.firstThrowAssist.powerFloor) — chỉ nâng cú yếu, không hạ cú mạnh.
 * - angle: clamp về [tâm window ± angleBandDeg] (band = nửa bề rộng, đơn vị deg).
 * Vector dirX/dirZ dựng lại từ góc mới (chuẩn hoá đơn vị).
 */
export function assistFlick(input: FlickInput, cfg: MechanicsConfig): FlickInput {
  const a = cfg.firstThrowAssist;
  const w = cfg.perfectWindow;
  const center = (w.angleMinDeg + w.angleMaxDeg) / 2;
  const angle = throwAngleDeg(input);
  const clamped = Math.min(center + a.angleBandDeg, Math.max(center - a.angleBandDeg, angle));
  const rad = (clamped * Math.PI) / 180;
  return {
    dirX: Math.sin(rad),
    dirZ: -Math.cos(rad),
    power: Math.max(input.power, a.powerFloor),
  };
}
