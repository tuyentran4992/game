// Loại shared cho engine + systems — pure TS, 0 Phaser.

export type Phase = 'ENTER' | 'FLASH' | 'BUILD' | 'SCORING' | 'INTERSTITIAL' | 'EXIT' | 'WIN' | 'LOSE'
export type WalkoutReason = 'patience' | 'bad_serve'

export interface RevealLayer {
  readonly i: number
  readonly expectedId: string | undefined
  readonly actualId: string | undefined
  readonly ok: boolean
}

export interface ServeResult {
  readonly score: number
  readonly stars: 0 | 1 | 2 | 3
  readonly tip: number
  readonly fast: boolean
  readonly revealed: RevealLayer[]
}

export interface MatchState {
  seed: number
  phase: Phase
  customerIdx: number // 0..7 — khách HIỆN TẠI (hoặc khách cuối khi WIN/LOSE)
  orders: string[][] // 8 order của ca (hàm của seed)
  order: string[] // order hiện hành (khách 7 có thể đổi bởi WAIT!)
  stack: string[] // layer người chơi đã lắp (dưới→trên, không tính base)
  timer: number // ms còn lại của phase có định thời
  patienceTotalMs: number
  patienceLeftMs: number
  pauseMs: number // patience đang nghỉ (wait replay / hint replay / dem)
  buildElapsedMs: number
  waitPending: boolean
  waitDone: boolean
  hintUsedThisCustomer: number // đếm 1/khach (so sánh HINT_MAX_PER_CUSTOMER)
  hintsShift: number
  served: number
  strikes: number
  tips: number
  stars: number
  fastCount: number
  comboStreak: number
  lastWalkout: WalkoutReason | null
  rewardedUsed: boolean
  lastServe: ServeResult | null
  exitHappy: boolean
}

export type MatchEvent =
  | { type: 'customer_start'; customerIdx: number }
  | { type: 'flash_start'; order: string[] }
  | { type: 'build_start' }
  | { type: 'wait'; customerIdx: number; changedIdx: number; newOrder: string[] }
  | { type: 'hint_replay'; ms: number }
  | { type: 'hint_denied'; reason: string }
  | { type: 'serve'; score: number; stars: number; tip: number; fast: boolean; revealed: RevealLayer[] }
  | { type: 'fast'; tipBonus: number }
  | { type: 'happy'; customerIdx: number; stars: number; tip: number; comboStreak: number }
  | { type: 'walkout'; customerIdx: number; reason: WalkoutReason }
  | { type: 'strike'; strikes: number }
  | { type: 'interstitial_start' }
  | { type: 'win' }
  | { type: 'lose' }
