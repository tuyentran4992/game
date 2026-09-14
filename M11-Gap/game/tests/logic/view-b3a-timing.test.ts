// ============================================================================
// view-b3a-timing.test.ts — B3a (nửa 2): LỊCH ĐỘNG MỞ BUNG + nhịp breathe +
// bảng gate input/disabled + kỷ luật timer.
//
// ĐỐI TƯỢNG TEST: src/render/anim/unfoldPlan.ts + src/render/scenes/PlayScene.ts.
// Hai file đó CHƯA TỒN TẠI ở thời điểm viết file này ⇒ toàn bộ suite RED CÓ CHỦ ĐÍCH
// (TDD: test là hợp đồng, code B3a viết ra để đáp ứng).
//
// ---------------------------------------------------------------------------
// HỢP ĐỒNG TÔI ĐẶT RA (code B3a PHẢI theo đúng tên + kiểu; reviewer đối chiếu PlayScene):
//
//   export type UnfoldOpts = {
//     readonly layers: number   // số lớp giấy = 2^số nếp. Chiến dịch chỉ có 4 | 8.
//     readonly holes: number    // số lỗ hiện dần khi mở. 1..8.
//     readonly wrong: boolean   // false = bản đúng, true = bản GIẢI THÍCH (PC-L-03)
//   }
//   export type UnfoldPlan = {          // echo input + các mốc ms, KHÔNG có hàm phụ
//     readonly layers: number
//     readonly holes: number
//     readonly wrong: boolean
//     readonly layerWaitMs: number      // (layers-1)*DUR.layerStep + DUR.head   (DS:120)
//     readonly holesStaggerMs: number   // = DUR.holeStagger = 60                (DS:121)
//     readonly popMs: number            // = DUR.pop = 250                       (DS:121)
//     readonly explainMs: number        // wrong: DUR.sweep+DUR.blend = 700 (DS:122); đúng: 0
//     readonly totalMs: number          // đúng: layerWait + (holes-1)*stagger + pop
//                                     // sai : layerWait + explain (KHÔNG chạy pop song song)
//   }
//   export function unfoldTimeline(opts: UnfoldOpts): UnfoldPlan | null
//        // null cho input bẩn (layers không phải luỹ thừa 2 trong dải 2..2^MAX_CHAIN_LEN,
//        //  hoặc holes ∉ 1..MAX_HOLES) — KHÔNG BAO GIỜ ném.
//   export const MAX_LAYERS / MAX_HOLES: number   // trần DẪN XUẤT từ logic (chainTable)
//   export const RENDER_PHASES: readonly RenderPhase[]   // liệt kê từ CHÍNH bảng gate
//   export function holeBudget(count: number): { shown: number; hidden: number }
//   export const DUR: Readonly<{ head: 140; layerStep: 110; holeStagger: 60; pop: 250;
//                                sweep: 500; blend: 200; fast: number /* ≤150 */ }>
//   export type BreathPlan = {
//     readonly scaleFrom: number; readonly scaleTo: number; readonly yoyoMs: number
//     readonly repeat: number; readonly idleGateMs: number; readonly teachOnly: boolean
//   }
//   export function breathPlan(): BreathPlan
//   export type RenderPhase = 'ready' | 'unfolding' | 'correct' | 'wrong'
//   export type OptionGate = { readonly enabled: boolean; readonly alpha: number; readonly buffer: 0 | 1 }
//   export const optionEnabledByState: Readonly<Record<RenderPhase, OptionGate>>
//   export const TOUCH: Readonly<{ alphaUnchosen: 0.45; alphaDisabled: 0.6;
//                                  tapScale: 1.03; shakeMaxPx: number /* ≤4 */ }>
//
// HÀNH VI CỦA SCENE (rect QA, nhãn, buffer thật, tờ giấy qua 2 màn, timer theo spec) KHÔNG
// đo bằng quét nguồn nữa — xem view-b3a-contract.test.ts, file đó DỰNG scene thật (C2/A14).
//
// Vì sao các con số KHÔNG tự bịa — mọi giá trị expect có nguồn:
//   DS:120 (110ms/lớp + 140ms đầu) · DS:121 (pop 250, so le 60) · DS:122 (500+200, sàn 700)
//   DS:124 (6 số breathe) · DS:94-96 (alpha 0.45 / 0.6, scale 1.03) · DS:127 (shake ≤4px)
//   SPEC:78 (dải mở bung 0,7–0,9s) · SPEC:125 (breathe) · SPEC:248 + PC-05 (buffer)
//   PC-U-06 (phản hồi ≤150ms) · PC-17 (pause/lifecycle, không wall clock).
// Trace E2E ghi trực tiếp trên từng it(): PC-L-01..11, PC-O-03, PC-U-06.
// ============================================================================

