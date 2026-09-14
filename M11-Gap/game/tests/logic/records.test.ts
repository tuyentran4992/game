// ============================================================================
// B1c (nửa sau) · RECORDS: codec bảng sao, ghost, wall top-5, streak, blob lưu.
// PHỦ: P2-01 (ghost = kỷ lục RIÊNG từng màn, chỉ ghi khi màn đã clear),
//      P2-02 (streak là của PHIÊN ⇒ không nằm trong blob lưu),
//      P2-03 (wall top-5 mỗi màn, xếp theo ms rồi wrongTaps), PC-16 (lưu gọn),
//      TC-GEN-03 (KHÔNG persist đề bài), PC-02 (hàm thuần, không đồng hồ/random).
// ORACLE: mọi chuỗi xếp hạng / chữ số / mã chia sẻ dưới đây là CONSTANT VIẾT TAY.
//      Không gọi lại hàm so sánh hay hàm băm của src/ để tính giá trị chờ
//      (bài học F-3 ở share-code.test.ts: bất biến + giá trị viết tay).
// HỢP ĐỒNG ĐÃ CHỐT Ở ĐÂY (KIẾN NGHỊ, xem báo cáo): starsEncode/starsDecode/
//      ghostInsert/wallInsert/streakNext/encodeRecords/STORAGE_KEY trong
//      src/logic/records.ts; bản ghi dùng field levelIndex | ms | wrongTaps.
// ============================================================================
import { describe, it, expect } from 'vitest'
import {
  STORAGE_KEY,
  encodeRecords,
  ghostInsert,
  starsDecode,
  starsEncode,
  streakNext,
  wallInsert,
} from '../../src/logic/records'
import { shareCode } from '../../src/logic/shareCode'
import { sumStars } from '../../src/logic/stars'
import { levelSpec } from '../../src/logic/generator'
import type { LevelSpec } from '../../src/logic/types'
import { GAME_SEED, cfgFor } from './helpers'

/** PC-01: 8 chương × 15 màn = 120 ô sao (hằng VIẾT TAY, không đọc từ src). */
const SLOTS = 120
/** Ô sao thứ i = i % 4 ⇒ mỗi chữ số 0..3 đúng 30 lần ⇒ tổng sao = 30*6 = 180. */
const CELLS: number[] = Array.from({ length: SLOTS }, (_, i) => i % 4)
const CELLS_DIGITS = CELLS.map((c) => String(c)).join('')
const ZERO_STRING = '0'.repeat(SLOTS)

type Attempt = {
  readonly levelIndex: number; readonly ms: number; readonly wrongTaps: number;
  readonly cleared: boolean; readonly chosenOptionId: number; readonly stars: number;
}
const attempt = (levelIndex: number, ms: number, wrongTaps: number, cleared: boolean): Attempt =>
  ({ levelIndex, ms, wrongTaps, cleared, chosenOptionId: 2, stars: cleared ? 3 : 0 })

/** Nhận diện một dòng wall bằng cặp (ms, wrongTaps) — không cần field tên riêng. */
const rank = (rows: readonly { ms: number; wrongTaps: number }[]): string[] =>
  rows.map((r) => r.ms + '/' + r.wrongTaps)

/** Đệ quy mọi key của một JSON đã parse (bắt rò rỉ đề bài vào blob). */
function keysDeep(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(keysDeep)
  if (value !== null && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    return Object.keys(obj).flatMap((k) => [k, ...keysDeep(obj[k])])
  }
  return []
}

