/**
 * M7 Skip King — PerfectWindowFitter: sweep 1800 cú seeded (seed 1..1800) → chọn vùng
 * liên tiếp tại chóp gradient đạt P(PERFECT)∈[0.20,0.45] KHOA×area≥80% max (CONTRACT §2).
 * 2 điều kiện mâu thuẫn → ưu tiên P (chọn vùng P∈band rộng nhất), khai báo qua result.conflict.
 * Tầng A pure TS — 0 import Phaser/DOM, rng inject 100%.
 */
import type { FlickInput } from './types';
import type { MechanicsConfig, PerfectWindow } from '../config/mechanics';
import { MECHANICS } from '../config/mechanics';
import { mulberry32 } from './rng';
import { simulateFlickDetailed } from './physicsEngine';
import type { SimDetail } from './physicsEngine';

/** Số cú sweep — CONTRACT §2 chốt 1800, seed 1..1800. */
export const SWEEP_SEED_COUNT = 1800;
/** Biên góc sweep (deg, đối xứng quanh 0) — clamp phân phối gaussian. */
export const SWEEP_ANGLE_RANGE_DEG = 50;
/** Khoảng lực sweep (0..1) — chừa 0.05 hai đầu để cú chắc-chìm/c chắc-tối vẫn tồn tại. */
export const SWEEP_POWER_MIN = 0.05;
export const SWEEP_POWER_MAX = 0.95;
/** Band P(PERFECT) mục tiêu — CONTRACT §2. */
export const P_TARGET_MIN = 0.2;
export const P_TARGET_MAX = 0.45;
/** Area tối thiểu so với vùng tốt nhất — CONTRACT §2 (≥80% max). */
export const AREA_MIN_FRAC = 0.8;
/** Sàn số cú qualifying để một vùng được tính (chống nhiễu mẫu nhỏ). */
const MIN_QUALIFYING = 30;
/** Kích thước bin lưới chọn vùng (deg / 0..1 lực). */
const ANGLE_BIN_DEG = 5;
const POWER_BIN = 0.05;

/** 1 điểm sweep: 1 cú thả + kết quả sim. */
export interface SweepPoint {
  seed: number;
  angleDeg: number;
  power: number;
  bounces: number;
  judgedPerfect: boolean;
  firstBounceTime: number | null;
}

/** Kết quả fit — số khai báo minh bạch để khoá vào MechanicsConfig. */
export interface PerfectWindowResult {
  window: PerfectWindow;
  /** P(PERFECT) của window trên toàn sweep (0..1). */
  p: number;
  /** area = qualifying của window / qualifying của vùng tốt nhất (0..1). */
  areaFrac: number;
  qualifyingCount: number;
  /** true = 2 điều kiện P∈band × area≥80% mâu thuẫn → đã ưu tiên P (CONTRACT §2). */
  conflict: boolean;
  /** true = cả P∈band cũng không đạt (P<0.20 hoặc tràn >0.45 sau trim) — cần tune lại physics. */
  fallback: boolean;
}

/** Cặp gaussian chuẩn Box–Muller (deterministic theo (u1,u2)). */
function gaussPair(u1: number, u2: number): [number, number] {
  const r = Math.sqrt(-2 * Math.log(Math.max(u1, 1e-12)));
  const t = 2 * Math.PI * u2;
  return [r * Math.cos(t), r * Math.sin(t)];
}

/**
 * FlickInput của 1 seed sweep — phân phối mô phỏng tay người chơi (đọc cfg.sweepInput).
 * Box–Muller pair cho (góc, lực gaussian); u3 chọn uniform/gaussian; u4 cho lực uniform.
 * Luôn rút đủ 4 số rng → dòng rng thẳng hàng giữa mọi seed.
 */
export function flickFromSeed(seed: number, cfg: MechanicsConfig = MECHANICS): FlickInput {
  const si = cfg.sweepInput;
  const r = mulberry32(seed);
  const u1 = r();
  const u2 = r();
  const u3 = r();
  const u4 = r();
  const [gA, gP] = gaussPair(u1, u2);
  const angle = Math.max(
    -SWEEP_ANGLE_RANGE_DEG,
    Math.min(SWEEP_ANGLE_RANGE_DEG, gA * si.angleSpreadDeg),
  );
  const power =
    u3 < si.uniformFrac
      ? SWEEP_POWER_MIN + u4 * (SWEEP_POWER_MAX - SWEEP_POWER_MIN)
      : Math.max(SWEEP_POWER_MIN, Math.min(SWEEP_POWER_MAX, si.powerCenter + gP * si.powerSpread));
  const rad = (angle * Math.PI) / 180;
  return { dirX: Math.sin(rad), dirZ: -Math.cos(rad), power };
}

