// ============================================================================
// view-b3b-contract.test.ts — B3b · HỢP ĐỒNG TĨNH đo bằng QUÉT NGUỒN (node:fs).
//
// Đối tượng quét (pack b3b.md §1): 5 scene + 3 component + viewmodel/mapModel.ts.
// TẤT CẢ CHƯA TỒN TẠI ⇒ mọi it() ở đây ĐỎ vì corpus rỗng (có guard "đủ 8 file", không cho
// pass giả tạo). CẤM sửa src/ trong phiên test này: đỏ là đích, dev B3b làm cho xanh.
// Một file một trách nhiệm: HÀNH VI của mapModel ở view-b3b-mapmodel.test.ts; ở đây chỉ là
// luật TĨNH (tên testid, copy EN, cấm tính lại nghiệp vụ, cấm mạng, trí ad, số đo bố cục).
//
// ---------------------------------------------------------------------------
// BẢNG NEO E2E (E2E-TESTS.md:55-115 — Hermes bấm máy + soi ảnh sau build):
// | Case E2E  | Kỳ vọng nhìn thấy                                | Rule  | Neo ở it() nào |
// |-----------|--------------------------------------------------|-------|----------------|
// | PC-R-01   | map/score/shop không cắt, không tràn              | PC-20 | "mọi số đo pack §3 có mặt trong corpus B3b" |
// | PC-R-02   | control nằm trong safe area, hit area thật        | PC-20 | "mỗi scene đăng ký rect qua cửa hook B3a" |
// | PC-R-04   | đổi viewport chỉ vẽ lại, không reset dữ liệu      | PC-02 | "mapModel không import phaser / không clock" |
// | PC-S-01   | scene chỉ đọc qua cửa session, không tự ghi save  | PC-16 | "mọi scene B3b vào nghiệp vụ qua session" |
// | PC-S-02   | mua skin bằng Mực, giá là DỮ LIỆU                 | PC-11 | "giá skin không hardcode" + "Shop/SkinCard đọc giá từ economy" |
// | PC-S-04   | 8 tab map + điều kiện khoá "12/15 ★"              | PC-07 | "đủ 14 testid" + "copy 12/15 ★" + "không tự kiểm 12" |
// | PC-S-07   | album ≤14 + badge ≤6, scene không tự cấp          | PC-12 | "trần 14/6 là CAPS của logic" + "cấm awardBadge trong view" |
// | PC-U-03   | copy EN qua lớp i18n, không chuỗi trần            | PC-19 | 4 it() mục i18n |
// | PC-U-05   | không "ảo giác nút": rect đăng ký là hit area thật | PC-20 | "14 testid B3b, sai dạng là ĐỎ" |
// | PC-G-01   | end screen khai báo hết nội dung + tổng sao /120  | PC-18 | copy "You unfolded all 120" + "EndScene vẽ totalStars" |
// | PC-G-02   | master không hint — cờ master do view-model trả   | PC-18 | describe "mapModel.ts là view-model THUẦN" |
// | PC-G-04   | thoát end screen về map/menu                      | PC-16 | copy "View map" + testid-end-master |
// | PC-A-03   | interstitial CHỈ sau score card                   | PC-14 | 2 it() mục interstitial |
// | PC-B-03   | 0 call mạng trong tầng view                        | PC-15 | "0 fetch/XHR/WebSocket/sendBeacon" |
//
// KHÔNG TRÙNG VỚI B3a: view-b3a-contract.test.ts quét src/render + src/ui cho 20 testid vòng
// chơi; file này quét ĐÚNG 14 testid B3b (pack §5) + 8 file B3b mới. Lệnh "cấm mạng" cố ý
// chồng nhau vì pack §7 dòng 65 yêu cầu grep trên toàn src/render.
// ============================================================================

import { describe, it, expect } from 'vitest'
// tsconfig "types": [] ⇒ không có khai báo kiểu cho node:* (vitest vẫn chạy trong node),
// cùng cách view-b3a-contract.test.ts / config-caps.test.ts đã dùng.
// @ts-expect-error module node:fs có thật lúc chạy, chỉ thiếu khai báo kiểu trong tsconfig
import { existsSync, readFileSync } from 'node:fs'
// @ts-expect-error module node:url có thật lúc chạy, chỉ thiếu khai báo kiểu trong tsconfig
import { fileURLToPath } from 'node:url'

