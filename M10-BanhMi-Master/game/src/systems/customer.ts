// src/systems/customer.ts — vong doi khach: vao/ra, walkout (strike), win/lose chuyen.
// Pure — scene duyet theo event + phase.
import type { MatchEvent, MatchState, Phase } from '../core/types.ts'
import { CUSTOMERS } from '../data/customers.ts'
import { beginPatience } from './patience.ts'
import { INTERSTITIAL_BETWEEN, INTERSTITIAL_MS, STRIKES_MAX, WALK_IN_MS } from '../data/shift.ts'

/** Bat dau khach `idx`: reset stack/hint-khach, gan order, vao ENTER (walk-in). */
export function beginCustomer(s: MatchState, idx: number): MatchEvent[] {
  s.customerIdx = idx
  s.order = [...s.orders[idx]!]
  s.stack = []
  s.hintUsedThisCustomer = 0
  s.buildElapsedMs = 0
  s.phase = 'ENTER'
  s.timer = WALK_IN_MS
  beginPatience(s, CUSTOMERS[idx]!.patienceS * 1000)
  return [{ type: 'customer_start', customerIdx: idx }]
}

/** Patience = 0 HOAC serve <40%: strike +1, khach bo di (giận). Khong tinh sao/tip. */
export function walkout(s: MatchState, reason: 'patience' | 'bad_serve'): MatchEvent[] {
  s.strikes += 1
  s.lastWalkout = reason
  s.exitHappy = false
  return [
    { type: 'walkout', customerIdx: s.customerIdx, reason },
    { type: 'strike', strikes: s.strikes }
  ]
}

/**
 * Ket thuc EXIT (khach da ra): quyet dinh chuyen tiep —
 * LOSE (strike 3), WIN (xong khach #8), INTERSTITIAL (sau khach #4), hoac khach ke.
 */
export function advanceAfterExit(s: MatchState): MatchEvent[] {
  if (s.strikes >= STRIKES_MAX) return enter(s, 'LOSE', 0, [{ type: 'lose' }])
  if (s.customerIdx >= SHIFT_LAST) return enter(s, 'WIN', 0, [{ type: 'win' }])
  if (s.customerIdx === INTERSTITIAL_BETWEEN - 1) {
    return enter(s, 'INTERSTITIAL', INTERSTITIAL_MS, [{ type: 'interstitial_start' }])
  }
  return beginCustomer(s, s.customerIdx + 1)
}

const SHIFT_LAST = CUSTOMERS.length - 1

function enter(s: MatchState, phase: Phase, timer: number, evs: MatchEvent[]): MatchEvent[] {
  s.phase = phase
  s.timer = timer
  return evs
}
