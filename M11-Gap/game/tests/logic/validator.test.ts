// ============================================================================
// B1a · NHÓM A — src/logic/validator.ts (Pattern: Specification) — CỔNG PC-03 / PC-04.
// Phủ TC-GEN-08 ("validator bắt được đề xấu, mỗi lần nêu đúng lý do") + định nghĩa ngưỡng
// mà TC-GEN-05/06/07 sẽ đếm bằng máy.
//   · ngưỡng khác biệt giữa 2 phương án = hamming >= 6 trên lưới 16×16
//     NGUỒN: header validator.ts "Gốc tham chiếu: g08_verify.py (bitmap + hamming >= 6)".
//   · PC-04 chữ nghĩa: mỗi ô nhiễu khác đáp án >= 1 lỗ, không ô nào trùng đáp án,
//     2 ô bất kỳ khác nhau (TEST-CASES §1 preamble).
// Fixture dựng TAY (không qua generator) để unit test cô lập — xem helpers.ts.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { bitmapOf, hamming, minPairDistance, validateSpec } from '../../src/logic/validator'
import type { ValidationResult } from '../../src/logic/validator'
import type { LevelSpec, Rat } from '../../src/logic/types'
import {
  CENTER,
  FIX_ANSWER,
  FIX_D1,
  FIX_D2,
  FIX_D3,
  FIX_NEAR,
  GRID,
  MIN_PAIR_DISTANCE,
  diffHoles,
  flatPts,
  goodSpec,
  handDistance,
  handPairwiseMinOf,
  duplicatedOptionSpec,
  distractorEqualsAnswerSpec,
  mkSpec,
  nearDuplicateSpec,
  noCorrectSpec,
  outOfBoundsSpec,
  threeOptionsSpec,
  wrongIndexSpec,
} from './helpers'

const cells = (bm: boolean[]): number => bm.filter(Boolean).length

/**
 * Min hamming đôi một của 4 phương án — B3/F-8: công thức VIẾT TAY trong helpers
 * (⌊x·grid⌋ bằng bigint + đếm ô lệch), KHÔNG dùng bitmapOf/hamming mà rule PC-04 của
 * chính validator đang dùng. Trước đây hai bên cùng một công thức ⇒ lỗi chung lọt lưới.
 */
const pairwiseMin = (spec: LevelSpec): number => handPairwiseMinOf(spec.options.map((o) => o.holes), GRID)

// Lý do phải NÊU ĐƯỢC tên vấn đề (TC-GEN-08). Cho phép cả từ khoá EN/VI + mã rule,
// nhưng bắt buộc lỗi "số đáp án" nói về đáp án và lỗi "trùng nhau" nói về sự trùng.
const RE_ANSWER = /correct|answer|solution|exactly one|only one|duy nhat|đáp án|PC-?0?3/i
const RE_DUPLICATE = /duplicate|identical|same|distinct|pairwise|unique|trung|trùng|kh[aá]c nhau|PC-?0?4/i
const RE_COORD = /bound|outside|range|coord|toa do|toạ độ|sheet|invalid|PC-/i

describe('validator.bitmapOf — raster hoá phương án (PC-04)', () => {
  it('PC-04: bitmapOf trả đúng grid*grid ô và chỉ nhận giá trị boolean', () => {
    const bm = bitmapOf(flatPts(FIX_ANSWER), GRID)
    expect(bm.length).toBe(GRID * GRID)
    expect(bm.every((v) => typeof v === 'boolean')).toBe(true)
  })

  it('PC-04: "mỗi ô = 1 điểm lỗ" đúng như docstring validator.ts — 4 lỗ phân biệt cho 4 ô sáng', () => {
    expect(cells(bitmapOf(flatPts(FIX_ANSWER), GRID))).toBe(4)
    expect(cells(bitmapOf(flatPts(FIX_D1), GRID))).toBe(8)
  })

  it('PC-04: một đáp án rỗng (không lỗ nào) cho raster toàn false, không crash', () => {
    const bm = bitmapOf([] as Rat[], GRID)
    expect(bm.length).toBe(GRID * GRID)
    expect(cells(bm)).toBe(0)
  })

  it('PC-04: hai lần đục TRÙNG một vị trí chỉ là MỘT ô (đúng nghĩa "tập lỗ")', () => {
    const twice = flatPts([CENTER, CENTER])
    expect(twice.length).toBe(4)
    expect(cells(bitmapOf(twice, GRID))).toBe(1)
  })

  it('PC-04: tham số grid được tôn trọng — cùng 4 lỗ, lưới 8x8 và 16x16 đều ra 4 ô sáng', () => {
    expect(bitmapOf(flatPts(FIX_ANSWER), 8).length).toBe(64)
    expect(cells(bitmapOf(flatPts(FIX_ANSWER), 8))).toBe(4)
    expect(cells(bitmapOf(flatPts(FIX_ANSWER), GRID))).toBe(4)
  })

  it('PC-04: hai phương án khác lỗ chắc chắn cho raster khác nhau (hamming > 0)', () => {
    expect(hamming(bitmapOf(flatPts(FIX_ANSWER), GRID), bitmapOf(flatPts(FIX_D1), GRID))).toBeGreaterThan(0)
    expect(hamming(bitmapOf(flatPts(FIX_D2), GRID), bitmapOf(flatPts(FIX_D3), GRID))).toBeGreaterThan(0)
  })
})

