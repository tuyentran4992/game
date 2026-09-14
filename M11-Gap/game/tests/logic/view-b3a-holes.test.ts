// ============================================================================
// view-b3a-holes.test.ts — VÒNG SỬA B3a · review F1: tầng vẽ phải dựng ĐỦ lỗ.
//
// ĐỐI TƯỢNG: src/render/holeView.ts (trần vẽ DẪN XUẤT + quy tắc bán kính) và
//   src/render/layout.ts#holeField (ô vẽ lỗ của một phương án), đo trên 120 màn thật.
//
// VÌ SAU PHẢI ĐO TRÊN 120 MÀN: lỗi F1 không nổ ở chương 1 — nó nổ ở chương 7-8
//   (2 điểm đục × 8 lớp = 16 lỗ). Trần cũ hardcode 8 nên SheetView/OptionCard chỉ vẽ 8 lỗ
//   ĐẦU TIÊN: hai phương án khác nhau ở lỗ thứ 9..16 hiện lên TRÊN MÀN HÌNH y hệt nhau,
//   người chơi bấm đúng vẫn bị báo sai (PC-03 + PC-L-01 mất nghĩa dù logic vẫn đúng).
//
// ORACLE: bộ toạ độ px mà tầng vẽ sẽ đặt Arc (holeField × toNumber, làm tròn theo px),
//   tính chất phải có là "bốn ô của cùng một màn KHÔNG trùng hình" — không lấy
//   MAX_HOLES của implementation làm expected (phòng oracle tự tham chiếu).
// ============================================================================
import { describe, expect, it } from 'vitest'
import { levelSpec } from '../../src/logic/generator'
import { toNumber, toPoints } from '../../src/logic/rational'
import type { Rat } from '../../src/logic/types'
import { CUT_MAX_SNIPS } from '../../src/logic/cutRegion'
import { MAX_CHAIN_LEN, MAX_PUNCH_COUNT } from '../../src/logic/chainTable'
import { holeField, layoutOf } from '../../src/render/layout'
import { holeBudget, holeRadius, LAYER_LADDER, MAX_HOLES, MAX_LAYERS, type PoolRole } from '../../src/render/holeView'
import { CAMPAIGN_LEVELS, cfgCampaign, GAME_SEED } from './helpers'

/** Camera CỐ ĐỊNH của DESIGN-SPEC §4 (cột dọc 720×1420) — một cỡ để đo mật độ px tầng vẽ. */
const DESIGN = { w: 720, h: 1420 }
/** Trần của bản hardcode CŨ (8) — giữ ở đây để chứng minh phép đo dưới đây không rỗng. */
const LEGACY_CAP = 8

const SPECS = Array.from({ length: CAMPAIGN_LEVELS }, (_, i) =>
  levelSpec(GAME_SEED, i + 1, cfgCampaign(i + 1)))

/** Bộ px tầng vẽ sẽ dựng cho một tập lỗ (flat Rat[]), theo ô cạnh `side`. */
function drawnPx(coords: readonly Rat[], side: number): string[] {
  const pts = toPoints(coords)
  const budget = holeBudget(pts.length)
  return pts.slice(0, budget.shown).map((p) => Math.round(toNumber(p.x) * side) + ',' + Math.round(toNumber(p.y) * side)).sort()
}

/** Số lỗ mà một ô phải vẽ hiện ra (flat array ⇒ /2). */
const holeAmount = (coords: readonly Rat[]): number => coords.length / 2

const layout = layoutOf(DESIGN.w, DESIGN.h)
const SHEET_SIDE = layout.sheet.w
const CARD_SIDES = layout.options.map((b) => holeField(b).w)