/** Chạy sweep trên danh sách seed (mặc định 1..1800) — mỗi seed 1 sim full detail. */
export function sweep(cfg: MechanicsConfig, seeds?: number[]): SweepPoint[] {
  const list = seeds ?? Array.from({ length: SWEEP_SEED_COUNT }, (_, i) => i + 1);
  return list.map((seed) => {
    const input = flickFromSeed(seed, cfg);
    const d = simulateFlickDetailed(cfg, input, seed);
    return {
      seed,
      angleDeg: (Math.atan2(input.dirX, -input.dirZ) * 180) / Math.PI,
      power: input.power,
      bounces: d.bounces,
      judgedPerfect: d.judgedPerfect,
      firstBounceTime: d.firstBounceTime,
    };
  });
}

/** P(PERFECT) của 1 window bất kỳ trên tập điểm sweep (đếm chính xác theo biên window). */
export function perfectRate(
  _cfg: MechanicsConfig,
  window: PerfectWindow,
  points: SweepPoint[],
): number {
  if (points.length === 0) return 0;
  const hit = points.filter(
    (pt) =>
      pt.angleDeg >= window.angleMinDeg &&
      pt.angleDeg <= window.angleMaxDeg &&
      pt.power >= window.powerMin &&
      pt.power <= window.powerMax,
  ).length;
  return hit / points.length;
}

interface Rect {
  i1: number;
  i2: number;
  j1: number;
  j2: number;
  qualifying: number;
}

/** Prefix-sum 2D trên lưới (đếm mọi rect O(1)). */
function buildPrefix(grid: number[][], nA: number, nP: number): number[][] {
  const ps: number[][] = Array.from({ length: nA + 1 }, () => new Array(nP + 1).fill(0));
  for (let i = 0; i < nA; i++) {
    for (let j = 0; j < nP; j++) {
      ps[i + 1][j + 1] = grid[i][j] + ps[i][j + 1] + ps[i + 1][j] - ps[i][j];
    }
  }
  return ps;
}

function rectSum(ps: number[][], r: Rect): number {
  return ps[r.i2 + 1][r.j2 + 1] - ps[r.i1][r.j2 + 1] - ps[r.i2 + 1][r.j1] + ps[r.i1][r.j1];
}

function rectWindow(r: Rect): PerfectWindow {
  const aMin = -SWEEP_ANGLE_RANGE_DEG + r.i1 * ANGLE_BIN_DEG;
  const aMax = -SWEEP_ANGLE_RANGE_DEG + (r.i2 + 1) * ANGLE_BIN_DEG;
  // Làm tròn 1e-10 để bin edges sạch float (0.05×11 = 0.6000000000000001 → 0.6).
  const pMin = Number((SWEEP_POWER_MIN + r.j1 * POWER_BIN).toFixed(10));
  const pMax = Number((SWEEP_POWER_MIN + (r.j2 + 1) * POWER_BIN).toFixed(10));
  return { angleMinDeg: aMin, angleMaxDeg: aMax, powerMin: pMin, powerMax: pMax };
}

/**
 * Fitter: quét mọi rect trên lưới 5°×0.05 bằng prefix-sum, chọn theo CONTRACT §2:
 * 1) có vùng P∈[0.20,0.45] & area≥80% → chọn vùng ĐẦY ĐỦ điều kiện rộng nhất (max qualifying);
 * 2) mâu thuẫn → ưu tiên P: vùng P∈band rộng nhất (area < 80%, conflict=true);
 * 3) không vùng nào đạt band → vùng max-P, trim cạnh lực cao xuống 0.45; vẫn thất bại → fallback=true.
 */
