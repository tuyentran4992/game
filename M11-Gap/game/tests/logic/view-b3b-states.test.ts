// ============================================================================
// view-b3b-states.test.ts — B3b (nửa 2): BẢNG STATE + hợp đồng nguồn của các scene
// vòng tiến trình (Map/Score/Shop/Album/End + SkinCard). 100% SOURCE-SCAN bằng
// node:fs (không import phaser, không chạy game) => chạy được trong `npm run test:logic`.
// File bị quét CHƯA TỒN TẠI ⇒ mọi it() ở đây ĐỎ hợp lệ (pack b3b.md §1); dev B3b code
// làm cho xanh. CẤM sửa src/ trong phiên test này.
//
// ---------------------------------------------------------------------------
// BẢNG NEO case E2E → rule → it() nào (E2E-TESTS.md:55-115 + pack b3b.md §1,§3,§4,§6)
// | Nhóm | Case E2E             | Rule             | Neo (describe)              |
// |------|----------------------|------------------|-----------------------------|
// | S    | PC-S-02              | PC-11, TC-INC-01 | Shop — bảng 4 trạng thái    |
// | U    | PC-U-01, U-04, U-05   | PC-12, PC-08     | Shop — bảng 4 trạng thái (dòng state phân biệt được, màu qua token) |
// | S    | PC-S-07              | PC-12            | Album + huy hiệu (trần)     |
// | G    | PC-G-01, G-02, G-04  | PC-18, PC-19     | End + vòng Master           |
// | U    | PC-U-02, PC-U-03      | PC-09, PC-19     | End (1 click về map/title, copy qua t()) |
// | G    | PC-G-03              | PC-06, PC-11     | End (0 phép cộng sao/Mực ở view) |
// | S    | PC-S-01,02,03,06     | PC-16, PC-15     | Save-reload contract        |
// | S    | PC-S-04, PC-S-05     | PC-07            | Save-reload (MapScene không tự kiểm 12/15) |
// | A    | PC-A-03, PC-A-04     | PC-14            | Interstitial thứ tự         |
// | R    | PC-R-01..04          | PC-20, PC-02     | Responsive invariants       |
// | U    | PC-U-06              | PC-10            | Phản hồi chạm <=150ms       |
//
// SỐ dùng trong file này CHỈ lấy từ pack b3b.md + config/*.json (đọc ĐỘNG, không chép
// tay) + các dòng DS/SPEC đã dẫn. Giá skin là DỮ LIỆU (pack §6, TC-INC-01) ⇒ test không
// hardcode con số giá, mà cấm scene có con số đó.
// ============================================================================

import { describe, it, expect } from 'vitest'
// @ts-expect-error tsconfig "types": [] — module node có thật lúc chạy, chỉ thiếu khai báo kiểu
import { existsSync, readdirSync, readFileSync } from 'node:fs'
// @ts-expect-error node:url không có khai báo kiểu trong tsconfig này
import { fileURLToPath } from 'node:url'
import { dictOf } from '../../src/logic/i18n'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const SRC = ROOT + 'src/'
const CONFIG = ROOT + 'config/'

/** 6 file B3b mà gói này chịu trách nhiệm quét (pack b3b.md §1). */
const B3B_FILES = [
  'render/scenes/MapScene.ts',
  'render/scenes/ScoreScene.ts',
  'render/scenes/ShopScene.ts',
  'render/scenes/AlbumScene.ts',
  'render/scenes/EndScene.ts',
  'render/components/SkinCard.ts',
] as const
type B3bFile = (typeof B3B_FILES)[number]

const SCENE_FILES: readonly B3bFile[] = [
  'render/scenes/MapScene.ts',
  'render/scenes/ScoreScene.ts',
  'render/scenes/ShopScene.ts',
  'render/scenes/AlbumScene.ts',
  'render/scenes/EndScene.ts',
]
/** 4 màn có bố cục riêng: layout phải đi qua cột + camera fit của B3a (pack §0, §3). */
const LAYOUT_FILES: readonly B3bFile[] = [
  'render/scenes/MapScene.ts',
  'render/scenes/ShopScene.ts',
  'render/scenes/ScoreScene.ts',
  'render/scenes/EndScene.ts',
]
const SHOP_FILES: readonly B3bFile[] = ['render/scenes/ShopScene.ts', 'render/components/SkinCard.ts']
const CARD_FILES: readonly B3bFile[] = ['render/components/SkinCard.ts']
const ALBUM_FILES: readonly B3bFile[] = ['render/scenes/AlbumScene.ts']
const END_FILES: readonly B3bFile[] = ['render/scenes/EndScene.ts']
const SCORE_FILES: readonly B3bFile[] = ['render/scenes/ScoreScene.ts']
const MAP_FILES: readonly B3bFile[] = ['render/scenes/MapScene.ts']
/** Mọi file B3b TRỪ ScoreScene — không được có interstitial (PC-14, điểm duy nhất). */
const NON_SCORE_FILES: readonly B3bFile[] = [
  'render/scenes/MapScene.ts',
  'render/scenes/ShopScene.ts',
  'render/scenes/AlbumScene.ts',
  'render/scenes/EndScene.ts',
  'render/components/SkinCard.ts',
]