import { describe, expect, it } from 'vitest'
import { levelConfigFor } from '../../src/logic/chapters'
import { CAMPAIGN } from '../../src/logic/progression'
import { MAX_CHAIN_LEN, MAX_PUNCH_COUNT } from '../../src/logic/chainTable'
import { CUT_MAX_SNIPS } from '../../src/logic/cutRegion'
import {
  applyOutcome, breathPlan, createInputBuffer, DUR, holeBudget, holePlan, isOpenPhase,
  MAX_HOLES, optionEnabledByState, outcomeOf, RENDER_BY_PHASE, RENDER_PHASES, TOUCH,
  unfoldPlan, unfoldTimeline, type RenderPhase,
} from '../../src/render/anim/unfoldPlan'
import type { LevelPhase, LevelState } from '../../src/logic/levelState'
import { initialLevelState } from '../../src/logic/levelState'
import type { LevelSpec } from '../../src/logic/types'
import { rat } from '../../src/logic/rational'

// ---------------------------------------------------------------------------
// BẢNG KỊCH BẢN (data, không if/else dây) — cột exp là SỐ ĐỌC TAY từ DS, không
// suy ra từ implementation (chống oracle tự tham chiếu).
// ---------------------------------------------------------------------------
type TimingCase = {
  readonly name: string
  readonly opts: { layers: number; holes: number; wrong: boolean }
  readonly exp: { layerWaitMs: number; totalMs: number }
  readonly trace: string
}

const TIMING_CASES: readonly TimingCase[] = [
  // 2 lớp = chương 1 (progression `layers: 2` -> chapters.ts:114 foldCount 1). C6: đây là 15
  // màn ĐẦU chiến dịch, lịch PHẢI dựng được — từng có lúc dải hợp lệ [4,8] bỏ rơi nó.
  // (2-1)*110 + 140 = 250 chờ lớp; 1 lỗ => + 250 pop = 500ms.
  {
    name: 'PC-L-01 layers=2 holes=1 đúng (chương 1) => 250 + pop 250 = 500ms',
    opts: { layers: 2, holes: 1, wrong: false },
    exp: { layerWaitMs: 250, totalMs: 500 },
    trace: 'PC-L-01 + PC-L-02 (15 màn dạy luật, gấp 1 nếp)',
  },
  // 4 lớp: (4-1)*110 + 140 = 470 (DS:120); 1 lỗ nên không có nhịp so le ⇒ 470 + 250 = 720.
  {
    name: 'PC-L-01 layers=4 holes=1 đúng => 470 + pop 250 = 720ms',
    opts: { layers: 4, holes: 1, wrong: false },
    exp: { layerWaitMs: 470, totalMs: 720 },
    trace: 'PC-L-01 (mở bung từng lớp 0,7–0,9s)',
  },
  // 8 lớp: (8-1)*110 + 140 = 910; 3 lỗ => lỗ cuối bắt đầu sau 2*60 = 120 rồi chạy pop 250.
  {
    name: 'PC-L-01 layers=8 holes=3 đúng => 910 + 2*60 + 250 = 1280ms',
    opts: { layers: 8, holes: 3, wrong: false },
    exp: { layerWaitMs: 910, totalMs: 1280 },
    trace: 'PC-L-01 + PC-L-11 (chương sâu gấp 8 lớp, 2-3 lỗ)',
  },
  // 16 lớp = trần chainTable (MAX_CHAIN_LEN = 4 nếp 'DHVH'). C9: từng rơi khỏi dải hợp lệ.
  // 16 lớp: (16-1)*110 + 140 = 1790; 8 lỗ => lỗ cuối bắt đầu sau 7*60 = 420 rồi chạy pop 250.
  {
    name: 'PC-L-01 layers=16 (trần hình học) holes=8 => 1790 + 7*60 + 250 = 2460ms',
    opts: { layers: 16, holes: 8, wrong: false },
    exp: { layerWaitMs: 1790, totalMs: 2460 },
    trace: 'PC-L-01 + PC-L-11 (trần gấp của logic cũng phải có hoạt cảnh)',
  },
  // Nhánh giải thích: đường chờ lớp giữ nguyên, phần đuôi là vệt sáng 500 + 200 blend (DS:122).
  {
    name: 'PC-L-03 layers=4 wrong => 470 + explain 700 = 1170ms',
    opts: { layers: 4, holes: 1, wrong: true },
    exp: { layerWaitMs: 470, totalMs: 1170 },
    trace: 'PC-L-03 (bản giải thích khi chọn sai)',
  },
]

