// ============================================================================
// view-b3a-contract.test.ts — B3a: HỢP ĐỒNG TĨNH đo bằng QUÉT NGUỒN (node:fs).
//
// Đối tượng quét: src/render/** + src/ui/** (pack b3a.md §1). Hai thư mục này CHƯA tồn
// tại => mọi it() ở đây ĐỎ vì corpus rỗng (có guard "corpus phải khác rỗng" — không cho
// pass giả tạo). CẤM sửa src/ trong phiên này: đỏ là đích, dev B3a làm cho xanh.
//
// ---------------------------------------------------------------------------
// BẢNG NEO E2E (E2E-TESTS.md:21-37; Hermes chạy Playwright+vision sau build):
// | Case E2E  | Kỳ vọng nhìn thấy                        | Rule | Neo ở it() nào |
// |-----------|------------------------------------------|------|----------------|
// | PC-B-01   | title <=3s, canvas boot, 0 console error | PC-20/PC-10 | "đủ 10 file B3a" + "mọi scene gọi registerTestid" |
// | PC-B-02   | Title 9:16, không scrollbar, HUD không hiện nhầm | PC-20 | "20 testid phủ đủ" + "registerTestid 5 tham số + window.__pcTestids" |
// | PC-B-03   | 0 call mạng ngoài localhost              | PC-15 | "không fetch/XHR/WebSocket/sendBeacon" + "không URL http(s) trong code" |
// | PC-B-04   | reload 3 lần sạch                        | PC-20 | (geometry file — lịch THUẦN, không random/clock) |
// | PC-B-05   | màn loading có tiến trình, không trắng   | PC-20 | "đủ 10 file B3a (BootScene.ts có trong danh sách)" |
// | PC-O-01   | 1 click vào chơi với 4 ô bấm được        | PC-09 | "option-0..3 là 4 id độc lập, không có option-4" |
// | PC-O-02   | màn 1 không cần đọc chữ vẫn hiểu          | PC-09/PC-19 | "setText/text: phải bọc t()" + "không literal display-string" |
// | PC-O-03   | nếp "thở" đúng 1 lần                     | PC-09 | (geometry file — breathPlan repeats=2) |
// | PC-O-04   | 60s đầu không popup/interstitial          | PC-09/PC-14 | "không call mạng" + (vision) |
// | PC-O-05   | không win screen, màn kế đã gấp sẵn       | PC-09/PC-07 | "cấm copy win screen + scene.start màn kết quả" |
// | PC-L-05   | bấm giữa animate không xử lý sai lượt     | PC-05/PC-16 | "scene không so sánh correctIndex" + "render không export hàm đúng/sai" |
// | PC-U-05   | không vùng "ảo giác nút"                  | PC-20 | "registerTestid(id,x,y,w,h)" — rect đăng ký là hit area thật |
//
// Bảng 20 testid B3a chép TAY từ pack b3a.md §6 (nguồn DESIGN-SPEC §4:76-99 +
// SPEC:118-133,139-141). 14 id còn lại (map/scorecard/shop/album/settings/end) thuộc B3b.
// ============================================================================

import { describe, it, expect } from 'vitest'
// tsconfig "types": [] ⇒ không có khai báo kiểu cho node:* (vitest vẫn chạy trong node),
// cùng cách config-caps.test.ts / i18n.test.ts đã dùng.
// @ts-expect-error module node:fs có thật lúc chạy, chỉ thiếu khai báo kiểu trong tsconfig
import { existsSync, readdirSync, readFileSync } from 'node:fs'
// @ts-expect-error module node:url có thật lúc chạy, chỉ thiếu khai báo kiểu trong tsconfig
import { fileURLToPath } from 'node:url'

const SRC_DIR = fileURLToPath(new URL('../../src/', import.meta.url))

// --- BẢNG DỮ LIỆU: file + testid mà B3a NỢ (pack §1 + §6) ------------------
const REQUIRED_FILES = [
  'render/anim/unfoldPlan.ts',
  'render/theme/paperTheme.ts',
  'render/scenes/BootScene.ts',
  'render/scenes/TitleScene.ts',
  'render/scenes/PlayScene.ts',
  'render/components/SheetView.ts',
  'render/components/OptionCard.ts',
  'render/components/StarRow.ts',
  'render/components/InkBadge.ts',
  'ui/testids.ts',
]
const B3A_TESTIDS: readonly string[] = [
  'testid-title-play',
  'testid-title-shop',
  'testid-hud-level',
  'testid-hud-stars',
  'testid-hud-ink',
  'testid-btn-sound',
  'testid-btn-menu',
  'testid-sheet-folded',
  'testid-sheet-hole',
  'testid-hint-breath',
  'testid-option-0',
  'testid-option-1',
  'testid-option-2',
  'testid-option-3',
  'testid-btn-hint',
  'testid-btn-undo',
  'testid-unfold-anim',
  'testid-feedback-wrong',
  'testid-btn-retry',
  'testid-btn-undo-ad',
]
const REQUIRED_SCENES = ['render/scenes/BootScene.ts', 'render/scenes/TitleScene.ts', 'render/scenes/PlayScene.ts']