describe('validator.hamming — khoảng cách raster (PC-04)', () => {
  it('PC-04: mảng giống hệt ⇒ 0; mảng đối xứng từng ô ⇒ length', () => {
    expect(hamming([true, false, true], [true, false, true])).toBe(0)
    expect(hamming([true, true], [false, false])).toBe(2)
  })

  it('PC-04: lệch đúng 1 ô ⇒ 1 (đơn vị đo là số ô khác nhau)', () => {
    expect(hamming([true, false, false], [true, true, false])).toBe(1)
  })

  it('PC-04: hamming đối xứng — không phụ thuộc thứ tự 2 tham số', () => {
    const a = bitmapOf(flatPts(FIX_ANSWER), GRID)
    const b = bitmapOf(flatPts(FIX_NEAR), GRID)
    expect(hamming(a, b)).toBe(hamming(b, a))
  })

  it('PC-04 (số đã kiểm bằng máy): A vs "gần như đúng" = 2 ô, A vs B = 12 ô trên lưới 16', () => {
    const bm = (pts: typeof FIX_ANSWER) => bitmapOf(flatPts(pts), GRID)
    expect(hamming(bm(FIX_ANSWER), bm(FIX_NEAR))).toBe(2) // FIX_NEAR chỉ khác 1 lỗ
    expect(hamming(bm(FIX_ANSWER), bm(FIX_D1))).toBe(12)
    expect(hamming(bm(FIX_D1), bm(FIX_D2))).toBe(16)
  })
})

describe('validator.minPairDistance — khoảng cách nhỏ nhất của 4 ô (PC-04)', () => {
  it('PC-04 + B3/F-8: minPairDistance == min 6 cặp khoảng cách VIẾT TAY (oracle độc lập với bitmapOf)', () => {
    expect(minPairDistance(goodSpec(), GRID)).toBe(pairwiseMin(goodSpec()))
  })

  it('B3/F-8: oracle viết tay khớp con số ĐÃ KIỂM BẰNG TAY ở header helpers (min = 12 ô)', () => {
    expect(pairwiseMin(goodSpec())).toBe(12)
    expect(handDistance(flatPts(FIX_ANSWER), flatPts(FIX_NEAR), GRID)).toBe(2)
    expect(handDistance(flatPts(FIX_ANSWER), flatPts(FIX_D1), GRID)).toBe(12)
    expect(handDistance(flatPts(FIX_D1), flatPts(FIX_D2), GRID)).toBe(16)
  })

  it('PC-04: đề tốt vượt ngưỡng — minPairDistance >= ' + MIN_PAIR_DISTANCE + ' (ngưỡng từ validator.ts/g08_verify)', () => {
    expect(minPairDistance(goodSpec(), GRID)).toBeGreaterThanOrEqual(MIN_PAIR_DISTANCE)
  })

  it('PC-04: đề có 2 ô GIỐNG HỆT ⇒ minPairDistance = 0', () => {
    expect(minPairDistance(duplicatedOptionSpec(), GRID)).toBe(0)
  })

  it('PC-04 (bắt được đề xấu tinh): ô nhiễu chỉ lệch 1 lỗ thì ĐẠT PC-04 chữ nghĩa nhưng KHÔNG đạt ngưỡng raster', () => {
    const spec = nearDuplicateSpec()
    expect(diffHoles(spec.answerHoles, spec.options[1].holes)).toBeGreaterThanOrEqual(1) // PC-04: khác >= 1 lỗ
    expect(minPairDistance(spec, GRID)).toBeLessThan(MIN_PAIR_DISTANCE) // nhưng máy vẫn loại được
  })

  it('PC-04: minPairDistance không phụ thuộc thứ tự mảng options (chỉ phụ thuộc tập 4 phương án)', () => {
    const reordered = mkSpec([FIX_D1, FIX_ANSWER, FIX_D3, FIX_D2], 1)
    expect(minPairDistance(reordered, GRID)).toBe(minPairDistance(goodSpec(), GRID))
  })
})

