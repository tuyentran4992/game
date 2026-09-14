// ============================================================================
// VÒNG FIX E · hợp đồng CƠ CẤU, đo bằng API công khai + đề sinh ra (E7/A14):
//  E2/A9 — mỗi sự thật MỘT nguồn (RASTER_CELL suy từ RASTER_GRID; số phương án đọc từ
//          validator.OPTION_COUNT, generator không tự khai 4).
//  E5/A5 — phép thử mở rộng: registry phủ toàn bộ FoldKind (kiểm bằng FOLD_KIND_ALL,
//          không so danh sách hardcode).
//  E6/A10 — memo có trần CACHE_MAX, và mảng trả về là BẢN SAO (caller làm bẩn không ăn
//          mòn trạng thái nội bộ ⇒ cùng tham số vẫn cho kết quả Y HỆT).
// ============================================================================
import { describe, it, expect } from 'vitest'
import { CACHE_MAX, cacheSizes } from '../../src/logic/cache'
import { cutCandidates } from '../../src/logic/cutRegion'
import type { CutCandidate } from '../../src/logic/cutRegion'
import { latticeOf, orbitOf, punchCapacity } from '../../src/logic/punchPoints'
import { FOLD_KIND_ALL } from '../../src/logic/foldRules'
import { RASTER_CELL, RASTER_GRID } from '../../src/logic/raster'
import { levelSpec } from '../../src/logic/generator'
import { OPTION_COUNT, validateSpec } from '../../src/logic/validator'
import { point, rat } from '../../src/logic/rational'
import type { FoldKind, Point } from '../../src/logic/types'
import { GAME_SEED, cfgFor, pk, rk } from './helpers'

const CHAIN_HV: FoldKind[] = ['H', 'V']
const Q18 = point(rat(1, 8), rat(1, 8))
const QOUT = point(rat(1, 3), rat(1, 3))
const keys = (pts: readonly Point[]): string[] => pts.map(pk)
const shape = (pool: CutCandidate[]): string[] => pool.map((c) => c.snip.corner + ':' + c.cells.map(pk).join('|'))

describe('E2/A9 · một nguồn cho mỗi sự thật', () => {
  it('RASTER_CELL = 1/RASTER_GRID (dẫn xuất, không khai số 16 lần thứ hai)', () => {
    expect(rk(RASTER_CELL)).toBe('1/' + RASTER_GRID)
  })

  it('số phương án của đề ĐỌC từ validator.OPTION_COUNT — generator không giữ hằng riêng', () => {
    const spec = levelSpec(GAME_SEED, 7, cfgFor(1, 1))
    expect(spec.options.length).toBe(OPTION_COUNT)
    expect(spec.correctIndex).toBeGreaterThanOrEqual(0)
    expect(spec.correctIndex).toBeLessThan(OPTION_COUNT)
  })

  it('validator cũng chấm theo ĐÚNG constant đó: cắt bớt 1 phương án ⇒ lỗi nêu tên con số nguồn', () => {
    const spec = levelSpec(GAME_SEED, 7, cfgFor(1, 1))
    const short = { ...spec, options: spec.options.slice(0, OPTION_COUNT - 1) }
    const errors = validateSpec(short).errors
    expect(errors.length).toBeGreaterThan(0)
    expect(errors.join(' ')).toContain('đủ ' + OPTION_COUNT)
  })
})

describe('E5/A5 · registry phủ toàn bộ FoldKind (phép thử mở rộng)', () => {
  it('mọi kiểu nếp đều có dòng trong bảng: dẫn xuất từ Object.keys(FOLD_RULES), không hardcode', () => {
    expect(FOLD_KIND_ALL.length).toBeGreaterThanOrEqual(3)
    for (const k of FOLD_KIND_ALL) {
      const holes = latticeOf([k])
      expect(holes.length, 'chuỗi ' + k + ' không có lưới điểm đục').toBeGreaterThan(0)
    }
  })

  it('đổi số phương án chỉ cần sửa 1 nguồn: các đề sinh ra đều dài bằng nhau = OPTION_COUNT', () => {
    const counts = [1, 2, 3, 4].map((n) => levelSpec('W-' + n, n, cfgFor(2, n)).options.length)
    expect([...new Set(counts)]).toEqual([OPTION_COUNT])
  })
})

describe('E6/A10 · bản sao chống ăn mòn trạng thái', () => {
  it('push/sort vào mảng latticeOf trả về ⇒ gọi lại cùng chuỗi cho kết quả Y HỆT', () => {
    const before = keys(latticeOf(CHAIN_HV))
    const dirty = latticeOf(CHAIN_HV) as Point[]
    dirty.push(QOUT)
    dirty.sort(() => -1)
    expect(keys(latticeOf(CHAIN_HV))).toEqual(before)
  })

  it('push vào quỹ đạo lỗ trả về ⇒ lời gọi sau không thấy lỗ rác', () => {
    const before = keys(orbitOf(CHAIN_HV, Q18))
    ;(orbitOf(CHAIN_HV, Q18) as Point[]).push(QOUT)
    expect(keys(orbitOf(CHAIN_HV, Q18))).toEqual(before)
  })

  it('cutCandidates (API công khai) là bản sao SÂU: sửa mảng + sửa cells của từng phần tử ⇒ pool không đổi', () => {
    const pool = cutCandidates(CHAIN_HV)
    expect(pool.length).toBeGreaterThan(0)
    const before = shape(pool)
    pool.push(pool[0])
    pool.forEach((c) => c.cells.push(QOUT))
    expect(shape(cutCandidates(CHAIN_HV))).toEqual(before)
  })
})

describe('E6/A10 · memo có trần', () => {
  it('ghi hơn trần khoá mới ⇒ không memo nào vượt CACHE_MAX, và có memo đã chạm trần', () => {
    const kinds: FoldKind[] = ['H', 'V', 'D']
    for (const a of kinds)
      for (const b of kinds)
        for (const c of [...kinds, undefined]) {
          const chain = [a, b, c].filter((k): k is FoldKind => k !== undefined)
          latticeOf(chain)
          punchCapacity(chain)
        }
    const sizes = cacheSizes()
    expect(sizes.length, 'phải theo dõi đủ 6 memo của lõi').toBeGreaterThanOrEqual(6)
    const over = sizes.filter((s) => s.size > CACHE_MAX)
    expect(over, 'memo vượt trần: ' + JSON.stringify(over)).toEqual([])
    const full = sizes.filter((s) => s.size === CACHE_MAX)
    expect(full.length, 'không memo nào chạm trần ⇒ phép đo vô nghĩa: ' + JSON.stringify(sizes)).toBeGreaterThan(0)
  })
})