const DIRTY_CASES: readonly { name: string; opts: { layers: number; holes: number; wrong: boolean } }[] = [
  { name: 'layers=0', opts: { layers: 0, holes: 1, wrong: false } },
  { name: 'layers=5 (không phải 2^nếp của chiến dịch)', opts: { layers: 5, holes: 1, wrong: false } },
  { name: 'layers=9 (lẻ)', opts: { layers: 9, holes: 1, wrong: false } },
  { name: 'holes=0', opts: { layers: 4, holes: 0, wrong: false } },
  { name: 'holes=-2', opts: { layers: 4, holes: -2, wrong: false } },
  { name: 'holes=vượt trần dẫn xuất MAX_HOLES', opts: { layers: 4, holes: MAX_HOLES + 1, wrong: false } },
  { name: 'holes=0 ở nhánh wrong', opts: { layers: 8, holes: 0, wrong: true } },
]

describe('B3a — lịch mở bung unfoldTimeline (DS:120-122)', () => {
  it('bảng hằng số lịch: head 140 · layerStep 110 · holeStagger 60 · pop 250 · sweep 500 · blend 200 (DS:120-122)', () => {
    expect(DUR).toEqual({
      head: 140,
      layerStep: 110,
      holeStagger: 60,
      pop: 250,
      sweep: 500,
      blend: 200,
      fast: expect.any(Number),
    })
  })

  for (const c of TIMING_CASES) {
    it(c.name + ' [' + c.trace + ']', () => {
      const p = unfoldTimeline(c.opts)
      expect(p).not.toBeNull()
      const plan = p as NonNullable<typeof p>
      expect(plan.layerWaitMs).toBe(c.exp.layerWaitMs)
      expect(plan.totalMs).toBe(c.exp.totalMs)
      expect(plan.holesStaggerMs).toBe(60)
      expect(plan.popMs).toBe(250)
    })
  }

  // PC-O-03/L-01: mốc 720ms phải nằm trong dải SPEC:78 (0,7–0,9s) — đây là case "màn dạy luật".
  it('PC-L-01 tổng mở bung màn dạy luật ∈ dải 0,7–0,9s của SPEC:78', () => {
    const plan = unfoldTimeline({ layers: 4, holes: 1, wrong: false }) as NonNullable<
      ReturnType<typeof unfoldTimeline>
    >
    expect(plan.totalMs).toBe(720)
    expect(plan.totalMs).toBeGreaterThanOrEqual(700)
    expect(plan.totalMs).toBeLessThanOrEqual(900)
  })

  it('PC-L-01 đường chờ lớp PHẢI tính trước pop: 4 lớp 470 < 8 lớp 910 (DS:120, 110ms/lớp)', () => {
    const a = unfoldTimeline({ layers: 4, holes: 1, wrong: false })
    const b = unfoldTimeline({ layers: 8, holes: 1, wrong: false })
    expect(a?.layerWaitMs).toBe(470)
    expect(b?.layerWaitMs).toBe(910)
    // pop chỉ chạy SAU khi mở xong lớp ⇒ total hiệu đúng bằng hiệu đường chờ.
    expect((b?.totalMs ?? 0) - (a?.totalMs ?? 0)).toBe(440)
  })

  it('PC-L-01 3 lỗ so le 60ms: nhịp cuối bắt đầu ở 2*60 và holesStaggerMs === 60 (DS:121)', () => {
    const plan = unfoldTimeline({ layers: 8, holes: 3, wrong: false })
    expect(plan?.holesStaggerMs).toBe(60)
    expect(plan?.totalMs).toBe(1280)
    // bất biến lịch: total = chờ lớp + (holes-1)*so le + pop — 3 lỗ luôn chậm hơn 1 lỗ đúng 120ms.
    const one = unfoldTimeline({ layers: 8, holes: 1, wrong: false })
    expect((plan?.totalMs ?? 0) - (one?.totalMs ?? 0)).toBe(120)
  })

  it('PC-L-03 nhánh sai: explainMs = 500 + 200 = 700, CẤM dưới 700 (DS:122)', () => {
    const plan = unfoldTimeline({ layers: 4, holes: 1, wrong: true })
    expect(plan?.explainMs).toBe(700)
    expect(plan?.explainMs ?? 0).toBeGreaterThanOrEqual(700)
  })

  it('PC-L-03 sàn 700ms giữ nguyên ở màn 8 lớp 3 lỗ (không bị tỷ lệ theo input)', () => {
    const plan = unfoldTimeline({ layers: 8, holes: 3, wrong: true })
    expect(plan?.explainMs).toBe(700)
    expect(plan?.explainMs ?? 0).toBeGreaterThanOrEqual(700)
    expect(plan?.totalMs).toBe(910 + 700)
  })

  it('PC-L-01 bản ĐÚNG không chạy vệt giải thích: explainMs === 0', () => {
    expect(unfoldTimeline({ layers: 4, holes: 1, wrong: false })?.explainMs).toBe(0)
    expect(unfoldTimeline({ layers: 8, holes: 3, wrong: false })?.explainMs).toBe(0)
  })

  it('PC-L-01 plan là hàm THUẦN: cùng input ra đúng cùng kế hoạch, echo lại input', () => {
    const x = unfoldTimeline({ layers: 8, holes: 3, wrong: false })
    const y = unfoldTimeline({ layers: 8, holes: 3, wrong: false })
    expect(JSON.stringify(x)).toBe(JSON.stringify(y))
    expect(x).toMatchObject({ layers: 8, holes: 3, wrong: false })
  })

  for (const d of DIRTY_CASES) {
    it('input bẩn ' + d.name + ' => null + không ném (scene không crash)', () => {
      expect(() => unfoldTimeline(d.opts)).not.toThrow()
      expect(unfoldTimeline(d.opts)).toBeNull()
    })
  }
})