/** 4 trạng thái card skin (SPEC §4.5 / DS:108) — 4 dòng của MỘT bảng, phân biệt được. */
const SKIN_STATES = ['locked', 'buyable', 'owned', 'equipped'] as const

/** Cửa hợp lệ cho hồ sơ lưu: export thật của src/logic/save.ts (không đặt tên mới). */
const SAVE_DOOR_FNS = ['loadSave', 'writeSave', 'applyWrite', 'migrateSave', 'defaultSave', 'parseSave']
const SAVE_DOOR_RECEIVER = /\bsession\b|\badapter\b|\bstore\b|SAVE_KEYS/

/** Máy quét: regex phát hiện vi phạm, mỗi cái kèm lý do ở it() gọi nó. */
const RE = {
  storage: /localStorage|sessionStorage|window\s*\.\s*(ytgame|playgama|sdk)/,
  viewport: /innerWidth|innerHeight|\bscreen\s*\./,
  /** key "m11.*" + trường version thuộc saveSchema/SAVE_KEYS (DM:82) — scene cấm có. */
  saveShape: /['"`]m11\.[a-z]+['"`]|version\s*:/,
  /** mọi lệnh lưu/đọc/xoá mà scene gọi (tên bắt đầu bằng load|save|write|reset|migrate). */
  saveCall: /([\w$.]*\b(?:load|save|write|reset|migrate)\w*)\s*\(/g,
  /** chữ hiển thị viết thẳng trong scene (PC-19). */
  tKey: /(?:^|[^\w.])t\(\s*['"`]([^'"`\n]+)['"`]/g,
  nav: /(?:scene\.start|goto|navigate)\s*\(\s*['"`]?([A-Za-z]+)/g,
  /** mảng literal toàn chuỗi = danh sách id hardcode (PC-12). */
  idArray: /\[([^\[\]]+)\]/g,
  item: /['"`][^'"`\n]+['"`]/g,
  hex: /#[0-9a-fA-F]{6}\b/,
  ms: /duration\s*:\s*(\d+)/g,
  slice: /\.slice\s*\(/g,
  elseIf: /else\s+if/g,
  masterCall: /\b([A-Za-z_]\w*[Mm]aster\w*)\s*\(/g,
  flagSet: /\b(timerOn|hintOn|showHint|isMaster|masterMode)\s*[:=]\s*(?:true|false|1|0)\b/,
  money: /\b(money|cash|coin|gem|usd|dollar|payWall|realMoney)\w*\b/i,
  interstitial: /showInterstitial|interstitial/i,
  touch: /pressScale|pointerdown|TOUCH\s*\./,
} as const
// ------------------------------------------------------------- bộ quét nguồn --
type Unit = {
  /** đường dẫn tương đối so với src/ */
  readonly path: string
  /** đã cắt comment, GIỮ nguyên chuỗi (quét chữ hiển thị / testid). */
  readonly code: string
  /** đã cắt comment + nội dung chuỗi (quét định danh + số, không bị oan vì chữ). */
  readonly masked: string
  readonly strings: readonly string[]
}

type Span = { readonly start: number; readonly end: number; readonly text: string }

/** Cắt comment dòng + comment khối: comment tiếng Việt không phải copy UI (PC-19). */
function stripComments(src: string): string {
  const endBlock = '*/'
  let out = ''
  let i = 0
  while (i < src.length) {
    const c = src[i]
    const d = src[i + 1]
    if (c === '/' && d === '*') {
      const j = src.indexOf(endBlock, i + 2)
      i = j < 0 ? src.length : j + 2
      out += ' '
      continue
    }
    if (c === '/' && d === '/') {
      const j = src.indexOf('\n', i)
      i = j < 0 ? src.length : j
      continue
    }
    out += c
    i += 1
  }
  return out
}

/** Mask nội dung chuỗi (giữ chỉ số tương đối của code cho tới khi mask). */
function maskStrings(code: string): { masked: string; strings: string[] } {
  const out: string[] = []
  const strings: string[] = []
  let i = 0
  while (i < code.length) {
    const c = code[i]
    if (c === "'" || c === '"' || c === '`') {
      let j = i + 1
      let body = ''
      while (j < code.length) {
        if (code[j] === '\\') { body += code[j + 1] ?? ''; j += 2; continue }
        if (code[j] === c) break
        body += code[j]
        j += 1
      }
      strings.push(body)
      out.push(c, ' ', c)
      i = j + 1
      continue
    }
    out.push(c)
    i += 1
  }
  return { masked: out.join(''), strings }
}

function walkTs(absDir: string): string[] {
  if (!existsSync(absDir)) return []
  const out: string[] = []
  for (const e of readdirSync(absDir, { withFileTypes: true })) {
    const p = absDir + '/' + e.name
    if (e.isDirectory()) out.push(...walkTs(p))
    else if (e.name.endsWith('.ts') && !e.name.endsWith('.d.ts')) out.push(p)
  }
  return out.sort()
}

function unitOf(abs: string): Unit {
  const code = stripComments(readFileSync(abs, 'utf8'))
  const box = maskStrings(code)
  return { path: abs.slice(SRC.length), code, masked: box.masked, strings: box.strings }
}

/** Corpus = tầng view (pack §1: src/render + src/ui). Rỗng ⇒ mọi it() ĐỎ, không pass giả. */
const VIEW: Unit[] = [...walkTs(SRC + 'render'), ...walkTs(SRC + 'ui')].map(unitOf)
const BY_PATH = new Map<string, Unit>(VIEW.map((u) => [u.path, u]))
/** src/logic ở dạng masked: chứng minh hàm mà scene gọi CÓ THẬT thuộc logic (pack §6). */
const LOGIC_MASKED = walkTs(SRC + 'logic')
  .map((f) => maskStrings(stripComments(readFileSync(f, 'utf8'))).masked)
  .join('\n')

function needFiles(paths: readonly string[], what: string): Unit[] {
  const missing = paths.filter((p) => !existsSync(SRC + p))
  expect(missing, what + ' — chưa tồn tại: ' + missing.join(', ') + '  (RED hợp lệ, pack §1)').toEqual([])
  return paths.map((p) => BY_PATH.get(p)).filter((u): u is Unit => u !== undefined)
}

const numLits = (masked: string): number[] =>
  (masked.match(/(?<![\w.])\d+(?:\.\d+)?(?![\w.])/g) ?? []).map(Number)

const lineAt = (src: string, index: number): number => src.slice(0, index).split('\n').length
const atLine = (u: Unit, re: RegExp): string => u.path + ':' + lineAt(u.masked, u.masked.search(re))
const filesWith = (re: RegExp, units: readonly Unit[]): string[] =>
  units.filter((u) => re.test(u.code)).map((u) => u.path)
const maskedWith = (re: RegExp, units: readonly Unit[]): string[] =>
  units.filter((u) => re.test(u.masked)).map((u) => atLine(u, re))

/** Mọi span brace cân bằng (đủ cho file scene vài trăm dòng). */
function braceBlocks(text: string): Span[] {
  const out: Span[] = []
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] !== '{') continue
    let depth = 0
    for (let j = i; j < text.length; j += 1) {
      if (text[j] === '{') depth += 1
      else if (text[j] === '}') {
        depth -= 1
        if (depth === 0) {
          out.push({ start: i, end: j + 1, text: text.slice(i, j + 1) })
          break
        }
      }
    }
  }
  return out
}