/**
 * CỬA đăng ký rect QA mà một scene được phép gọi khi dựng. A9 dồn phép đổi toạ độ
 * world -> px vào `ui/testids.makeTestidHook` (scene không copy lại phép nhân sx/sy), nên
 * Title/Play dựng cửa rồi gọi `this.hook(id, box)`; Boot chưa có camera resize thì gọi
 * `registerTestid` thẳng. Thêm một cửa mới = thêm một token, không thêm nhánh if.
 */
const REGISTER_DOORS = ['registerTestid(', 'makeTestidHook(']

// --- bộ quét nguồn ----------------------------------------------------------
type Unit = { readonly path: string; readonly raw: string; readonly code: string }

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

/** Cắt // và /* *\/ để máy quét chỉ nhìn CODE (comment tiếng Việt được phép — không hiển thị). */
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

const UNITS: Unit[] = [...walkTs(SRC_DIR + 'render'), ...walkTs(SRC_DIR + 'ui')].map((abs) => {
  const raw = readFileSync(abs, 'utf8')
  return { path: abs.slice(SRC_DIR.length), raw, code: stripComments(raw) }
})
const SCENE_UNITS = UNITS.filter((u) => u.path.startsWith('render/scenes/'))
const ALL_RAW = UNITS.map((u) => u.raw).join('\n')

/** Corpus rỗng => mọi lệnh quét phải ĐỎ, không được pass giả tạo vì thiếu file. */
function needCorpus(units: Unit[], what: string): void {
  expect(units.length, what + ' — src/render + src/ui chưa có file nào (RED hợp lệ)').toBeGreaterThan(0)
}

const lineAt = (src: string, index: number): number => src.slice(0, index).split('\n').length
const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** id được phủ bằng chuỗi tĩnh HOẶC bằng mẫu động "testid-option-" + "${i}" (pack §6). */
function coveredId(src: string, id: string): boolean {
  if (src.includes(id)) return true
  for (let k = id.length; k > 'testid-'.length; k--) {
    if (id[k - 1] !== '-') continue
    const tail = id.slice(k)
    if (!/^[a-z0-9]+$/.test(tail)) continue
    if (new RegExp(escapeRe(id.slice(0, k)) + '\\$\\{').test(src)) return true
  }
  return false
}

const QUOTE_PASSES: readonly RegExp[] = [/"([^"\\\n]*)"/g, /'([^'\\\n]*)'/g, /`([^`\\]*)`/g]

/** exec() trên RegExp có cờ /g GIỮ TRẠNG THÁI lastIndex => luôn clone rồi mới quét từng file. */
function matches(re: RegExp, s: string): RegExpExecArray[] {
  const rx = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g')
  const out: RegExpExecArray[] = []
  for (let m = rx.exec(s); m !== null; m = rx.exec(s)) out.push(m)
  return out
}

function literalsOf(code: string): { value: string; at: number }[] {
  return QUOTE_PASSES.flatMap((re) => matches(re, code).map((m) => ({ value: m[1], at: m.index })))
}

describe('khung file B3a (pack §1) — neo PC-B-01 · PC-B-05', () => {
  it('đủ 10 file B3a: 3 scene + 4 component + unfoldPlan + paperTheme + ui/testids.ts', () => {
    const missing = REQUIRED_FILES.filter((rel) => !existsSync(SRC_DIR + rel))
    expect(missing, 'thiếu file: ' + missing.join(', ')).toEqual([])
  })

  it('src/render + src/ui có nguồn để quét (corpus khác rỗng — không pass giả tạo)', () => {
    needCorpus(UNITS, 'nguồn view')
  })
})

