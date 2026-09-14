// ============================================================================
// level-state.test.ts — B1b NỬA A: máy trạng thái MỘT MÀN (src/logic/levelState.ts).
// Module chưa tồn tại => CẢ FILE PHẢI ĐỎ vì lỗi resolve import (TDD, không try/catch, không skip).
//
// HỢP ĐỒNG ĐƯỢC CHỐT Ở ĐÂY (pack B1b mục 2 — transition thuần, state bất biến):
//   loading --markReady--> ready --tap(option)--> answered --resolve--> correct | wrong
//   wrong --retry--> ready (CÙNG LevelSpec)        correct --nextLevel--> next
//   advanceClock(state, ms): chỉ cộng elapsedMs, KHÔNG đổi phase, KHÔNG phạt.
//
// BẢNG CHÍNH SÁCH LỖI (ERR) — dùng thống nhất cho cả 2 file test B1b:
//   tap SAI phase                 => BUFFER: state nguyên trạng, taps không đổi (TC-SES-03 / ERR-06)
//   tap option ngoài 0..3         => NÉM (PC-03: mọi đề có đúng 4 ô)
//   advanceClock(ms âm hoặc NaN)  => NÉM (không time-travel ngược)
//   resolve / retry / nextLevel sai phase => NÉM
//   quy ước: thông báo NÉM phải chứa TÊN transition => test bắt bằng regex theo tên.
//
// Dấu † = tên/kiểu SUY RA từ bảng 6 phase, chưa thấy chép nguyên văn trong pack. Nếu pack chốt
// khác thì sửa ĐÚNG MỘT chỗ có dấu † (import + chữ ký), không rải nhánh ra từng case.
// ============================================================================

import { describe, expect, it } from "vitest"
import type { LevelSpec } from "../../src/logic/types"
import type { LevelState } from "../../src/logic/levelState"
import {
  advanceClock,
  initialLevelState,
  markReady,
  nextLevel,
  resolve,
  retry,
  tap,
} from "../../src/logic/levelState"
import { FIX_ANSWER, FIX_D1, FIX_D2, FIX_D3, goodSpec, mkSpec, serializeSpec } from "./helpers"

/** †† BẢNG 6 PHASE VIẾT TAY — CẤM dẫn xuất danh sách này từ LEVEL_PHASES của src. */
const PHASE_TABLE = ["loading", "ready", "answered", "correct", "wrong", "next"] as const
type Phase = (typeof PHASE_TABLE)[number]

/** PC-05: màn là breakpoint — máy trạng thái màn không được có phase thắng-cuộc. */
const WIN_SCREEN_PHASES = ["win", "won", "victory", "complete", "completed", "end", "gameover", "game_over", "campaign_end"]

const SPEC = goodSpec() // folds [H,V], 4 ô id 0..3, correctIndex = 0
const T_SPEC: LevelSpec = { ...goodSpec(), timerOn: true } // bản có bật đồng hồ (PC-01)
const RIGHT = 0
const WRONG = 1
/** Đề màn-kế-tiếp do makeNext giả trả về — giá trị khác hẳn SPEC hiện hành. */
const NEXT_FIXTURE = mkSpec([FIX_D2, FIX_D1, FIX_ANSWER, FIX_D3], 2)
const NEXT_JSON = serializeSpec(NEXT_FIXTURE)

type Snap = {
  phase: string
  spec: string
  taps: number
  misses: number
  hintUsed: boolean
  undoUsed: boolean
  elapsedMs: number
  lastWrong: number | null
  nextSpec: string | null
}

/** Snapshot GIÁ TRỊ của state (LevelSpec serialize theo giá trị) — mọi assert đi qua đây. */
function snap(s: LevelState): Snap {
  return {
    phase: s.phase,
    spec: serializeSpec(s.spec),
    taps: s.taps,
    misses: s.misses,
    hintUsed: s.hintUsed,
    undoUsed: s.undoUsed,
    elapsedMs: s.elapsedMs,
    lastWrong: s.lastWrong,
    nextSpec: s.nextSpec ? serializeSpec(s.nextSpec) : null,
  }
}

const ZERO: Snap = {
  phase: "ready",
  spec: serializeSpec(SPEC),
  taps: 0,
  misses: 0,
  hintUsed: false,
  undoUsed: false,
  elapsedMs: 0,
  lastWrong: null,
  nextSpec: null,
}
const want = (over: Partial<Snap>): Snap => ({ ...ZERO, ...over })

/** makeNext dạng con đếm số lần gọi (TC-SES-04) — thuần, không nguồn ngẫu nhiên, không đồng hồ. */
function counter(seed: LevelSpec = NEXT_FIXTURE): { fn: () => LevelSpec; calls: () => number } {
  let n = 0
  return {
    fn: () => {
      n += 1
      return seed
    },
    calls: () => n,
  }
}
const SPY = counter() // dùng cho các chain không đo số lần gọi

const ready = (): LevelState => markReady(initialLevelState(SPEC))

