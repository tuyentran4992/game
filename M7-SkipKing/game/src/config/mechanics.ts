/**
 * M7 "Skip King" — MechanicsConfig: NGUỒN DUY NHẤT của mọi hằng số gameplay (CONTRACT mục 1).
 * Mỗi field: đơn vị + rationale. Số còn chờ playtest/sim đánh dấu [PLACEHOLDER] — cấm hardcode số này nơi khác.
 * Nguồn số chốt: CONTRACT Skip King §2 (dev-lead 06/09, card t_127f0843).
 */

export interface PerfectWindow {
  angleMinDeg: number;   // deg — biên dưới góc thả tính từ trục z+ (hướng ném ra xa)
  angleMaxDeg: number;   // deg — biên trên góc thả
  powerMin: number;      // 0..1 — lực thả tối thiểu rơi vào window
  powerMax: number;      // 0..1 — lực thả tối đa rơi vào window
}

export interface FirstThrowAssist {
  powerFloor: number;    // 0..1 — sàn lực áp cho cú thả ĐẦU run ĐẦU (Đ2)
  angleBandDeg: number;  // deg — biên độ clamp góc về sweet band (Đ2)
}

export interface MechanicsConfig {
  /** s — bước sim fixed-step; render interpolate. Deterministic seeded. */
  fixedDt: number;
  /** m — chiều dài sân nước tới horizon; waterline z=0 tại đáy màn. */
  fieldZMax: number;
  /** m — bán kính viên đá. */
  stoneRadius: number;
  /** m/s² — trọng lực. */
  gravityY: number;
  /** px — canvas portrait 9:16, Scale.FIT. */
  canvas: { width: number; height: number };
  /** px — target chạm tối thiểu toàn màn chơi (ROLE-RULES fe-dev: mobile ≥44px). */
  touchTargetPx: number;
  /** banner 2 dòng khi PERFECT — ×2 ĐIỂM cú thả, không multiplier chuỗi (CONTRACT §2). */
  comboBanner: { line1: string; line2: string };
  /** × — timescale slow-mo cuối PERFECT run (CONTRACT §2). */
  slowmoTimescale: number;
  /** Vùng PERFECT (góc+lực). Số do T2 sweep 1800 cú seeded → kho vào đây. */
  perfectWindow: PerfectWindow;
  /** Đ2 assist cú ĐẦU run ĐẦU. Số do T2 đo sim 100 seed → kho vào đây. */
  firstThrowAssist: FirstThrowAssist;
}

export const MECHANICS: MechanicsConfig = {
  fixedDt: 1 / 120,          // s — CONTRACT §2: sim fixed-step 1/120, deterministic
  fieldZMax: 40,             // m — CONTRACT §2: đá bay tới horizon, waterline z=0
  stoneRadius: 0.12,         // m — CONTRACT §2
  gravityY: 9.81,            // m/s² — CONTRACT §2

  canvas: {
    width: 720,              // px — portrait 9:16 (PB-5)
    height: 1280,            // px
  },

  touchTargetPx: 44,         // px — CONTRACT §2: toàn màn chơi ≥44px (THROW AGAIN thuộc T5)

  comboBanner: {
    line1: 'PERFECT FLICK!', // EN (PB-5)
    line2: '×2',             // ×2 điểm cú thả — CONTRACT §2 mục 3.4
  },

  slowmoTimescale: 0.4,      // × — CONTRACT §2: slow-mo cuối PERFECT run

  // [PLACEHOLDER] — T2 sweep 1800 cú seeded (seed 1..1800, rng inject) chọn vùng liên tiếp
  // tại chóp gradient đạt P(PERFECT)∈[0.20,0.45] KHOA×area ≥80% max; kho số tại đây + comment số sweep.
  perfectWindow: {
    angleMinDeg: 0,          // [PLACEHOLDER] deg — chờ T2 sweep
    angleMaxDeg: 0,          // [PLACEHOLDER] deg — chờ T2 sweep
    powerMin: 0,             // [PLACEHOLDER] 0..1 — chờ T2 sweep
    powerMax: 0,             // [PLACEHOLDER] 0..1 — chờ T2 sweep
  },

  // [PLACEHOLDER] — Đ2 assist chỉ flick ĐẦU run ĐẦU: T2 đo sim 100 seed, tiêu chí 0/100 chìm
  // cú đầu (G2); thiếu → tăng assist tối đa powerFloor 0.65 + band ±10° rồi báo lead.
  firstThrowAssist: {
    powerFloor: 0,           // [PLACEHOLDER] 0..1 — chờ T2 đo sim
    angleBandDeg: 0,         // [PLACEHOLDER] deg — chờ T2 đo sim
  },
} as const;
