// ============================================================================
// B1c (nửa sau) · I18N: placeholder, fallback khi thiếu key, copy nộp PC-19,
//                 quét chuỗi hardcode trong nguồn, đổi tên cũ, rà key mồ côi.
// PHỦ: PC-19, TC-I18-01 (không hardcode chuỗi hiển thị trong logic), TC-I18-02 (placeholder),
//      TC-I18-03 (đủ copy nộp), TC-I18-04 (thiếu key ⇒ fallback, không ném),
//      TC-I18-05 (không còn tên cũ "GẤP"; tên game = Paper Crease).
// HỢP ĐỒNG ĐÃ CHỐT Ở ĐÂY (KIẾN NGHỊ, xem báo cáo):
//   t(key, dict, vars?) ⇒ string            lookup(key, dict, vars?) ⇒ { text, missing }
//   dictEn: từ điển EN;  collectUsedKeys(dict, usedKeys, maxOrphans) ⇒
//   { ok, errors, missing, orphaned };  placeholder dạng {name}, thiếu var ⇒ giữ nguyên "{name}".
//   Fallback khi thiếu key = CHÍNH KEY (một nhánh xác định).
// ============================================================================
// tsconfig đặt "types": [] (không có @types/node) nhưng vitest chạy trong node:
// cần node:fs để quét nguồn theo TC-I18-01 ⇒ bật riêng dòng import này.
// @ts-expect-error module node:fs có thật lúc chạy, chỉ thiếu khai báo kiểu trong tsconfig
import { readdirSync, readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import {
  DICTIONARIES, DEFAULT_LOCALE, collectUsedKeys, dictEn, dictOf, locales, lookup, t,
} from '../../src/logic/i18n'
import type { Dict } from '../../src/logic/i18n'

/** 9 Khoá nộp PC-19 — id dựng tay theo từ vựng ĐÃ CÓ trong nguồn (không bịa copy). */
const REQUIRED_IDS: string[] = [
  'app.title', 'hud.continue', 'hud.hint', 'hud.undo', 'hud.retry', 'hud.next',
  'explain.fold-axis-swapped', 'explain.fold-layer-count', 'explain.punch-on-crease',
]
/** Copy CHỐT (trích nguyên văn từ hợp đồng B1c trong prompt của phiên này). */
const PINNED_COPY: Record<string, string> = {
  'app.title': 'Paper Crease',
  'hud.continue': 'Continue — Level {n}',
}
/** explain.* lấy từ EXPLAIN_BY_SUBJECT của levelState.ts (ID kebab, không phải copy). */
const EXPLAIN_IDS = ['fold-axis-swapped', 'fold-layer-count', 'punch-on-crease', 'cut-corner-shape']
const KEYS = Object.keys(dictEn)
const copyOf = (id: string): string => dictEn[id]

// --------------------------------------------------------- TC-I18-02 placeholder
describe('PC-19 / TC-I18-02 · t() thế placeholder {name}', () => {
  it('chuỗi nộp thế đúng {n}; placeholder lặp + nhiều tên đều xong; thiếu var ⇒ giữ "{x}"', () => {
    expect(copyOf('hud.continue')).toBe('Continue — Level {n}')
    expect(t('hud.continue', dictEn, { n: 23 })).toBe('Continue — Level 23')
    expect(t('hud.continue', dictEn, { n: 7 })).toBe('Continue — Level 7')
    const dict = { 'a.b': '{n} of {m} ({n})' }
    expect(t('a.b', dict, { n: 3, m: 9 })).toBe('3 of 9 (3)')
    expect(t('a.b', dict, { n: 3 })).toBe('3 of {m} (3)')
    expect(t('a.b', dict, {})).toBe('{n} of {m} ({n})')
  })
})

// ------------------------------------------------------------- TC-I18-04 fallback
describe('PC-19 / TC-I18-04 · key thiếu ⇒ fallback có chủ đích, không ném', () => {
  it('key lạ hoặc dict rỗng ⇒ t() trả CHÍNH key, lookup() báo missing=true, không crash', () => {
    expect(() => t('hud.does-not-exist', dictEn, { n: 1 })).not.toThrow()
    expect(t('hud.does-not-exist', dictEn, { n: 1 })).toBe('hud.does-not-exist')
    expect(lookup('hud.does-not-exist', dictEn, { n: 1 })).toEqual({ text: 'hud.does-not-exist', missing: true })
    expect(lookup('hud.continue', dictEn, { n: 23 }).missing).toBe(false)
    expect(t('app.title', {}, {})).toBe('app.title')
    expect(lookup('app.title', {}, {}).missing).toBe(true)
  })
})

// ------------------------------------------------------------------- TC-I18-03
describe('PC-19 / TC-I18-03 · dictionary EN đủ 9 chuỗi nộp', () => {
  it('đủ 9 id nộp (kèm 4 id explain của levelState); khớp nguyên văn chuỗi đã chốt', () => {
    for (const id of REQUIRED_IDS) expect(KEYS, 'thiếu key ' + id).toContain(id)
    expect(KEYS.length).toBeGreaterThanOrEqual(9)
    for (const id of EXPLAIN_IDS) expect(KEYS).toContain('explain.' + id)
    for (const [id, expected] of Object.entries(PINNED_COPY)) {
      expect(copyOf(id), 'copy chốt của ' + id).toBe(expected)
    }
    for (const id of REQUIRED_IDS) {
      const value = copyOf(id)
      expect(value.trim().length, 'copy rỗng ở ' + id).toBeGreaterThan(0)
      expect(value.split(/\s+/).length).toBeLessThanOrEqual(8)
      expect(value).toMatch(/^[ -~—–’]+$/)
      for (const token of value.match(/\{[^}]*\}/g) ?? []) {
        expect(token, 'placeholder lạ trong ' + id).toMatch(/^\{[a-z][a-zA-Z0-9]*\}$/)
      }
    }
  })
})