/** Một state đại diện cho TỪNG phase, dựng bằng đúng các transition công khai. */
function sampleStates(): Record<Phase, LevelState> {
  const loading = initialLevelState(SPEC)
  const rdy = markReady(loading)
  const answered = tap(rdy, WRONG)
  const wrong = resolve(answered, SPY.fn)
  const correct = resolve(tap(rdy, RIGHT), SPY.fn)
  return { loading, ready: rdy, answered, wrong, correct, next: nextLevel(correct) }
}
const S = sampleStates()

type Step = (s: LevelState) => LevelState
/** † TC-SES-06: state suy lại được từ CHUỖI ACTION, không từ biến ẩn nào. */
function walk(steps: readonly Step[], spec: LevelSpec = SPEC): LevelState[] {
  let s = initialLevelState(spec)
  const out: LevelState[] = [s]
  for (const step of steps) {
    s = step(s)
    out.push(s)
  }
  return out
}

const CHAIN: readonly Step[] = [
  markReady,
  (s) => advanceClock(s, 1500),
  (s) => tap(s, WRONG),
  (s) => resolve(s, SPY.fn),
  retry,
  (s) => tap(s, RIGHT),
  (s) => resolve(s, SPY.fn),
  nextLevel,
]

describe("levelState — máy trạng thái một màn (B1b nửa A)", () => {
  it("TC-SES-01 / PC-05: máy chỉ có đúng 6 phase, không có phase win-screen nào", () => {
    const seen = walk(CHAIN).map((s) => s.phase)
    const oneTry = walk([markReady, (s) => tap(s, RIGHT), (s) => resolve(s, SPY.fn), nextLevel]).map((s) => s.phase)
    const all = [...new Set([...seen, ...oneTry])].sort()
    expect(all).toEqual([...PHASE_TABLE].sort())
    expect(all.filter((p) => (WIN_SCREEN_PHASES as readonly string[]).includes(p))).toEqual([])
    for (const p of PHASE_TABLE) expect(S[p].phase).toBe(p) // không có phase chết
  })

  it("TC-SES-01: đúng ngay -> correct -> nextLevel cho phase next, nguyên bộ đếm và nextSpec", () => {
    const st = walk([markReady, (s) => tap(s, RIGHT), (s) => resolve(s, SPY.fn), nextLevel])
    expect(st.map((s) => s.phase)).toEqual(["loading", "ready", "answered", "correct", "next"])
    expect(snap(st[1])).toEqual(want({ phase: "ready" }))
    expect(snap(st[2])).toEqual(want({ phase: "answered", taps: 1 }))
    expect(snap(st[3])).toEqual(want({ phase: "correct", taps: 1, nextSpec: NEXT_JSON }))
    expect(snap(st[4])).toEqual(want({ phase: "next", taps: 1, nextSpec: NEXT_JSON }))
  })

  it("TC-SES-02: sai -> wrong -> retry về ready với ĐÚNG cùng LevelSpec, giữ misses/taps/lastWrong", () => {
    const answered = tap(ready(), WRONG)
    expect(snap(answered)).toEqual(want({ phase: "answered", taps: 1 }))
    const bad = resolve(answered, SPY.fn)
    expect(snap(bad)).toEqual(want({ phase: "wrong", taps: 1, misses: 1, lastWrong: WRONG }))
    const back = retry(bad)
    expect(snap(back)).toEqual(want({ phase: "ready", taps: 1, misses: 1, lastWrong: WRONG }))
    expect(serializeSpec(back.spec)).toBe(serializeSpec(SPEC))
  })

  it("TC-SES-02 + ERR: resolve/retry/nextLevel gọi sai phase => NÉM, thông báo nêu tên transition", () => {
    const illegal: readonly { name: string; ok: Phase; call: (s: LevelState) => LevelState }[] = [
      { name: "retry", ok: "wrong", call: (s) => retry(s) },
      { name: "resolve", ok: "answered", call: (s) => resolve(s, SPY.fn) },
      { name: "nextLevel", ok: "correct", call: (s) => nextLevel(s) },
    ]
    for (const t of illegal) {
      for (const p of PHASE_TABLE) {
        if (p === t.ok) continue
        expect(() => t.call(S[p])).toThrow(new RegExp(t.name, "i"))
      }
    }
  })

  it("TC-SES-03: bấm thừa ở answered bị buffer — state nguyên trạng, taps KHÔNG đổi", () => {
    const answered = tap(ready(), RIGHT)
    const before = snap(answered)
    expect(snap(tap(answered, RIGHT))).toEqual(before)
    expect(snap(tap(tap(answered, WRONG), RIGHT))).toEqual(before)
    expect(tap(answered, RIGHT).taps).toBe(1)
  })

  it("TC-SES-03: buffer không nhân thưởng — retry rồi bấm hợp lệ chỉ tăng taps ĐÚNG 1 (taps = 2)", () => {
    const bad = resolve(tap(ready(), WRONG), SPY.fn)
    const buffered = retry(tap(tap(bad, RIGHT), WRONG))
    expect(snap(buffered)).toEqual(want({ phase: "ready", taps: 1, misses: 1, lastWrong: WRONG }))
    const solved = resolve(tap(buffered, RIGHT), SPY.fn)
    expect(snap(solved)).toEqual(want({ phase: "correct", taps: 2, misses: 1, lastWrong: WRONG, nextSpec: NEXT_JSON }))
  })

  it("TC-ERR-06 / TC-SES-03: tap ở loading/correct/next cũng buffer nguyên trạng (taps không đổi)", () => {
    for (const p of ["loading", "correct", "next"] as const) {
      expect(snap(tap(S[p], WRONG))).toEqual(snap(S[p]))
      expect(snap(tap(S[p], RIGHT))).toEqual(snap(S[p]))
    }
  })

  it.each([-1, 4, NaN])("TC-ERR-01 / PC-03: tap(state, %p) ở ready => NÉM vì option ngoài 0..3", (bad) => {
    const r = ready()
    expect(() => tap(r, bad)).toThrow(/tap/i)
    expect(snap(r)).toEqual(want({ phase: "ready" }))
  })

  it("TC-SES-04: resolve đúng gọi makeNext ĐÚNG 1 lần, nextSpec có sẵn ngay ở correct; tới next vẫn 1 lần", () => {
    const spy = counter()
    const solved = resolve(tap(ready(), RIGHT), spy.fn)
    expect(spy.calls()).toBe(1)
    expect(snap(solved)).toEqual(want({ phase: "correct", taps: 1, nextSpec: NEXT_JSON }))
    const nxt = nextLevel(solved)
    expect(spy.calls()).toBe(1)
    expect(snap(nxt)).toEqual(want({ phase: "next", taps: 1, nextSpec: NEXT_JSON }))
  })

  it("TC-SES-04: resolve ở đáp án SAI không gọi makeNext (0 lần) và nextSpec vẫn null", () => {
    const spy = counter()
    const bad = resolve(tap(ready(), WRONG), spy.fn)
    expect(spy.calls()).toBe(0)
    expect(snap(bad)).toEqual(want({ phase: "wrong", taps: 1, misses: 1, lastWrong: WRONG }))
  })

  it("TC-SES-05: advanceClock chỉ cộng elapsedMs — không đổi phase, không phạt, đi được ở cả 6 phase", () => {
    for (const p of PHASE_TABLE) {
      const st = S[p]
      expect(snap(advanceClock(st, 999999))).toEqual({ ...snap(st), elapsedMs: st.elapsedMs + 999999 })
    }
    expect(snap(advanceClock(ready(), 0))).toEqual(snap(ready()))
    const summed = advanceClock(advanceClock(ready(), 1500), 250)
    expect(snap(summed)).toEqual(want({ phase: "ready", elapsedMs: 1750 }))
  })

  it("TC-SES-05: đề bật timer, advanceClock 10 phút vẫn ready với misses 0 — transition không tự phạt", () => {
    const tReady = markReady(initialLevelState(T_SPEC))
    expect(snap(tReady)).toEqual({ ...want({ phase: "ready" }), spec: serializeSpec(T_SPEC) })
    expect(snap(advanceClock(tReady, 600000))).toEqual({ ...snap(tReady), elapsedMs: 600000 })
  })

  it("TC-SES-05 + ERR: advanceClock(-5 | -1 | NaN) => NÉM, thông báo nêu tên transition", () => {
    for (const ms of [-5, -1, NaN]) expect(() => advanceClock(ready(), ms)).toThrow(/advanceClock/i)
  })

  it("TC-SES-06 / PC-02: cả màn là breakpoint — cùng chuỗi action suy lại ĐÚNG dãy state", () => {
    const once = walk(CHAIN).map(snap)
    expect(walk(CHAIN).map(snap)).toEqual(once)
    expect(walk(CHAIN, goodSpec()).map(snap)).toEqual(once) // LevelSpec cùng giá trị nhưng khác object
    expect(once.map((x) => x.phase)).toEqual(["loading", "ready", "ready", "answered", "wrong", "ready", "answered", "correct", "next"])
    expect(once[0]).toEqual(want({ phase: "loading" }))
    expect(once[4]).toEqual(want({ phase: "wrong", taps: 1, misses: 1, elapsedMs: 1500, lastWrong: WRONG }))
    expect(once[7]).toEqual(want({ phase: "correct", taps: 2, misses: 1, elapsedMs: 1500, lastWrong: WRONG, nextSpec: NEXT_JSON }))
    expect(once[8]).toEqual(want({ phase: "next", taps: 2, misses: 1, elapsedMs: 1500, lastWrong: WRONG, nextSpec: NEXT_JSON }))
  })

  it("TC-SES-06: mọi transition là hàm THUẦN — không mutate state, không mutate LevelSpec đầu vào", () => {
    const before = snap(S.ready)
    const specJson = serializeSpec(SPEC)
    const after = tap(S.ready, WRONG)
    expect(after).not.toBe(S.ready)
    expect(snap(S.ready)).toEqual(before)
    expect(serializeSpec(SPEC)).toBe(specJson)
    const back = retry(resolve(after, SPY.fn))
    expect(back).not.toBe(S.ready)
    expect(snap(S.ready)).toEqual(before)
  })
})