const SRC_DIR = fileURLToPath(new URL('../../src/', import.meta.url))

// --- BẢNG DỮ LIỆU 1: file B3b phải có (pack §1) -----------------------------
const B3B_FILES: readonly string[] = [
  'render/scenes/MapScene.ts',
  'render/scenes/ScoreScene.ts',
  'render/scenes/ShopScene.ts',
  'render/scenes/AlbumScene.ts',
  'render/scenes/EndScene.ts',
  'render/components/MapNode.ts',
  'render/components/SkinCard.ts',
  'render/components/BadgeIcon.ts',
]
const SCENES: readonly string[] = B3B_FILES.filter((f) => f.startsWith('render/scenes/'))
const VIEWMODEL = 'render/viewmodel/mapModel.ts'
/** Nơi copy EN được phép sống: từ điển của lõi + chính corpus B3b (table `key: 'copy'`). */
const COPY_SOURCES: readonly string[] = ['logic/i18n.ts', ...B3B_FILES, VIEWMODEL]

// --- BẢNG DỮ LIỆU 2: 14 testid pack §5 (SPEC:140-146) -----------------------
// Tên kết thúc bằng '-' là PREFIX ĐỘNG (map-chapter-{1..8}, map-node-{n}, shop-skin-{i},
// album-item-{i}, badge-{i}) ⇒ chấp nhận `testid-map-node-${i}` HOẶC chuỗi tĩnh có số.
const B3B_TESTIDS: readonly string[] = [
  'testid-map-chapter-',
  'testid-map-node-',
  'testid-map-locked',
  'testid-scorecard-stars',
  'testid-scorecard-next',
  'testid-shop-skin-',
  'testid-shop-price',
  'testid-album-item-',
  'testid-badge-',
  'testid-set-sound',
  'testid-set-mute',
  'testid-set-reset',
  'testid-end-total-stars',
  'testid-end-master',
]

// --- BẢNG DỮ LIỆU 3: copy EN chốt (pack §3 + §6, SPEC:149-151) --------------
type CopyRow = { readonly need: string; readonly re: RegExp; readonly files: readonly string[] }
const REQUIRED_COPY: readonly CopyRow[] = [
  { need: 'nhãn khép chương', re: /^Chapter complete$/, files: ['render/scenes/ScoreScene.ts'] },
  { need: 'khai báo hết nội dung (PC-18)', re: /^You unfolded all 120$/, files: ['render/scenes/EndScene.ts'] },
  { need: 'nút sang chương', re: /^Next chapter$/, files: ['render/scenes/ScoreScene.ts'] },
  { need: 'nút về map (PC-G-04)', re: /^View map$/, files: ['render/scenes/ScoreScene.ts'] },
  { need: 'điều kiện khoá 12/15 ★', re: /(?:12\s*\/\s*15|\{\w+\}\s*\/\s*\{\w+\})\s*★/, files: ['render/scenes/MapScene.ts'] },
  { need: 'format giá Mực (số do economy đưa lên)', re: /\{\s*(?:n|ink|price|cost|amount)\s*\}|(?:\{\w+\}\s*ink\b|\bink\s*\{\w+\})/i, files: ['render/scenes/ShopScene.ts', 'render/components/SkinCard.ts'] },
]

