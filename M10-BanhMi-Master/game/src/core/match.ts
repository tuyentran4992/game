// src/core/match.ts — MAY TRANG THAI ca (orchestrator mong). Khong chua cong thuc luat:
// moi goi rules.ts / systems/*. Scene chi connect input + render + tick tai day.
import { mulberry32, type Rng } from './rng.ts'
import { genShiftOrders, rankFor } from './rules.ts'
import type { MatchEvent, MatchState } from './types.ts'
import {
  EXIT_ANIM_MS, LID_CLOSE_MS, REWARDED_CONTINUE_PER_SHIFT, REVEAL_PER_LAYER_MS,
  REVEAL_SETTLE_MS, STRIKES_MAX, WALK_IN_MS
} from '../data/shift.ts'
import { advancePatience } from '../systems/patience.ts'
import { beginBuild, waitShouldFire, fireWait, flashDurationMs, tickBuildElapsed } from '../systems/order.ts'
import { resolveServe } from '../systems/scoring.ts'
import { canHint, useHint } from '../systems/hint.ts'
import { advanceAfterExit, beginCustomer, walkout } from '../systems/customer.ts'

export type { MatchEvent, MatchState, Phase, ServeResult, RevealLayer } from './types.ts'

const MAX_STACK = 6 // so layer giua lon nhat tren don (DATA-MODEL §3 khach 8)

export interface MatchSummary {
  win: boolean
  served: number
  stars: number
  tips: number
  strikes: number
  fastCount: number
  rank: 'S' | 'A' | 'B'
  sendScore: number // bridge: tong tips ca nay
}

export class Match {
  readonly state: MatchState
  private readonly waitRng: Rng
  private pending: MatchEvent[] = []

  constructor(seed: number) {
    const orders = genShiftOrders(seed)
    this.state = {
      seed, phase: 'ENTER', customerIdx: 0, orders, order: [], stack: [],
      timer: WALK_IN_MS, patienceTotalMs: 0, patienceLeftMs: 0, pauseMs: 0,
      buildElapsedMs: 0, waitPending: false, waitDone: false,
      hintUsedThisCustomer: 0, hintsShift: 0, served: 0, strikes: 0, tips: 0, stars: 0,
      fastCount: 0, comboStreak: 0, lastWalkout: null, rewardedUsed: false,
      lastServe: null, exitHappy: false
    }
    this.waitRng = mulberry32(seed + 7777) // rng rieng cho su kien WAIT! (deterministic)
    this.emit(beginCustomer(this.state, 0))
  }

  tick(dtMs: number): MatchEvent[] {
    const s = this.state
    switch (s.phase) {
      case 'ENTER':
        s.timer -= dtMs
        if (s.timer <= 0) {
          s.phase = 'FLASH'
          s.timer = flashDurationMs(s.customerIdx)
          this.emit({ type: 'flash_start', order: [...s.order] })
        }
        break
      case 'FLASH':
        s.timer -= dtMs
        if (s.timer <= 0) {
          s.phase = 'BUILD'
          this.emit(beginBuild(s))
        }
        break
      case 'BUILD': {
        if (s.pauseMs > 0) {
          advancePatience(s, dtMs) // tru pause, khong dem patience
        } else {
          tickBuildElapsed(s, dtMs)
          if (waitShouldFire(s)) this.emit(fireWait(s, this.waitRng))
          if (advancePatience(s, dtMs)) {
            this.emit(walkout(s, 'patience'))
            this.toExit()
          }
        }
        break
      }
      case 'SCORING':
        s.timer -= dtMs
        if (s.timer <= 0) this.toExit()
        break
      case 'INTERSTITIAL':
        s.timer -= dtMs
        if (s.timer <= 0) this.emit(beginCustomer(s, s.customerIdx + 1))
        break
      case 'EXIT':
        s.timer -= dtMs
        if (s.timer <= 0) this.emit(advanceAfterExit(s))
        break
      case 'WIN':
      case 'LOSE':
        break // terminal — choi lai = tao Match moi (seed moi)
    }
    return this.drain()
  }

  tapLayer(id: string): MatchEvent[] {
    if (this.state.phase !== 'BUILD' || this.state.stack.length >= MAX_STACK) return this.drain()
    this.state.stack.push(id)
    return this.drain()
  }

  tapUndo(): MatchEvent[] {
    if (this.state.phase === 'BUILD' && this.state.stack.length > 0) this.state.stack.pop()
    return this.drain()
  }

  tapServe(): MatchEvent[] {
    const s = this.state
    if (s.phase !== 'BUILD') return this.drain()
    this.emit(resolveServe(s))
    s.phase = 'SCORING'
    s.timer = LID_CLOSE_MS + REVEAL_PER_LAYER_MS * Math.max(s.order.length, s.stack.length) + REVEAL_SETTLE_MS
    return this.drain()
  }

  tapHint(): MatchEvent[] {
    const check = canHint(this.state)
    if (!check.ok) return this.drain({ type: 'hint_denied', reason: check.reason ?? 'unavailable' })
    this.emit(useHint(this.state))
    return this.drain()
  }

  /** Rewarded continue (DATA-MODEL §6 + SPEC §7): sau LOSE, 1 lan/ca, hoi 1 strike.
   *  Khong hieu neu khach cuoi (#8) bi LOSE — het khach de choi tiep. */
  canContinue(): boolean {
    const s = this.state
    return (
      s.phase === 'LOSE' &&
      !s.rewardedUsed &&
      REWARDED_CONTINUE_PER_SHIFT >= 1 &&
      s.customerIdx + 1 < s.orders.length
    )
  }

  continueAfterAd(): MatchEvent[] {
    if (!this.canContinue()) return this.drain()
    this.state.rewardedUsed = true
    this.state.strikes = STRIKES_MAX - 1 // hoi 1 strike
    this.emit(beginCustomer(this.state, this.state.customerIdx + 1))
    return this.drain()
  }

  summary(): MatchSummary {
    const s = this.state
    return {
      win: s.phase === 'WIN',
      served: s.served,
      stars: s.stars,
      tips: s.tips,
      strikes: s.strikes,
      fastCount: s.fastCount,
      rank: rankFor(s.stars, s.tips),
      sendScore: s.tips
    }
  }

  // --- private plumbing ---
  private toExit(): void {
    this.state.phase = 'EXIT'
    this.state.timer = EXIT_ANIM_MS
  }

  private emit(evs: MatchEvent | MatchEvent[]): void {
    const arr = Array.isArray(evs) ? evs : [evs]
    this.pending.push(...arr)
  }

  private drain(extra?: MatchEvent): MatchEvent[] {
    if (extra) this.pending.push(extra)
    const out = this.pending
    this.pending = []
    return out
  }
}

export function createMatch(seed: number): Match {
  return new Match(seed)
}
