// src/systems/hint.ts — he HINT (rewarded replay 1.5s): ngan 1/khach, 3/ca (SPEC §3).
import type { MatchEvent, MatchState } from '../core/types.ts'
import { HINT_MAX_PER_CUSTOMER, HINT_MAX_PER_SHIFT, HINT_REPLAY_MS } from '../data/shift.ts'
import { addPause } from './patience.ts'

export interface HintCheck {
  ok: boolean
  reason?: string
}

export function canHint(s: MatchState): HintCheck {
  if (s.phase !== 'BUILD') return { ok: false, reason: 'phase' }
  if (s.hintsShift >= HINT_MAX_PER_SHIFT) return { ok: false, reason: 'per-shift' }
  if (s.hintUsedThisCustomer >= HINT_MAX_PER_CUSTOMER) return { ok: false, reason: 'per-customer' }
  return { ok: true }
}

/**
 * Dung hint: bong bubble hien lai HINT_REPLAY_MS, patience pause bang do.
 * LUU Y (DATA-MODEL §7): neu khach 7 dung hint TRUOC khi WAIT trigger -> WAIT bi huy
 * (hintUsedThisCustomer > 0 khi waitPending -> khong sinh wait).
 */
export function useHint(s: MatchState): MatchEvent[] {
  s.hintsShift += 1
  s.hintUsedThisCustomer += 1
  // DATA-MODEL §7: dung hint TRUOC khi WAIT trigger => WAIT bi huy (tranh 2 lan hien lai)
  if (!s.waitDone) s.waitPending = false
  addPause(s, HINT_REPLAY_MS)
  return [{ type: 'hint_replay', ms: HINT_REPLAY_MS }]
}