// --- BẢNG DỮ LIỆU 4: biểu thức NGHIỆP VỤ bị cấm ở tầng view (pack §6 dòng 58) -
// Số HÌNH HỌC (200×72, 168, 260×300, ⌀96…) được phép; số LUẬT thì không:
// "Scene CẤM: tự cộng sao/tổng sao, tự kiểm 12/15, tự tính giá skin, tự cấp badge/hint".
type Ban = { readonly why: string; readonly re: RegExp }
const BUSINESS_BANS: readonly Ban[] = [
  { why: 'tự kiểm ngưỡng 12 (PC-07 — progression.isChapterUnlocked là nguồn duy nhất)', re: /[=!><]==?\s*12\b|\b12\s*[=!><]==?/ },
  { why: 'tự cộng/trừ sao·mực·điểm (PC-06, PC-11)', re: /\b(?:stars?|star|ink|score|total|sum|count|reward)\w*\s*(?:\+=|-=|\+\+|--)/ },
  { why: 'tự cắt trần album/badge 14/6 (CAPS của logic/cache.ts — PC-12)', re: /\b(?:albums?|badges?|collections?|owned)\w*\s*(?:\.length\s*)?(?:===|>=|<=|<|>)\s*\d+|\.(?:slice|splice)\s*\([^)]*,\s*(?:14|6)\s*\)/ },
  { why: 'hardcode giá skin bằng số (giá là DỮ LIỆU từ config/skins.json — TC-INC-01)', re: /\b(?:price|cost|inkPrice|inkCost|priceInk)\s*[:=]\s*\d+/ },
  { why: 'tự suy /120 ở end screen (mapModel.totalStars là nguồn — PC-18)', re: /\b(?:totalStars|stars?|levels?|levelIndex|progress)\w*\s*(?:===|!==|>=|<=|<|>|%)\s*120\b/ },
  { why: 'tự cấp album/huy hiệu trong view (awardBadge/addAlbumItems là việc của logic)', re: /\b(?:awardBadge|addAlbumItems)\s*\(/ },
]

// --- BẢNG DỮ LIỆU 5: số đo bố cục pack §3 (DS:102-112) ----------------------
type GeoRow = { readonly what: string; readonly nums: readonly number[] }
const GEOMETRY: readonly GeoRow[] = [
  { what: 'tab chương pill 200×72 (DS:102)', nums: [200, 72] },
  { what: 'ô màn 168×168 + cụm sao 32px (DS:102)', nums: [168, 32] },
  { what: 'GameOverPanel 480×560 + cụm sao 48px (DS:57,104)', nums: [480, 560, 48] },
  { what: 'card skin 260×300 (DS:108)', nums: [260, 300] },
  { what: 'mẫu album 200×200 + huy hiệu ⌀96 (DS:109)', nums: [200, 96] },
]

/** Cửa đăng ký rect mà B3a đã dựng (A9) — scene B3b dùng lại, không tự nhân sx/sy. */
const REGISTER_DOORS = ['registerTestid(', 'makeTestidHook(']
/** Token chứng minh giá skin đến từ tầng kinh tế, không phải số trong view. */
const PRICE_SOURCES = ['buySkin', 'SkinPrice', 'prices', 'economy']

// --- bộ quét nguồn ----------------------------------------------------------
type Unit = { readonly path: string; readonly raw: string; readonly code: string }

/** Cắt // và block comment để máy quét chỉ nhìn CODE (comment tiếng Việt được phép). */
function stripComments(src: string): string {
  let out = ''
  let i = 0
  while (i < src.length) {
    const c = src[i]
    const d = src[i + 1]
    if (c === '/' && d === '*') {
      const j = src.indexOf('*/', i + 2)
      i = j < 0 ? src.length : j + 2
      out += ' '
      continue
    }
    if (c === '/' && d === '/') {
      const j = src.indexOf('\n', i)
      i = j < 0 ? src.length : j
      continue
    }
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1
      while (j < src.length) {
        if (src[j] === '\\') j += 2
        else if (src[j] === c) { j++; break }
        else j++
      }
      out += src.slice(i, j)
      i = j
      continue
    }
    out += c
    i++
  }
  return out
}

function readUnit(rel: string): Unit | null {
  const abs = SRC_DIR + rel
  if (!existsSync(abs)) return null
  const raw = readFileSync(abs, 'utf8')
  return { path: rel, raw, code: stripComments(raw) }
}

const UNITS: Unit[] = B3B_FILES.map(readUnit).filter((u): u is Unit => u !== null)
const SCENE_UNITS: Unit[] = UNITS.filter((u) => u.path.startsWith('render/scenes/'))
const ALL_RAW = UNITS.map((u) => u.raw).join('\n')

/** Corpus rỗng => mọi lệnh quét phải ĐỎ, không được pass giả tạo vì thiếu file. */
function needCorpus(units: readonly Unit[], what: string): void {
  expect(units.length, what + ' — corpus B3b rỗng (chưa có file nào trong pack §1)').toBeGreaterThan(0)
}

