// ============================================================================
// B1a · VÒNG FIX A — nhóm A4 (review F-8): shareCode(levelIndex, score).
// Bản cũ KHÔNG chặn input ⇒ shareCode(3, NaN) trả "GAP-JDP5F-NaN": mã rác nhưng vẫn
// đúng hình thức để B1c nạp vào records. Ở đây input phải là số nguyên hữu hạn ≥ 0.
// F-3: assertion bằng bất biến + giá trị viết tay (định dạng, độ ổn định, số cuối),
// không lấy lại thuật toán trong src/ làm oracle.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { shareCode } from '../../src/logic/shareCode'

/** Định dạng viết tay từ doc của shareCode: GAP-<5 ký tự>-<điểm>. */
const CODE_SHAPE = /^GAP-[0-9A-Z]{5}-[0-9]+$/
const NICE_PAIRS: [number, number][] = [[0, 0], [1, 0], [23, 1234], [120, 999999], [7, 7]]
/** Input bẩn phải bị từ chối: NaN / Infinity / âm / số thực. */
const DIRTY: [number, number][] = [
  [Number.NaN, 10],
  [3, Number.NaN],
  [Number.NaN, Number.NaN],
  [-1, 0],
  [0, -5],
  [1.5, 0],
  [0, 2.5],
  [Number.POSITIVE_INFINITY, 0],
  [0, Number.NEGATIVE_INFINITY],
]

describe('A4/F-8 · shareCode chặn input bẩn', () => {
  it('case bình thường: đúng định dạng GAP-<5 ký tự>-<điểm>, phần điểm nguyên văn', () => {
    for (const [level, score] of NICE_PAIRS) {
      const code = shareCode(level, score)
      expect(code, level + '/' + score).toMatch(CODE_SHAPE)
      expect(code.endsWith('-' + score)).toBe(true)
      expect(code.slice(4, 9).length).toBe(5)
      expect(code).not.toContain('NaN')
      expect(code).not.toContain('Infinity')
    }
  })

  it('NaN ở levelIndex hoặc score ⇒ NÉM (không còn sinh "GAP-XXXXX-NaN")', () => {
    expect(() => shareCode(Number.NaN, 10)).toThrow(/levelIndex/)
    expect(() => shareCode(3, Number.NaN)).toThrow(/score/)
    expect(() => shareCode(Number.NaN, Number.NaN)).toThrow(/levelIndex/)
  })

  it('số âm / số thực / Infinity ⇒ NÉM', () => {
    for (const [level, score] of DIRTY) {
      expect(() => shareCode(level, score), 'input ' + level + '/' + score).toThrow(/số nguyên hữu hạn/)
    }
  })

  it('thông báo lỗi nêu được giá trị thừa (debug records B1c)', () => {
    expect(() => shareCode(-1, 0)).toThrow('-1')
    expect(() => shareCode(0, 2.5)).toThrow('2.5')
  })
})

describe('A4/F-8 · shareCode là hàm THUẦN, tất định (PC-02)', () => {
  it('gọi 100 lần cùng input ⇒ cùng một mã, không cấp phát theo bộ nhớ/thời gian', () => {
    for (const [level, score] of NICE_PAIRS) {
      const first = shareCode(level, score)
      let same = true
      for (let i = 0; i < 100; i++) if (shareCode(level, score) !== first) same = false
      expect(same, level + '/' + score).toBe(true)
    }
  })

  it('hai bộ (level, score) khác nhau trong bảng chờ cho hai mã khác nhau', () => {
    const codes = NICE_PAIRS.map(([level, score]) => shareCode(level, score))
    expect(new Set(codes).size).toBe(NICE_PAIRS.length)
  })

  it('đổi một trong hai input thì mã đổi theo (không phải hằng số)', () => {
    const base = shareCode(5, 100)
    expect(shareCode(6, 100)).not.toBe(base)
    expect(shareCode(5, 101)).not.toBe(base)
  })
})
