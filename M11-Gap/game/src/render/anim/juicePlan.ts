// Pattern: Data Table (pure planner, seeded) — B4 JUICE
// TRÁCH NHIỆM: mọi biến thiên "đã mắt" của một lượt (rung khi sai, tia vàng khi nhận sao, hơi
//   thở idle của màn Title) là DỮ LIỆU TẤT ĐỊNH sinh từ seed — CẤM Math.random (PC-02), nên ba
//   lần reload phải cho đúng một dãy rung/tia (PC-B-04). Số ms lấy từ anim/unfoldPlan (một
//   nguồn nhịp), biên rung lấy từ TOUCH.shakeMaxPx (một nguồn biên).
// RÀNG BUỘC: module THUẦN — không import phaser, không đồng hồ, không DOM. Scene chỉ việc đặt
//   tween theo từng dòng.
// HỢP ĐỒNG SỐ (pack B4): mở lớp 140/so le 110 · pop ô đáp án 250/so le 60 · giải thích ≥700 ·
//   rung nhẹ khi sai · tia #F5B301 khi nhận sao · giấy "thở" 1,2s yoyo khi idle ≥5s ở Title.

import { hash32 } from '../../logic/rng';
import type { LevelSpec } from '../../logic/types';
import { breathPlan, DUR, TOUCH } from './unfoldPlan';

/** Nhịp của tầng juice — dẫn xuất từ DUR/TOUCH, không khai số mới ở nơi gọi. */
export const JUICE: Readonly<{
  steps: number;
  stepMs: number;
  sparks: number;
  sparkPx: number;
  sparkLifeMs: number;
  sparkStaggerMs: number;
  sparkReachMin: number;
  sparkReachMax: number;
  sparkScaleMin: number;
  sparkScaleMax: number;
}> = {
  /** 6 nhát rung, mỗi nhát 1/4 nhịp phản hồi chạm (DUR.fast) — tổng vẫn dưới một nhịp. */
  steps: 6,
  stepMs: DUR.fast / 4,
  /** 10 tia vàng, nở chậm dần đều (nửa nhịp so le của lỗ), sống 420ms (= một tiếng `star`). */
  sparks: 10,
  /** Cỡ chấm sáng bake (px thiết kế) — KÍCH THƯỚC cũng là nhịp juice, để file vẽ không sở hữu số. */
  sparkPx: 12,
  sparkLifeMs: 420,
  sparkStaggerMs: DUR.holeStagger / 2,
  /** Bán kính bay (tỷ lệ của vùng phát) và cỡ tia — DỮ LIỆU, không phải px thô trong vòng vẽ. */
  sparkReachMin: 0.45,
  sparkReachMax: 1,
  sparkScaleMin: 0.6,
  sparkScaleMax: 1.2,
};

/** Một nhát rung của tờ giấy (bđ tuyệt đối so với vị trí gốc, px thiết kế). */
export type ShakeStep = {
  readonly dx: number;
  readonly dy: number;
  readonly durationMs: number;
};

/** Một tia: véctơ đơn vị + quãng đường (theo `reach` của scene) + cỡ + trễ. */
export type Spark = {
  readonly nx: number;
  readonly ny: number;
  readonly reach: number;
  readonly scale: number;
  readonly delayMs: number;
  readonly lifeMs: number;
};

/** Số [0,1] tất định của một dòng — hash32 của logic, không phải ngẫu nhiên. */
const unitAt = (tag: string, i: number): number => hash32(tag + '#' + i) / 4294967295;

/**
 * Seed của juice MỘT lượt: seed CỦA ĐỀ (LevelSpec.seed — logic sở hữu, main.ts sinh từ
 * hash(gameId + levelIndex)) cộng với số lần sai, để hai lượt sai liên tiếp không rung giống
 * hệt nhau. View không tự đặt ngẫu nhiên và không cần cửa mới trong GameSession.
 */
export function juiceSeedOf(spec: LevelSpec, misses: number): string {
  return spec.seed + '|miss|' + misses;
}

/** Dãy rung: biên không bao giờ vượt TOUCH.shakeMaxPx (DS:127) — tờ giấy không nảy khỏi cột. */
export function shakeSteps(seed: string, count: number = JUICE.steps): ShakeStep[] {
  const out: ShakeStep[] = [];
  for (let i = 0; i < count; i += 1) {
    const span = TOUCH.shakeMaxPx * 2;
    out.push({
      dx: Math.round((unitAt(seed, i) * span - TOUCH.shakeMaxPx) * 100) / 100,
      dy: Math.round((unitAt(seed + 'y', i) * span - TOUCH.shakeMaxPx) * 100) / 100,
      durationMs: JUICE.stepMs,
    });
  }
  return out;
}

/** Dãy tia vàng: đều quanh vòng tròn + lệch góc tất định ⇒ không thành hình cánh quạt cứng. */
export function sparkBurst(seed: string, count: number = JUICE.sparks): Spark[] {
  const out: Spark[] = [];
  for (let i = 0; i < count; i += 1) {
    const angle = (Math.PI * 2 * i) / count + unitAt(seed + 'a', i) * 0.5;
    const reach = JUICE.sparkReachMin + unitAt(seed + 'r', i) * (JUICE.sparkReachMax - JUICE.sparkReachMin);
    out.push({
      nx: Math.cos(angle),
      ny: Math.sin(angle),
      reach,
      scale: JUICE.sparkScaleMin + unitAt(seed + 's', i) * (JUICE.sparkScaleMax - JUICE.sparkScaleMin),
      delayMs: i * JUICE.sparkStaggerMs,
      lifeMs: JUICE.sparkLifeMs,
    });
  }
  return out;
}

/**
 * Hơi thở của màn Title (pack B4): CÙNG 1,2s yoyo + CÙNG ngưỡng 5s của hơi thở hint
 * (breathPlan) — chỉ khác ở chỗ nó lặp vô hạn cho tới khi có cú bấm. Không khai số thứ hai.
 */
export function idleBreathPlan(): ReturnType<typeof breathPlan> {
  return Object.freeze({ ...breathPlan(), teachOnly: false, repeat: -1 });
}

/** Lịch pop 4 ô đáp án lúc mở đề (250ms/ô, so le 60ms — DS:121 + pack B4). */
export const optionPop = (count: number): { index: number; delayMs: number; durationMs: number }[] =>
  Array.from({ length: count }, (_, i) => ({ index: i, delayMs: i * DUR.holeStagger, durationMs: DUR.pop }));