describe('B3a — nhịp breathe testid-hint-breath (DS:124, SPEC:125)', () => {
  it('PC-O-03 breathPlan() trả ĐÚNG 6 số của DS:124', () => {
    expect(breathPlan()).toEqual({
      scaleFrom: 1.0,
      scaleTo: 1.02,
      yoyoMs: 1200,
      repeat: 2,
      idleGateMs: 5000,
      teachOnly: true,
    })
  })

  it('PC-O-03 repeat=2 nghĩa là DỨT sau 2 nhịp: tổng hơi thở 2400ms và HỮU HẠN (không lặp vô hạn)', () => {
    const b = breathPlan()
    expect(b.repeat).toBe(2)
    expect(Number.isFinite(b.repeat)).toBe(true)
    expect(b.yoyoMs * b.repeat).toBe(2400)
    expect(b.idleGateMs).toBe(5000)
  })

  it('PC-O-03 biên độ thở nhỏ: scaleFrom 1.0 → scaleTo 1.02 (delta đúng 0,02) và teachOnly=true', () => {
    const b = breathPlan()
    expect(b.scaleFrom).toBe(1.0)
    expect(b.scaleTo).toBe(1.02)
    expect(b.scaleTo - b.scaleFrom).toBeCloseTo(0.02, 6)
    expect(b.teachOnly).toBe(true)
    // breathPlan là hàm THUẦN: 2 lời gọi xuất ra giống hệt (không đồng hồ, không random).
    expect(JSON.stringify(breathPlan())).toBe(JSON.stringify(b))
  })
})