/** Block trong cùng chứa một vị trí — dùng hỏi "lệnh này nằm trong callback nào?". */
function innermostBlock(text: string, idx: number): Span | null {
  let best: Span | null = null
  for (const b of braceBlocks(text)) {
    if (idx < b.start || idx >= b.end) continue
    if (best === null || b.end - b.start < best.end - best.start) best = b
  }
  return best
}

/** Registry state: một block chứa đủ 4 khoá trạng thái (bảng dữ liệu, không rải if/else). */
const keyRe = (key: string): RegExp => new RegExp('\\b' + key + '\\s*:')
function stateTableOf(u: Unit): Span | null {
  return braceBlocks(u.masked).find((b) => SKIN_STATES.every((k) => keyRe(k).test(b.text))) ?? null
}

/** Vùng dữ liệu của MỘT dòng bảng: từ `key:` tới `key:` kế tiếp. */
function rowOf(block: Span, key: string): string {
  const at = keyRe(key).exec(block.text)
  if (at === null) return ''
  const rest = block.text.slice(at.index)
  const cut = SKIN_STATES.map((k) => keyRe(k).exec(rest.slice(1)))
    .filter((m): m is RegExpExecArray => m !== null)
    .map((m) => m.index + 1)
    .sort((a, b) => a - b)[0]
  return cut === undefined ? rest : rest.slice(0, cut)
}

// ------------------------------------------- DỮ LIỆU config (đọc ĐỘNG, không chép) --
type SkinRow = { readonly id: string; readonly ink: number }
type Caps = { readonly albumItems: number; readonly badges: number }

