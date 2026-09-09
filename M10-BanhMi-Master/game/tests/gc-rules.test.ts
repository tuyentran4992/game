// GC-01..GC-09, GC-14(rules part) — pure rules/data tests (TEST-CASES.md §A)
// TDD: file này viết TRƯỚC code — chạy phải RED.
import { describe, it, expect } from 'vitest'
import { genShiftOrders, matchScore, starsFor, comboMult, tipFor, rankFor, applyWaitChange } from '../src/core/rules'
import { mulberry32 } from '../src/core/rng'
import { ORDER_POOL, SAUCE_IDS, MEAT_IDS, VEG_IDS } from '../src/data/ingredients'
import { CUSTOMERS } from '../src/data/customers'

const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1)

describe('GC-01 rng cung seed cung chuoi', () => {
  it('genShiftOrders(42) deterministic: 8 order giong het nhau', () => {
    const a = genShiftOrders(42)
    const b = genShiftOrders(42)
    expect(a.length).toBe(8)
    expect(a).toEqual(b)
  })
})

describe('GC-02 rng khac seed', () => {
  it('seed 42 vs 43: it nhat 1 order khac', () => {
    const a = JSON.stringify(genShiftOrders(42))
    const b = JSON.stringify(genShiftOrders(43))
    expect(a).not.toBe(b)
  })
})

describe('GC-03 rang buoc order (40 seed x 8 khach)', () => {
  for (const seed of SEEDS) {
    it(`seed ${seed}: moi order hop le`, () => {
      const orders = genShiftOrders(seed)
      orders.forEach((o, i) => {
        const c = CUSTOMERS[i]
        expect(o.length, `len khach ${i}`).toBe(c.layers)
        // (b) lop dau tien sau base luon la SAUT/sauce
        expect(SAUCE_IDS, `layer0 sauce khach ${i}`).toContain(o[0])
        // (c) khong trung id, moi id nam trong pool 10 (khong co base/top)
        expect(new Set(o).size).toBe(o.length)
        for (const id of o) expect(ORDER_POOL).toContain(id)
        // (a) >=1 sauce + >=1 meat + >=1 veg — rieng khach 1 (n=2) khong the du 3 nhom:
        //     ep buoc >=1 sauce + >=1 meat (ghi chu trong bao cao — spec mau thuan n=2 vs 3 nhom)
        const has = (ids: readonly string[]) => o.some((id) => ids.includes(id))
        expect(has(SAUCE_IDS), `sauce khach ${i}`).toBe(true)
        expect(has(MEAT_IDS), `meat khach ${i}`).toBe(true)
        if (c.layers >= 3) expect(has(VEG_IDS), `veg khach ${i}`).toBe(true)
      })
    })
  }
})

describe('GC-04 khong trung 2 order giong het trong cung ca', () => {
  for (const seed of SEEDS) {
    it(`seed ${seed}: 8 order doi mot khac nhau`, () => {
      const keys = genShiftOrders(seed).map((o) => o.join(','))
      expect(new Set(keys).size).toBe(8)
    })
  }
})

describe('GC-05 matchScore hoan hao', () => {
  it('order==stack -> 1.0, 3 sao, khach 3 tip = 36', () => {
    const o = ['ing-pate', 'ing-pork', 'ing-cuke', 'ing-ham']
    expect(matchScore(o, [...o])).toBe(1)
    expect(starsFor(1)).toBe(3)
    // khach 3 (c-office) tipMult 1.2, khong combo, khong FAST (patience <60%)
    expect(tipFor({ stars: 3, tipMult: 1.2, streak: 0, fast: false })).toBe(36)
  })
})

describe('GC-06 matchScore vi tri', () => {
  it('[pate,pork,cuke] vs [pate,cuke,pork] -> 1/3 <0.40 -> 0 sao', () => {
    const s = matchScore(['ing-pate', 'ing-pork', 'ing-cuke'], ['ing-pate', 'ing-cuke', 'ing-pork'])
    expect(s).toBeCloseTo(1 / 3, 10)
    expect(starsFor(s)).toBe(0) // 0 sao = strike/walkout
  })
})