const unitOf = (rel: string): Unit => {
  const u = UNITS.find((x) => x.path === rel) ?? readUnit(rel)
  expect(u, rel + ' chưa tồn tại (pack §1)').toBeDefined()
  return u as Unit
}

const lineOf = (src: string, index: number): string => {
  const from = src.lastIndexOf('\n', index) + 1
  const to = src.indexOf('\n', index)
  return src.slice(from, to < 0 ? src.length : to).trim()
}

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** exec() trên RegExp cờ /g GIỮ lastIndex ⇒ luôn clone trước khi quét từng file. */
function matches(re: RegExp, s: string): RegExpExecArray[] {
  const rx = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g')
  const out: RegExpExecArray[] = []
  for (let m = rx.exec(s); m !== null; m = rx.exec(s)) out.push(m)
  return out
}

/** id được phủ bằng chuỗi tĩnh HOẶC prefix động + `${i}` / chữ số (pack §5). */
function covered(src: string, entry: string): boolean {
  if (!entry.endsWith('-')) return src.includes(entry)
  return new RegExp(escapeRe(entry) + '(?:\\$\\{|[0-9])').test(src)
}

const QUOTE_PASSES: readonly RegExp[] = [/"([^"\\\n]*)"/g, /'([^'\\\n]*)'/g, /`([^`\\]*)`/g]

function literalsOf(code: string): { value: string; at: number }[] {
  return QUOTE_PASSES.flatMap((re) => matches(re, code).map((m) => ({ value: m[1], at: m.index })))
}

/**
 * Bản ghi `<key>: '<copy>'` — nơi DUY NHẤT được phép chứa chuỗi hiển thị.
 * Loại các khoá là thuộc tính dựng object của Phaser (text/label/…): nếu không,
 * `{ text: 'Next chapter' }` bị nhầm là một key của từ điển => bỏ lọt copy trần.
 */
