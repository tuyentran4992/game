// src/core/rules.ts — TOÀN BỘ công thức luật chơi, hàm PURE (DATA-MODEL §4–§7).
// scene/systems gọi vào đây — cấm nhân bản công thức (PROMPT kiến trúc). 0 import Phaser.
import { CUSTOMERS } from '../data/customers.ts'
import { MEAT_IDS, ORDER_POOL, SAUCE_IDS, VEG_IDS, categoryOf } from '../data/ingredients.ts'
import { pick, shuffled, mulberry32, type Rng } from './rng.ts'
import {
  COMBO_CAP, COMBO_STEP, FAST_TIP_BONUS, RANK_A_STARS, RANK_A_TIPS, RANK_S_STARS, RANK_S_TIPS,
  STAR_THRESHOLD_1, STAR_THRESHOLD_2, STAR_THRESHOLD_3, TIP_1STAR, TIP_2STAR, TIP_3STAR
} from '../data/shift.ts'

/**
 * Sinh order cho 1 khách (DATA-MODEL §4).
 * Ràng buộc: (a) ≥1 sốt+thịt+rau — riêng khách tutorial n=2 không thể đủ 3 nhóm nên
 *             chỉ ép ≥1 sốt + ≥1 thịt (ghi chú BÁO CÁO — spec mâu thuẫn n=2 vs §4a);
 *           (b) layer[0] luôn là sốt; (c) không trùng id; sauce tối đa 2 (không trùng).
 */
export function genOrder(_seed: number, customerIdx: number, rng: Rng): string[] {
  // _seed giu dung chu ky DATA-MODEL §4 genOrder(seed, customerIdx); rng truyen vao de
  // genShiftOrders kiem soat duoc stream khi can sinh lai (ro rang GC-04).
  const n = CUSTOMERS[customerIdx]!.layers
  const s0 = pick(SAUCE_IDS, rng)
  const m0 = pick(MEAT_IDS, rng)
  const core = n >= 3 ? [s0, m0, pick(VEG_IDS, rng)] : [s0, m0]
  const chosen = [...core]
  while (chosen.length < n) {
    let cands = ORDER_POOL.filter((id) => !chosen.includes(id))
    if (chosen.filter((id) => SAUCE_IDS.includes(id)).length >= 2) {
      cands = cands.filter((id) => !SAUCE_IDS.includes(id)) // (d-note §2) ≤2 loại sốt
    }
    chosen.push(pick(cands, rng))
  }
  // (b) layer đầu = sốt; phần còn lại shuffle deterministic
  return [s0, ...shuffled(chosen.filter((id) => id !== s0), rng)]
}

/**
 * 8 order của cả ca — hàm của seed (GC-01/02/03/04).
 * (d) không 2 order giống hệt trong ca: trùng thì rút lại trên CÙNG rng stream (still deterministic).
 */
export function genShiftOrders(seed: number): string[][] {
  const orders: string[][] = []
  for (let idx = 0; idx < CUSTOMERS.length; idx++) {
    const rng = pickRng(seed, idx)
    let o = genOrder(seed, idx, rng)
    while (orders.some((p) => p.join(',') === o.join(','))) o = genOrder(seed, idx, rng)
    orders.push(o)
  }
  return orders
}

/** rng stream per khách: seed + idx*1013 (DATA-MODEL §4) */
export const pickRng = (seed: number, customerIdx: number): Rng => mulberry32(seed + customerIdx * 1013)

/** matchScore: khớp đúng id ĐÚNG vị trí / max(len) (DATA-MODEL §5, decision #4) */
export function matchScore(order: readonly string[], stack: readonly string[]): number {
  const n = Math.max(order.length, stack.length)
  if (n === 0) return 0
  let hit = 0
  for (let i = 0; i < n; i++) if (order[i] === stack[i]) hit++
  return hit / n
}

/** sao theo thang §5 — biên là ĐẠT (GC-08) */
export function starsFor(score: number): 0 | 1 | 2 | 3 {
  if (score >= STAR_THRESHOLD_3) return 3
  if (score >= STAR_THRESHOLD_2) return 2
  if (score >= STAR_THRESHOLD_1) return 1
  return 0
}

/** combo: streak = số khách 3-sao liên tiếp TRƯỚC khách hiện tại; ×1.15 mỗi khách, cap ×1.5 */
export function comboMult(streak: number): number {
  return Math.min(COMBO_CAP, 1 + streak * COMBO_STEP)
}

/** tip = floor(base × tipMult × combo) + (FAST? +5 : 0); 0 sao = 0 tip (round-down cuối) */
export function tipFor(args: { stars: number; tipMult: number; streak: number; fast: boolean }): number {
  if (args.stars === 0) return 0
  const base = args.stars === 3 ? TIP_3STAR : args.stars === 2 ? TIP_2STAR : TIP_1STAR
  return Math.floor(base * args.tipMult * comboMult(args.streak)) + (args.fast ? FAST_TIP_BONUS : 0)
}

/** phục vụ xong có FAST? patience còn ≥60% (DATA-MODEL §5) */
export const isFast = (patienceFrac: number): boolean => patienceFrac >= 0.6

/** rank khi WIN (DATA-MODEL §6) */
export function rankFor(stars: number, tips: number): 'S' | 'A' | 'B' {
  if (stars >= RANK_S_STARS && tips >= RANK_S_TIPS) return 'S'
  if (stars >= RANK_A_STARS && tips >= RANK_A_TIPS) return 'A'
  return 'B'
}

/**
 * Khách #7 WAIT! — đổi DUNG 1 layer giữa đơn (index 1..n-2, giữ sauce-neo ở 0),
 * id mới không trùng order cũ (DATA-MODEL §7). Ràng buộc §4a/§2 PHẢI được giữ sau đổi:
 * nếu layer bị thay là thành viên CUỐI của nhóm → id mới cùng nhóm; đơn đã đủ 2 sốt
 * và không thay sốt → cấm thêm sốt.
 */
export function applyWaitChange(
  order: readonly string[],
  rng: Rng
): { order: string[]; changedIdx: number } {
  const n = order.length
  const mids = Array.from({ length: n - 2 }, (_, i) => i + 1) // 1..n-2
  const changedIdx = pick(mids.length > 0 ? mids : [Math.floor(n / 2)], rng)
  const removed = order[changedIdx]!
  const removedCat = categoryOf(removed)
  const countCat = (c: string) => order.filter((id) => categoryOf(id) === c).length
  let cands = ORDER_POOL.filter((id) => !order.includes(id))
  if (countCat(removedCat) === 1) {
    cands = cands.filter((id) => categoryOf(id) === removedCat) // giu nhom "co hon"
  } else if (removedCat !== 'sauce' && countCat('sauce') >= 2) {
    cands = cands.filter((id) => categoryOf(id) !== 'sauce') // toi da 2 loi sau (§2)
  }
  const nw = [...order]
  nw[changedIdx] = pick(cands, rng)!
  return { order: nw, changedIdx }
}