describe('B3a — bảng gate input + buffer (PC-05, SPEC:248, DS:96)', () => {
  // DANH SÁCH pha là hợp đồng DS (4 pha), không lấy từ implementation (F8).
  const PHASES: readonly RenderPhase[] = ['ready', 'unfolding', 'correct', 'wrong']

  it('PC-L-05 bảng phủ đúng 4 phase render, không thừa không thiếu', () => {
    expect(Object.keys(optionEnabledByState).sort()).toEqual([...PHASES].sort())
  })

  it('A15: danh sách pha RENDER PHAT sinh tu chinh bang gate => them pha chi sua 1 dong', () => {
    expect(RENDER_PHASES).toEqual(PHASES)
    expect(RENDER_PHASES.length).toBe(4)
  })

  it('PC-05 ready: bấm được, alpha 1, không buffer (lượt ăn ngay)', () => {
    expect(optionEnabledByState.ready).toEqual({ enabled: true, alpha: 1, buffer: 0 })
  })

  it('PC-L-05 unfolding: 4 ô KHOÁ bấm (disabled alpha 0.6) nhưng buffer=1 — bấm không mất lượt', () => {
    expect(optionEnabledByState.unfolding).toEqual({ enabled: false, alpha: 0.6, buffer: 1 })
  })

  it('PC-05 correct/wrong: disabled, không còn buffer (kết quả đã chốt)', () => {
    expect(optionEnabledByState.correct).toEqual({ enabled: false, alpha: 1, buffer: 0 })
    expect(optionEnabledByState.wrong).toEqual({ enabled: false, alpha: 1, buffer: 0 })
  })

  it('PC-L-05 chỉ MỘT phase được buffer = 1 (đang animate)', () => {
    const withBuffer = PHASES.filter((ph) => optionEnabledByState[ph].buffer === 1)
    expect(withBuffer).toEqual(['unfolding'])
  })

  it('PC-L-05 chỉ MỘT phase mở cho bấm (enabled = true) và đó là ready', () => {
    expect(PHASES.filter((ph) => optionEnabledByState[ph].enabled)).toEqual(['ready'])
  })

  // 3b-stress C6: trước đây bộ giữ cú bấm là code chết (không ai take()). Đây là hợp đồng
  // của chính nó — scene nối vào paint()/answer() được đo bằng RUNTIME ở view-b3a-contract.
  it('PC-05 bộ giữ cú bấm: hold rồi take trả đúng MỘT lần, reset là sạch', () => {
    const b = createInputBuffer()
    expect(b.take()).toBe(null)
    b.hold(2)
    expect(b.pending()).toBe(true)
    expect(b.take()).toBe(2)
    expect(b.take()).toBe(null)
    b.hold(0)
    expect(b.pending(), 'index 0 là cú bấm hợp lệ, không phải "không có gì"').toBe(true)
    b.reset()
    expect(b.pending()).toBe(false)
    expect(b.take()).toBe(null)
  })

  it('PC-05 hold sau là lần ăn kế tiếp (người chơi đổi ý, không phải hàng đợi)', () => {
    const b = createInputBuffer()
    b.hold(1)
    b.hold(3)
    expect(b.take()).toBe(3)
  })
})

describe('B3a — disabled state của ô (DS:94-96, DS:127, PC-U-06)', () => {
  it('PC-L-02 hai số mờ KHÁC NHAU, không gộp một: alphaUnchosen 0.45 · alphaDisabled 0.6', () => {
    expect(TOUCH.alphaUnchosen).toBe(0.45)
    expect(TOUCH.alphaDisabled).toBe(0.6)
    expect(TOUCH.alphaUnchosen).not.toBe(TOUCH.alphaDisabled)
  })

  it('PC-U-06 chạm: scale 1.03 (DS:95) · shake ≤ 4px (DS:127) · phản hồi ≤ 150ms qua DUR.fast', () => {
    expect(TOUCH.tapScale).toBe(1.03)
    expect(TOUCH.shakeMaxPx).toBeGreaterThan(0)
    expect(TOUCH.shakeMaxPx).toBeLessThanOrEqual(4)
    expect(DUR.fast).toBeGreaterThan(0)
    expect(DUR.fast).toBeLessThanOrEqual(150)
  })

  it('PC-U-04 ô mờ vẫn đọc được hình: cả hai alpha nằm trong (0,1) và lớn hơn 0.4', () => {
    expect(TOUCH.alphaUnchosen).toBeGreaterThan(0.4)
    expect(TOUCH.alphaUnchosen).toBeLessThan(1)
    expect(TOUCH.alphaDisabled).toBeGreaterThan(0.4)
    expect(TOUCH.alphaDisabled).toBeLessThan(1)
  })
})

// ---------------------------------------------------------------------------
// PHẦN moved-từ-view-b3a-geometry: bảng MỐC TỪNG LỚP + lịch lỗ + nhịp thở.
// Số đọc tay từ DS:120/121/124 (110/140 · 60/250 · 1200/2), không suy từ DUR.
// ---------------------------------------------------------------------------
const startsOf = (p: readonly { startMs: number }[]): number[] => p.map((l) => l.startMs)
const endsOf = (p: readonly { endMs: number }[]): number[] => p.map((l) => l.endMs)