const NOT_A_DICT_KEY = new Set(['text', 'label', 'tooltip', 'value', 'name', 'style', 'font'])
const DICT_ENTRY = /(?:['"]([A-Za-z][\w.-]*)['"]|\b([A-Za-z][\w-]*))\s*:\s*['"]([^'"\n]*)['"]/g

function dictEntries(): { key: string; value: string; file: string }[] {
  const out: { key: string; value: string; file: string }[] = []
  for (const rel of COPY_SOURCES) {
    const u = readUnit(rel)
    if (!u) continue
    for (const m of matches(DICT_ENTRY, u.raw)) {
      const key = m[1] ?? m[2]
      if (NOT_A_DICT_KEY.has(key)) continue
      out.push({ key, value: m[3], file: rel })
    }
  }
  return out
}

/** Chuỗi bị nghi là copy hiển thị hardcode (heuristic B3a + B3b thêm nhãn sao). */
function isDisplaySuspect(v: string): boolean {
  const s = v.trim()
  if (s.length === 0) return false
  if (s.startsWith('testid-')) return false
  if (s === 'game-canvas') return false
  if (/^#[0-9A-Fa-f]{3,8}$/.test(s)) return false
  if (/\d+px/.test(s)) return false // font Phaser "900 44px Fraunces" (DS:99)
  if (s.includes('★')) return true // nhãn sao "12/15 ★" là COPY, không phải ký hiệu (pack §3)
  return /[A-Za-z]/.test(s) && /\s/.test(s)
}

/** Dòng table hợp lệ: `key: 'copy'` (khai báo từ điển) — không phải chỗ dựng object hiển thị. */
const isDictLine = (line: string): boolean => /^\s*(?:['"][\w.-]+['"]|[\w-]+)\s*:\s*['"`]/.test(line)

describe('khung file B3b (pack §1) — neo PC-B-01 · PC-R-01', () => {
  it('đủ 8 file B3b: 5 scene (Map/Score/Shop/Album/End) + 3 component (MapNode/SkinCard/BadgeIcon)', () => {
    const missing = B3B_FILES.filter((rel) => !existsSync(SRC_DIR + rel))
    expect(missing, 'thiếu file: ' + missing.join(', ')).toEqual([])
  })

  it('corpus B3b có nguồn để quét (guard chống pass giả tạo cho mọi it() bên dưới)', () => {
    needCorpus(UNITS, 'src/render/scenes + src/render/components')
  })
})

describe('testid contract — 14 tên pack §5 (neo PC-S-04 · PC-S-07 · PC-U-05)', () => {
  it('bảng hardcode đúng 14 tên của pack §5 (không thêm/bớt âm thầm)', () => {
    expect(B3B_TESTIDS.length).toBe(14)
    expect([...B3B_TESTIDS].sort()).toEqual([
      'testid-album-item-', 'testid-badge-', 'testid-end-master', 'testid-end-total-stars',
      'testid-map-chapter-', 'testid-map-locked', 'testid-map-node-', 'testid-scorecard-next',
      'testid-scorecard-stars', 'testid-set-mute', 'testid-set-reset', 'testid-set-sound',
      'testid-shop-price', 'testid-shop-skin-',
    ])
  })

  it('cả 14 testid B3b xuất hiện trong corpus (prefix động chấp nhận `testid-map-node-${i}`)', () => {
    needCorpus(UNITS, 'src/render')
    const missing = B3B_TESTIDS.filter((id) => !covered(ALL_RAW, id))
    expect(missing, 'chưa đăng ký testid: ' + missing.join(', ')).toEqual([])
  })

  it('mọi token testid-… trong file B3b đúng khu vực đặt tên (kebab, không hoa/underscore/gạch đôi)', () => {
    needCorpus(UNITS, 'src/render')
    const tokens = ALL_RAW.match(/testid-[A-Za-z0-9_-]+/g) ?? []
    const bad = [...new Set(tokens)].filter((t) => !/^testid-[a-z0-9]+(-[a-z0-9]+)*-?$/.test(t))
    expect(bad, 'testid sai định dạng: ' + bad.join(', ')).toEqual([])
  })

  it('mỗi scene B3b đăng ký rect QA qua cửa hook của B3a, không tự tính sx/sy (A9 · PC-U-05)', () => {
    for (const rel of SCENES) {
      const code = unitOf(rel).code
      const door = REGISTER_DOORS.find((d) => code.includes(d))
      expect(door, rel + ' không đăng ký rect qua cửa nào: ' + REGISTER_DOORS.join(' | ')).toBeDefined()
      expect(code, rel + ' tự gọi viewTransform() — phải dùng makeTestidHook (A9)').not.toMatch(/viewTransform\s*\(/)
    }
  })
})

describe('i18n PC-19 (pack §3 + §6) — neo PC-U-03 · PC-G-01', () => {
  const CALL_SITES: readonly RegExp[] = [
    /(?:\.setText\(|\btext\s*[:=]\s*)(['"`])([^'"`\n]*)\1/g,
    /\badd\.text\([^,)]+,[^,)]+,\s*(['"`])([^'"`\n]*)\1/g,
  ]

  it('6 copy EN chốt là GIÁ TRỊ của một key trong từ điển, không phải chuỗi trần', () => {
    needCorpus(UNITS, 'src/render')
    const entries = dictEntries()
    const missing = REQUIRED_COPY.filter((row) => !entries.some((e) => row.re.test(e.value)))
    expect(missing.map((r) => r.need), 'copy chưa vào từ điển (phải là value của một key): ' +
      missing.map((r) => r.need).join(' | ')).toEqual([])
  })

  it('scene sở hữu copy phải nhắc tới KEY của copy đó (PC-19 — đổi ngôn ngữ không sửa scene)', () => {
    needCorpus(UNITS, 'src/render')
    const entries = dictEntries()
    const bad: string[] = []
    for (const row of REQUIRED_COPY) {
      const keys = [...new Set(entries.filter((e) => row.re.test(e.value)).map((e) => e.key))]
      const used = keys.some((k) => row.files.some((f) => unitOf(f).raw.includes(k)))
      if (!used) bad.push(row.need + ' (candidate key: ' + (keys.join(',') || 'KHÔNG CÓ') + ')')
    }
    expect(bad, 'copy có trong từ điển nhưng scene không dùng key: ' + bad.join(' | ')).toEqual([])
  })

  it('không copy trần ở setText(/text:/add.text(x,y,_) trong 5 scene B3b', () => {
    needCorpus(SCENE_UNITS, 'scene')
    const bad: string[] = []
    for (const u of SCENE_UNITS) {
      for (const re of CALL_SITES) {
        for (const m of matches(re, u.code)) {
          if (m[2].trim().length > 0) bad.push(u.path + ' :: ' + lineOf(u.code, m.index) + ' => ' + m[2])
        }
      }
    }
    expect(bad, 'chuỗi hiển thị không qua t(): ' + bad.join(' | ')).toEqual([])
  })

  it('không display-string literal ngoài whitelist trong scene B3b (kèm nhãn "12/15 ★")', () => {
    needCorpus(SCENE_UNITS, 'scene')
    const bad = SCENE_UNITS.flatMap((u) =>
      literalsOf(u.code)
        .filter((l) => isDisplaySuspect(l.value))
        .filter((l) => !isDictLine(lineOf(u.code, l.at)))
        .map((l) => u.path + ' = ' + l.value),
    )
    expect(bad, 'nghi copy hardcode (phải bọc t()): ' + bad.join(' | ')).toEqual([])
  })
})

describe('cấm tính lại nghiệp vụ ở tầng view (pack §6) — neo PC-S-04 · PC-S-02 · PC-G-03', () => {
  it('Map/Score/Shop/End/Album + 3 component không có biểu thức nghiệp vụ nào (1 cái là FAIL)', () => {
    needCorpus(UNITS, 'corpus B3b')
    const bad: string[] = []
    for (const u of UNITS) {
      for (const ban of BUSINESS_BANS) {
        for (const m of matches(ban.re, u.code)) bad.push(u.path + ' [' + ban.why + '] :: ' + lineOf(u.code, m.index))
      }
    }
    expect(bad, 'view tự tính nghiệp vụ: ' + bad.join(' | ')).toEqual([])
  })

  it('MapScene vẽ từ view-model: gọi buildMapModel( và không tự sinh vòng 15 màn', () => {
    const code = unitOf('render/scenes/MapScene.ts').code
    expect(code, 'MapScene phải dựng tab/node từ buildMapModel (pack §1 dòng 22)').toContain('buildMapModel(')
    expect(code, 'MapScene lặp tay 15 màn là hardcode bảng chương').not.toMatch(/for\s*\([^)]*<\s*15\s*;/)
  })

  it('Shop/SkinCard lấy giá từ tầng kinh tế (config/skins.json qua economy), không phải số trong view', () => {
    const shop = unitOf('render/scenes/ShopScene.ts').code + unitOf('render/components/SkinCard.ts').code
    expect(PRICE_SOURCES.find((tok) => shop.includes(tok)),
      'ShopScene/SkinCard không đọc giá từ economy: ' + PRICE_SOURCES.join(' | ')).toBeDefined()
  })

  it('EndScene vẽ totalStars của model — không tự đếm 120, không tự cộng sao (PC-G-01)', () => {
    expect(unitOf('render/scenes/EndScene.ts').code,
      'EndScene phải vẽ tổng sao do model trả').toContain('totalStars')
  })
})

describe('cấm mạng + cấm chạm SDK trần (pack §6, §7 dòng 65) — neo PC-B-03', () => {
  const NET_API = /\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|EventSource|serviceWorker/
  const RAW_SDK = /window\.(?:ytgame|playgama|external)\b|from\s+['"][^'"]*platform\/(?:ytgame|playgama)Adapter/

  it('0 fetch/XHR/WebSocket/sendBeacon trong 8 file B3b (đúng lệnh grep của gate — PC-15)', () => {
    needCorpus(UNITS, 'corpus B3b')
    const bad = UNITS.filter((u) => NET_API.test(u.raw)).map((u) => u.path)
    expect(bad, 'gọi mạng ở: ' + bad.join(', ')).toEqual([])
  })

  it('scene không chạm SDK trần (window.ytgame / adapter trực tiếp) và không có URL http(s)', () => {
    needCorpus(SCENE_UNITS, 'scene')
    const sdk = SCENE_UNITS.filter((u) => RAW_SDK.test(u.code)).map((u) => u.path)
    expect(sdk, 'scene đụng thẳng SDK: ' + sdk.join(', ')).toEqual([])
    const url = UNITS.filter((u) => /https?:\/\//.test(u.code)).map((u) => u.path)
    expect(url, 'URL ngoài ở: ' + url.join(', ')).toEqual([])
  })

  it('mọi scene B3b vào nghiệp vụ qua cửa session duy nhất (readSession/SESSION_KEY)', () => {
    for (const rel of SCENES) {
      expect(unitOf(rel).code, rel + ' không đi qua cửa session (pack §6)').toMatch(/readSession|SESSION_KEY/)
    }
  })
})

describe('interstitial đúng chỗ (PC-14, SPEC:84) — neo PC-A-03 · PC-L-09', () => {
  const AD_CALL = /showInterstitial\s*\(/

  it('chuỗi gọi showInterstitial CHỈ xuất hiện trong ScoreScene.ts của B3b', () => {
    needCorpus(UNITS, 'corpus B3b')
    const hits = UNITS.filter((u) => AD_CALL.test(u.code)).map((u) => u.path)
    expect(hits, 'interstitial sai chỗ (điểm duy nhất là score card): ' + hits.join(', ')).toEqual(['render/scenes/ScoreScene.ts'])
  })

  it('ScoreScene bật ad SAU phần thưởng: sau testid-scorecard-stars và sau callback animate', () => {
    const code = unitOf('render/scenes/ScoreScene.ts').code
    const ad = code.search(AD_CALL)
    expect(ad, 'ScoreScene không gọi interstitial (pack §3 Score)').toBeGreaterThan(-1)
    const stars = code.search(/testid-scorecard-stars/)
    expect(stars, 'ScoreScene thiếu phần thưởng testid-scorecard-stars').toBeGreaterThan(-1)
    expect(ad, 'ad phải sau khi sao đã hiện (PC-14)').toBeGreaterThan(stars)
    expect(code.slice(0, ad), 'ad phải sau callback animate (dur.slow — DS:105)')
      .toMatch(/onComplete|complete|\.then\(|callOnce|setTimeout|tween/i)
  })
})

describe('mapModel.ts là view-model THUẦN, 0 luật mới (pack §1 dòng 22) — neo PC-R-04 · PC-G-02', () => {
  const codeOf = (): string => {
    const u = readUnit(VIEWMODEL)
    expect(u, VIEWMODEL + ' chưa tồn tại').toBeDefined()
    return (u as Unit).code
  }

  it('không import phaser, không DOM, không clock/random, không mạng (thuần PC-02 + PC-15)', () => {
    const c = codeOf()
    expect(c, 'mapModel phải là pure view-model — 0 Phaser (pack §1)').not.toMatch(/from\s+['"]phaser/)
    expect(c).not.toMatch(/Math\.random\s*\(|Date\.now\s*\(|performance\.now\s*\(|new Date\s*\(/)
    expect(c).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon/)
    expect(c).not.toMatch(/document\.|window\./)
  })

  it('ngưỡng + tổng sao lấy từ logic (import progression/stars) — không so sánh với 12 (PC-07)', () => {
    const c = codeOf()
    expect(c, 'mapModel phải đọc khoá/sao từ src/logic (pack §6)').toMatch(/from\s+['"][^'"]*logic\/(?:progression|stars)/)
    expect(c, 'viewmodel tự kiểm ngưỡng 12 là trùng luật với progression').not.toMatch(/[=!><]==?\s*12\b|\b12\s*[=!><]==?/)
    expect(c, 'viewmodel tự cộng sao thay vì gọi sumStars').not.toMatch(/\b(?:stars?|ink|total|sum)\w*\s*(?:\+=|-=|\+\+)/)
  })
})

describe('số đo bố cục pack §3 (DS:102-112) — neo PC-R-01 · PC-R-02', () => {
  it('mọi số đo của Map/Score/Shop/Album có mặt trong corpus B3b (không đổi số âm thầm)', () => {
    needCorpus(UNITS, 'corpus B3b')
    const missing: string[] = []
    for (const row of GEOMETRY) {
      for (const n of row.nums) {
        if (!new RegExp('\\b' + n + '\\b').test(ALL_RAW)) missing.push(row.what + ' -> ' + n)
      }
    }
    expect(missing, 'thiếu số đo pack §3: ' + missing.join(' | ')).toEqual([])
  })
})