describe('B3a/F1 — trần vẽ lỗ của một ô (holeView)', () => {
  it('MAX_HOLES DẪN XUẤT từ hai trần của logic, không phải hằng tự đặt ở tầng vẽ', () => {
    expect(MAX_LAYERS, 'số lớp trần = 2^chuỗi dài nhất').toBe(2 ** MAX_CHAIN_LEN)
    expect(LAYER_LADDER, 'bậc thang lớp phải phủ 1..MAX_CHAIN_LEN nếp').toEqual(
      Array.from({ length: MAX_CHAIN_LEN }, (_, i) => 2 ** (i + 1)))
    expect(MAX_HOLES, 'mọi nguồn lỗ (đục + cắt) × số lớp').toBe(
      (MAX_PUNCH_COUNT + CUT_MAX_SNIPS) * 2 ** MAX_CHAIN_LEN)
  })

  it('120 màn chiến dịch: KHÔNG có ô nào bị holeBudget ẩn lỗ (vẽ đủ — C9)', () => {
    for (const spec of SPECS) {
      const sets = [spec.answerHoles, ...spec.options.map((o) => o.holes)]
      for (const coords of sets) {
        const n = holeAmount(coords)
        expect(holeBudget(n).hidden, 'màn ' + spec.levelIndex + ' có ' + n + ' lỗ').toBe(0)
      }
    }
  })

  it('phép đo ở trên KHÔNG rỗng: có màn cần vẽ nhiều lỗ hơn trần cũ 8', () => {
    const counts = SPECS.flatMap((s) => [holeAmount(s.answerHoles), ...s.options.map((o) => holeAmount(o.holes))])
    const max = Math.max(...counts)
    expect(max, '120 màn toàn ≤8 lỗ ⇒ suite này đang test gió').toBeGreaterThan(LEGACY_CAP)
    expect(max).toBeLessThanOrEqual(MAX_HOLES)
  })
})

describe('B3a/F1 — 120 màn × 4 ô: không ô nào trùng hình trên màn hình', () => {
  it('bốn bộ px của bốn phương án ĐÔI MỘT KHÁC NHAU (kể cả tờ giấy đáp án)', () => {
    for (const spec of SPECS) {
      const sides = spec.options.map((o, i) => drawnPx(o.holes, CARD_SIDES[i]))
      for (let a = 0; a < sides.length; a++) {
        for (let b = a + 1; b < sides.length; b++) {
          expect(sides[b].join('|'), 'màn ' + spec.levelIndex + ' ô ' + a + '/' + b).not.toEqual(sides[a].join('|'))
        }
      }
    }
  })

  it('bộ px của ô đáp án ĐÚNG BẰNG bộ px tờ giấy vẽ khi mở bung (cùng dữ liệu, cùng trần)', () => {
    for (const spec of SPECS) {
      const paper = drawnPx(spec.answerHoles, SHEET_SIDE)
      const card = drawnPx(spec.options[spec.correctIndex].holes, CARD_SIDES[0])
      expect(paper.length, 'màn ' + spec.levelIndex + ' vẽ thiếu lỗ').toBe(card.length)
    }
  })
})

describe('B3a/F1 — mật độ: vẽ đủ lỗ mà lỗ vẫn đọc được (PC-U-04)', () => {
  it('đường kính × lưới lỗ nằm gọn trong ô, cả tờ giấy lẫn 4 ô, ở MỌI màn', () => {
    for (const spec of SPECS) {
      const rows: readonly (readonly [PoolRole, number, number])[] = [
        ['sheet', holeAmount(spec.answerHoles), SHEET_SIDE],
        ...spec.options.map((o, i) => ['card', holeAmount(o.holes), CARD_SIDES[i]] as const),
      ]
      for (const [role, n, side] of rows) {
        const r = holeRadius(role, n, side)
        const grid = Math.ceil(Math.sqrt(Math.max(1, n)))
        expect(r * 2 * grid, 'màn ' + spec.levelIndex + ' ' + n + ' lỗ trong ô ' + Math.round(side))
          .toBeLessThanOrEqual(side * 0.95)
        expect(r).toBeGreaterThanOrEqual(1)
      }
    }
  })

  it('holeRadius không tăng khi số lỗ tăng (đề dày hơn không được phình lỗ to hơn)', () => {
    let prev = Number.POSITIVE_INFINITY
    for (const n of [1, 2, 4, 8, 16, 32, 64, MAX_HOLES]) {
      const r = holeRadius('card', n, 200)
      expect(r, 'count ' + n).toBeLessThanOrEqual(prev)
      prev = r
    }
  })
})
