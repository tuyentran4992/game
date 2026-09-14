// ============================================================================
// view-b3a-geometry.test.ts — B3a (render vòng chơi) · HÌNH HỌC BỐ CỤC + TOKEN MÀU.
//
// NỘI DUNG FILE NÀY ĐÚNG BẰNG TÊN NÓ (A2): hình học của màn chơi
//   src/render/layout.ts            — Box của từng vùng (tờ giấy vuông, 4 ô 2x2, nút >=44px)
//   src/render/theme/paperTheme.ts  — registry theme giấy theo chương, CẤM import phaser
// Lịch THỜI GIAN (unfoldPlan / holePlan / breathPlan / gate) nằm ở file em:
//   tests/logic/view-b3a-timing.test.ts. Hành vi scene: view-b3a-contract.test.ts.
//
// ---------------------------------------------------------------------------
// HỢP ĐỒNG CHỐT Ở ĐÂY (DESIGN-SPEC §4 — CỘT DỌC 720×1420):
//   layoutOf(w, h): Layout                          // số thiết kế, chỉ THU ĐỀU khi camera lệch
//   CAMERA: {width:720,height:1420}                 // camera cố định main.ts phải dựng đúng
//   creaseBand(sheet, fold): Box                    // dải của nếp gấp thứ `fold`
//   TAP_MIN: number                                 // trần dưới của một ô chạm (44)
//   PAPER_THEMES: readonly PaperTheme[]             // BẢNG registry, 1 dòng / 1 theme id
//   themeFor(chapter: number): PaperTheme           // đọc theo dòng, không nhánh if
//
// BẢNG NEO E2E (E2E-TESTS.md:21-37 — Hermes nghiệm thu bằng Playwright+vision):
// | Case E2E  | Kỳ vọng nhìn thấy                      | Neo ở đâu |
// |-----------|----------------------------------------|-----------|
// | PC-B-02   | Title 9:16, không scrollbar            | "cột nội dung vừa khung camera" + "portrait 9:16" |
// | PC-L-11   | mỗi chương một bộ token màu            | paperTheme: 8 dòng registry đôi một khác |
// | PC-U-04   | lỗ phân biệt trên nền mọi theme        | paperTheme: ink != paper, ink != 2 đầu nền |
// | PC-U-05   | không vùng "ảo giác nút"                | layout: mọi ô chạm >= TAP_MIN + rect hữu hạn |
// | PC-O-01   | 4 ô bấm được, không có ô thứ năm        | layout: options.length === 4, không chồng nhau |
//
// PIN-ASSUMPTION B3a-G1: "giá trị mặc định lấy DS §1" = DÒNG ĐẦU của registry (fallback khi
// chương chưa khai báo) mang đúng bộ DS §1; các dòng sau phân biệt bằng >= 1 token.
// ============================================================================

import { describe, it, expect } from 'vitest'
// @ts-expect-error module node:fs có thật lúc chạy, chỉ thiếu khai báo kiểu trong tsconfig
import { existsSync, readFileSync } from 'node:fs'
import type { PaperTheme } from '../../src/render/theme/paperTheme'
import { creaseBand, layoutOf, TAP_MIN, type Box, type Layout } from '../../src/render/layout'
import { PAPER_THEMES, themeFor } from '../../src/render/theme/paperTheme'
import { CAMPAIGN, paperThemeOf } from '../../src/logic/progression'

// --- hằng số TRÍCH NGUYÊN VĂN (DESIGN-SPEC §4 — vòng sửa layout cột dọc) ------
/** Camera CỐ ĐỊNH của mọi mockup: cột dọc 720×1420 + Scale.FIT (main.ts). */
const DESIGN_W = 720
const DESIGN_H = 1420
/** Cột chơi là TOÀN BỘ bề ngang thiết kế (layout.ts DESIGN.w — không còn tỷ lệ 0,6667×h). */
const COLUMN_W = 720
/** Ô đáp án xếp 2x2 (PC-03: đúng 4 phương án). */
const OPTION_SLOTS = 4
const CHAPTERS = CAMPAIGN.length // progression.ts:44-61 — 8 dòng, không khai số 8 lần hai

const dump = (t: PaperTheme): string => JSON.stringify(t)

// Token DS §1 (pack §2 dòng 35-39) — bản mặc định, áp cho chương 1.
const DS_PAPER = '#FFFFFF'
const DS_INK = '#17324D'
const DS_CREASE = '#9FB3C8'
const DS_BG_TOP = '#FFF7E8'
const DS_BG_BOTTOM = '#EADFC4'

