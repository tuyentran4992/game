// ============================================================================
// hint-undo.test.ts — B1b NỬA A: hai dụng thuật trong màn (hint + undo) trên levelState.
// Module src/logic/levelState.ts chưa tồn tại => CẢ FILE PHẢI ĐỎ vì lỗi resolve import.
//
// HỢP ĐỒNG ĐƯỢC CHỐT Ở ĐÂY (pack B1b mục 2):
//   useHint(state)  : chỉ từ ready; tối đa 1 lần/màn; lần 2 là NO-OP nguyên trạng (TC-STR-04)
//   peekFold(state) : null khi chưa bật hint; sau khi bật hint trả VỀ ĐÚNG MỘT foldIndex
//                     (số nguyên trong 0..folds.length-1) và không được lộ ô đáp án (TC-STR-06)
//   explainKey      : ID nội bộ nằm trong bảng 4 giá trị, KHÔNG phải chuỗi hiển thị (PC-19)
//   useUndo(state)  : chỉ từ wrong; tối đa 1 lần/màn; rollback lượt bấm sai nên firstTry còn
//                     nguyên — khác đường retry (misses tăng) (TC-STR-07 / TC-ERR-13)
//   ERR: transition dụng thuật gọi SAI phase => NÉM, thông báo chứa TÊN transition.
//
// Dấu † = tên/kiểu hoặc bộ giá trị SUY RA, chưa thấy chép nguyên văn trong pack. Nếu pack chốt
// khác thì sửa ĐÚNG MỘT chỗ có dấu †, không rải ra từng case.
// ============================================================================

import { describe, expect, it } from "vitest"
import type { LevelSpec } from "../../src/logic/types"
import type { LevelState } from "../../src/logic/levelState"
import {
  initialLevelState,
  markReady,
  nextLevel,
  peekFold,
  resolve,
  retry,
  tap,
  useHint,
  useUndo,
} from "../../src/logic/levelState"
import { FIX_ANSWER, FIX_D1, FIX_D2, FIX_D3, goodSpec, mkSpec, serializeSpec } from "./helpers"

/** †† BẢNG 4 ID giải thích (PC-19) — danh sách ĐỘC NHẤT của file, sửa 1 dòng nếu pack khác. */
const EXPLAIN_KEYS = ["fold-axis-swapped", "fold-layer-count", "punch-on-crease", "cut-corner-shape"]
/** PC-19: ID phải là token kebab, không phải câu chữ hiển thị. */
const ID_SHAPE = /^[a-z0-9]+([-a-z0-9])*$/

const SPEC = goodSpec() // folds [H,V] => foldIndex hợp lệ là 0 và 1
const SPEC_JSON = serializeSpec(SPEC)
const RIGHT = 0
const WRONG = 1
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
  spec: SPEC_JSON,
  taps: 0,
  misses: 0,
  hintUsed: false,
  undoUsed: false,
  elapsedMs: 0,
  lastWrong: null,
  nextSpec: null,
}
const want = (over: Partial<Snap>): Snap => ({ ...ZERO, ...over })

/** makeNext giả có con đếm — dùng cho resolve; ở file này chỉ cần nó ĐƯỢC gọi đúng 0/1 lần. */
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
const SPY = counter()

const ready = (): LevelState => markReady(initialLevelState(SPEC))

/** †† BẢNG PHASE VIẾT TAY (6 giá trị) — giữ đúng danh sách của pack, không dẫn xuất từ src. */
type Phase = "loading" | "ready" | "answered" | "correct" | "wrong" | "next"
const ALL_PHASES: readonly Phase[] = ["loading", "ready", "answered", "correct", "wrong", "next"]
/** 5 phase mà useHint bị cấm (hint chỉ ở ready). */
const NO_HINT_PHASES: readonly Phase[] = ["loading", "answered", "wrong", "correct", "next"]
/** 5 phase mà useUndo bị cấm (undo chỉ ở wrong). */
const NO_UNDO_PHASES: readonly Phase[] = ["loading", "ready", "answered", "correct", "next"]

/** State theo từng phase (chưa dùng hint/undo) — dựng bằng transition công khai. */
function sampleStates(): Record<Phase, LevelState> {
  const loading = initialLevelState(SPEC)
  const rdy = markReady(loading)
  const answered = tap(rdy, WRONG)
  const wrong = resolve(answered, SPY.fn)
  const correct = resolve(tap(rdy, RIGHT), SPY.fn)
  return { loading, ready: rdy, answered, wrong, correct, next: nextLevel(correct) }
}
const S = sampleStates()