export class PerfectWindowFitter {
  fit(points: SweepPoint[], opts: { minBounces?: number } = {}): PerfectWindowResult {
    const minBounces = opts.minBounces ?? 7;
    const nA = Math.ceil((2 * SWEEP_ANGLE_RANGE_DEG) / ANGLE_BIN_DEG);
    const nP = Math.ceil((SWEEP_POWER_MAX - SWEEP_POWER_MIN) / POWER_BIN);
    const total = points.length;

    const countGrid: number[][] = Array.from({ length: nA }, () => new Array(nP).fill(0));
    const qualGrid: number[][] = Array.from({ length: nA }, () => new Array(nP).fill(0));
    for (const pt of points) {
      const i = Math.min(
        nA - 1,
        Math.max(0, Math.floor((pt.angleDeg + SWEEP_ANGLE_RANGE_DEG) / ANGLE_BIN_DEG)),
      );
      const j = Math.min(
        nP - 1,
        Math.max(0, Math.floor((pt.power - SWEEP_POWER_MIN) / POWER_BIN)),
      );
      countGrid[i][j]++;
      if (pt.bounces >= minBounces) qualGrid[i][j]++;
    }
    const psCount = buildPrefix(countGrid, nA, nP);
    const psQual = buildPrefix(qualGrid, nA, nP);

    let maxQ = 0;
    const rects: Rect[] = [];
    for (let i1 = 0; i1 < nA; i1++) {
      for (let i2 = i1; i2 < nA; i2++) {
        for (let j1 = 0; j1 < nP; j1++) {
          for (let j2 = j1; j2 < nP; j2++) {
            const r: Rect = { i1, i2, j1, j2, qualifying: 0 };
            if (rectSum(psCount, r) === 0) continue;
            r.qualifying = rectSum(psQual, r);
            rects.push(r);
            if (r.qualifying > maxQ) maxQ = r.qualifying;
          }
        }
      }
    }

    // Hàng ứng viên theo thứ tự duyệt cố định — tie-break deterministic (strictly-greater).
    // P(PERFECT) theo CONTRACT = tỷ lệ VECTOR rơi vào window (membership = count/total);
    // quality = số cú đạt chóp gradient (bounces ≥ minBounces) trong window (khoá vùng vào chóp);
    // area = qualifying / vùng-max (điều kiện "KHOA×area ≥80% max" — CONTRACT §2).
    let bestValid: Rect | null = null;
    let bestBand: Rect | null = null;
    let bestP: Rect | null = null;
    let bestPVal = -1;
    for (const r of rects) {
      if (r.qualifying < MIN_QUALIFYING) continue;
      const membership = rectSum(psCount, r) / total;
      const inBand = membership >= P_TARGET_MIN && membership <= P_TARGET_MAX;
      const areaOk = maxQ > 0 && r.qualifying >= AREA_MIN_FRAC * maxQ;
      if (inBand && areaOk && (bestValid === null || r.qualifying > bestValid.qualifying)) {
        bestValid = r;
      }
      if (inBand && (bestBand === null || r.qualifying > bestBand.qualifying)) bestBand = r;
      if (membership > bestPVal) {
        bestPVal = membership;
        bestP = r;
      }
    }

    const mkResult = (r: Rect, p: number, conflict: boolean, fallback: boolean): PerfectWindowResult => ({
      window: rectWindow(r),
      p,
      areaFrac: maxQ > 0 ? r.qualifying / maxQ : 0,
      qualifyingCount: r.qualifying,
      conflict,
      fallback,
    });

    // 1) đủ cả 2 điều kiện → vùng rộng nhất (max qualifying).
    if (bestValid !== null) {
      return mkResult(bestValid, rectSum(psCount, bestValid) / total, false, false);
    }
    // 2) ưu tiên P: vùng P∈band rộng nhất (area chưa đạt 80% — khai conflict).
    if (bestBand !== null) {
      return mkResult(bestBand, rectSum(psCount, bestBand) / total, true, false);
    }
    // 3) không vùng nào đạt band → max-P, trim cạnh lực cao về 0.45 (theo membership).
    if (bestP === null) {
      // Sweep rỗng/toàn cú yếu — trả window an toàn rỗng, báo fallback.
      return {
        window: { angleMinDeg: 0, angleMaxDeg: 0, powerMin: 0, powerMax: 0 },
        p: 0,
        areaFrac: 0,
        qualifyingCount: 0,
        conflict: true,
        fallback: true,
      };
    }
    const trimmed: Rect = { ...bestP };
    let mTrim = rectSum(psCount, trimmed) / total;
    while (mTrim > P_TARGET_MAX && trimmed.j2 > trimmed.j1) {
      trimmed.j2--;
      trimmed.qualifying = rectSum(psQual, trimmed);
      mTrim = rectSum(psCount, trimmed) / total;
    }
    const fallback = mTrim > P_TARGET_MAX || mTrim < P_TARGET_MIN;
    return mkResult(trimmed, mTrim, true, fallback);
  }
}