describe('validator.validateSpec — cổng PC-03 + PC-04 (TC-GEN-08)', () => {
  it('PC-03 + PC-04: đề tốt (1 đáp án + 3 nhiễu phân biệt) ⇒ ok = true, errors rỗng', () => {
    const res = validateSpec(goodSpec())
    expect(typeof res.ok).toBe('boolean')
    expect(Array.isArray(res.errors)).toBe(true)
    expect(res.errors).toEqual([])
    expect(res.ok).toBe(true)
  })

  it('PC-04: ô nhiễu TRÙNG ĐÁP ÁN ⇒ ok = false và nêu đúng lý do (không ô nào trùng đáp án)', () => {
    const res = validateSpec(distractorEqualsAnswerSpec())
    expect(res.ok).toBe(false)
    expect(res.errors.length).toBeGreaterThanOrEqual(1)
    expect(res.errors.join(' |')).toMatch(RE_DUPLICATE)
  })

  it('PC-04: hai ô nhiễu GIỐNG NHAU ⇒ ok = false và nêu đúng lý do (2 ô bất kỳ phải khác nhau)', () => {
    const res = validateSpec(duplicatedOptionSpec())
    expect(res.ok).toBe(false)
    expect(res.errors.length).toBeGreaterThanOrEqual(1)
    expect(res.errors.join(' |')).toMatch(RE_DUPLICATE)
  })

  it('PC-03: KHÔNG có ô nào khớp đáp án ⇒ ok = false và nêu lý do về đáp án đúng', () => {
    const res = validateSpec(noCorrectSpec())
    expect(res.ok).toBe(false)
    expect(res.errors.length).toBeGreaterThanOrEqual(1)
    expect(res.errors.join(' |')).toMatch(RE_ANSWER)
  })

  it('PC-03: có 2 ô cùng khớp đáp án ⇒ ok = false ("đúng 1 trong 4 ô")', () => {
    const res = validateSpec(mkSpec([FIX_ANSWER, FIX_ANSWER, FIX_D1, FIX_D2], 0))
    expect(res.ok).toBe(false)
    expect(res.errors.join(' |')).toMatch(RE_ANSWER)
  })

  it('PC-03: correctIndex trỏ SAI ô khớp đáp án ⇒ ok = false (đáp án không được xáo random)', () => {
    const res = validateSpec(wrongIndexSpec())
    expect(res.ok).toBe(false)
    expect(res.errors.join(' |')).toMatch(RE_ANSWER)
  })

  it('PC-04: chỉ có 3 phương án ⇒ ok = false (định dạng đề bắt buộc 4 ô)', () => {
    const res = validateSpec(threeOptionsSpec())
    expect(res.ok).toBe(false)
    expect(res.errors.length).toBeGreaterThanOrEqual(1)
  })

  it('PC-04: lỗ NGOÀI tờ giấy (3/2, 1/4) ⇒ ok = false theo ràng buộc "toạ độ hợp lệ"', () => {
    const res = validateSpec(outOfBoundsSpec())
    expect(res.ok).toBe(false)
    expect(res.errors.join(' |')).toMatch(RE_COORD)
  })

  it('PC-03: validateSpec KHÔNG quăng exception trên đề xấu — phải trả ValidationResult (Pattern Specification)', () => {
    expect(() => validateSpec(noCorrectSpec())).not.toThrow()
    expect(() => validateSpec(duplicatedOptionSpec())).not.toThrow()
    expect(() => validateSpec(outOfBoundsSpec())).not.toThrow()
  })

  it('PC-02: validateSpec là hàm thuần — cùng một đề, 2 lần trả về cùng kết quả (log QA tái lập được)', () => {
    const a = validateSpec(goodSpec())
    const b = validateSpec(goodSpec())
    expect(a).toEqual(b)
    const c = validateSpec(noCorrectSpec())
    const d = validateSpec(noCorrectSpec())
    expect(c).toEqual(d)
  })

  it('PC-03: đề đủ điều kiện phát hành thì correctIndex trỏ vào ô có TẬP lỗ bằng answerHoles', () => {
    const spec = goodSpec()
    expect(validateSpec(spec).ok).toBe(true)
    expect(diffHoles(spec.answerHoles, spec.options[spec.correctIndex].holes)).toBe(0)
  })

  it('PC-04: 4 phương án phải là 4 ô phân biệt — id 0..3 và mỗi ô một tập lỗ riêng (đề tốt đi qua cổng)', () => {
    const spec = goodSpec()
    expect(spec.options.map((o) => o.id).sort()).toEqual([0, 1, 2, 3])
    expect(validateSpec(spec).ok).toBe(true)
  })

  it('PC-03: correctIndex NGOÀI khoảng 0..3 ⇒ ok = false (không có ô nào để render làm đáp án)', () => {
    const outHigh = mkSpec([FIX_ANSWER, FIX_D1, FIX_D2, FIX_D3], 4, FIX_ANSWER)
    const outLow = mkSpec([FIX_ANSWER, FIX_D1, FIX_D2, FIX_D3], -1, FIX_ANSWER)
    expect(validateSpec(outHigh).ok).toBe(false)
    expect(validateSpec(outLow).ok).toBe(false)
    expect(validateSpec(outHigh).errors.join(' |')).toMatch(RE_ANSWER)
  })
})