/** Bảng giá PC-12 — nguồn duy nhất của con số giá (pack §6: scene chỉ đọc). */
function skinPrices(): readonly SkinRow[] {
  const box = JSON.parse(readFileSync(CONFIG + 'skins.json', 'utf8')) as { prices?: SkinRow[] }
  return box.prices ?? []
}
/** Trần cứng PC-12 (album / badge) — test dùng để biết trần, KHÔNG chép số vào assert. */
function albumCaps(): Caps {
  const box = JSON.parse(readFileSync(CONFIG + 'album.json', 'utf8')) as { caps?: Partial<Caps> }
  return { albumItems: box.caps?.albumItems ?? 0, badges: box.caps?.badges ?? 0 }
}
const literalRows = (arrayText: string): number => (arrayText.match(RE.item) ?? []).length
// ============================================================================
// 1) SHOP — bảng 4 trạng thái skin. Nguồn: SPEC §4.5 + DS:108 (lưới 2x4 card 260x300,
//    đã mua = ✓, đang dùng = viền primary 4px, thiếu Mực = disabled) + pack §6
//    (mọi phán quyết mua được/không lấy từ economy.ts, scene chỉ vẽ).
//    E2E neo: PC-S-02 (reload/reset không mất skin đã mua).
// ============================================================================
describe('Shop — bảng 4 trạng thái skin (PC-11 · SPEC §4.5 · DS:108 · E2E PC-S-02)', () => {
  it('PC-S-02 · pack §1: đủ 6 file B3b để quét (5 scene vòng tiến trình + SkinCard)', () => {
    needFiles(B3B_FILES, 'file B3b')
  })

  it('PC-S-02 · PC-11: SkinCard có registry 4 trạng thái locked/buyable/owned/equipped ở MỘT bảng', () => {
    const [card] = needFiles(CARD_FILES, 'SkinCard')
    expect(stateTableOf(card), 'SkinCard: không có block nào chứa đủ 4 khoá locked:/buyable:/owned:/equipped:').not.toBeNull()
  })

  it('PC-S-02 · DS:108: 4 dòng bảng state phân biệt được thật (mờ khoá / giá / ✓ / viền equip)', () => {
    const [card] = needFiles(CARD_FILES, 'SkinCard')
    const table = stateTableOf(card)
    if (table === null) throw new Error('chưa có bảng state 4 dòng trong SkinCard.ts')
    const row = (k: string): string => rowOf(table, k)
    expect(row('locked'), 'row locked thiếu dấu khoá (alpha/lock/dim/disabled)').toMatch(/alpha|lock|dim|disabled/i)
    expect(row('buyable'), 'row buyable thiếu giá Mực (price/ink/cost)').toMatch(/price|ink|cost/i)
    expect(row('owned'), 'row owned thiếu nhãn đã sở hữu (owned/✓/check)').toMatch(/owned|check|tick|✓/i)
    expect(row('equipped'), 'row equipped thiếu tham chiếu token màu primary').toMatch(/primary/i)
    expect(card.strings.some((s) => s.includes('✓')), 'SkinCard thiếu glyph ✓ (DS:108: đã mua = dấu ✓)').toBe(true)
  })

  it('PC-S-02 · A4: trạng thái vẽ bằng tra bảng, không chuỗi if/else >=3 nhánh trên state', () => {
    const units = needFiles(SHOP_FILES, 'ShopScene + SkinCard')
    const bad: string[] = []
    for (const u of units) {
      const branches = (u.code.match(RE.elseIf) ?? []).length
      if (branches > 1) bad.push(u.path + ' = ' + branches + ' nhánh else if')
      if (!/\[\s*\w*(state|status)\w*\s*\]/.test(u.masked)) bad.push(u.path + ' không tra bảng bằng [state]/[status]')
    }
    expect(bad, 'state phải là registry (pack §6, luật ở logic): ' + bad.join(' | ')).toEqual([])
  })

  it('PC-S-02 · TC-INC-01: giá là DỮ LIỆU từ config/skins.json — scene không có con số giá', () => {
    const units = needFiles(SHOP_FILES, 'ShopScene + SkinCard')
    const banned = skinPrices().map((p) => p.ink).filter((n) => n >= 10)
    expect(banned.length, 'config/skins.json rỗng bảng giá — không có dữ liệu để quét').toBeGreaterThan(0)
    const bad: string[] = []
    for (const u of units) {
      const nums = numLits(u.masked)
      for (const price of banned) if (nums.includes(price)) bad.push(u.path + ' có literal giá ' + price)
      if (!/price|prices|\bink\b/i.test(u.code)) bad.push(u.path + ' không đọc bảng giá (SkinPrice[]) từ dữ liệu')
    }
    expect(bad, 'giá phải đi qua economy.ts + config/skins.json, không hardcode: ' + bad.join(' | ')).toEqual([])
  })

  it('PC-S-02 · TC-INC-01: id skin cũng là dữ liệu — shop không hardcode chuỗi skin_…', () => {
    const units = needFiles(SHOP_FILES, 'ShopScene + SkinCard')
    const lit = units.flatMap((u) => u.strings.filter((s) => s.startsWith('skin_')).map((s) => u.path + ':' + s))
    expect(lit, 'danh sách skin phải dựng từ config/skins.json: ' + lit.join(', ')).toEqual([])
  })

  it('PC-S-02 · PC-11: không đường tiền thật trong shop (money/cash/coin/gem/usd/paywall)', () => {
    const units = needFiles(SHOP_FILES, 'ShopScene + SkinCard')
    expect(filesWith(RE.money, units), 'Mực Gấp là loại tiền duy nhất (pack §3): ' + filesWith(RE.money, units).join(', ')).toEqual([])
  })

  it('PC-S-02 · PC-19: không định nghĩa lại palette — 0 hex literal trong file B3b', () => {
    const units = needFiles(B3B_FILES, 'file B3b')
    const bad = filesWith(RE.hex, units)
    expect(bad, 'viền equipped #1F6FEB phải lấy qua token theme/constant B3a: ' + bad.join(', ')).toEqual([])
    const [card] = needFiles(CARD_FILES, 'SkinCard')
    expect(card.code, 'SkinCard không tham chiếu token màu nào của theme/B3a').toMatch(/theme\.|PRIMARY|primaryColor|paperTheme|parseHex/)
  })

  it('PC-S-02 · DS:108: "đang dùng" = viền 4px màu primary, và #1F6FEB khai ở ĐÚNG MỘT nơi ngoài scene (token SSOT)', () => {
    const [card] = needFiles(CARD_FILES, 'SkinCard')
    const table = stateTableOf(card)
    if (table === null) throw new Error('chưa có bảng state 4 dòng trong SkinCard.ts (xem it PC-11 ở trên)')
    expect(rowOf(table, 'equipped'), 'row equipped thiếu bề dày viền 4px (DS:108: đang dùng = viền primary 4px)').toMatch(/\b4\b/)
    const hexHits = VIEW.filter((u) => u.strings.some((s) => s.toUpperCase() === '#1F6FEB')).map((u) => u.path)
    expect(hexHits.length, '#1F6FEB phải là token khai báo MỘT lần duy nhất (pack §2), đã thấy ở: ' + hexHits.join(', ')).toBe(1)
    expect(hexHits[0].startsWith('render/scenes/'), '#1F6FEB nằm trong scene = palette bị định nghĩa lại ở view').toBe(false)
  })
})

