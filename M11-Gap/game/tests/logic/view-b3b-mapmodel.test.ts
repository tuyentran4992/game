// ============================================================================
// view-b3b-mapmodel.test.ts — B3b · VIEW-MODEL của level map (8 tab × 15 node).
// Đối tượng: src/render/viewmodel/mapModel.ts (pack b3b.md §1 dòng 22 — HÀM THUẦN, 0 Phaser).
// Style: black-box — gọi hàm rồi so GIÁ TRỊ; file này không chạm fs / phaser / DOM.
// Hợp đồng NGUỒN của chính mapModel (0 import phaser, 0 clock, 0 mạng, không tự tính ngưỡng)
// scan bằng node:fs nằm ở view-b3b-contract.test.ts — một file một trách nhiệm.
//
// ---------------------------------------------------------------------------
// HỢP ĐỒNG CHỐT Ở ĐÂY (dev B3b implement đúng tên — test là hợp đồng, CẤM đổi chữ ký):
//
//   export type MapNode = {
//     readonly levelIndex: number   // 1..120
//     readonly chapter: number      // 1..8
//     readonly stars: number        // 0..3 = MỘT ký tự của chuỗi nén (DATA-MODEL:89)
//     readonly locked: boolean
//   }
//   export type MapChapter = { readonly chapter: number; readonly locked: boolean;
//                              readonly stars: number;               // = sumStars(stars, chapter)
//                              readonly nodes: readonly MapNode[] }  // đúng 15, levelIndex tăng dần
//   export type MapModel = { readonly chapters: readonly MapChapter[]  // 1 dòng = 1 tab chương
//                            readonly totalStars: number               // = sumStars(stars) → End
//                            readonly master: boolean }
//   export type MapOptions = { readonly master?: boolean; readonly masterStars?: string }
//   export function buildMapModel(
//     chapters: readonly ChapterRow[], stars: string,
//     unlockFlags: readonly boolean[], opts?: MapOptions,
//   ): MapModel
//
// C1 · HẠT KHOÁ LÀ CHƯƠNG, không phải màn: node.locked === chapter.locked. Màn chưa chơi trong
//      chương đã mở vẫn bấm được — PC-07 + PC-S-05 ("màn không chơi tính 0 sao, KHÔNG chặn").
// C2 · `stars` phải là chuỗi nén ĐÚNG 120 ký tự '0'..'3' (DM:89). Chuỗi rác ⇒ NÉM; KHÔNG có
//      fallback "cắt/pad" (fallback vẽ sai tiến trình thì người chơi không sửa được — tiền lệ
//      progression.starsOf: "moi input ban la loi lap trinh => NEM LOI ro"). Message chứa "stars"
//      và con số chuẩn "120". ĐÃ CHỌN MỘT HÀNH VI: các it() dưới đây chỉ assert NÉM.
// C3 · NGƯỠNG 12/15 KHÔNG tính lại ở đây: mapModel gọi progression.isChapterUnlocked (PC-07 —
//      hàng đợi đã chốt 12/15, không bắt full sao). it() "ORACLE" dưới đây so từng tab với đúng
//      hàm đó ⇒ mọi biểu thức tự cộng sao / tự so 12 trong viewmodel làm lệch bảng là ĐỎ.
// C4 · `unlockFlags` (độ dài = số dòng `chapters`) là cờ "đã mở" MỘT CHIỀU từ save (TC-PRG-07):
//      locked = !(mở theo tiến trình || cờ đã mở). Sai độ dài ⇒ NÉM, message chứa "unlock".
// C5 · master:true ⇒ sao lấy từ `masterStars` riêng (DM:103), chuỗi campaign không đổi; tổng của
//      vòng master = sumStars(masterStars) — KHÔNG cộng dồn hai vòng (PC-18, PC-G-03).
// C6 · Mọi phép cộng sao là của logic (stars.sumStars); viewmodel chỉ DÀN trang cho scene vẽ.
//
// ---------------------------------------------------------------------------
// BẢNG NEO E2E (E2E-TESTS.md:55-115 — Hermes bấm máy + soi ảnh sau build):
// | Case E2E | Kỳ vọng nhìn thấy                           | Rule  | Neo ở it() nào |
// |----------|---------------------------------------------|-------|----------------|
// | PC-S-04  | 8 tab map, sao từng màn, khoá "~12/15 ★"     | PC-07 | "8 tab × 15 node" · "11/12/15 sao" · oracle isChapterUnlocked |
// | PC-S-05  | màn bỏ trống = 0 sao, không chặn tiến trình  | PC-07 | "skip = 0 sao" · "node.locked == chapter.locked" |
// | PC-S-01  | mở map không làm nhúc nhích tiến trình       | PC-16 | "không mutate input" · "hàm thuần" |
// | PC-S-03  | chuỗi rác không vẽ bừa ⇒ NÉM rõ             | PC-16 | 3 it() input bẩn |
// | PC-R-04  | đổi viewport không sinh lại dữ liệu          | PC-02 | "cùng input ⇒ cùng output, object mới" |
// | PC-G-01  | end screen "tổng sao /120" khớp save         | PC-18 | "tổng == sumStars" · "full 3★ = 360" |
// | PC-G-02  | master chơi lại trọn 120 màn, ẩn hint        | PC-18 | "master ... campaign không đổi" · "cờ master mở tab" |
// | PC-G-03  | sao master không cộng 2 lần vào vòng chính   | PC-18 | "totalStars(master) == sumStars(masterStars)" |
// | PC-U-02  | dữ liệu dàn sẵn, 1 click là vào màn          | PC-09 | "node đúng 4 trường, không lẫn hình học" |
// ============================================================================