// ---------------------------------------------------------------------------
// B2/F-2 — validateSpec là CỔNG, không phải hàm tra cứu: input bẩn ({} / null / thiếu
// field / mảng toạ độ lẻ) phải trả về ValidationResult với lý do nêu TÊN field. Bản cũ
// ném TypeError ở rule đầu tiên chạm `spec.options.length` ⇒ caller (scene, QA tool) crash.
// ---------------------------------------------------------------------------
describe('B2/F-2 · validateSpec chặn spec rác bằng errors, không bằng exception', () => {
  const asSpec = (box: unknown): LevelSpec => box as unknown as LevelSpec
  const cut = (patch: Record<string, unknown>): LevelSpec => asSpec({ ...goodSpec(), ...patch })
  const DIRTY: readonly [string, unknown][] = [
    ['{}', {}],
    ['null', null],
    ['undefined', undefined],
    ['chuỗi', 'spec'],
    ['số', 0],
    ['thiếu options', cut({ options: undefined })],
    ['thiếu answerHoles', cut({ answerHoles: undefined })],
    ['thiếu action', cut({ action: undefined })],
    ['thiếu correctIndex', cut({ correctIndex: undefined })],
    ['thiếu folds', cut({ folds: undefined })],
    ['options rỗng', cut({ options: [] })],
    ['mảng toạ độ lẻ', cut({ answerHoles: flatPts(FIX_ANSWER).slice(0, 3) })],
    ['folds kiểu lạ', cut({ folds: ['Z'] })],
    ['action.kind lạ', cut({ action: { kind: 'tear', points: [] } })],
  ]

  it('mọi input bẩn ⇒ KHÔNG ném, ok = false và có ít nhất một lỗi', () => {
    for (const [name, box] of DIRTY) {
      let res: ValidationResult | undefined
      expect(() => {
        res = validateSpec(asSpec(box))
      }, 'input ' + name).not.toThrow()
      expect(res, 'input ' + name).toBeDefined()
      expect(res!.ok, 'input ' + name + ': ' + res!.errors.join('; ')).toBe(false)
      expect(res!.errors.length, 'input ' + name).toBeGreaterThan(0)
    }
  })

  it('spec thiếu field ⇒ thông điệp nêu ĐÚNG tên field còn thiếu (TC-GEN-08 "nêu đúng lý do")', () => {
    for (const f of ['seed', 'levelIndex', 'chapter', 'folds', 'action', 'answerHoles', 'options', 'correctIndex', 'difficulty', 'timerOn']) {
      const res = validateSpec(cut({ [f]: undefined }))
      expect(res.ok, 'thiếu ' + f).toBe(false)
      expect(res.errors.join(' |'), 'phải nêu tên ' + f).toContain(f)
    }
  })

  it('{} ⇒ báo thiếu RIÊNG TỪNG field của LevelSpec, không phải một message chung chung', () => {
    const FIELDS = ['seed', 'levelIndex', 'chapter', 'folds', 'action', 'answerHoles', 'options', 'correctIndex', 'difficulty', 'timerOn']
    const res = validateSpec({} as unknown as LevelSpec)
    expect(res.ok).toBe(false)
    expect(res.errors.length).toBe(FIELDS.length)
    for (const f of FIELDS) expect(res.errors.some((e) => e.includes('"' + f + '"')), 'phải nêu ' + f).toBe(true)
  })
})