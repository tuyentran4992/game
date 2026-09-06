/**
 * M7 "Skip King" — MechanicsConfig: NGUỒN DUY NHẤT của mọi hằng số gameplay (CONTRACT mục 1).
 * Mỗi field: đơn vị + rationale. Số do T2 đo sim/sweep được KHÓA tại đây kèm comment nguồn
 * ("sweep 1800 seed 1..1800" / "sim 100 seed 1..100") — cấm hardcode số này nơi khác.
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

/** Nhóm hằng skip — physicsEngine.willSkip đọc qua đây (0 magic number). */
export interface SkipConstants {
  /** m/s — ngưỡng tốc độ ngang lúc chạm nước để skip. */
  minSkipSpeed: number;
  /** deg — góc lệch ngang tối đa (so trục z) để skip; rộng hơn = cú xoát ngang chìm. */
  maxAngleDeg: number;
  /** ×/bounce — hao tổn tốc ngang mỗi lần nảy. */
  frictionXY: number;
  /** ×/bounce — hệ số hồi phục chiều đứng (hop thấp dần) — sàn hop khi lift yếu. */
  restitutionY: number;
  /** (không chiều) — lift thủy động lực: tốc ngang lúc chạm → vy hop (max với restitutionY). */
  liftFactor: number;
  /** m/s — biên độ nhiễu seeded quanh ngưỡng skip (rng inject — biến thiên bề mặt nước). */
  speedJitter: number;
  /** m/s — vy sau nảy dưới ngưỡng này → chìm ngay (chống micro-hop vô hạn). */
  minRestitutionVy: number;
}

/** Nhóm hằng cú ném — mechanics.throwVector đọc qua đây. */
export interface ThrowConstants {
  /** m/s — tốc độ phóng tại power 0. */
  minSpeed: number;
  /** m/s — tốc độ phóng tại power 1. */
  maxSpeed: number;
  /** deg — góc phóng so với ngang; ÂM = hếch LÊN (arc skip thật). */
  tiltDeg: number;
  /** m — độ cao tay thả trên mặt nước. */
  launchY: number;
}

/** Phân phối input của sweep/flickFromSeed — mô phỏng tay người chơi quanh sweet spot. */
export interface SweepInput {
  /** deg (σ) — độ lệch góc quanh 0 (gauss). */
  angleSpreadDeg: number;
  /** — tâm lực sweep (chóp gradient phân phối). */
  powerCenter: number;
  /** (σ) — độ rộng lực, thành phần gaussian. */
  powerSpread: number;
  /** 0..1 — tỷ lệ cú lực ĐỀU trong [0.05,0.95] (đảm bảo cú yếu tồn tại cho beat B2). */
  uniformFrac: number;
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
  /** nảy — số nảy tối thiểu để run chốt là PERFECT (CONTRACT §3 beat B3: "~7 nảy"). */
  perfectMinBounces: number;
  /** Nhóm hằng skip (physicsEngine đọc — 0 magic number). */
  skip: SkipConstants;
  /** Nhóm hằng cú ném (mechanics đọc — 0 magic number). */
  throw: ThrowConstants;
  /** Phân phối input sweep (perfectWindow.flickFromSeed đọc). */
  sweepInput: SweepInput;
  /** Vùng PERFECT (góc+lực). Số do T2 sweep 1800 cú seeded → khoá vào đây. */
  perfectWindow: PerfectWindow;
  /** Đ2 assist cú ĐẦU run ĐẦU. Số do T2 đo sim 100 seed → khoá vào đây. */
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

  touchTargetPx: 44,         // px — CONTRACT §2: toàn màn chơi ≥44px

  comboBanner: {
    line1: 'PERFECT FLICK!', // EN (PB-5)
    line2: '×2',             // ×2 điểm cú thả — CONTRACT §2 mục 3.4
  },

  slowmoTimescale: 0.4,      // × — CONTRACT §2: slow-mo cuối PERFECT run

  perfectMinBounces: 7,      // nảy — CONTRACT §3 beat B3: PERFECT ~7 nảy (cận dưới chốt tầng A)

  skip: {
    // m/s — cú chạm chậm hơn ngưỡng này chìm; power 0 (4.5 m/s) + jitter ±0.4 vẫn < 5.2 → chắc chìm (test biên)
    minSkipSpeed: 5.2,
    maxAngleDeg: 35,         // deg — rộng hơn window PERFECT ±9° một biên cho cú lệch vừa
    frictionXY: 0.9,         // ×/bounce — hao tổn 10%/nảy, chuỗi nảy dài ở vùng PERFECT
    restitutionY: 0.55,      // ×/bounce — sàn hop từ vy dội lại
    liftFactor: 0.28,        // — lift thủy động: vy hop = speed×0.28 (nhanh → hop xa, skip thật)
    speedJitter: 0.4,        // m/s — nhiễu seeded, cùng seed cùng quyết định (deterministic)
    minRestitutionVy: 0.02,  // m/s — chỉ chặn micro-hop; chết chính = hao tổn tốc ngang < minSkipSpeed
  },

  throw: {
    minSpeed: 4.5,           // m/s @ power 0 — dưới minSkipSpeed + jitter → power 0 luôn chìm
    maxSpeed: 14,            // m/s @ power 1 — đầy đủ lift để cúmax vượt horizon 40m chắc chắn (0 phụ thuộc rng)
    tiltDeg: -6,             // deg — ÂM = hếch lên 6°: arc skip thật (cú mạnh bay xa từng nảy)
    launchY: 0.25,           // m — tay thả thấp sát mặt nước
  },

  sweepInput: {
    angleSpreadDeg: 8,       // deg (σ) — tay người chơi lệch quanh 0°
    powerCenter: 0.75,       // — chóp gradient lực (gần sweet zone → window bắt ~25-40% cú)
    powerSpread: 0.1,        // (σ) thành phần gaussian
    uniformFrac: 0.4,        // — 40% cú lực ĐỀU 0.05..0.95 (cú yếu tồn tại cho beat B2)
  },

  // KHÓA TỪ SWEEP 1800 seed 1..1800 (PerfectWindowFitter — vùng liên tiếp tại chóp gradient,
  // membership P(PERFECT)∈[0.20,0.45] × quality-area ≥80% max; 2 điều kiện KHÔNG mâu thuẫn —
  // chọn vùng đầy đủ điều kiện rộng nhất. Số khớp nguyên văn output fitter.)
  perfectWindow: {
    angleMinDeg: -15,        // deg — sweep 1800 seed 1..1800 (output fitter nguyên văn)
    angleMaxDeg: 20,         // deg — sweep 1800 seed 1..1800 (output fitter nguyên văn)
    powerMin: 0.7,           // 0..1 — sweep 1800 seed 1..1800 (output fitter nguyên văn)
    powerMax: 0.9,           // 0..1 — sweep 1800 seed 1..1800 (output fitter nguyên văn)
  },

  // KHÓA TỪ SIM 100 seed MỚI (1..100) — tiêu chí 0/100 chìm cú đầu (G2, pull-back CONTRACT §2);
  // trần CONTRACT §2: powerFloor ≤ 0.65, band ≤ ±10°.
  firstThrowAssist: {
    powerFloor: 0.6,         // 0..1 — sim 100 seed 1..100: 0/100 chìm cú đầu
    angleBandDeg: 10,        // deg — sim 100 seed 1..100: 0/100 chìm cú đầu
  },
} as const;