describe('B3a — mốc từng lớp unfoldPlan(layers) (DS:120) - neo PC-L-01', () => {
  it('4 lớp => đúng 4 dòng, mốc tuyệt đối [0,110,220,330], mỗi lớp 140ms => chốt 470ms', () => {
    const plan = unfoldPlan(4)
    expect(plan.length, 'số dòng = số lớp').toBe(4)
    expect(plan.map((l) => l.index)).toEqual([0, 1, 2, 3])
    expect(startsOf(plan)).toEqual([0, 110, 220, 330])
    expect(endsOf(plan)).toEqual([140, 250, 360, 470])
    expect(plan[3].totalMs).toBe(3 * 110 + 140)
  })

  it('8 lớp => 7*110+140 = 910ms ~ 0,9s; 8 dòng; lớp NGOÀI CÙNG mốc 0 (mở trước)', () => {
    const plan = unfoldPlan(8)
    expect(plan.length).toBe(8)
    expect(startsOf(plan)).toEqual([0, 110, 220, 330, 440, 550, 660, 770])
    expect(plan[0].startMs).toBe(0)
    expect(plan[7].endMs).toBe(910)
    expect(plan[7].totalMs).toBe((8 - 1) * 110 + 140)
  })

  it('16 lớp (trần chainTable) cũng có mốc riêng: 15*110+140 = 1790ms — không rơi khỏi lịch', () => {
    const plan = unfoldPlan(16)
    expect(plan.length).toBe(16)
    expect(plan[15].startMs).toBe(15 * 110)
    expect(plan[15].totalMs).toBe(1790)
  })

  it('mọi dòng tự chứa hằng số bảng (110/140/60) + ease-out => scene không hardcode số rải rác', () => {
    for (const l of unfoldPlan(8)) {
      expect(l.layerDelayMs).toBe(110)
      expect(l.layerDurMs).toBe(140)
      expect(l.holeStaggerMs).toBe(60)
      expect(l.endMs - l.startMs).toBe(140)
      expect(l.ease, 'DS:120 ghi rõ ease-out').toBe('easeOut')
    }
    expect(new Set(unfoldPlan(8).map((l) => l.totalMs)).size).toBe(1)
  })

  it('1 lớp => 1 dòng [0,140]: công thức (n-1)*110+140 chạy đều, không ngoại lệ cứng', () => {
    const plan = unfoldPlan(1)
    expect(plan.length).toBe(1)
    expect(startsOf(plan)).toEqual([0])
    expect(endsOf(plan)).toEqual([140])
    expect(plan[0].totalMs).toBe(140)
  })

  it('0 lớp => lịch rỗng, KHÔNG ném (đề chỉ cắt góc vẫn vẽ được)', () => {
    expect(unfoldPlan(0)).toEqual([])
  })

  it('hàm THUẦN: 2 lần gọi cùng input cho lịch y hệt (PC-B-04 reload + PC-02 seed)', () => {
    expect(JSON.stringify(unfoldPlan(4))).toBe(JSON.stringify(unfoldPlan(4)))
    expect(unfoldPlan(4)).toEqual(unfoldPlan(6).slice(0, 4))
  })
})

describe('B3a — lịch hiện lỗ holePlan (DS:121) - neo PC-L-01 "lỗ hiện dần, không bập"', () => {
  it('4 lỗ => so le ĐÚNG 60ms, mỗi lỗ scale 250ms; start [0,60,120,180] end [250,310,370,430]', () => {
    const plan = holePlan(4)
    expect(plan.length).toBe(4)
    expect(startsOf(plan)).toEqual([0, 60, 120, 180])
    expect(endsOf(plan)).toEqual([250, 310, 370, 430])
    expect(plan.every((h) => h.durMs === 250)).toBe(true)
  })

  it('8 lỗ => dòng cuối bắt đầu 7*60 = 420ms, kết 670ms; số dòng = số lỗ', () => {
    const plan = holePlan(8)
    expect(plan.length).toBe(8)
    expect(plan[7].startMs).toBe(7 * 60)
    expect(plan[7].endMs).toBe(7 * 60 + 250)
  })

  it('1 lỗ => không có so le nhưng vẫn pop 250ms (đừng nhân stagger cho lỗ duy nhất)', () => {
    const plan = holePlan(1)
    expect(startsOf(plan)).toEqual([0])
    expect(plan[0].durMs).toBe(250)
    expect(plan[0].endMs).toBe(250)
  })

  it('0 lỗ => lịch rỗng, không ném', () => {
    expect(holePlan(0)).toEqual([])
  })
})