describe('testid contract — 20 tên pack §6 (neo PC-O-01 · PC-B-02 · PC-U-05)', () => {
  it('cả 20 testid B3a phải xuất hiện trong src/render + src/ui', () => {
    needCorpus(UNITS, 'src/render + src/ui')
    const missing = B3A_TESTIDS.filter((id) => !coveredId(ALL_RAW, id))
    expect(missing, 'chưa đăng ký testid: ' + missing.join(', ')).toEqual([])
  })

  it('mọi token testid-… viết đúng khu vực đặt tên (không hoa/underscore/r gạch đôi)', () => {
    needCorpus(UNITS, 'src/render + src/ui')
    const tokens = ALL_RAW.match(/testid-[A-Za-z0-9_-]+/g) ?? []
    const bad = [...new Set(tokens)].filter((t) => !/^testid-[a-z0-9]+(-[a-z0-9]+)*$/.test(t))
    expect(bad, 'testid sai định dạng: ' + bad.join(', ')).toEqual([])
  })

  it('đúng 4 ô đáp án: option-0..3 tồn tại, KHÔNG có option-4 (PC-03: 4 phương án)', () => {
    needCorpus(UNITS, 'src/render + src/ui')
    for (let i = 0; i < 4; i++) expect(coveredId(ALL_RAW, 'testid-option-' + i)).toBe(true)
    expect(coveredId(ALL_RAW, 'testid-option-4'), 'có option-4 trong khi đề chỉ 4 ô').toBe(false)
  })

  it('mỗi scene B3a gọi registerTestid khi dựng (rect cho QA click — pack §6)', () => {
    for (const rel of REQUIRED_SCENES) {
      const u = UNITS.find((x) => x.path === rel)
      expect(u, rel + ' chưa tồn tại').toBeDefined()
      const door = REGISTER_DOORS.find((d) => u!.code.includes(d))
      expect(door, rel + ' không đăng ký rect QA qua cửa nào: ' + REGISTER_DOORS.join(' | ')).toBeDefined()
    }
  })
})

describe('registry M10-style (pack §1 dòng 22) — neo PC-B-02 · PC-U-05', () => {
  const reg = (): string => {
    const u = UNITS.find((x) => x.path === 'ui/testids.ts')
    expect(u, 'src/ui/testids.ts chưa tồn tại').toBeDefined()
    return u!.code
  }

  it('testids.ts ĐỊNH NGHĨA registerTestid(id, x, y, w, h) — đủ 5 tham số hình chữ nhật', () => {
    needCorpus(UNITS, 'src/ui')
    const code = reg()
    expect(code).toMatch(/(function|const)\s+registerTestid/)
    const sigs = matches(/registerTestid\s*\(([^)]*)\)/g, code).map((m) => m[1])
    expect(sigs.length, 'không thấy chữ ký registerTestid(...)').toBeGreaterThan(0)
    expect(sigs.some((s) => s.split(',').length === 5), 'cần 1 chữ ký 5 tham số id,x,y,w,h').toBe(true)
  })

  it('registry gắn window.__pcTestids (QA/devtools đọc rect) + markCanvas data-testid="game-canvas"', () => {
    needCorpus(UNITS, 'src/ui')
    const code = reg()
    expect(code, 'phải export window.__pcTestids (tiền lệ M10)').toContain('__pcTestids')
    expect(code).toContain('markCanvas')
    expect(code).toContain('game-canvas')
  })
})