import { describe, it, expect } from 'vitest'
// Import KHÔNG có @ts-expect-error: thiếu module là TS2307 thật, dev tạo file là hết đỏ.
import { buildMapModel, type MapChapter, type MapModel, type MapNode } from '../../src/render/viewmodel/mapModel'
import { CAMPAIGN, isChapterUnlocked, type ChapterRow } from '../../src/logic/progression'
import { markSkip, sumStars } from '../../src/logic/stars'
import { CAMPAIGN_LEVELS, CHAPTERS, LEVELS_PER_CHAPTER } from './helpers'

// ---------------------------------------------------------------------------
// FIXTURE — dựng tay theo DM:89 (chuỗi nén 120 ký tự), không random.
// Ghi chú ngưỡng: PC-07 chốt "~12/15" theo SỐ MÀN ĐÃ CHẠM (progression.bestLevel), nên
// '3'.repeat(12) = 12 màn đầu chương 1 đạt 3★ = ĐÚNG ngưỡng; '3'.repeat(11) = thiếu 1 màn.
// HAI SỐ KHÁC NHAU, đừng nhầm: `MapChapter.stars` là TỔNG CHỮ SỐ (sumStars — End/Score in ra,
// full chương = 45), còn ĐIỀU KIỆN MỞ KHOÁ đếm MÀN (12/15). Ví dụ: chain(11) ⇒ stars = 33,
// nhưng vẫn dưới ngưỡng nên chương 2 khoá.
// ---------------------------------------------------------------------------
/** Bảng chương thật (DATA-MODEL §3.1) — bản COPY để test không sợ bị mutate. */
const rows = (): ChapterRow[] => CAMPAIGN.map((r) => ({ ...r }))

/** n màn đầu chiến dịch đạt `digit` sao, phần còn lại '0'. */
const chain = (n: number, digit = '3'): string =>
  digit.repeat(n) + '0'.repeat(CAMPAIGN_LEVELS - n)

/** Đặt từng ô theo cặp [màn, chữ số] — các ô khác là '0' (chưa chơi). */
function starsAt(picks: readonly (readonly [number, string])[]): string {
  const cells = '0'.repeat(CAMPAIGN_LEVELS).split('')
  for (const [level, digit] of picks) cells[level - 1] = digit
  return cells.join('')
}

