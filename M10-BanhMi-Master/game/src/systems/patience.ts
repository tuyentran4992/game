// src/systems/patience.ts — hệ kiên nhẫn (DATA-MODEL §8): chi dem khi BUILD,
// nghi khi pause (WAIT!/HINT/overlay). Pure — scene ve cung arc tu frac.
import type { MatchState } from '../core/types.ts'

export function beginPatience(s: MatchState, patienceMs: number): void {
  s.patienceTotalMs = patienceMs
  s.patienceLeftMs = patienceMs
  s.pauseMs = 0
}

/** Fraction patience con lai 0..1 (FAST nguong 0.6 o rules). */
export function patienceFrac(s: MatchState): number {
  return s.patienceTotalMs > 0 ? s.patienceLeftMs / s.patienceTotalMs : 0
}

/**
 * Advance patience 1 buoc thoi gian. Tra ve true NEU patience ve 0 (walkout).
 * pauseMs > 0 => phan dt trong luc pause khong dem patience; neu pause het giua
 * tick, phan dt con lai van dem binh thuong.
 */
export function advancePatience(s: MatchState, dtMs: number): boolean {
  let remaining = dtMs
  if (s.pauseMs > 0) {
    const used = Math.min(s.pauseMs, remaining)
    s.pauseMs -= used
    remaining -= used
  }
  if (remaining > 0) s.patienceLeftMs = Math.max(0, s.patienceLeftMs - remaining)
  return s.patienceLeftMs <= 0
}

/** Nhiet pause (ms) len patience — dung cho WAIT! replay + dem, va HINT replay. */
export function addPause(s: MatchState, ms: number): void {
  s.pauseMs += ms
}
