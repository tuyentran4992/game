// BUGFIX-1 (lệnh 09/09) — 2 bug UX boss chơi tay preview. TDD: file viết TRƯỚC code → RED.
// B1: press-state helper (nút lún tức thì khi chạm) + hitArea khớp vùng vẽ.
// B2: bubble chữ to (Vi ≥30px, ORDER! ≥32px) — bubbleH mới >= cỡ cũ, API không đổi.
import { describe, it, expect } from 'vitest'
import { PRESS_SCALE, pressDown, pressUp, buttonHitRect } from '../src/ui/press'
import { BUBBLE, bubbleH } from '../src/ui/layout'
import { INGREDIENTS, ORDER_POOL, INGREDIENT_BY_ID } from '../src/data/ingredients'

// ---- Bug 1: press-state helper (pure, khong Phaser) ----
function stub() {
  const t = { scale: 1, setScale(v: number) { t.scale = v } }
  return t
}

describe('GC-B1 press state tuc thi', () => {
  it('PRESS_SCALE = 0.94 (dinh theo yeu cau)', () => {
    expect(PRESS_SCALE).toBe(0.94)
  })
  it('pressDown lam nut lun (scale 0.94)', () => {
    const b = stub()
    pressDown(b)
    expect(b.scale).toBe(PRESS_SCALE)
  })
  it('pressUp tra scale 1 (pointerup/pointerout)', () => {
    const b = stub()
    pressDown(b)
    pressUp(b)
    expect(b.scale).toBe(1)
  })
  it('hitArea nut = vung ve mat tren (offset -3px so voi day)', () => {
    expect(buttonHitRect(300, 100)).toEqual({ x: -150, y: -53, w: 300, h: 103 })
  })
})

// ---- Bug 2: bubble/khay chu doc duoc tren iPhone (~390px) ----
describe('GC-B2 bubble co moi', () => {
  const OLD_H = (n: number): number => 18 * 2 + n * 46 // cong thuc cu (pad 18, rowH 46)
  it('bubbleH(n) >= cu voi moi n = 1..8 (khong duoc trang)', () => {
    for (let n = 1; n <= 8; n++) expect(bubbleH(n), `n=${n}`).toBeGreaterThanOrEqual(OLD_H(n))
  })
  it('rowH du cho chu 30px + icon 38', () => {
    expect(BUBBLE.rowH).toBeGreaterThanOrEqual(50)
  })
  it('API layout khong doi (bubbleH van la ham (n)=>number)', () => {
    expect(typeof bubbleH).toBe('function')
    expect(bubbleH(3)).toBe(BUBBLE.pad * 2 + 3 * BUBBLE.rowH)
  })
})

describe('GC-B2 displayName tieng Viet', () => {
  const EXPECTED: Record<string, string> = {
    'ing-pate': 'Pâté gan',
    'ing-mayo': 'Mayo',
    'ing-chili': 'Tương ớt',
    'ing-pork': 'Thịt nướng',
    'ing-chicken': 'Gà xé',
    'ing-ham': 'Chả lụa',
    'ing-cuke': 'Dưa leo',
    'ing-pickle': 'Đồ chua',
    'ing-herb': 'Rau mùi',
    'ing-chili-f': 'Ớt lát'
  }
  it('10 nguyen lieu order co dung ten Vi theo lenh', () => {
    for (const id of ORDER_POOL) expect(INGREDIENT_BY_ID[id]!.vi, id).toBe(EXPECTED[id])
  })
  it('moi nguyen lieu co vi khong rong', () => {
    for (const i of INGREDIENTS) expect(i.vi.length, i.id).toBeGreaterThan(0)
  })
})