describe('i18n PC-19 (pack §9 dòng 107) — neo PC-O-02 · PC-U-03', () => {
  // Ranh giới: chỉ quét CODE sau khi cắt comment; scene là nơi duy nhất dựng chuỗi hiển thị.
  const CALL_SITES: readonly RegExp[] = [
    /(?:\.setText\(|\btext\s*[:=]\s*)(['"`])([^'"`\n]*)\1/g, //  copy trần ở setText/text:/text=
    /\badd\.text\([^,)]+,[^,)]+,\s*(['"`])([^'"`\n]*)\1/g, //  copy trần ở add.text(x,y,<arg>)
  ]

  it('mọi setText(/text:/add.text(x,y,_) trong scene phải bọc t(...) — không copy trần', () => {
    needCorpus(SCENE_UNITS, 'scene')
    const bad: string[] = []
    for (const u of SCENE_UNITS) {
      for (const re of CALL_SITES) {
        for (const m of matches(re, u.code)) {
          if (m[2].trim().length > 0) bad.push(u.path + ':' + lineAt(u.code, m.index) + ' = ' + m[2])
        }
      }
    }
    expect(bad, 'chuỗi hiển thị không qua t(): ' + bad.join(' | ')).toEqual([])
  })

  it('không literal display-string lạ trong scene (danh sách cho phép ở dưới, có lý do)', () => {
    needCorpus(SCENE_UNITS, 'scene')
    const bad = SCENE_UNITS.flatMap((u) =>
      literalsOf(u.code)
        .filter((l) => isDisplaySuspect(l.value))
        .map((l) => u.path + ':' + lineAt(u.code, l.at) + ' = ' + l.value),
    )
    expect(bad, 'nghi copy hardcode (phải bọc t()): ' + bad.join(' | ')).toEqual([])
  })

  it('0 chuỗi tiếng Việt hardcode trong code src/render + src/ui (PC-19 — comment không tính)', () => {
    needCorpus(UNITS, 'src/render + src/ui')
    // Dấu tiếng Việt trong CODE = nghi vấn chuỗi hiển thị hardcode (PC-19). Loại × ÷ để
    // không bắt nhầm ký hiệu toán trong con số.
    const VN = /[À-ÖØ-öø-ʏḀ-῿]/
    const bad = UNITS.filter((u) => VN.test(u.code)).map((u) => u.path)
    expect(bad, 'code chứa dấu tiếng Việt: ' + bad.join(', ')).toEqual([])
  })
})

/**
 * Chuỗi bị coi là "nghi copy hiển thị" khi CÓ CHỮ + CÓ DẤU CÁCH và không rơi vào nhóm
 * cho phép (mỗi dòng là một lý do thật trong tầng view, không phải lỗ hổng):
 *   ^testid-…          hook QA, không hiển thị (pack §6)
 *   game-canvas        thuộc tính data-testid của canvas (pack §1)
 *   #RGB/#RRGGBBAA     token màu DS §1
 *   có '/'            đường dẫn asset cục bộ "assets/paper.png"
 *   có 'NNpx'         chuỗi font/size Phaser "900 44px Fraunces" (DS:99)
 *   số/ký tự không chữ  '0.45', '1,02', ''
 * Giới hạn đã biết (và lý do còn 2 lớp): copy MỘT từ viết hoa trần ("PLAY") không có dấu
 * cách nên lọt rule này — nó bị CALL_SITES ở it() trên bắt (setText/text:/add.text).
 */
function isDisplaySuspect(v: string): boolean {
  const s = v.trim()
  if (s.length === 0 || !/[A-Za-z]/.test(s)) return false
  if (!/\s/.test(s)) return false
  if (/^testid-/.test(s)) return false
  if (s === 'game-canvas') return false
  if (/^#[0-9A-Fa-f]{3,8}$/.test(s)) return false
  if (s.includes('/')) return false
  if (/\d+px/.test(s)) return false
  return true
}

describe('cấm call mạng (PC-15, pack §8) — neo PC-B-03', () => {
  const NET_API = /\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|EventSource|serviceWorker/

  it('src/render + src/ui không có fetch/XHR/WebSocket/sendBeacon (đúng lệnh grep gate)', () => {
    needCorpus(UNITS, 'src/render + src/ui')
    const bad = UNITS.filter((u) => NET_API.test(u.raw)).map((u) => u.path)
    expect(bad, 'gọi mạng ở: ' + bad.join(', ')).toEqual([])
  })

  it('không URL http(s) tuyệt đối trong CODE (mọi request phải là asset cục bộ)', () => {
    needCorpus(UNITS, 'src/render + src/ui')
    const bad = UNITS.filter((u) => /https?:\/\//.test(u.code)).map((u) => u.path)
    expect(bad, 'URL ngoài ở: ' + bad.join(', ')).toEqual([])
  })
})

describe('ranh giới 1 chiều src/logic -> src/render (pack §7) — neo PC-05 · PC-L-05', () => {
  it('scene không tự phán quyết: không so sánh với correctIndex (=== / !==), chỉ vẽ kết quả', () => {
    needCorpus(UNITS, 'src/render')
    const DECIDE = /(?:===|!==|==|!=)\s*[\w.]*correctIndex|[\w.]*correctIndex\s*(?:===|!==|==|!=)/
    const bad = UNITS.filter((u) => DECIDE.test(u.code)).map((u) => u.path)
    expect(bad, 'đoán đúng/sai trong view: ' + bad.join(', ')).toEqual([])
  })

  it('src/render không export hàm tính đúng/sai và không import validator (validateSpec chỉ ở test)', () => {
    needCorpus(UNITS, 'src/render')
    const DECIDE_FN = /export\s+(?:async\s+)?(?:function|const)\s+\w*(isCorrect|checkAnswer|verify|grade|verdict|countHoles|solve)\w*/i
    const badFn = UNITS.filter((u) => DECIDE_FN.test(u.code)).map((u) => u.path)
    expect(badFn, 'view export hàm phán quyết: ' + badFn.join(', ')).toEqual([])
    const badImp = UNITS.filter((u) => /from\s+['"][^'"]*logic\/validator/.test(u.code)).map((u) => u.path)
    expect(badImp, 'view import validator (cấm chạy trong scene): ' + badImp.join(', ')).toEqual([])
  })

  it('không win screen (PC-09): cấm copy "You win"/"Victory"/… và scene.start tới màn kết quả', () => {
    needCorpus(UNITS, 'src/render')
    const WIN_COPY = /you\s+win|victory|congrats|congratulations|level\s+cleared/i
    const WIN_SCENE = /scene\.start\(\s*['"`](win|result|victory|gameover|game-over|complete)/i
    const bad = UNITS.filter((u) => WIN_COPY.test(u.code) || WIN_SCENE.test(u.code)).map((u) => u.path)
    expect(bad, 'có màn/copy "win screen" (kết quả phải nằm trong PlayScene): ' + bad.join(', ')).toEqual([])
  })
})