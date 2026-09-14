// ============================================================================
// B1a · VÒNG FIX A — nhóm A2 (review F-2): validator PHẢI ràng buộc action ↔ số lỗ.
// Bản cũ dùng `sourcesOf = Math.max(1, ...)` ⇒ "punch 0 điểm đục" vẫn được tính là 1 nguồn
// và đề 4 lỗ vẫn ok=true. Ở đây: bỏ floor, thêm rule PC-03/holes (một dòng bảng cho mỗi
// kind của SheetAction) — punch 0 điểm ⇒ đáp án phải không có lỗ nào; punch n≥1 ⇒ phải có
// lỗ; cut ⇒ mọi lỗ phải nằm trong quỹ đạo của GÓC PACKET bị cắt (SPEC §7.5).
// F-3: toạ độ chờ viết TAY (lưới 1/4, 1/8 — theo g01_fold_sim.py), không gọi generator.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { validateSpec } from '../../src/logic/validator'
import type { LevelSpec, Rat, SheetAction } from '../../src/logic/types'
import { FIX_ANSWER, FIX_D1, R, flatPts, goodSpec, p } from './helpers'

const NO_HOLES: Rat[] = []
const PUNCH_ONE: SheetAction = { kind: 'punch', points: flatPts([p(1, 4, 1, 4)]) }
const PUNCH_NONE: SheetAction = { kind: 'punch', points: NO_HOLES }
const CUT_BL: SheetAction = { kind: 'cut', corner: 'BL', size: R(1n, 4n) }

/** Đề tốt trong helpers có sẵn 4 phương án; thay đáp án ⇒ phải thay cả ô đúng theo. */
function withAnswer(spec: LevelSpec, holes: Rat[], action: SheetAction): LevelSpec {
  return {
    ...spec,
    action,
    answerHoles: holes,
    options: spec.options.map((o) => (o.id === spec.correctIndex ? { id: o.id, holes } : o)),
  }
}
const allErrors = (spec: LevelSpec): string => validateSpec(spec).errors.join(' | ')

describe('A2/F-2 · PC-03/holes: số lỗ phải khớp action (punch)', () => {
  it('đề nền vẫn qua cổng: punch 1 điểm đục, đáp án 4 lỗ của H+V (trần = 1 × 4 lớp)', () => {
    const base = withAnswer(goodSpec(), flatPts(FIX_ANSWER), PUNCH_ONE)
    expect(validateSpec(base).ok, allErrors(base)).toBe(true)
  })

  it('punch RỖNG (0 điểm đục) mà answerHoles còn 4 lỗ ⇒ ok=false', () => {
    const spec = withAnswer(goodSpec(), flatPts(FIX_ANSWER), PUNCH_NONE)
    const res = validateSpec(spec)
    expect(res.ok).toBe(false)
    expect(allErrors(spec)).toMatch(/PC-03/)
    expect(allErrors(spec)).toMatch(/0 điểm đục/)
  })

  it('punch 1 điểm đục nhưng answerHoles không có lỗ nào ⇒ ok=false (mỗi điểm mở ≥1 lỗ)', () => {
    const spec = withAnswer(goodSpec(), NO_HOLES, PUNCH_ONE)
    expect(validateSpec(spec).ok).toBe(false)
    expect(allErrors(spec)).toMatch(/answerHoles rỗng/)
  })

  it('số lỗ ≠ số điểm đục mở được: 1 điểm đục mà đáp án 12 lỗ (trần 4) ⇒ ok=false', () => {
    const holes = flatPts([...FIX_D1, ...FIX_ANSWER]) // 8 + 4 điểm phân biệt
    const spec = withAnswer(goodSpec(), holes, PUNCH_ONE)
    expect(validateSpec(spec).ok).toBe(false)
    expect(allErrors(spec)).toMatch(/PC-03/)
    expect(allErrors(spec)).toMatch(/tối đa 4/)
  })

  it('validateSpec không ném trên đề xấu punch rỗng (Pattern Specification)', () => {
    const spec = withAnswer(goodSpec(), flatPts(FIX_ANSWER), PUNCH_NONE)
    expect(() => validateSpec(spec)).not.toThrow()
  })
})

describe('A2/F-2 · PC-03/holes: cut ⇒ lỗ phải đến từ vùng cắt (SPEC §7.5)', () => {
  /** Chân lý viết tay: gấp H rồi V ⇒ packet 1/2×1/2, cắt góc BL (0,0) mở ra 4 GÓC TỜ. */
  const CORNER_HOLES = flatPts([p(0, 1, 0, 1), p(1, 1, 0, 1), p(0, 1, 1, 1), p(1, 1, 1, 1)])

  it('đáp án là 4 góc tờ ⇒ khớp nhát cắt góc BL, qua cổng', () => {
    const spec = withAnswer(goodSpec(), CORNER_HOLES, CUT_BL)
    expect(validateSpec(spec).ok, allErrors(spec)).toBe(true)
  })

  it('đáp án 4 lỗ giữa mặt (không phải góc) với cùng nhát cắt ⇒ ok=false, nêu rõ vùng cắt', () => {
    const spec = withAnswer(goodSpec(), flatPts(FIX_ANSWER), CUT_BL)
    expect(validateSpec(spec).ok).toBe(false)
    expect(allErrors(spec)).toMatch(/vùng cắt/)
    expect(allErrors(spec)).toMatch(/BL/)
  })

  it('cut mà answerHoles rỗng ⇒ ok=false (nhát cắt luôn mở ra ≥1 lỗ)', () => {
    const spec = withAnswer(goodSpec(), NO_HOLES, CUT_BL)
    expect(validateSpec(spec).ok).toBe(false)
    expect(allErrors(spec)).toMatch(/answerHoles rỗng/)
  })

  it('ô nhiễu lấy từ bảng FIX_D1/D2/D3 của helpers (goodSpec) ⇒ lỗi duy nhất là vùng cắt', () => {
    const bad = withAnswer(goodSpec(), flatPts(FIX_ANSWER), CUT_BL)
    const errs = validateSpec(bad).errors
    expect(errs.length, allErrors(bad)).toBe(1)
    expect(errs[0]).toContain('vùng cắt')
    expect(errs.some((e) => e.includes('trùng đáp án'))).toBe(false)
  })
})
