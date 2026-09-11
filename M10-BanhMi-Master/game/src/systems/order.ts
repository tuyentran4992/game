// src/systems/order.ts — he FLASH order: thoi gian hien bong bubble, ghost bubble,
// va kich hoat su kien WAIT! cua khach #7 (DATA-MODEL §7). Pure — scene ve bong bubble.
import type { MatchEvent, MatchState } from '../core/types.ts'
import { CUSTOMERS } from '../data/customers.ts'
import { applyWaitChange } from '../core/rules.ts'
import type { Rng } from '../core/rng.ts'
import { FLASH_REPLAY_WAIT_MS, WAIT_BUFFER_MS, WAIT_TRIGGER_AFTER_FLASH_MS } from '../data/shift.ts'
import { addPause } from './patience.ts'

export const flashDurationMs = (customerIdx: number): number =>
  CUSTOMERS[customerIdx]!.flashS * 1000

/** Flash tat -> vao BUILD. Ghi nhan waitPending cho khach doi y (neu chua dung hint som hon). */
export function beginBuild(s: MatchState): MatchEvent[] {
  s.buildElapsedMs = 0
  s.waitPending =
    s.order.length >= 3 && // can "giua don" de doi (luon dung voi khach #7)
    CUSTOMERS[s.customerIdx]!.changer === true &&
    !s.waitDone
  return [{ type: 'build_start' }]
}

/** Sau flash tat +2.5s va patience khong dang pause thi WAIT! moi duoc nop. */
export function waitShouldFire(s: MatchState): boolean {
  return s.waitPending && s.pauseMs <= 0 && s.buildElapsedMs >= WAIT_TRIGGER_AFTER_FLASH_MS
}

/** Kich hoat WAIT!: doi 1 layer, bong bubble replay 1.5s + dem 1.0s (patience pause 2.5s). */
export function fireWait(s: MatchState, rng: Rng): MatchEvent[] {
  const { order: nw, changedIdx } = applyWaitChange(s.order, rng)
  s.order = nw
  s.waitPending = false
  s.waitDone = true
  addPause(s, FLASH_REPLAY_WAIT_MS + WAIT_BUFFER_MS) // 1.5s replay + 1.0s dem = 2.5s (DATA-MODEL §7)
  return [{ type: 'wait', customerIdx: s.customerIdx, changedIdx, newOrder: [...nw] }]
}

/** Du ban buildElapsed khi khong pause (match.ts goi moi tick BUILD). */
export function tickBuildElapsed(s: MatchState, dtMs: number): void {
  if (s.pauseMs <= 0) s.buildElapsedMs += dtMs
}