describe('GC-07 matchScore thua/thieu', () => {
  it('order 4 lop, stack 3 dung dau -> 0.75 -> 2 sao', () => {
    const o = ['ing-pate', 'ing-pork', 'ing-cuke', 'ing-herb']
    const s = matchScore(o, ['ing-pate', 'ing-pork', 'ing-cuke'])
    expect(s).toBe(0.75)
    expect(starsFor(s)).toBe(2)
  })
})

describe('GC-08 thang sao bien (bien la DAT)', () => {
  it('0.90 -> 3, 0.70 -> 2, 0.40 -> 1, 0.3999 -> 0', () => {
    expect(starsFor(0.9)).toBe(3)
    expect(starsFor(0.7)).toBe(2)
    expect(starsFor(0.4)).toBe(1)
    expect(starsFor(0.3999)).toBe(0)
  })
})

describe('GC-09 combo', () => {
  it('streak tang 0.15/khach, cap 1.5; khong combo -> 1.0', () => {
    expect(comboMult(0)).toBe(1)
    expect(comboMult(1)).toBeCloseTo(1.15, 10)
    expect(comboMult(2)).toBeCloseTo(1.3, 10)
    expect(comboMult(3)).toBeCloseTo(1.45, 10)
    expect(comboMult(4)).toBe(1.5) // cap
    expect(comboMult(9)).toBe(1.5)
  })
  it('tip 3 sao lien tiep: khach 2 = floor(30*1.15)=34, khach 3 = floor(30*1.3)=39', () => {
    expect(tipFor({ stars: 3, tipMult: 1, streak: 1, fast: false })).toBe(34)
    expect(tipFor({ stars: 3, tipMult: 1, streak: 2, fast: false })).toBe(39)
  })
  it('chuoi cut (2 sao) -> streak reset -> tip khach ke = 30', () => {
    // 2 sao khong tang streak => caller reset streak ve 0
    expect(tipFor({ stars: 3, tipMult: 1, streak: 0, fast: false })).toBe(30)
  })
})

describe('GC-14 (rules part) rank + FAST boundary', () => {
  it('rank: S >=21 sao & >=260 tip; A >=16 & >=190; con lai B', () => {
    expect(rankFor(24, 300)).toBe('S')
    expect(rankFor(21, 260)).toBe('S')
    expect(rankFor(21, 259)).toBe('A')
    expect(rankFor(20, 999)).toBe('A')
    expect(rankFor(16, 190)).toBe('A')
    expect(rankFor(16, 189)).toBe('B')
    expect(rankFor(3, 50)).toBe('B')
  })
  it('FAST (+5) cong sau khi round xuong', () => {
    expect(tipFor({ stars: 3, tipMult: 1, streak: 0, fast: true })).toBe(35)
    expect(tipFor({ stars: 0, tipMult: 1, streak: 0, fast: true })).toBe(0) // 0 sao = khong tip
  })
  it('applyWaitChange: doi DUNG 1 index, id moi khong co trong order cu, uu tien giua don', () => {
    const base = ['ing-pate', 'ing-pork', 'ing-cuke', 'ing-mayo']
    for (let s = 0; s < 50; s++) {
      const rng = mulberry32(s + 7)
      const { order: nw, changedIdx } = applyWaitChange(base, rng)
      expect(nw.length).toBe(base.length)
      const diff = nw.map((id, i) => (id !== base[i] ? i : -1)).filter((i) => i >= 0)
      expect(diff).toEqual([changedIdx])
      expect(ORDER_POOL).toContain(nw[changedIdx])
      expect(base).not.toContain(nw[changedIdx])
      expect(new Set(nw).size).toBe(nw.length)
      expect(changedIdx).toBeGreaterThanOrEqual(1) // layer 0 (sauce neo) giu nguyen
      expect(changedIdx).toBeLessThanOrEqual(base.length - 2) // uu tien "giua don"
      // + rang buoc §4a van GIU sau WAIT!: du 3 nhom & ≤2 sauce (review — order phai "co hon")
      const has = (ids: readonly string[]) => nw.some((id) => ids.includes(id))
      expect(has(SAUCE_IDS), `sauce giu sau doi (seed ${s})`).toBe(true)
      expect(has(MEAT_IDS), `meat giu sau doi (seed ${s})`).toBe(true)
      expect(has(VEG_IDS), `veg giu sau doi (seed ${s})`).toBe(true)
      expect(nw.filter((id) => SAUCE_IDS.includes(id)).length).toBeLessThanOrEqual(2)
    }
  })
})