// --------------------------------------------------------------- 1. codec sao
describe('PC-16 · starsEncode/starsDecode là codec đối xứng của 120 ô sao', () => {
  it('starsEncode(120 ô) ⇒ chuỗi 120 ký tự ĐÚNG BẰNG bảng chữ số viết tay', () => {
    const enc = starsEncode(CELLS)
    expect(enc).toHaveLength(SLOTS)
    expect(enc).toBe(CELLS_DIGITS)
    expect(enc).toMatch(/^[0-3]+$/)
  })

  it('round-trip 120 ký tự + hai biên toàn 0 / toàn 3, decode trả mảng 0..3', () => {
    const back = starsDecode(starsEncode(CELLS))
    expect(back.ok).toBe(true)
    expect(back.errors).toEqual([])
    expect(back.cells).toEqual(CELLS)
    expect(back.cells).toHaveLength(SLOTS)
    expect(starsDecode(ZERO_STRING).cells).toEqual(new Array(SLOTS).fill(0))
    expect(starsDecode('3'.repeat(SLOTS)).cells).toEqual(new Array(SLOTS).fill(3))
  })

  it('độ dài ≠ 120 ⇒ kết quả LỖI CÓ KIỂU {ok:false, errors, cells:null}, không ném', () => {
    for (const bad of ['', '0', ZERO_STRING.slice(0, 119), ZERO_STRING + '0', '012']) {
      let out: unknown
      expect(() => { out = starsDecode(bad); }, 'độ dài ' + bad.length).not.toThrow()
      const res = out as { ok: boolean; errors: string[]; cells: number[] | null }
      expect(res.ok, 'input độ dài ' + bad.length).toBe(false)
      expect(res.cells).toBe(null)
      expect(res.errors.length).toBeGreaterThan(0)
      expect(res.errors.join(' ')).toContain(String(SLOTS))
    }
  })

  it('120 ký tự nhưng có chữ số ngoài 0..3 ⇒ cùng kiểu lỗi, lỗi nêu ký tự phạm', () => {
    const res = starsDecode('4' + ZERO_STRING.slice(1))
    expect(res.ok).toBe(false)
    expect(res.cells).toBe(null)
    expect(res.errors.join(' ')).toMatch(/4/)
  })

  it('chuỗi records sinh ra nạp ngược được sang bảng sao B1a: sumStars = 180', () => {
    expect(sumStars(starsEncode(CELLS))).toBe(180)
  })
})

// -------------------------------------------------------------------- 2. ghost
describe('P2-01 · ghost = kỷ lục riêng của TỪNG MÀN, chỉ ghi khi màn đã clear', () => {
  it('màn CHƯA clear ⇒ không ghi; clear ⇒ đúng 1 ghost mang ms + wrongTaps của lần ghi', () => {
    expect(ghostInsert([], attempt(4, 5000, 0, false))).toEqual([])
    const seeded = ghostInsert([], attempt(7, 8000, 1, true))
    expect(seeded).toHaveLength(1)
    expect(seeded[0].levelIndex).toBe(7)
    expect(rank(seeded)).toEqual(['8000/1'])
    expect(rank(ghostInsert(seeded, attempt(7, 1000, 9, false)))).toEqual(['8000/1'])
  })

  it('phá ghost ⇒ ĐÈ bản tốt hơn (ms nhỏ hơn, hoặc bằng ms mà sai ít hơn); chơi dở hơn ⇒ giữ nguyên', () => {
    const beaten = ghostInsert(ghostInsert([], attempt(7, 8000, 1, true)), attempt(7, 6500, 1, true))
    expect(beaten).toHaveLength(1)
    expect(beaten[0].ms).toBe(6500)
    const tie = ghostInsert(beaten, attempt(7, 6500, 0, true))
    expect(tie).toHaveLength(1)
    expect(rank(tie)).toEqual(['6500/0'])
    expect(rank(ghostInsert(tie, attempt(7, 9999, 3, true)))).toEqual(['6500/0'])
  })

  it('2 lần chơi cùng 1 màn ⇒ giữ ĐÚNG 1 ghost; màn khác là mục riêng (hàm không sửa đầu vào)', () => {
    const base = ghostInsert([], attempt(3, 7000, 0, true))
    let ghosts = ghostInsert(base, attempt(3, 4000, 2, true))
    ghosts = ghostInsert(ghosts, attempt(3, 9000, 0, true))
    ghosts = ghostInsert(ghosts, attempt(5, 3000, 0, true))
    expect(ghosts.map((g) => g.levelIndex).sort((a, b) => a - b)).toEqual([3, 5])
    expect(ghosts.find((g) => g.levelIndex === 3)?.ms).toBe(4000)
    expect(ghosts.find((g) => g.levelIndex === 5)?.ms).toBe(3000)
    expect(rank(base)).toEqual(['7000/0'])
  })
})