// Khoá BẮT BUỘC của 1 dòng theme [đường dẫn, kiểu] — bảng, không if/else dây.
// `id` là KHOÁ NGOÀI (logic sở hữu: progression.paperThemeOf) => view không tự đặt theme.
const THEME_KEYS: readonly (readonly [string, string])[] = [
  ['id', 'string'],
  ['paper', 'string'],
  ['crease', 'string'],
  ['ink', 'string'],
  ['bg', 'object'],
  ['bg.top', 'string'],
  ['bg.bottom', 'string'],
]
const HEX_PATHS = ['paper', 'crease', 'ink', 'bg.top', 'bg.bottom']
const HEX = /^#[0-9A-Fa-f]{6}$/

function fieldOf(t: PaperTheme, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, k) => (acc as Record<string, unknown>)[k], t)
}

describe('layoutOf - hình học một màn chơi (pack §2) - neo PC-B-02 · PC-O-01 · PC-U-05', () => {
  /** Bảng vùng phải tồn tại ở MỌI camera — thêm vùng = thêm một dòng (không thêm if). */
  const BOX_ROWS: readonly (readonly [string, (l: Layout) => Box])[] = [
    ['field', (l) => l.field],
    ['portrait', (l) => l.portrait],
    ['level', (l) => l.level],
    ['stars', (l) => l.stars],
    ['ink', (l) => l.ink],
    ['sheet', (l) => l.sheet],
    ['hint', (l) => l.hint],
    ['undo', (l) => l.undo],
    ['undoAd', (l) => l.undoAd],
    ['retry', (l) => l.retry],
    ['unfold', (l) => l.unfold],
    ['menu', (l) => l.menu],
    ['sound', (l) => l.sound],
    ['play', (l) => l.play],
    ['shop', (l) => l.shop],
    ['banner', (l) => l.banner],
    ['titleSheet', (l) => l.titleSheet],
    ['titleWord', (l) => l.titleWord],
    ['progress', (l) => l.progress],
  ]
  const boxOf = (l: Layout, name: string): Box => {
    const row = BOX_ROWS.find((r) => r[0] === name)
    expect(row, 'layout không có vùng ' + name).toBeDefined()
    return (row as readonly [string, (x: Layout) => Box])[1](l)
  }
  const L = layoutOf(DESIGN_W, DESIGN_H)

  it('camera NGANG hơn chỉ dời bố cục theo trục giữa: y/w/h bất biến (cột 720 căn giữa)', () => {
    const wide = layoutOf(3000, DESIGN_H)
    // Ngang hơn CHỈ được phép đẩy cả bố cục theo trục giữa (letterbox hai bên cột): layout.ts
    // không có px tuyệt đối theo width — nền ngoài cột do index.html vẽ.
    for (const [name, get] of BOX_ROWS) {
      const a = get(L)
      const b = get(wide)
      for (const k of ['y', 'w', 'h'] as const) expect(b[k], name + '.' + k).toBe(a[k])
      expect(b.x - wide.cx, name + '. do lech theo truc giua').toBeCloseTo(a.x - L.cx, 6)
    }
    expect(wide.cx).toBe(1500)
  })

  it('giảm camera 2 lần => mọi vùng co đúng 2 lần (THU ĐỀU, không méo, không dịch tương đối)', () => {
    const small = layoutOf(DESIGN_W / 2, DESIGN_H / 2)
    for (const [name, get] of BOX_ROWS) {
      const a = get(L)
      const b = get(small)
      for (const k of ['x', 'y', 'w', 'h'] as const) expect(b[k], name + '.' + k).toBeCloseTo(a[k] / 2, 6)
    }
  })

  it('mọi vùng co so huu han, rong va cao > 0 o camera thiet ke (QA khong the bam vao rong)', () => {
    for (const [name, get] of BOX_ROWS) {
      const b = get(L)
      for (const k of ['x', 'y', 'w', 'h'] as const) expect(Number.isFinite(b[k]), name + '.' + k).toBe(true)
      expect(b.w, name + '.w').toBeGreaterThan(0)
      expect(b.h, name + '.h').toBeGreaterThan(0)
    }
    // DS:99 + PC-U-05: o nut phai dat nguong cham toi thieu ngay o camera thiet ke.
    for (const name of ['hint', 'undo', 'undoAd', 'retry', 'unfold', 'menu', 'sound', 'play']) {
      expect(boxOf(L, name).h, name + ' duoi nguong cham').toBeGreaterThanOrEqual(TAP_MIN)
    }
  })

  it('camera 0x0 va camera le => KHONG nem, khong NaN (boot tren nen mong manh - PC-B-01)', () => {
    for (const [w, h] of [[0, 0], [1, 1], [377, 811]]) {
      const l = layoutOf(w, h)
      for (const [, get] of BOX_ROWS) {
        const b = get(l)
        for (const k of ['x', 'y', 'w', 'h'] as const) expect(Number.isFinite(b[k])).toBe(true)
      }
      expect(() => layoutOf(NaN, 100)).not.toThrow()
    }
  })

  it('cột nội dung và tờ giấy ĐỀU qua trục giữa; tờ giấy là HÌNH VUÔNG 480 (DS:88)', () => {
    expect(L.field.w).toBe(COLUMN_W)
    expect(L.field.x + L.field.w / 2).toBeCloseTo(L.cx, 6)
    expect(L.sheet.w).toBe(480)
    expect(L.sheet.w).toBe(L.sheet.h)
    expect(L.sheet.x + L.sheet.w / 2).toBeCloseTo(L.cx, 6)
    expect(L.s).toBeCloseTo(DESIGN_H / 1420, 9)
  })

  it('cột chân dung của mọi màn: đúng 720×1420 và nằm giữa camera (PC-B-02)', () => {
    const p = L.portrait
    expect(p.w / p.h).toBeCloseTo(720 / 1420, 6)
    expect(p.x + p.w / 2).toBeCloseTo(L.cx, 6)
    expect(p.y).toBe(0)
    expect(p.h).toBe(DESIGN_H)
    expect(p).toEqual(L.field)
  })

  it('dung 4 o dap an, xep 2x2, khong chong nhau va nam trong cot noi dung (PC-03 · PC-O-01)', () => {
    expect(L.options.length).toBe(OPTION_SLOTS)
    const [a, b, c, d] = L.options
    expect(b.x).toBeGreaterThan(a.x + a.w - 1) // 2 cot tach roi
    expect(c.y).toBeGreaterThan(a.y + a.h - 1) // 2 hang tach roi
    expect(d.x).toBe(b.x) // o thu 4 = goc duoi-phai cua luoi 2x2
    expect(d.y).toBe(c.y)
    expect(d.w).toBe(a.w)
    expect(d.h).toBe(a.h)
    for (const o of L.options) {
      expect(o.x).toBeGreaterThanOrEqual(L.field.x - 1)
      expect(o.x + o.w).toBeLessThanOrEqual(L.field.x + L.field.w + 1)
      expect(o.w).toBe(o.h * (o.w / o.h))
    }
    expect(new Set(L.options.map((o) => o.x + ':' + o.y)).size).toBe(OPTION_SLOTS) // 4 cho ngoi khac nhau
  })

  it('undo va undo-ad dung CHUNG mot cho ngoi (loai trau nhau); retry khac o unfold', () => {
    expect(L.undo).toEqual(L.undoAd)
    expect(L.hint.w).toBe(L.undo.w)
    // retry (pha wrong) co the hien CUNG LUC voi undo => hai ô KHONG được chồng nhau.
    expect(L.retry).not.toEqual(L.unfold)
    expect(L.retry.x + L.retry.w).toBeLessThanOrEqual(L.unfold.x)
  })

  it('creaseBand: nếp thứ k chiếm dải cao h/2^(k+1), nằm trong tờ giấy và KHÔNG chồng mép', () => {
    const sheet = L.sheet
    const halves = [0, 1, 2, 3]
    for (const k of halves) {
      const band = creaseBand(sheet, k)
      expect(band.h).toBeCloseTo(sheet.h / 2 ** (k + 1), 6)
      expect(band.w).toBe(sheet.w)
      expect(band.x).toBe(sheet.x)
      expect(band.y).toBeGreaterThanOrEqual(sheet.y)
      expect(band.y + band.h).toBeLessThanOrEqual(sheet.y + sheet.h + 1e-9)
    }
    // dải của nếp 0 va nếp 1 khong duoc de lat len nhau hoan toan
    expect(creaseBand(sheet, 0).y).not.toBe(creaseBand(sheet, 1).y)
  })

  it('layoutOf la HAM THUAN: cung input ra dung output (PC-B-04 reload 3 lan)', () => {
    expect(JSON.stringify(layoutOf(800, 1200))).toBe(JSON.stringify(layoutOf(800, 1200)))
  })
})