/** Cờ "chương đã mở" (một chiều) — không tham số = chưa từng mở chương nào. */
const flagsFor = (...opened: number[]): boolean[] =>
  CAMPAIGN.map((r) => opened.includes(r.chapter))

const chapterOf = (m: MapModel, chapter: number): MapChapter => {
  const hit = m.chapters.find((c) => c.chapter === chapter)
  if (!hit) throw new Error('mapModel: thiếu tab chương ' + chapter)
  return hit
}

const nodeAt = (m: MapModel, level: number): MapNode => {
  const hit = m.chapters.flatMap((c) => c.nodes).find((n) => n.levelIndex === level)
  if (!hit) throw new Error('mapModel: thiếu node màn ' + level)
  return hit
}

const nodesOf = (m: MapModel): MapNode[] => m.chapters.flatMap((c) => c.nodes)

/** MẢNG 15 giá trị giống nhau — dựng kỳ vọng cho "mọi node của tab". */
const fill = <T>(v: T, n = LEVELS_PER_CHAPTER): T[] => Array.from({ length: n }, () => v)

describe('khung bảng 8 tab × 15 node (pack §3 Map, DS:102) — neo PC-S-04', () => {
  it('đủ 8 tab chương, mỗi tab đúng 15 node đánh số liên tiếp theo chương', () => {
    const m = buildMapModel(rows(), chain(12), flagsFor())
    expect(m.chapters.map((c) => c.chapter)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect(m.chapters.length).toBe(CHAPTERS)
    for (const c of m.chapters) {
      const first = (c.chapter - 1) * LEVELS_PER_CHAPTER + 1
      expect(c.nodes.length, 'tab chương ' + c.chapter + ' phải 15 ô').toBe(LEVELS_PER_CHAPTER)
      expect(c.nodes.map((n) => n.levelIndex)).toEqual(
        Array.from({ length: LEVELS_PER_CHAPTER }, (_, i) => first + i),
      )
    }
  })

  it('120 ô phủ kín chiến dịch và chapter = ceil(level/15) cho từng ô', () => {
    const m = buildMapModel(rows(), chain(120), flagsFor(1, 2, 3, 4, 5, 6, 7, 8))
    expect(nodesOf(m).length).toBe(CAMPAIGN_LEVELS)
    expect(nodesOf(m).map((n) => n.chapter)).toEqual(
      Array.from({ length: CAMPAIGN_LEVELS }, (_, i) => Math.ceil((i + 1) / LEVELS_PER_CHAPTER)),
    )
  })

  it('mỗi node có ĐÚNG 4 trường nghiệp vụ {levelIndex, chapter, stars, locked} — không lẫn hình học', () => {
    const keys = [...new Set(nodesOf(buildMapModel(rows(), chain(12), flagsFor())).flatMap((n) => Object.keys(n)))]
    expect(keys.sort()).toEqual(['chapter', 'levelIndex', 'locked', 'stars'])
  })

  it('số tab = số dòng `chapters` truyền vào (bảng là DỮ LIỆU, viewmodel không hardcode 8)', () => {
    const three = rows().slice(0, 3)
    const m = buildMapModel(three, chain(12), three.map(() => false))
    expect(m.chapters.map((c) => c.chapter)).toEqual([1, 2, 3])
    expect(nodesOf(m).length).toBe(45)
  })
})

describe('sao từng ô đọc từ chuỗi nén (DM:89) — neo PC-S-04 · PC-S-05', () => {
  it('stars đúng từng chữ số 0..3 theo chuỗi trộn (3★ / 2★ / 1★ / chưa chơi)', () => {
    const s = starsAt([[1, '3'], [2, '2'], [3, '1'], [4, '0'], [15, '3'], [16, '1'], [120, '2']])
    const m = buildMapModel(rows(), s, flagsFor(1, 2, 3, 4, 5, 6, 7, 8))
    expect([nodeAt(m, 1).stars, nodeAt(m, 2).stars, nodeAt(m, 3).stars, nodeAt(m, 4).stars]).toEqual([3, 2, 1, 0])
    expect([nodeAt(m, 15).stars, nodeAt(m, 16).stars, nodeAt(m, 120).stars]).toEqual([3, 1, 2])
    expect(nodesOf(m).every((n) => n.stars >= 0 && n.stars <= 3)).toBe(true)
  })

  it('skip = 0 sao: ô chưa chơi là stars:0 và KHÔNG chặn ô sau trong cùng tab đã mở', () => {
    const s = markSkip(markSkip(markSkip(chain(15), 4), 9), 13) // 3 màn bị bỏ
    const m = buildMapModel(rows(), s, flagsFor())
    expect([nodeAt(m, 4).stars, nodeAt(m, 9).stars, nodeAt(m, 13).stars]).toEqual([0, 0, 0])
    expect(chapterOf(m, 1).nodes.map((n) => n.locked)).toEqual(fill(false))
    expect(nodeAt(m, 15).locked).toBe(false)
    expect(chapterOf(m, 1).stars).toBe(36) // 12 o x 3★ — tổng KHONG bị trừ ảo vì 3 ô 0★ (PC-S-05)
    expect(chapterOf(m, 2).locked).toBe(false) // 15 màn đã chạm ⇒ qua ngưỡng 12 (PC-07 đếm MÀN)
  })

  it('tổng sao từng tab và toàn chiến dịch BẰNG NGUYÊN sumStars của logic (C6)', () => {
    const s = starsAt([[1, '3'], [2, '2'], [13, '1'], [16, '3'], [120, '3']])
    const m = buildMapModel(rows(), s, flagsFor())
    for (const c of m.chapters) expect(c.stars, 'tab ' + c.chapter).toBe(sumStars(s, c.chapter))
    expect([chapterOf(m, 1).stars, chapterOf(m, 2).stars, chapterOf(m, 3).stars, chapterOf(m, 8).stars]).toEqual([6, 3, 0, 3])
    expect(m.totalStars).toBe(12)
  })

  it('chiến dịch full 3★: 45 sao mỗi tab, tổng 360 — số End screen in ra (PC-G-01)', () => {
    const m = buildMapModel(rows(), chain(120), flagsFor(1, 2, 3, 4, 5, 6, 7, 8))
    expect(m.chapters.map((c) => c.stars)).toEqual(fill(45, CHAPTERS))
    expect(m.totalStars).toBe(360)
  })
})

describe('khoá chương theo ngưỡng PC-07 (hàng đợi đã chốt 12/15) — neo PC-S-04', () => {
  it('11 màn đầu chương 1 đạt 3★ ⇒ chương 2 locked:true (cả 15 node), chương 1 vẫn mở', () => {
    const m = buildMapModel(rows(), chain(11), flagsFor())
    expect(chapterOf(m, 1).locked).toBe(false)
    expect(chapterOf(m, 2).locked).toBe(true)
    expect(chapterOf(m, 2).nodes.map((n) => n.locked)).toEqual(fill(true))
    expect(chapterOf(m, 2).nodes.map((n) => n.stars)).toEqual(fill(0))
    expect(chapterOf(m, 3).locked).toBe(true)
  })

  it('ĐÚNG 12 ⇒ chương 2 mở (không bắt full sao), chương 3 vẫn khoá', () => {
    const m = buildMapModel(rows(), chain(12), flagsFor())
    expect(chapterOf(m, 2).locked).toBe(false)
    expect(chapterOf(m, 2).nodes.map((n) => n.locked)).toEqual(fill(false))
    expect(chapterOf(m, 3).locked).toBe(true) // ngưỡng ch3 = 27 màn đã chạm
  })

  it('15 ⇒ mở; chuỗi toàn 0 ⇒ chỉ chương 1 mở (unlockNeed 0), tổng sao 0', () => {
    expect(chapterOf(buildMapModel(rows(), chain(15), flagsFor()), 2).locked).toBe(false)
    const fresh = buildMapModel(rows(), '0'.repeat(CAMPAIGN_LEVELS), flagsFor())
    expect(fresh.chapters.map((c) => c.locked)).toEqual([false, true, true, true, true, true, true, true])
    expect(fresh.totalStars).toBe(0)
  })

  it('ORACLE: locked của mọi tab = !progression.isChapterUnlocked — 8 fixture (C3)', () => {
    const fixtures = ['0'.repeat(CAMPAIGN_LEVELS), chain(11), chain(12), chain(15), chain(26), chain(27), chain(102), chain(120)]
    for (const s of fixtures) {
      const m = buildMapModel(rows(), s, flagsFor())
      for (const c of m.chapters) {
        expect(c.locked, 'fixture ' + s.slice(0, 4) + '... tab ' + c.chapter).toBe(!isChapterUnlocked(c.chapter, s))
      }
    }
  })

  it('C1: node.locked LUÔN bằng chapter.locked — không có kiểu "chưa tới màn" trong tab đã mở', () => {
    const m = buildMapModel(rows(), chain(3), flagsFor())
    for (const n of nodesOf(m)) expect(n.locked, 'màn ' + n.levelIndex).toBe(chapterOf(m, n.chapter).locked)
    expect(nodeAt(m, 15).locked).toBe(false)
    expect(nodeAt(m, 16).locked).toBe(true)
  })

  it('MỞ KHOÁ MỘT CHIỀU (TC-PRG-07): 12 sao → chơi lại còn 11 + cờ đã mở ⇒ tab 2 vẫn locked:false', () => {
    const lost = markSkip(chain(12), 12) // chơi lại màn 12 rồi bỏ ⇒ còn 11 ô có sao (tổng 33★)
    expect(sumStars(lost)).toBe(33)
    expect(chapterOf(buildMapModel(rows(), lost, flagsFor()), 2).locked).toBe(true) // bằng chứng: chính CỜ cứu tiến trình
    const m = buildMapModel(rows(), lost, flagsFor(1, 2))
    expect(chapterOf(m, 2).locked).toBe(false)
    expect(chapterOf(m, 2).nodes.map((n) => n.locked)).toEqual(fill(false))
    expect(chapterOf(m, 3).locked).toBe(true) // cờ chỉ cứu tab ĐÃ mở, không mở lan
    expect(m.totalStars).toBe(33)
  })
})

describe('vòng Master (PC-18, DM:103) — neo PC-G-01 · PC-G-02 · PC-G-03', () => {
  it('master:true đọc sao từ masterStars RIÊNG; bảng campaign không đổi', () => {
    const camp = chain(12)
    const before = buildMapModel(rows(), camp, flagsFor(1, 2))
    expect(before.master).toBe(false)
    expect(nodeAt(before, 1).stars).toBe(3)

    const masterStars = starsAt([[1, '2'], [16, '3'], [120, '1']])
    const m = buildMapModel(rows(), camp, flagsFor(1, 2, 3, 4, 5, 6, 7, 8), { master: true, masterStars })
    expect(m.master).toBe(true)
    expect(nodeAt(m, 1).stars).toBe(2) // số của master, không phải campaign
    expect(nodeAt(m, 2).stars).toBe(0) // '3' campaign KHÔNG lẫn sang master
    expect([nodeAt(m, 16).stars, nodeAt(m, 120).stars]).toEqual([3, 1])

    const after = buildMapModel(rows(), camp, flagsFor(1, 2))
    expect(after).toEqual(before) // PC-18: master là TẤM LÒNG RIÊNG, campaign y nguyên
    expect(after.master).toBe(false)
  })

  it('PC-G-03: tổng sao vòng master = sumStars(masterStars), không cộng dồn hai vòng', () => {
    const masterStars = starsAt([[1, '2'], [16, '3'], [120, '1']])
    const m = buildMapModel(rows(), chain(12), flagsFor(1, 2, 3, 4, 5, 6, 7, 8), { master: true, masterStars })
    expect(m.totalStars).toBe(6)
    expect(m.totalStars).toBe(sumStars(masterStars))
    expect(m.totalStars).not.toBe(sumStars(chain(12)))
    expect([chapterOf(m, 1).stars, chapterOf(m, 8).stars]).toEqual([2, 1])
  })

  it('master + cờ đã mở ⇒ không tab nào khoá, master:true để scene ẩn hint (PC-G-02)', () => {
    const blank = '0'.repeat(CAMPAIGN_LEVELS)
    const m = buildMapModel(rows(), blank, flagsFor(1, 2, 3, 4, 5, 6, 7, 8), { master: true, masterStars: blank })
    expect(m.chapters.map((c) => c.locked)).toEqual(fill(false, CHAPTERS))
    expect(nodesOf(m).every((n) => !n.locked)).toBe(true)
    expect(m.master).toBe(true)
  })

  it('master:true mà thiếu masterStars ⇒ NÉM nêu rõ masterStars (C5, không âm thầm vẽ 0★)', () => {
    expect(() => buildMapModel(rows(), chain(12), flagsFor(1), { master: true })).toThrow(/masterStars/i)
  })
})

describe('hàm THUẦN + input bẩn (C2, C4) — neo PC-R-04 · PC-S-01 · PC-S-03', () => {
  it('cùng input hai lần ⇒ deep-equal và trả object MỚI (resize chỉ vẽ lại, không dùng model cũ)', () => {
    const a = buildMapModel(rows(), chain(12), flagsFor(1, 2))
    const b = buildMapModel(rows(), chain(12), flagsFor(1, 2))
    expect(a).toEqual(b)
    expect(a).not.toBe(b)
    expect(a.chapters[0].nodes).not.toBe(b.chapters[0].nodes)
    expect(nodesOf(a)[0]).not.toBe(nodesOf(b)[0])
  })

  it('không mutate input: bảng chapters, chuỗi sao, mảng cờ giữ nguyên sau khi dựng (PC-16)', () => {
    const r = rows()
    const s = chain(12)
    const f = flagsFor(1)
    const snapR = JSON.stringify(r)
    const snapF = JSON.stringify(f)
    buildMapModel(r, s, f)
    expect(JSON.stringify(r)).toBe(snapR)
    expect(JSON.stringify(r)).toBe(JSON.stringify(CAMPAIGN))
    expect(s).toBe(chain(12))
    expect(JSON.stringify(f)).toBe(snapF)
  })

  it('chuỗi sao 119 ký tự ⇒ NÉM, message nêu độ dài chuẩn 120 (C2 — không fallback cắt/pad)', () => {
    expect(() => buildMapModel(rows(), '3'.repeat(CAMPAIGN_LEVELS - 1), flagsFor())).toThrow(/120/)
  })

  it('chuỗi sao 121 ký tự ⇒ NÉM', () => {
    expect(() => buildMapModel(rows(), '3'.repeat(CAMPAIGN_LEVELS + 1), flagsFor())).toThrow(/120/)
  })

  it('ký tự ngoài bảng 0-3 ("x") ⇒ NÉM, message nêu đúng tên input `stars`', () => {
    expect(() => buildMapModel(rows(), '0'.repeat(CAMPAIGN_LEVELS - 1) + 'x', flagsFor())).toThrow(/stars/i)
  })

  it('unlockFlags sai số dòng của bảng chapters ⇒ NÉM, message nêu "unlock" (C4)', () => {
    const r = rows()
    expect(() => buildMapModel(r, chain(12), r.map(() => true).slice(0, 7))).toThrow(/unlock/i)
  })
})