// ------------------------------------------------------------------- TC-I18-01
/**
 * Nguồn logic — copy hiển thị PHẢI nằm trong dictionary, không hardcode.
 * A14: danh sách file CŨ (economy/save/records/telemetry) là một hợp đồng sai tipo — nó khoá
 *      test vào tên file, bỏ sót chính i18n.ts và mọi file thêm sau ⇒ quét MỌI file .ts trong
 *      src/logic, lấy từ thư mục thật, không có ngoại lệ khai trước.
 */
const scanTargets = (): string[] =>
  (readdirSync('src/logic') as unknown as string[]).filter((f: string) => f.endsWith('.ts')).sort()
/** Bỏ comment khối + comment dòng (giữ số dòng) — cùng bài học với tools/gate-smell.mjs. */
const stripComments = (src: string): string => src
  .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  .replace(/\/\/.*$/gm, '')
/** Chuỗi literal 3 đoạn (nháy đơn/kép/backtick) — mẫu quét cho TC-I18-01. */
const LITERALS = /'([^'\n]*)'|"([^"\n]*)"|`([^`\n]*)`/g
/** ≥3 từ CÓ CẢ chữ HOA lẫn chữ thường = nghi copy hiển thị (message log chữ thường được bỏ qua). */
const isDisplayCopy = (text: string): boolean => text.split(/\s+/).filter((w) => /[A-Za-zÀ-ỹ]/.test(w)).length > 2
  && /[A-ZÀ-Þ]/.test(text) && /[a-zà-ỹ]/.test(text)
/** Whitelist: id i18n/testid/token nội bộ — không phải câu hiển thị. */
const whitelisted = (text: string, line: string): boolean =>
  /^[a-z][a-z0-9]*(\.[a-zA-Z0-9_-]+)+$/.test(text)
  || /^[a-z][a-z0-9]*([-_][a-z0-9]+)+$/.test(text)
  || /testid|data-testid|TESTID|explain\.|hud\.|i18n-ignore/i.test(line)
/**
 * Lời chẩn đoán của lõi (`new Error('...')`, `errors.push('...')`) là chuỗi dev-facing, KHÔNG
 * phải copy UI ⇒ xoá trọn đối số (đếm ngoặc, nên nối chuỗi nhiều dòng cũng ăn hết) TRƯỚC khi
 * quét. Loại theo NGỮ CẢNH MÃI, không loại theo TÊN FILE — A14: file mới vẫn bị quét y hệ.
 */