describe('B3a — trần vẽ lỗ holeBudget (C9: cắt thì PHẢI nói ra)', () => {
  const BUDGET_CASES: readonly { n: number; shown: number; hidden: number }[] = [
    { n: 0, shown: 0, hidden: 0 },
    { n: 1, shown: 1, hidden: 0 },
    { n: MAX_HOLES, shown: MAX_HOLES, hidden: 0 },
    // Vượt trần thì PHẢI có hidden — các dòng dưới viết theo số ĐẾM ĐƯỢC, không theo 9/16
    // của bản hardcode cũ (review F1: trần 8 khiến hai ô khác nhau render y hệt nhau).
    { n: MAX_HOLES + 1, shown: MAX_HOLES, hidden: 1 },
    { n: MAX_HOLES + 8, shown: MAX_HOLES, hidden: 8 },
    { n: -3, shown: 0, hidden: 0 },
  ]

  it('MAX_HOLES là hiệu của hai Trần logic (điểm đục + nhát cắt) × số lớp — không phải số tự đặt', () => {
    expect(MAX_HOLES, 'trần lỗ phải suy từ chainTable + cutRegion').toBe(
      (MAX_PUNCH_COUNT + CUT_MAX_SNIPS) * 2 ** MAX_CHAIN_LEN,
    )
    expect(MAX_HOLES, 'trần cũ 8 từng cắt lỗ của chương 7-8').toBeGreaterThan(8)
  })

  for (const c of BUDGET_CASES) {
    it('holeBudget(' + c.n + ') => shown ' + c.shown + ' · hidden ' + c.hidden, () => {
      expect(holeBudget(c.n)).toEqual({ shown: c.shown, hidden: c.hidden })
    })
  }

  it('shown + hidden == input (không có lỗ nào biến mất không ai biết)', () => {
    for (let n = 0; n <= 24; n += 1) {
      const b = holeBudget(n)
      expect(b.shown + b.hidden).toBe(Math.max(0, n))
    }
  })
})

// ---------------------------------------------------------------------------
// C6 + C9: toàn bộ 120 màn của chiến dịch PHẢI có hoạt cảnh mở bung. Trước vòng sửa này,
// LEGAL_LAYERS = [4,8] trong khi chương 1 chỉ 2 lớp => 15/120 màn đứng tờ giấy, và trần
// hình học 16 lớp cũng rơi khỏi dải. Bảng dưới dựng ĐÚNG cấu hình mà logic sinh ra.
// ---------------------------------------------------------------------------
const CAMPAIGN_TABLE: readonly Record<string, unknown>[] = CAMPAIGN.map((row) => ({
  chapter: row.chapter,
  layers: row.layers,
  timer: row.timer,
  levels: Array.from({ length: row.levels }, (_, i) => ({ level: i + 1 })),
}))

