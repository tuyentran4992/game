// src/systems/scoring.ts — resolve SERVE + du lieu reveal tung layer (SPEC §7 SCORING).
// Moi cong thuc goi thang rules.ts (khong nhan ban). Pure.
import type { MatchEvent, MatchState, RevealLayer } from '../core/types.ts'
import { CUSTOMERS } from '../data/customers.ts'
import { isFast, matchScore, starsFor, tipFor } from '../core/rules.ts'
import { patienceFrac } from './patience.ts'
import { walkout } from './customer.ts'
import { FAST_TIP_BONUS } from '../data/shift.ts'

/** ✅/❌ tung layer theo vi tri tuyet doi (reveal hien dung cho lech — UX checklist). */
export function revealLayers(order: readonly string[], stack: readonly string[]): RevealLayer[] {
  const n = Math.max(order.length, stack.length)
  const out: RevealLayer[] = []
  for (let i = 0; i < n; i++) {
    out.push({ i, expectedId: order[i], actualId: stack[i], ok: order[i] === stack[i] })
  }
  return out
}

/**
 * Tinh SERVE va AP LUON ket qua vao state (logic di truoc juice — scene mo phong
 * reveal 0.5s/layer bang du lieu `revealed`). Tra ve event serve/fast/happy|walkout+strike.
 * <0.40 = 0 sao = strike (DATA-MODEL §5).
 */
export function resolveServe(s: MatchState): MatchEvent[] {
  const score = matchScore(s.order, s.stack)
  const stars = starsFor(score)
  // FAST tinh khi khach OI (stars>0): serve bam <40% = bo di, khong thuong "nhanh"
  const fast = stars > 0 && isFast(patienceFrac(s))
  const tip = tipFor({
    stars,
    tipMult: CUSTOMERS[s.customerIdx]!.tipMult,
    streak: s.comboStreak,
    fast
  })
  const revealed = revealLayers(s.order, s.stack)
  s.lastServe = { score, stars, tip, fast, revealed }
  s.tips += tip
  s.stars += stars
  if (stars > 0) {
    s.served += 1 // khach bo di (0 sao) KHONG tinh la phuc vu (overlay LOSE "Served X/8")
    if (fast) s.fastCount += 1
  }
  s.comboStreak = stars === 3 ? s.comboStreak + 1 : 0

  const evs: MatchEvent[] = [{ type: 'serve', score, stars, tip, fast, revealed }]
  if (fast) evs.push({ type: 'fast', tipBonus: FAST_TIP_BONUS })
  if (stars === 0) return [...evs, ...walkout(s, 'bad_serve')]
  s.exitHappy = true
  evs.push({ type: 'happy', customerIdx: s.customerIdx, stars, tip, comboStreak: s.comboStreak })
  return evs
}