const DIAG_CALL = /(?:new\s+Error|[\w.]*\.push)\s*\(/g;
function blankDiagnostics(src: string): string {
  const chars = [...src];
  for (const m of src.matchAll(DIAG_CALL)) {
    const open = src.indexOf('(', m.index);
    let depth = 0;
    let i = open;
    for (; i < src.length; i += 1) {
      if (src[i] === '(') depth += 1;
      else if (src[i] === ')' && (depth -= 1) === 0) break;
    }
    for (let j = open; j <= i && j < src.length; j += 1) if (chars[j] !== '\n') chars[j] = ' ';
  }
  return chars.join('');
}
/**
 * Module ĐƯỢC PHÉP chứa copy là module khai bảng từ điển (`: Dict`), không phải một danh sách
 * tên file viết tay ⇒ i18n.ts nằm trong diện "được chứa" theo ĐÚNG lý do nghiệp vụ, và mọi
 * file mới muốn chứa copy buộc phải tự khai là bảng từ điển.
 */
const isDictModule = (src: string): boolean => /:\s*Dict\b|Record<[A-Za-z<>, '"]+,\s*string>/ .test(src);

function scanHardcoded(file: string): string[] {
  const raw = String(readFileSync('src/logic/' + file, 'utf8'));
  if (isDictModule(raw)) return [];
  const rawLines = raw.split('\n');
  const stripped = blankDiagnostics(stripComments(raw)).split('\n');
  const hits: string[] = [];
  stripped.forEach((line, i) => {
    for (const m of line.matchAll(LITERALS)) {
      const text = (m[1] ?? m[2] ?? m[3] ?? '').trim();
      if (isDisplayCopy(text) && !whitelisted(text, rawLines[i] ?? line)) {
        hits.push(file + ':' + (i + 1) + ' = "' + text + '"');
      }
    }
  });
  return hits;
}

describe('PC-19 / TC-I18-01 · không có chuỗi hiển thị hardcode trong logic (quét mọi file)', () => {
  it('quét MỌI file src/logic ⇒ 0 vi phạm (danh sách file lấy từ thư mục, không hardcode tên)', () => {
    const present = scanTargets()
    expect(present.length, 'src/logic phải có file để quét').toBeGreaterThan(0)
    expect(present, 'phải quét được cả i18n.ts').toContain('i18n.ts')
    expect(present.flatMap((f: string) => scanHardcoded(String(f)))).toEqual([])
  })
})

// ------------------------------------------------------------------- TC-I18-05
describe('PC-19 / TC-I18-05 · không còn tên cũ, tên game là Paper Crease', () => {
  it('mọi giá trị trong dict EN sạch tên cũ "GẤP"/"Banh"; app.title = "Paper Crease"', () => {
    for (const [id, value] of Object.entries(dictEn)) {
      expect(value, 'key ' + id).not.toMatch(/GẤP|Gap Fold|Gấp Gọn/i)
      expect(value).not.toContain(' Banh ')
    }
    expect(t('app.title', dictEn, {})).toBe('Paper Crease')
    expect(t('hud.continue', dictEn, { n: 23 })).not.toContain('GẤP')
  })
})

// ------------------------------------------------------- A3 · registry từ điển theo locale
describe('A3 / TC-I18-03 · DICTIONARIES là registry locale→dict, logic không biết tên locale', () => {
  it('mọi locale trong registry tra được bằng dictOf(); locale lạ ⇒ về DEFAULT_LOCALE, không ném', () => {
    expect(locales()).toContain(DEFAULT_LOCALE)
    expect(Object.keys(DICTIONARIES).sort()).toEqual([...locales()].sort())
    expect(dictOf('en')).toBe(dictEn)
    expect(dictOf(DEFAULT_LOCALE)).toBe(dictEn)
    expect(dictOf('klingon')).toBe(dictEn)
    expect(() => dictOf('')).not.toThrow()
  })

  it('thêm ngôn ngữ KHÔNG phải sửa t(): nạp dictVi ngoài registry rồi tra qua cùng t()', () => {
    const dictVi: Dict = { ...dictEn, 'hud.hint': 'Gợi ý' }
    expect(t('hud.hint', dictVi)).toBe('Gợi ý')
    expect(t('hud.hint', dictEn)).toBe('Hint')
    // placeholder + fallback chạy y hệt trên từ điển mới ⇒ không có nhánh locale nào trong t
    expect(t('hud.continue', dictVi, { n: 3 })).toBe('Continue — Level 3')
    expect(t('khong.co', dictVi)).toBe('khong.co')
  })
})

// ------------------------------------------------------------- key phủ + mồ côi
describe('PC-19 · collectUsedKeys báo thiếu/mồ côi trong errors, không ném', () => {
  it('đủ key ⇒ ok/missing sạch; key lạ ⇒ missing nêu tên; mồ côi quá ngưỡng ⇒ errors, không ném', () => {
    const wide = collectUsedKeys(dictEn, REQUIRED_IDS, KEYS.length)
    expect(wide.missing).toEqual([])
    expect(wide.ok).toBe(true)
    let res: unknown
    expect(() => {
      res = collectUsedKeys(dictEn, ['hud.continue', 'hud.not-in-dict'], 0)
    }).not.toThrow()
    const out = res as { ok: boolean; errors: string[]; missing: string[] }
    expect(out.ok).toBe(false)
    expect(out.missing).toEqual(['hud.not-in-dict'])
    expect(out.errors.join(' ')).toContain('hud.not-in-dict')
    const orphans = collectUsedKeys(dictEn, ['app.title'], 2)
    expect(orphans.orphaned.length).toBeGreaterThan(2)
    expect(orphans.orphaned.every((k) => KEYS.includes(k))).toBe(true)
    expect(orphans.ok).toBe(false)
    expect(orphans.errors.join(' ').toLowerCase()).toContain('orphan')
  })
})