describe('B3a — dải lịch phủ toàn chiến dịch 120 màn (C6 + C9, PC-L-01)', () => {
  const rows = Array.from({ length: 120 }, (_, i) => levelConfigFor(CAMPAIGN_TABLE, i + 1))

  it('số lớp của MỌI màn nằm trong bậc thang lịch (2..2^MAX_CHAIN_LEN) => unfoldPlan != rỗng', () => {
    for (const cfg of rows) {
      const layers = 2 ** cfg.foldCount
      expect(layers, 'foldCount ' + cfg.foldCount).toBeLessThanOrEqual(2 ** MAX_CHAIN_LEN)
      expect(unfoldPlan(layers).length, 'lịch lớp của ' + layers).toBe(layers)
      expect(holePlan(1).length).toBe(1)
    }
  })

  it('chương 1 (layers: 2 -> 2 lớp) CÓ lịch mở bung, không còn plan=null (C6: 15 màn đầu)', () => {
    const ch1 = rows[0]
    expect(ch1, 'chương 1 phải cần đúng 1 nếp').toMatchObject({ chapter: 1, foldCount: 1 })
    const plan = unfoldTimeline({ layers: 2 ** ch1.foldCount, holes: 1, wrong: false })
    expect(plan, 'màn 1 không được mất hoạt cảnh').not.toBeNull()
    expect(plan?.layerWaitMs).toBe(250)
  })

  it('mọi màn, cả 2 nhánh đúng/sai, đều dựng được timeline với số lỗ đã cắt theo budget', () => {
    for (const cfg of rows) {
      const layers = 2 ** cfg.foldCount
      const holes = holeBudget(cfg.punchCount * layers).shown
      for (const wrong of [false, true]) {
        const plan = unfoldTimeline({ layers, holes: Math.max(1, holes), wrong })
        expect(plan, 'layer ' + cfg.chapter + '/' + cfg.levelInChapter).not.toBeNull()
        expect(plan?.totalMs).toBeGreaterThan(0)
      }
    }
  })

  it('trần lỗ của lịch = MAX_HOLES và budget không cắt âm thầm trong dải 1..MAX_HOLES', () => {
    for (let n = 1; n <= MAX_HOLES; n += 1) expect(holeBudget(n).hidden).toBe(0)
    expect(holeBudget(MAX_HOLES + 1).hidden).toBe(1)
  })
})

describe('B3a — bảng pha vẽ + phần thưởng chốt lượt (A15 · PC-09 · PC-13)', () => {
  const MACHINE_PHASES: readonly LevelPhase[] = ['loading', 'ready', 'answered', 'correct', 'wrong', 'next']

  it('mỗi pha của máy ánh xạ tới MỘT pha vẽ có thật trong bảng gate (thêm pha = 1 dòng)', () => {
    for (const ph of MACHINE_PHASES) {
      const render = RENDER_BY_PHASE[ph]
      expect(RENDER_PHASES, ph + ' -> ' + render).toContain(render)
      expect(optionEnabledByState[render], 'thiếu gate cho ' + render).toBeDefined()
    }
  })

  it('pha đúng/next là lúc tờ giấy đã mở; chỉ ready là còn gói giấy (PC-U-04 rect hole)', () => {
    expect(RENDER_PHASES.filter(isOpenPhase)).toEqual(['unfolding', 'correct', 'wrong'])
    expect(isOpenPhase('ready')).toBe(false)
  })

  it('PC-09/PC-13: chỉ ĐÚNG/SAI có phần thưởng; correct thì commit, wrong thì không', () => {
    expect(outcomeOf('correct')).toEqual({ fx: 'correct', shake: false, commit: true })
    expect(outcomeOf('wrong')).toEqual({ fx: 'wrong', shake: true, commit: false })
    for (const ph of ['loading', 'ready', 'answered', 'next'] as const) {
      expect(outcomeOf(ph), 'pha ' + ph).toBeUndefined()
    }
  })

  it('applyOutcome gọi đúng bộSink cho một lượt sai rồi một lượt đúng (không commit 2 lần)', () => {
    const fx: string[] = []
    const commits: number[] = []
    let shakes = 0
    const sinks = {
      fx: (k: string) => { fx.push(k) },
      shake: () => { shakes += 1 },
      commit: (r: { level: number }) => { commits.push(r.level) },
    }
    const spec = fixtureSpec(7)
    applyOutcome(withPhase(spec, 'wrong'), sinks)
    applyOutcome(withPhase(spec, 'correct'), sinks)
    applyOutcome(withPhase(spec, 'ready'), sinks)
    expect(fx).toEqual(['wrong', 'correct'])
    expect(shakes).toBe(1)
    expect(commits).toEqual([7])
  })
})

/** LevelSpec tối giản cho phần test bảng outcome (không cần đề thật — view chỉ đọc pha). */
function fixtureSpec(level: number): LevelSpec {
  const hole = [rat(1, 2), rat(1, 2)]
  return {
    seed: 'fixture-' + level,
    levelIndex: level,
    chapter: 1,
    folds: ['H'],
    action: { kind: 'punch', points: hole },
    answerHoles: hole,
    options: [0, 1, 2, 3].map((id) => ({ id, holes: id === 0 ? hole : [rat(1, 4), rat(1, 4)] })),
    correctIndex: 0,
    difficulty: 1,
    timerOn: false,
  }
}

function withPhase(spec: LevelSpec, phase: LevelPhase): LevelState {
  return { ...initialLevelState(spec), phase }
}