// --------------------------------------------------------------------- 3. wall
// Bảng xếp hạng TÍNH TAY trong test (màn 5, trần 5), theo ms tăng rồi wrongTaps tăng:
//   3500/5  -> hạng 1 (nhanh nhất, dù sai 5 lần)
//   4000/1  -> hạng 2 (cùng ms với 4000/2 nhưng sai ít hơn)
//   4000/2  -> hạng 3
//   4200/0  -> hạng 4
//   9000/0  -> hạng 5
//   12000/0 -> hạng 6 ⇒ bị cắt khi phần tử thứ 6 vào bảng
const HAND_ROWS = ['3500/5', '4000/1', '4000/2', '4200/0', '9000/0']
const L5 = {
  A: attempt(5, 9000, 0, true), B: attempt(5, 4000, 2, true), C: attempt(5, 4000, 1, true),
  D: attempt(5, 12000, 0, true), E: attempt(5, 3500, 5, true), F: attempt(5, 4200, 0, true),
}
/** Bảng 5 dòng MÀN 5 đã ổn định (F,A,B,C,D,E đã qua cửa cắt tỉa). */
const fill5 = (): ReturnType<typeof wallInsert> =>
  [L5.A, L5.B, L5.C, L5.D, L5.E].reduce((w, e) => wallInsert(w, e), wallInsert([], L5.F))

describe('P2-03 · wallInsert = top-5 MỖI MÀN, thứ tự theo (ms, rồi wrongTaps)', () => {
  it('nhét dần 5 lượt ⇒ thứ tự khớp bảng tay, không trần nào bị vượt', () => {
    let wall = wallInsert([], L5.A)
    expect(rank(wall)).toEqual(['9000/0'])
    wall = wallInsert(wall, L5.B)
    expect(rank(wall)).toEqual(['4000/2', '9000/0'])
    wall = wallInsert(wall, L5.C)
    expect(rank(wall)).toEqual(['4000/1', '4000/2', '9000/0'])
    wall = wallInsert(wall, L5.D)
    expect(rank(wall)).toEqual(['4000/1', '4000/2', '9000/0', '12000/0'])
    wall = wallInsert(wall, L5.E)
    expect(wall).toHaveLength(5)
    expect(rank(wall)).toEqual(['3500/5', '4000/1', '4000/2', '9000/0', '12000/0'])
  })

  it('phần tử thứ 6 ⇒ cắt PHẦN TỬ TỆ NHẤT, trần đúng 5; tie-break chỉ thắng khi ms bằng nhau', () => {
    const before = fill5()
    expect(rank(before)).toEqual(HAND_ROWS)
    expect(before[0].wrongTaps).toBe(5)
    expect(before.map((e) => e.ms)).toEqual([3500, 4000, 4000, 4200, 9000])
    const after = wallInsert(before, attempt(5, 4100, 4, true))
    expect(after).toHaveLength(5)
    expect(rank(after)).toEqual(['3500/5', '4000/1', '4000/2', '4100/4', '4200/0'])
    expect(rank(after)).not.toContain('12000/0')
    // lượt thứ 6 TỆ hơn cả bảng thì không chen nổi
    const stuck = rank(wallInsert(after, attempt(5, 99000, 9, true)))
    expect(stuck).toEqual(['3500/5', '4000/1', '4000/2', '4100/4', '4200/0'])
  })

  it('top-5 là THEO TỪNG MÀN: màn 6 có bảng riêng, không lấn bảng màn 5', () => {
    let wall = fill5()
    wall = wallInsert(wall, attempt(6, 100, 9, true))
    expect(wall).toHaveLength(6)
    expect(rank(wall.filter((e) => e.levelIndex === 5))).toEqual(HAND_ROWS)
    expect(rank(wall.filter((e) => e.levelIndex === 6))).toEqual(['100/9'])
  })
})

// ------------------------------------------------------------------- 4. streak
describe('P2-02 · streakNext thuần theo (streak, kết quả) — streak của PHIÊN', () => {
  it('đúng ⇒ +1; chuỗi 0..7 tính tay, không nhảy bước', () => {
    expect(streakNext(0, true)).toBe(1)
    expect(streakNext(1, true)).toBe(2)
    expect(streakNext(2, true)).toBe(3)
    let s = 0
    for (let i = 0; i < 7; i++) s = streakNext(s, true)
    expect(s).toBe(7)
  })

  it('sai ⇒ về 0 (kể cả đang streak dài); gọi lại cùng cặp cho cùng con số', () => {
    expect(streakNext(12, false)).toBe(0)
    expect(streakNext(0, false)).toBe(0)
    for (let i = 0; i < 20; i++) {
      expect(streakNext(4, true)).toBe(5)
      expect(streakNext(4, false)).toBe(0)
    }
  })

  it('streak KHÔNG được persist (P2-02): blob encodeRecords không có key "streak"', () => {
    const blob = encodeRecords(recordsOf(CELLS_DIGITS, ghostInsert([], attempt(2, 5000, 0, true))))
    expect(keysDeep(JSON.parse(blob))).not.toContain('streak')
    expect(blob.toLowerCase()).not.toContain('streak')
  })
})