describe('giới hạn module pure (pack §1) - neo PC-B-01 + PC-B-04', () => {
  const PURE_FILES = ['src/render/anim/unfoldPlan.ts', 'src/render/theme/paperTheme.ts']

  it('unfoldPlan.ts + paperTheme.ts tồn tại và KHÔNG import phaser => test chạy được trong node', () => {
    for (const rel of PURE_FILES) {
      const abs = new URL('../../' + rel, import.meta.url)
      expect(existsSync(abs), rel + ' chưa tồn tại (RED hợp lệ của TDD)').toBe(true)
      const src = readFileSync(abs, 'utf8')
      expect(src, rel + ' phải pure - CẤM import phaser').not.toMatch(/from\s+['"]phaser['"]/)
    }
  })

  it('2 module pure không đụng Math.random / Date.now / performance.now (đồng hồ thuộc timeline)', () => {
    for (const rel of PURE_FILES) {
      const src = readFileSync(new URL('../../' + rel, import.meta.url), 'utf8')
      for (const banned of ['Math.random', 'Date.now', 'performance.now']) {
        expect(src, rel + ' gọi ' + banned + ' => lịch không tái lập (PC-02/PC-B-04)').not.toContain(banned)
      }
    }
  })
})

describe('paperTheme - BẢNG registry theme theo chương (pack §2) - neo PC-L-11 + PC-U-04', () => {
  it('registry là bảng 8 DÒNG (thêm chương = thêm dòng); themeFor đọc theo dòng, không nhánh if', () => {
    expect(PAPER_THEMES.length, '8 chương = 8 dòng theme (CAMPAIGN progression.ts:44-61)').toBe(CHAPTERS)
    // KHOÁ theme do LOGIC sở hữu: dòng i của registry phải mang đúng id mà paperThemeOf công
    // bố (thêm chương = thêm 1 dòng CAMPAIGN + 1 dòng PAPER_THEMES, không thêm nhánh if).
    expect(PAPER_THEMES.map((t) => t.id)).toEqual(CAMPAIGN.map((r) => paperThemeOf(r.chapter)))
    expect(new Set(PAPER_THEMES.map((t) => t.id)).size, '2 dòng trùng id').toBe(CHAPTERS)
    for (let i = 0; i < CHAPTERS; i++) expect(themeFor(i + 1), 'dòng ' + i).toBe(PAPER_THEMES[i])
  })

  it('chương 1 = nguyên văn token mặc định DS §1 (paper/ink/crease/gradient nền)', () => {
    const t = themeFor(1)
    expect(t.paper).toBe(DS_PAPER)
    expect(t.ink).toBe(DS_INK)
    expect(t.crease).toBe(DS_CREASE)
    expect(t.bg.top).toBe(DS_BG_TOP)
    expect(t.bg.bottom).toBe(DS_BG_BOTTOM)
  })

  it('cả 8 dòng đủ khoá bắt buộc + đúng định dạng hex (bảng THEME_KEYS)', () => {
    for (const t of PAPER_THEMES) {
      for (const [path, kind] of THEME_KEYS) {
        const v = fieldOf(t, path)
        expect(v, 'theme ' + t.id + ' thiếu khoá ' + path).toBeDefined()
        expect(typeof v, 'khoá ' + path + ' của ' + t.id).toBe(kind)
      }
      for (const path of HEX_PATHS) {
        expect(fieldOf(t, path), path + ' của theme ' + t.id).toMatch(HEX)
      }
    }
  })

  it('theme ch1 != ch2 != ch8 và 8 dòng ĐÔI MỘT KHÁC NHAU (PC-L-11)', () => {
    const seen = PAPER_THEMES.map(dump)
    expect(new Set(seen).size, 'có 2 chương trùng token => chưa "mỗi chương một bộ"').toBe(CHAPTERS)
    expect(dump(themeFor(1))).not.toBe(dump(themeFor(2)))
    expect(dump(themeFor(2))).not.toBe(dump(themeFor(CHAPTERS)))
  })

  it('mọi theme: lỗ (ink) phân biệt với mặt giấy VÀ với 2 đầu nền (PC-U-04)', () => {
    for (const t of PAPER_THEMES) {
      expect(t.ink).not.toBe(t.paper)
      expect(t.ink).not.toBe(t.bg.top)
      expect(t.ink).not.toBe(t.bg.bottom)
      expect(t.bg.top).not.toBe(t.bg.bottom) // gradient thật, không phải nền phẳng
      expect(t.crease).not.toBe(t.paper) // nếp thấy được trên giấy
    }
  })

  // progression.rowOf NÉM với chapter ngoài 1..8 (progression.ts:108-113) => themeFor phải
  // CHẶN TRƯỚC khi gọi paperThemeOf; view không được ném lúc boot (PC-B-01: 0 exception).
  it('chương CHƯA khai báo => fallback theme 1 và KHÔNG ném (PC-B-01: 0 exception lúc boot)', () => {
    for (const bad of [0, 9, 99, -3]) expect(themeFor(bad), 'chapter=' + bad).toBe(PAPER_THEMES[0])
    expect(() => themeFor(9)).not.toThrow()
  })

  it('themeFor không cấp phát lại mỗi lần gọi (vẽ 60fps + boot <=3s)', () => {
    expect(themeFor(3)).toBe(themeFor(3))
    expect(themeFor(42)).toBe(themeFor(42))
  })
})