describe("hint + undo trên levelState (B1b nửa A)", () => {
  it("TC-STR-04: hint ở ready chỉ bật hintUsed — không đổi phase/taps/misses/elapsedMs/undoUsed", () => {
    const r = ready()
    const h = useHint(r)
    expect(snap(h)).toEqual(want({ phase: "ready", hintUsed: true }))
    expect(snap(r)).toEqual(want({ phase: "ready" }))
  })

  it("TC-STR-04 / PC-19: explainKey của hint là ID nằm trong bảng 4 giá trị, không phải chuỗi hiển thị", () => {
    const key = useHint(ready()).explainKey
    expect(key).not.toBeNull()
    expect(EXPLAIN_KEYS).toContain(key)
    expect(ID_SHAPE.test(String(key))).toBe(true)
    expect(String(key).length).toBeLessThanOrEqual(32)
    expect(snap(useHint(ready()))).toEqual(snap(useHint(useHint(ready()))))
  })

  it("TC-STR-04: hint lần thứ 2 trong cùng màn là NO-OP — state trả về giống hệt", () => {
    const h1 = useHint(ready())
    const h2 = useHint(h1)
    expect(snap(h2)).toEqual(snap(h1))
    expect(h2.hintUsed).toBe(true)
    expect(peekFold(h2)).toBe(peekFold(h1))
    expect(h2.explainKey).toBe(h1.explainKey)
  })

  it("TC-STR-04 + ERR: useHint ngoài phase ready => NÉM, thông báo nêu tên transition", () => {
    for (const p of NO_HINT_PHASES) expect(() => useHint(S[p])).toThrow(/useHint/i)
  })

  it("TC-STR-06: bật hint rồi thì peekFold trả về ĐÚNG MỘT foldIndex trong 0..folds.length-1", () => {
    const h = useHint(ready())
    const f = peekFold(h)
    expect(f).not.toBeNull()
    expect(Array.isArray(f)).toBe(false)
    const k = f as number
    expect(typeof k).toBe("number")
    expect(Number.isInteger(k)).toBe(true)
    expect(k).toBeGreaterThanOrEqual(0)
    expect(k).toBeLessThan(SPEC.folds.length)
    expect(peekFold(h)).toBe(k)
    expect(peekFold(h)).toBe(peekFold(useHint(h)))
  })

  it("TC-STR-06: chưa bật hint thì peekFold null ở mọi phase (kể cả sau retry)", () => {
    for (const p of ALL_PHASES) expect(peekFold(S[p])).toBeNull()
    expect(peekFold(retry(S.wrong))).toBeNull()
  })

  it("TC-STR-06 / PC-19: hint không lộ đáp án — 2 đề cùng folds, khác ô đúng, cho cùng peekFold + explainKey", () => {
    const specA = mkSpec([FIX_ANSWER, FIX_D1, FIX_D2, FIX_D3], 0)
    const specB = mkSpec([FIX_ANSWER, FIX_D1, FIX_D2, FIX_D3], 2)
    expect(serializeSpec(specA)).not.toBe(serializeSpec(specB))
    const hA = useHint(markReady(initialLevelState(specA)))
    const hB = useHint(markReady(initialLevelState(specB)))
    expect(peekFold(hA)).toBe(peekFold(hB))
    expect(hA.explainKey).toBe(hB.explainKey)
    expect(snap(hA)).toEqual(want({ phase: "ready", hintUsed: true, spec: serializeSpec(specA) }))
    expect(snap(hB)).toEqual(want({ phase: "ready", hintUsed: true, spec: serializeSpec(specB) }))
  })

  it("TC-STR-07: undo chỉ đi từ wrong — về ready, rollback lượt bấm sai, giữ hintUsed và spec", () => {
    const h = useHint(ready())
    const bad = resolve(tap(h, WRONG), SPY.fn)
    expect(snap(bad)).toEqual(want({ phase: "wrong", taps: 1, misses: 1, hintUsed: true, lastWrong: WRONG }))
    const u = useUndo(bad)
    expect(snap(u)).toEqual(want({ phase: "ready", hintUsed: true, undoUsed: true }))
    expect(serializeSpec(u.spec)).toBe(SPEC_JSON)
    expect(peekFold(u)).toBe(peekFold(h))
  })

  it("TC-STR-07: undo lần 2 trong cùng màn bị từ chối — dù đang ở wrong", () => {
    const bad1 = resolve(tap(ready(), WRONG), SPY.fn)
    const u = useUndo(bad1)
    const bad2 = resolve(tap(u, WRONG), SPY.fn)
    expect(snap(bad2)).toEqual(want({ phase: "wrong", taps: 1, misses: 1, undoUsed: true, lastWrong: WRONG }))
    expect(() => useUndo(bad2)).toThrow(/useUndo/i)
  })

  it("TC-STR-07 + ERR: useUndo ngoài phase wrong => NÉM, thông báo nêu tên transition", () => {
    for (const p of NO_UNDO_PHASES) expect(() => useUndo(S[p])).toThrow(/useUndo/i)
  })

  it("TC-ERR-13: hint + undo rồi trả lời đúng thì firstTry còn nguyên (misses 0), khác hẳn đường retry (misses 1)", () => {
    const h = useHint(ready())
    const bad = resolve(tap(h, WRONG), SPY.fn)
    const solved = resolve(tap(useUndo(bad), RIGHT), SPY.fn)
    expect(snap(solved)).toEqual(want({ phase: "correct", taps: 1, misses: 0, hintUsed: true, undoUsed: true, nextSpec: NEXT_JSON }))
    const viaRetry = resolve(tap(retry(bad), RIGHT), SPY.fn)
    expect(snap(viaRetry)).toEqual(want({ phase: "correct", taps: 2, misses: 1, hintUsed: true, lastWrong: WRONG, nextSpec: NEXT_JSON }))
  })
})