// ============================================================================
// 2) ALBUM + HUY HIỆU — trần cứng PC-12 (DS:109 lưới 4 cột 200x200, badge ⌀96;
//    DM:251-253 + pack §6: scene đọc danh sách đã mở TỪ logic, không tự cấp/tự cắt).
//    E2E neo: PC-S-07 (album + badge sáng đúng 1 sau khép chương).
// ============================================================================
describe('Album + huy hiệu — trần cứng PC-12 (E2E PC-S-07 · DS:109 · DM:251-253)', () => {
  it('PC-S-07 · PC-12: AlbumScene không tự lọc — 0 phép .slice( và 0 bộ lọc id trong scene', () => {
    const [u] = needFiles(ALBUM_FILES, 'AlbumScene')
    const cut = (u.masked.match(RE.slice) ?? []).length
    expect(cut, 'AlbumScene gọi .slice( ' + cut + ' lần = scene tự cắt theo trần (pack §6)').toBe(0)
    expect(u.code, 'AlbumScene phải render đúng số mục logic đưa (vòng lặp trên rows/items/length)').toMatch(/\brows\b|\bitems\b|\bcards\b|\.length|\bmap\(/)
  })

  it('PC-S-07 · PC-12: không mảng id album/badge hardcode dài hơn trần 14/6 của config/album.json', () => {
    const [u] = needFiles(ALBUM_FILES, 'AlbumScene')
    const caps = albumCaps()
    expect(caps.albumItems, 'config/album.json thiếu caps.albumItems').toBeGreaterThan(0)
    const bad: string[] = []
    for (const m of u.code.matchAll(RE.idArray)) {
      const items = literalRows(m[1])
      if (items < 2) continue
      const isBadge = /badge/i.test(m[1])
      const cap = isBadge ? caps.badges : caps.albumItems
      if (items > cap) bad.push('mảng ' + items + ' id ' + (isBadge ? 'badge' : 'album') + ' > trần ' + cap)
    }
    expect(bad, 'scene không được sở hữu danh sách id: ' + bad.join(' | ')).toEqual([])
  })

  it('PC-S-07 · PC-12: trần 14/6 là dữ liệu config — scene không khai lại con số trần', () => {
    const [u] = needFiles(ALBUM_FILES, 'AlbumScene')
    const caps = albumCaps()
    const nums = numLits(u.masked)
    const bad = [caps.albumItems, caps.badges].filter((c) => nums.includes(c))
    expect(bad, 'trần phải truyền qua tham số cho addAlbumItems/awardBadge: ' + bad.join(', ')).toEqual([])
  })

  it('PC-S-07 · PC-12: silhouette xám là TRẠNG THÁI do logic báo, không phải mục bị ẩn khỏi lưới', () => {
    const [u] = needFiles(ALBUM_FILES, 'AlbumScene')
    expect(u.code, 'AlbumScene phải đọc cờ đã-mở từ dữ liệu logic (unlocked/earned/collected)').toMatch(/\bunlocked\b|\bearned\b|\bcollected\b|\bisOpen\b/)
    expect(u.code, 'màu silhouette phải là token theme (shade/crease/ink), không tự chế').toMatch(/theme\.|shade|crease|\bink\b|parseHex/)
  })
})
// ============================================================================
// 3) END + vòng MASTER — PC-18 (DS:111-112: tổng sao /120, copy "You unfolded all
//    120", testid-end-master; pack §6 + E2E PC-G-02: master = ẩn hint + không timer,
//    cờ do logic quyết — scene chỉ dispatch và chỉ vẽ).  E2E neo: G-01, G-02, G-04.
// ============================================================================
describe('End + vòng Master — PC-18 (E2E PC-G-01, G-02, G-04 · SPEC:151 · DS:111-112)', () => {
  it('PC-G-01 · PC-18/PC-19: copy "all 120" đi qua t(key) và key đó có bản EN trong DICTIONARIES', () => {
    const [u] = needFiles(END_FILES, 'EndScene')
    const dict = dictOf('en')
    const keys = [...u.code.matchAll(RE.tKey)].map((m) => m[1])
    const resolved = keys.filter((k) => (dict[k] ?? '').includes('all 120'))
    expect(resolved, 'EndScene: không t(key) nào giải ra bản EN chứa "all 120" (đã quét ' + keys.length + ' key)').not.toEqual([])
    const inline = u.strings.filter((s) => s.includes('all 120'))
    expect(inline, 'copy hiển thị phải sống ở i18n, không viết thẳng trong scene: ' + inline.join(' / ')).toEqual([])
  })

  it('PC-G-02 · PC-18: EndScene mở master qua MỘT hàm logic (hàm phải có thật trong src/logic)', () => {
    const [u] = needFiles(END_FILES, 'EndScene')
    const calls = [...u.masked.matchAll(RE.masterCall)].map((m) => m[1])
    expect(calls.length, 'EndScene không gọi hàm master nào — dispatch phải qua logic (pack §6)').toBeGreaterThan(0)
    const notInLogic = [...new Set(calls)].filter((fn) => !new RegExp('\\b' + fn + '\\b').test(LOGIC_MASKED))
    expect(notInLogic, 'hàm master không thuộc src/logic (scene tự đặt cờ): ' + notInLogic.join(', ')).toEqual([])
  })

  it('PC-G-02 · PC-18: 0 lần gán timerOn/hint/master trong tầng view — PlayScene phải NHẬN cờ', () => {
    needFiles(B3B_FILES, 'file B3b')
    const bad = maskedWith(RE.flagSet, VIEW)
    expect(bad, 'cờ timer/hint sinh ra ở logic (LevelSpec/progression), không set trong scene: ' + bad.join(', ')).toEqual([])
  })

  it('PC-G-04 · PC-16/PC-18: EndScene có nút master + đường về map/title (không kẹt end screen)', () => {
    const [u] = needFiles(END_FILES, 'EndScene')
    expect(u.code, 'EndScene thiếu đăng ký testid-end-master (DS:112)').toContain('testid-end-master')
    const nav = [...u.code.matchAll(RE.nav)].map((m) => m[1])
    expect(nav.some((k) => /map|title/i.test(k)), 'không thấy đường về map/title, chỉ có: ' + nav.join(', ')).toBe(true)
  })

  it('PC-G-03 · PC-06/PC-11: 0 phép cộng/trừ sao và Mực trong tầng view (sao vòng chính không cộng 2 lần)', () => {
    needFiles(B3B_FILES, 'file B3b')
    const ADD = /\bstars\w*\s*(?:\+=|\+\s*1)|(?:\+=|-=)\s*\w*(?:stars?|ink)\b|\bink\s*(?:\+=|-=)/
    const bad = maskedWith(ADD, VIEW)
    expect(bad, 'số học sao/Mực thuộc stars.ts + economy.ts, view chỉ đọc kết quả (pack §6): ' + bad.join(', ')).toEqual([])
  })
})

// ============================================================================
// 4) SAVE-RELOAD — PC-16 (pack §6: save/records là việc của logic + adapter.storage;
//    PC-15 + ADR-01: tầng view không chạm nền tảng).  E2E neo: S-01 (reload giữa
//    chương), S-02 (reset giữ skin đã mua), S-03 (JSON rác không crash), S-06 (key+version).
// ============================================================================
describe('Save-reload — hợp đồng PC-16 (E2E PC-S-01, S-02, S-03, S-06 · PC-15 · ADR-01)', () => {
  it('PC-S-01,03 · PC-16/PC-15: 0 lần localStorage/sessionStorage/window.ytgame trong src/render + src/ui', () => {
    needFiles(B3B_FILES, 'file B3b')
    const bad = maskedWith(RE.storage, VIEW)
    expect(bad, 'mọi lưu/đọc đi qua save.ts + adapter.storage: ' + bad.join(', ')).toEqual([])
  })

  it('PC-S-01,02 · PC-16: mọi lệnh load|save|write|reset|migrate trong scene B3b gọi qua cửa logic/session/adapter', () => {
    const units = needFiles(B3B_FILES, 'file B3b')
    const bad: string[] = []
    for (const u of units) {
      for (const m of u.masked.matchAll(RE.saveCall)) {
        const callee = m[1]
        const leaf = callee.split('.').pop() ?? callee
        if (SAVE_DOOR_FNS.includes(leaf) || SAVE_DOOR_RECEIVER.test(callee)) continue
        bad.push(u.path + ':' + lineAt(u.masked, m.index) + ' ' + callee + '(')
      }
    }
    expect(bad, 'cửa hợp lệ = ' + SAVE_DOOR_FNS.join('/') + ' hoặc receiver session./adapter.: ' + bad.join(', ')).toEqual([])
  })

  it('PC-S-06 · PC-16: scene không tự dựng object save / không tự đặt key storage', () => {
    const units = needFiles(B3B_FILES, 'file B3b')
    const bad = filesWith(RE.saveShape, units)
    expect(bad, 'key "m11.save" + trường version thuộc saveSchema/SAVE_KEYS (DM:82): ' + bad.join(', ')).toEqual([])
  })

  it('PC-S-02 · PC-16/PC-17: reset ở Settings là confirm 2 bước và vẫn đi qua cửa save', () => {
    const [u] = needFiles(MAP_FILES, 'MapScene (Settings modal — pack §3)')
    expect(u.code, 'MapScene thiếu nút reset settings testid-set-reset').toContain('testid-set-reset')
    expect(u.code, 'reset phải confirm 2 bước, không xoá ngay ở nhát bấm đầu (PC-17)').toMatch(/confirm|armed|arm\(|pending|secondTap/i)
    const bareWipe = /\.(?:remove|clear)\s*\(/.test(u.masked) && !SAVE_DOOR_RECEIVER.test(u.masked)
    expect(bareWipe, 'MapScene gọi thẳng phép xoá storage thay vì qua cửa save của logic').toBe(false)
  })

  it('PC-S-04,05 · PC-07: MapScene không tự kiểm ngưỡng khoá — 0 literal 12/15, 0 so sánh trên sao, copy khoá qua t()', () => {
    const [u] = needFiles(MAP_FILES, 'MapScene')
    const bad: string[] = []
    if (numLits(u.masked).some((n) => n === 12 || n === 15)) bad.push('chép tay ngưỡng 12/15 (SSOT: GATE_STARS ở progression.ts)')
    if (/\b(?:stars|starCount|starsAt)\s*(?:>=|<=|>|<|===|!==)/.test(u.code)) bad.push('scene tự so sánh sao để suy ra khoá/mở')
    expect(bad, 'điều kiện mở khoá phải là dữ liệu logic đưa xuống (pack §6): ' + bad.join(' | ')).toEqual([])
    expect(u.code, 'MapScene thiếu dòng điều kiện khoá cho QA (testid-map-locked — pack §3)').toContain('testid-map-locked')
    expect(u.code, 'copy "cần 12/15 ★" phải qua i18n, không viết thẳng trong scene (PC-19)').toMatch(/t\(\s*['"`][^'"`\n]+['"`]/)
  })
})
// ============================================================================
// 5) INTERSTITIAL THỨ TỰ — PC-14 (SPEC:84 + DS:105:ScoreScene là ĐIỂM DUY NHẤT có
//    interstitial và chỉ sau khi panel + sao animate xong).  E2E neo: A-03, L-09, A-04.
//    Bằng chứng: lời gọi ad phải nằm trong callback onComplete của tween, không trần
//    trong create().  Scene B3b khác: 0 lời gọi ad.
// ============================================================================
describe('Interstitial — thứ tự PC-14 (E2E PC-A-03, PC-L-09, PC-A-04)', () => {
  it('PC-A-03 · PC-14: ScoreScene gọi interstitial TRONG callback onComplete của tween sao', () => {
    const [u] = needFiles(SCORE_FILES, 'ScoreScene')
    const idx = u.masked.search(/showInterstitial\s*\(/)
    expect(idx, 'ScoreScene không gọi showInterstitial (điểm ad duy nhất = score card, DS:105)').toBeGreaterThan(-1)
    const host = innermostBlock(u.masked, idx)
    if (host === null) throw new Error('không tìm được khối chứa lời gọi ad')
    const before = host.text.slice(0, idx - host.start)
    expect(/onComplete/.test(before), 'lời gọi ad không nằm sau onComplete của tween thưởng (PC-14)').toBe(true)
    expect(/DUR\.pop/.test(u.code), 'phải chờ tween sao DUR.pop (DS:125) xong rồi mới tới ad').toBe(true)
    expect(/create\s*\(/.test(before), 'ad gọi trần ngay trong create() = FAIL (PC-A-04)').toBe(false)
  })

  it('PC-A-04 · PC-14: 0 lời gọi interstitial ở các scene B3b khác (đã quét lại để lấy bằng chứng)', () => {
    const units = needFiles(NON_SCORE_FILES, 'scene B3b còn lại')
    const bad = filesWith(RE.interstitial, units)
    expect(bad, 'ad chỉ ở ranh giới chương, sau score card (SPEC:84): ' + bad.join(', ')).toEqual([])
  })
})

// ============================================================================
// 6) RESPONSIVE INVARIANTS — PC-R-01..04 (pack §0: camera 1920x1080 Scale.FIT, playfield
//    cột 720px DS:35-36; mọi kích thước B3a quy về TỶ LỆ THEO CHIỀU CAO trong layout.ts).
// ============================================================================
describe('Responsive — PC-R-01..04 (E2E PC-R-01..04 · PC-20 · pack §0 cột 720)', () => {
  it('PC-R-01..03 · PC-20: 0 lần innerWidth/innerHeight/screen.* trong src/render + src/ui', () => {
    needFiles(B3B_FILES, 'file B3b')
    const bad = maskedWith(RE.viewport, VIEW)
    expect(bad, 'resize phải qua Scale manager, không đọc px trình duyệt: ' + bad.join(', ')).toEqual([])
  })

  it('PC-R-01..03 · PC-20: Map/Shop/Score/End dựng bố cục qua layoutOf(), không tự tính cột 720, không px >1080', () => {
    const units = needFiles(LAYOUT_FILES, '4 scene có bố cục')
    const bad: string[] = []
    for (const u of units) {
      if (!/layoutOf\s*\(/.test(u.code)) bad.push(u.path + ' không gọi layoutOf(')
      if (/\b720\b|0\.6667/.test(u.masked)) bad.push(u.path + ' hardcode bề rộng cột (SSOT: R.field ở render/layout.ts)')
      const over = numLits(u.masked).filter((n) => n > 1080)
      if (over.length > 0) bad.push(u.path + ' pixel tuyệt đối >1080: ' + [...new Set(over)].join(','))
    }
    expect(bad, 'mọi layout phải qua cột 720 + camera fit của B3a: ' + bad.join(' | ')).toEqual([])
  })

  it('PC-R-04 · PC-02/PC-16: file có handler resize không sinh lại đề (chỉ vẽ lại)', () => {
    needFiles(B3B_FILES, 'file B3b')
    const bad: string[] = []
    for (const u of VIEW) {
      if (!/\bresize\b/.test(u.code)) continue
      for (const gen of ['makeSpec(', 'levelSpec(', 'generateLevel(', 'Math.random(']) {
        if (u.masked.includes(gen)) bad.push(u.path + ' chứa ' + gen + ' — resize không được đổi đề (R-04)')
      }
    }
    expect(bad, bad.join(' | ')).toEqual([])
  })
})

// ============================================================================
// 7) PHẢN HỒI <=150ms — PC-U-06 (pack §4 DS:126: chạm ô = dur.fast, scale 0,96;
//    DS:123 panel Score vào 400ms là transition, KHÔNG phải feedback chạm).
//    Cửa duy nhất có feedback chạm là ui/button.ts (makeButton: TOUCH.pressScale +
//    DUR.fast/2) ⇒ scene B3b không được tự setInteractive, không được tự đặt ms.
// ============================================================================
describe('Phản hồi chạm <=150ms — PC-U-06 (E2E PC-U-06 · pack §4 DS:126)', () => {
  it('PC-U-06 · pack §4: mọi node bấm được của B3b tạo qua makeButton (0 setInteractive trần)', () => {
    const units = needFiles(B3B_FILES, 'file B3b')
    const bad: string[] = []
    for (const u of units) {
      if (/setInteractive\s*\(/.test(u.masked)) bad.push(u.path + ' tự setInteractive(')
      if (SCENE_FILES.includes(u.path as B3bFile) && !/makeButton/.test(u.code)) {
        bad.push(u.path + ' không dùng makeButton => mất DUR.fast + pressScale 0,96')
      }
    }
    expect(bad, 'ui/button.ts là cửa duy nhất cho phản hồi chạm (DS:126/PC-U-06): ' + bad.join(' | ')).toEqual([])
  })

  it('PC-U-06 · DS:126/DS:123: tween chạm <=150ms, transition panel <=400ms, không ms vượt trần', () => {
    const units = needFiles(B3B_FILES, 'file B3b')
    const bad: string[] = []
    for (const u of units) {
      for (const m of u.masked.matchAll(RE.ms)) {
        const ms = Number(m[1])
        const host = innermostBlock(u.masked, m.index)
        const isTouch = host !== null && RE.touch.test(host.text)
        const at = u.path + ':' + lineAt(u.masked, m.index)
        if (ms > 150 && isTouch) bad.push(at + ' feedback chạm ' + ms + 'ms > 150ms')
        if (ms > 400) bad.push(at + ' duration ' + ms + 'ms > trần transition 400ms (DS:105,123)')
      }
    }
    expect(bad, 'nhịp chạm lấy từ DUR.fast (120ms) của B3a, không khai lại ms: ' + bad.join(' | ')).toEqual([])
  })
})