// ----------------------------------------------- 5. shareCode B1a tái dùng được
describe('PC-02 / P2-04 · shareCode của B1a tái dùng nguyên văn cho records', () => {
  /** Mã DỰNG TAY theo format GAP-XXXXX-<score>; XXXXX đã đóng băng thành hằng số
   *  (base36 của FNV-1a("GAP|<level>|<score>"), pad/slice 5 ký tự theo doc src). */
  const HANDMADE: [number, number, string][] = [
    [7, 2031, 'GAP-XRMYC-2031'],
    [23, 12, 'GAP-OE1W1-12'],
    [0, 0, 'GAP-KI177-0'],
    [11, 999, 'GAP-N5DNE-999'],
  ]

  it('cùng (levelIndex, score) ⇒ đúng một mã dựng tay trong bảng HANDMADE', () => {
    for (const [levelIndex, score, expected] of HANDMADE) {
      expect(shareCode(levelIndex, score), levelIndex + '/' + score).toBe(expected)
    }
  })

  it('đuôi mã là điểm NGUYÊN VĂN, phần giữa đúng 5 ký tự 0-9A-Z, đủ 3 đoạn', () => {
    const parts = shareCode(7, 2031).split('-')
    expect(parts).toHaveLength(3)
    expect(parts[0]).toBe('GAP')
    expect(parts[1]).toHaveLength(5)
    expect(parts[1]).toMatch(/^[0-9A-Z]{5}$/)
    expect(parts[2]).toBe('2031')
  })
})

// ------------------------------------------------ 6. blob lưu không chứa đề bài
/** Mỏ neo blob: factory (không phải literal tươi) để test không phụ thuộc field thừa của src. */
const recordsOf = (stars: string, ghosts: unknown[], walls: unknown[] = []) =>
  ({ stars, ghosts, walls })

/** Bản ghi CÀI THEO nguyên LevelSpec — đồ mồi cho bug rò rỉ dữ liệu đề (TC-GEN-03). */
function leakyAttempt(spec: LevelSpec): Attempt & Record<string, unknown> {
  const base = attempt(4, 5000, 0, true)
  return {
    ...base, spec,
    folds: spec.folds, options: spec.options, answerHoles: spec.answerHoles,
    holes: spec.options[0].holes,
  }
}
function leakyBlob(): string {
  const spec = levelSpec(GAME_SEED, 4, cfgFor(1, 4))
  return encodeRecords(recordsOf(
    CELLS_DIGITS,
    ghostInsert([], leakyAttempt(spec)),
    wallInsert([], leakyAttempt(spec)),
  ))
}

describe('TC-GEN-03 / PC-16 · blob records không chứa ĐỀ BÀI; key storage có phiên bản', () => {
  it('ghost/wall nhận cả LevelSpec ⇒ serialize không lộ key folds|options|answerHoles|holes', () => {
    const blob = leakyBlob()
    const forbidden = /folds|options|answerHoles|holes/i
    for (const k of keysDeep(JSON.parse(blob))) expect(k, 'key rò rỉ đề bài').not.toMatch(forbidden)
    expect(blob).not.toMatch(forbidden)
  })

  it('blob đọc lại ra đúng dữ liệu records (stars 120 ô + ghost màn 4) mà không sinh đề', () => {
    const parsed = leakyBlob()
    const rec = JSON.parse(parsed) as {
      stars: string; ghosts: { levelIndex: number; ms: number; wrongTaps: number }[];
    }
    expect(rec.stars).toHaveLength(SLOTS)
    expect(starsDecode(rec.stars).ok).toBe(true)
    expect(rec.ghosts).toHaveLength(1)
    expect(rank(rec.ghosts)).toEqual(['5000/0'])
    expect(rec.ghosts[0].levelIndex).toBe(4)
  })

  it('STORAGE_KEY: chuỗi có phiên bản, chữ thường không khoảng trắng, không tên cũ GẤP', () => {
    expect(STORAGE_KEY.length).toBeGreaterThan(0)
    expect(STORAGE_KEY).toMatch(/^[a-z][a-z0-9._:-]*$/)
    expect(STORAGE_KEY).toMatch(/v1|\.1$|:1$/)
    expect(STORAGE_KEY).not.toContain('GẤP')
    expect(STORAGE_KEY.toLowerCase()).toContain('paper')
  })
})
