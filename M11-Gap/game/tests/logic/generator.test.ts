// ============================================================================
// B1a · NHÓM A — src/logic/generator.ts (Pattern: Factory + Seed, STRUCTURE §2)
// Phủ TC-GEN-01, TC-GEN-02, TC-GEN-04, TC-GEN-11 + một phần TC-GEN-03/05/06/07 (dải 120 màn).
// Rule: PC-02 (seed deterministic, không phụ thuộc thời gian/thứ tự, CẤM Math.random),
//       PC-03 (đúng 1 đáp án, sinh từ trạng thái mở bung), PC-04 (4 ô phân biệt),
//       PC-01 (cfg chương decides fold/punch/cut/D/timer — config là dữ liệu).
// cfg được TRUYỀN TAY vì config/chapters.json chưa tồn tại ở B1a (doc generator.ts ghi rõ
// "truyền vào khi test"). Bảng cfg lấy nguyên văn SPEC §6.1 + PC-01 — xem helpers.cfgFor.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { levelConfigFor, levelSpec } from '../../src/logic/generator'
import type { ChapterLevelConfig } from '../../src/logic/generator'
import { unfoldHoles } from '../../src/logic/foldRules'
import { minPairDistance, validateSpec } from '../../src/logic/validator'
import type { FoldKind, LevelSpec } from '../../src/logic/types'
import {
  CAMPAIGN_LEVELS,
  CHAPTERS,
  GAME_SEED,
  GRID,
  LEVELS_PER_CHAPTER,
  MIN_PAIR_DISTANCE,
  R,
  diffHoles,
  handCapacity,
  handCells,
  holeCount,
  insideSheet,
  punchPointsOf,
  rk,
  sameSet,
  serializeSpec,
  cfgCampaign,
  cfgFor,
} from './helpers'

const gen = (levelIndex: number, cfg: ChapterLevelConfig = cfgCampaign(levelIndex)): LevelSpec =>
  levelSpec(GAME_SEED, levelIndex, cfg)

/** Sinh cả 120 màn chiến dịch (1..120 — DATA-MODEL §3.1 "level_index int 1–120"). */
const campaign = (): LevelSpec[] => {
  const out: LevelSpec[] = []
  for (let i = 1; i <= CAMPAIGN_LEVELS; i++) out.push(gen(i))
  return out
}

const chapterOf = (spec: LevelSpec): number => spec.chapter

const report = (label: string, bad: string[]): void => {
  expect(bad.length, label + ' (' + bad.length + ' vi phạm, ví dụ: ' + bad.slice(0, 5).join(' || ') + ')').toBe(0)
}

describe('generator.levelSpec — PC-02 deterministic từ seed (TC-GEN-01, TC-GEN-02)', () => {
  it('TC-GEN-01 · PC-02: cùng (seed, levelIndex, cfg) gọi 2 lần ⇒ deep-equal TỪNG trường (kiểu gấp, lỗ, 4 ô, đáp án)', () => {
    const a = gen(23)
    const b = gen(23)
    expect(b).toEqual(a)
    expect(serializeSpec(b)).toBe(serializeSpec(a))
    expect(b.folds).toEqual(a.folds)
    expect(b.options).toEqual(a.options)
    expect(b.correctIndex).toBe(a.correctIndex)
  })

  it('TC-GEN-01 · PC-02: determinism giữ nguyên khi sinh hàng loạt màn khác xen giữa (không trạng thái ẩn)', () => {
    const before = serializeSpec(gen(23))
    for (const i of [5, 1, 90, 120, 23, 44, 7, 101]) gen(i)
    expect(serializeSpec(gen(23))).toBe(before)
    // màn 5 cũng phải y hệt nếu sinh lại sau khi đã chơi qua 100 màn khác
    const five = serializeSpec(gen(5))
    for (let i = 1; i <= 100; i++) gen(i)
    expect(serializeSpec(gen(5))).toBe(five)
  })

  it('TC-GEN-02 · PC-02: mock đồng hồ nhảy sang ngày khác (seed = hash(gameId+levelIndex), SPEC §5.4) ⇒ đề không đổi', () => {
    const a = serializeSpec(gen(23))
    const realNow = Date.now
    Date.now = () => realNow() + 400 * 86400000
    try {
      expect(serializeSpec(gen(23))).toBe(a)
      expect(serializeSpec(gen(64))).toBe(serializeSpec(gen(64)))
    } finally {
      Date.now = realNow
    }
  })

  it('PC-02 · STRUCTURE §5 gate-4: levelSpec KHÔNG dùng Math.random (cắm stub báo lỗi nếu bị gọi)', () => {
    const realRandom = Math.random
    Math.random = () => {
      throw new Error('MATH_RANDOM_FORBIDDEN: PC-02 — mọi biến thiên phải đến từ seed, không từ RNG toàn cục')
    }
    try {
      expect(() => gen(23)).not.toThrow()
      expect(serializeSpec(gen(23))).toBe(serializeSpec(gen(23)))
    } finally {
      Math.random = realRandom
    }
  })

  it('PC-02: LevelSpec tự carry danh tính (seed + levelIndex) để QA tái lập đúng màn bằng ?level/?seed (SPEC §5.4)', () => {
    const a = gen(23)
    expect(a.seed).toBe(GAME_SEED)
    expect(a.levelIndex).toBe(23)
    const other = levelSpec('ANOTHER-SEED', 23, cfgCampaign(23))
    expect(other.seed).toBe('ANOTHER-SEED')
    expect(other.levelIndex).toBe(23)
  })

  it('PC-02: đổi levelIndex sang chương khác ⇒ đề khác nhau (so bằng serialize, không phải so reference)', () => {
    const pairs: [number, number][] = [
      [15, 16], [30, 31], [45, 46], [60, 61], [75, 76], [90, 91], [105, 106], [1, 120],
    ]
    for (const [i, j] of pairs) {
      expect(serializeSpec(gen(i)), 'màn ' + i + ' và ' + j + ' không được giống nhau').not.toBe(serializeSpec(gen(j)))
    }
  })

  it('PC-02: levelIndex THỰC SỰ đi vào dòng sinh đề — cùng cfg, 30 màn liên tiếp không được cho ra MỘT đề duy nhất', () => {
    // Trong cùng 1 chương cfg chỉ khác levelInChapter ⇒ nếu generator bỏ qua levelIndex thì
    // toàn bộ 30 đề giống hệt nhau (bug thật của các bản prototype cũ).
    // Dải 1..N (không 0..N-1): B2/F-2 xếp levelIndex=0 vào input bẩn bị levelSpec từ chối.
    const cfg = cfgFor(1, 1)
    const keys = new Set<string>()
    for (let i = 1; i <= 30; i++) keys.add(serializeSpec(levelSpec(GAME_SEED, i, cfg)))
    expect(keys.size).toBeGreaterThanOrEqual(2)
    const counts = new Set<string>()
    for (let i = 1; i <= 200; i++) counts.add(String(holeCount(levelSpec(GAME_SEED, i, cfg).answerHoles)))
    expect(counts.size).toBeGreaterThanOrEqual(2)
  })

  it('PC-02: seed THỰC SỰ được dùng — cùng levelIndex, 16 seed khác nhau không cho ra một đề duy nhất', () => {
    const keys = new Set<string>()
    for (let s = 0; s < 16; s++) keys.add(serializeSpec(levelSpec('SEED-' + s, 7, cfgCampaign(7))))
    expect(keys.size).toBeGreaterThanOrEqual(2)
  })

  it('PC-02: không dùng float trong toạ độ — mọi Rat trả về có mẫu dương khác 0 và rút gọn đúng', () => {
    const bad: string[] = []
    for (const spec of campaign()) {
      const coords = [...spec.options.flatMap((o) => o.holes), ...spec.answerHoles]
      for (const c of coords) {
        if (c.d <= 0n) bad.push('mau <= 0: ' + rk(c))
        if (typeof c.n !== 'bigint' || typeof c.d !== 'bigint') bad.push('khong phai bigint: ' + String(c.n))
      }
    }
    report('toạ độ không phải số hữu tỉ bigint chuẩn', bad)
  })
})

describe('generator.levelSpec — PC-03 đúng 1 đáp án sinh từ trạng thái mở (TC-GEN-04)', () => {
  it('TC-GEN-04 · PC-03: cả 120 màn đều có ĐÚNG 1/4 ô khớp answerHoles (không ô nào trùng, không 0 ô)', () => {
    const bad: string[] = []
    for (const spec of campaign()) {
      const matches = spec.options.filter((o) => sameSet(o.holes, spec.answerHoles)).length
      if (matches !== 1) bad.push('man ' + spec.levelIndex + ' co ' + matches + ' o khop dap an')
    }
    report('PC-03: số ô khớp đáp án phải = 1', bad)
  })

  it('TC-GEN-04 · PC-03: options[correctIndex] chính là answerHoles — đáp án KHÔNG do xáo ngẫu nhiên', () => {
    const bad: string[] = []
    for (const spec of campaign()) {
      if (spec.correctIndex < 0 || spec.correctIndex > 3) bad.push('man ' + spec.levelIndex + ' correctIndex=' + spec.correctIndex)
      else if (!sameSet(spec.options[spec.correctIndex].holes, spec.answerHoles)) bad.push('man ' + spec.levelIndex + ' correctIndex tro sai o')
    }
    report('PC-03: correctIndex phải trỏ đúng ô khớp simulator', bad)
  })

  it('PC-03 · đối chiếu chéo: answerHoles == unfoldHoles(folds, tờ cạnh 1, điểm đục) của ĐỀ punch (màn 1..40)', () => {
    const bad: string[] = []
    for (let i = 1; i <= 40; i++) {
      const spec = gen(i)
      if (spec.action.kind !== 'punch') continue
      const sim = unfoldHoles(spec.folds, R(1n), spec.action.points)
      if (!sameSet(spec.answerHoles, sim)) {
        bad.push('man ' + i + ': generator khong dung simulator (gen=' + holeCount(spec.answerHoles) + ' lo, sim=' + holeCount(sim) + ' lo)')
      }
    }
    report('PC-03: đáp án phải là kết quả mở bung', bad)
  })

  it('TC-GEN-04 · PC-03: mọi màn có đủ 4 phương án với id phân biệt và toạ độ nằm trong tờ giấy', () => {
    const bad: string[] = []
    for (const spec of campaign()) {
      if (spec.options.length !== 4) bad.push('man ' + spec.levelIndex + ' co ' + spec.options.length + ' phuong an')
      if (new Set(spec.options.map((o) => o.id)).size !== spec.options.length) bad.push('man ' + spec.levelIndex + ' id trung')
      if (!insideSheet(spec.answerHoles)) bad.push('man ' + spec.levelIndex + ' dap an ngoai to')
      for (const o of spec.options) if (!insideSheet(o.holes)) bad.push('man ' + spec.levelIndex + ' o ' + o.id + ' ngoai to')
    }
    report('PC-03/PC-04: hình dạng đề hợp lệ', bad)
  })

  it('PC-03 · số lỗ phải khớp bậc số lớp: chương 1-4 (gấp làm 4) tối đa 4 lỗ, chương 5+ (8 lớp) tối đa 8 lỗ', () => {
    // §7.5 (vòng C): TRẦN 2^số nếp là của ĐỀ ĐỤC ĐIỂM. Đề cut là một VÙNG ⇒ đáp án là tập
    // Ô RASTER bị vùng phủ, số ô không bị chặn bởi bậc lớp (mà bởi số điểm mẫu × số lớp).
    const punch = campaign().filter((s) => s.action.kind === 'punch')
    const over = punch.filter((spec) => {
      const cap = 2 ** spec.folds.length
      return holeCount(spec.answerHoles) > cap || holeCount(spec.answerHoles) < 1
    })
    expect(over.map((s) => s.levelIndex)).toEqual([])
    const ch1 = punch.filter((s) => chapterOf(s) === 1)
    expect(ch1.every((s) => holeCount(s.answerHoles) <= 4)).toBe(true)
    const late = punch.filter((s) => chapterOf(s) >= 5)
    expect(late.every((s) => holeCount(s.answerHoles) <= 8)).toBe(true)
    // Đề cut: không có hai lỗ nào chìm trong một ô ảnh (ô là đơn vị thị giác của §7.5).
    for (const spec of campaign().filter((s) => s.action.kind === 'cut')) {
      expect(holeCount(spec.answerHoles)).toBeGreaterThanOrEqual(1)
      expect(handCells(spec.answerHoles, GRID).size).toBe(holeCount(spec.answerHoles))
    }
  })
})

describe('generator.levelSpec — PC-04 bốn ô phân biệt, đạt ngưỡng khác biệt', () => {
  it('TC-GEN-06 · PC-04: 120 màn — mỗi ô nhiễu khác đáp án đúng ở ≥1 lỗ', () => {
    const bad: string[] = []
    for (const spec of campaign()) {
      spec.options.forEach((o, i) => {
        if (i === spec.correctIndex) return
        if (diffHoles(o.holes, spec.answerHoles) < 1) bad.push('man ' + spec.levelIndex + ' o ' + i + ' giong dap an')
      })
    }
    report('PC-04: ô nhiễu phải khác đáp án >= 1 lỗ', bad)
  })

  it('TC-GEN-07 · PC-04: 120 màn — 6 cặp đôi một (C(4,2)) đều khác nhau thật sự', () => {
    const bad: string[] = []
    for (const spec of campaign()) {
      for (let i = 0; i < 4; i++)
        for (let j = i + 1; j < 4; j++)
          if (sameSet(spec.options[i].holes, spec.options[j].holes))
            bad.push('man ' + spec.levelIndex + ' cap ' + i + '/' + j + ' giong het nhau')
    }
    report('PC-04: 2 ô bất kỳ phải khác nhau', bad)
  })

  it('PC-04 + ngưỡng: 120 màn — minPairDistance trên lưới 16 ≥ 6 và validateSpec ok cho mọi đề', () => {
    const bad: string[] = []
    for (const spec of campaign()) {
      const res = validateSpec(spec)
      if (!res.ok) bad.push('man ' + spec.levelIndex + ' validateSpec: ' + res.errors.join('; '))
      const d = minPairDistance(spec, GRID)
      if (d < MIN_PAIR_DISTANCE) bad.push('man ' + spec.levelIndex + ' minPairDistance=' + d + ' < ' + MIN_PAIR_DISTANCE)
    }
    report('PC-03/PC-04: cổng validator trên dải 120 màn', bad)
  })
})

describe('generator.levelSpec — PC-01 tham số chương là DỮ LIỆU, không hardcode', () => {
  it('PC-01: cfg nào ra đề nấy — foldCount/punchCount/timerOn/chapter được tôn trọng trên 120 màn', () => {
    const bad: string[] = []
    for (let i = 1; i <= CAMPAIGN_LEVELS; i++) {
      const cfg = cfgCampaign(i)
      const spec = gen(i)
      if (spec.folds.length !== cfg.foldCount) bad.push('man ' + i + ' folds=' + spec.folds.length + ' != cfg=' + cfg.foldCount)
      if (spec.timerOn !== cfg.timerOn) bad.push('man ' + i + ' timerOn=' + spec.timerOn + ' != cfg=' + cfg.timerOn)
      if (spec.chapter !== cfg.chapter) bad.push('man ' + i + ' chapter=' + spec.chapter + ' != cfg=' + cfg.chapter)
      if (spec.action.kind === 'punch' && spec.action.points.length !== 2 * cfg.punchCount)
        bad.push('man ' + i + ' so diem duc khong dung punchCount=' + cfg.punchCount)
    }
    report('PC-01: generator phải ăn theo cfg (config = dữ liệu, SPEC §5.2)', bad)
  })

  it('PC-01: chương = ceil(level/15), 8 chương × 15 màn hiện đủ trong 120 màn (DATA-MODEL §3.1)', () => {
    const specs = campaign()
    const chapters = new Set(specs.map(chapterOf))
    expect(chapters.size).toBe(CHAPTERS)
    for (let c = 1; c <= CHAPTERS; c++) {
      expect(specs.filter((s) => s.chapter === c).length).toBe(LEVELS_PER_CHAPTER)
    }
    expect(specs.map((s) => s.levelIndex)).toEqual(Array.from({ length: CAMPAIGN_LEVELS }, (_, k) => k + 1))
  })

  it('TC-GEN-11 · PC-03 + PC-01: dải chương 4..8 CÓ xuất hiện "cắt 1 góc chéo" hợp lệ; chương 1..3 chỉ đục lỗ', () => {
    const cut = campaign().filter((s) => s.action.kind === 'cut')
    const early = campaign().filter((s) => chapterOf(s) <= 3)
    expect(early.every((s) => s.action.kind === 'punch')).toBe(true) // cfg.useCut = false trước ch4
    expect(cut.length).toBeGreaterThanOrEqual(1)
    for (const spec of cut) {
      const action = spec.action
      if (action.kind !== 'cut') continue // thu hep union ve CutAction (khong dung narrowing qua filter)
      expect(['BL', 'BR', 'TL', 'TR']).toContain(action.corner)
      expect(action.size.n > 0n && action.size.d > 0n).toBe(true)
      expect(rk(action.size)).not.toBe('0/1')
      expect(holeCount(spec.answerHoles)).toBeGreaterThanOrEqual(1) // "hình cắt mở bung", không phải rỗng
      expect(validateSpec(spec).ok, 'de cat goc man ' + spec.levelIndex + ' phai qua validator').toBe(true)
    }
  })

  it('PC-01 + PC-03: nếp chéo D chỉ vào đề từ chương 6 (cfg.useDiagonal) và có mặt thật sự trong dải 6..8', () => {
    const early = campaign().filter((s) => chapterOf(s) <= 5)
    expect(early.every((s) => !s.folds.includes('D'))).toBe(true)
    const late = campaign().filter((s) => chapterOf(s) >= 6)
    expect(late.some((s) => s.folds.includes('D'))).toBe(true)
    for (const spec of late.filter((s) => s.folds.includes('D'))) {
      expect(validateSpec(spec).ok, 'de co nep cheo man ' + spec.levelIndex + ' phai hop le').toBe(true)
    }
  })

  it('PC-03: đề nhiều lỗ (chương 7+, punchCount 2) phải có 2 điểm đục và ≥2 vị trí lỗ khi mở', () => {
    const multi = campaign().filter((s) => chapterOf(s) >= 7)
    expect(multi.length).toBe(LEVELS_PER_CHAPTER * 2)
    for (const spec of multi) {
      if (spec.action.kind !== 'punch') continue
      expect(punchPointsOf(spec).length).toBe(2)
      expect(holeCount(spec.answerHoles)).toBeGreaterThanOrEqual(2)
    }
  })

  it('PC-01: difficulty là số hữu hạn để tiến trình xếp bậc suy luận (không NaN/undefined len manifest)', () => {
    for (const spec of campaign()) expect(Number.isFinite(spec.difficulty)).toBe(true)
  })

  it('PC-02 + PC-04: hai lần sinh cả 120 màn cho serialize y hệt từng màn (regression khoá hành vi PC-02)', () => {
    const first = campaign().map(serializeSpec)
    const second = campaign().map(serializeSpec)
    expect(second).toEqual(first)
    expect(new Set(first).size).toBeGreaterThan(1) // không phải "một đề duy nhất lặp 120 lần"
  })
})

// ---------------------------------------------------------------------------
// VÒNG FIX B · B1 (review F-1) — cfg.punchCount là ĐỊNH LUẬT, không phải gợi ý.
// Bản cũ: hết ô hợp lệ là trả về ÍT điểm đục hơn config khai (chain HV + punchCount 3 ⇒
// 2 nguồn, 200/200 seed), và `Math.max(1, cfg.punchCount)` che luôn punchCount rác.
// Oracle dùng ở đây là handCapacity() trong helpers — affine số nguyên lưới 1/8 VIẾT TAY,
// không gọi layerCount/punchRun của src ⇒ src không được tự chấm bài mình.
// ---------------------------------------------------------------------------
const CHAIN_HV: FoldKind[] = ['H', 'V']
const CHAIN_HVH: FoldKind[] = ['H', 'V', 'H']
const CHAIN_HHV: FoldKind[] = ['H', 'H', 'V']
const CHAIN_DHVH: FoldKind[] = ['D', 'H', 'V', 'H']

/** Bảng chương 8 × 15 theo DATA-MODEL §3.1 — `holesMaxLate` là chỗ bảng thật xin quá trần. */
function chaptersTable(holesMaxLate: number): unknown {
  const list: unknown[] = []
  for (let c = 1; c <= CHAPTERS; c++) {
    const folds: FoldKind[] = c >= 6 ? ['D', 'H', 'V'] : c >= 5 ? CHAIN_HVH : CHAIN_HV
    const levels: unknown[] = []
    for (let k = 1; k <= LEVELS_PER_CHAPTER; k++) {
      levels.push({ level_index: (c - 1) * LEVELS_PER_CHAPTER + k, folds, action: c >= 4 ? 'cut' : 'punch', timer_sec: c >= 7 ? 60 : 0 })
    }
    list.push({ chapter: c, layers: c >= 5 ? 8 : 4, timer: c >= 7, holes_min: c >= 7 ? 2 : 1, holes_max: c >= 7 ? holesMaxLate : 1, levels })
  }
  return { chapters: list }
}

type Scan = { punched: number; cut: number; short: string[]; badThrow: string[]; overAsk: string[] }

/** quét 120 màn: "thiếu" = trả đề mà số điểm đục < cfg.punchCount; "ném oan" = ném khi còn chỗ. */
function scanTable(table: unknown): Scan {
  const out: Scan = { punched: 0, cut: 0, short: [], badThrow: [], overAsk: [] }
  for (let level = 1; level <= CAMPAIGN_LEVELS; level++) {
    const cfg = levelConfigFor(table, level)
    const chain = cfg.folds ?? []
    const room = handCapacity(chain)
    try {
      const spec = levelSpec(GAME_SEED, level, cfg)
      const got = spec.action.kind === 'cut' ? -1 : punchPointsOf(spec).length
      if (got === -1) out.cut += 1
      else if (got === cfg.punchCount) out.punched += 1
      else out.short.push('màn ' + level + ' ' + chain.join('') + ' cfg.punchCount=' + cfg.punchCount + ' nhưng sinh ' + got)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (room >= cfg.punchCount) out.badThrow.push('màn ' + level + ' ' + chain.join('') + ' punchCount=' + cfg.punchCount + ' (còn chỗ cho ' + room + ') ném: ' + msg)
      else if (!msg.includes(chain.join('')) || !msg.includes('punchCount=' + cfg.punchCount)) out.badThrow.push('màn ' + level + ' ném không nêu chain+punchCount: ' + msg)
      else out.overAsk.push('màn ' + level + ' ' + chain.join('') + ' xin ' + cfg.punchCount + ' > trần ' + room)
    }
  }
  return out
}

describe('B1/F-1 · cfg.punchCount được tôn trọng tuyệt đối trên bảng chương thật 8×15', () => {
  it('(a) 120 màn: không màn nào sinh ÍT điểm đục hơn config, không màn nào ném oan', () => {
    const r = scanTable(chaptersTable(3))
    console.log('[B1] bảng holes_max=3: punch đủ=' + r.punched + ' cắt=' + r.cut +
      ' ném đúng lý do hình học=' + r.overAsk.length + ' :: ' + r.overAsk.slice(0, 3).join(' | '))
    expect(r.short, 'sinh thiếu điểm đục: ' + r.short.join(' || ')).toEqual([])
    expect(r.badThrow, 'ném sai lý do: ' + r.badThrow.join(' || ')).toEqual([])
    expect(r.punched + r.cut).toBe(CAMPAIGN_LEVELS - r.overAsk.length)
  })

  it('(a2) cùng bảng với holes_max=2 (trong trần hình học): 120/120 màn sinh đề, đủ điểm đục', () => {
    const r = scanTable(chaptersTable(2))
    expect(r.badThrow, r.badThrow.join(' || ')).toEqual([])
    expect(r.overAsk, r.overAsk.join(' || ')).toEqual([])
    expect(r.punched + r.cut).toBe(CAMPAIGN_LEVELS)
    expect(r.punched).toBeGreaterThanOrEqual(45) // ch1-3 không cắt góc ⇒ bắt buộc có đủ màn punch thật
  })

  it('(b) 200 seed × HV/HVH/HHV × punchCount 3..4 ⇒ hoặc đủ, hoặc NÉM nêu chain + punchCount', () => {
    const bad: string[] = []
    for (const chain of [CHAIN_HV, CHAIN_HVH, CHAIN_HHV])
      for (const n of [3, 4])
        for (let s = 1; s <= 200; s++) {
          const cfg: ChapterLevelConfig = { ...cfgFor(1, 1), foldCount: chain.length, folds: chain, punchCount: n, useCut: false }
          const who = chain.join('') + '/' + n + '/S-' + s
          try {
            const spec = levelSpec('S-' + s, 7, cfg)
            if (punchPointsOf(spec).length !== n) bad.push(who + ' sinh thiếu: ' + punchPointsOf(spec).length)
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e)
            if (handCapacity(chain) >= n) bad.push(who + ' NÉM OAN (còn chỗ): ' + msg)
            else if (!msg.includes(chain.join('')) || !msg.includes('punchCount=' + n)) bad.push(who + ' ném không nêu chain+punchCount: ' + msg)
          }
        }
    expect(bad.slice(0, 6), bad.length + ' vi phạm: ' + bad.slice(0, 3).join(' || ')).toEqual([])
  })

  it('(b2) điều khiển dương: chuỗi còn chỗ thì MỌI seed ra đủ điểm đục (HV/HVH/HHV × 2, DHVH × 3)', () => {
    const cases: [FoldKind[], number][] = [[CHAIN_HV, 2], [CHAIN_HVH, 2], [CHAIN_HHV, 2], [CHAIN_DHVH, 3]]
    const bad: string[] = []
    for (const [chain, n] of cases) {
      if (handCapacity(chain) < n) bad.push('bảng chờ sai: ' + chain.join('') + ' trần ' + handCapacity(chain) + ' < ' + n)
      for (let s = 1; s <= 50; s++) {
        const cfg: ChapterLevelConfig = { ...cfgFor(1, 1), foldCount: chain.length, folds: chain, punchCount: n, useCut: false, useDiagonal: true }
        const spec = levelSpec('OK-' + s, 7, cfg)
        if (punchPointsOf(spec).length !== n) bad.push(chain.join('') + '/' + n + '/OK-' + s + ' -> ' + punchPointsOf(spec).length)
        if (holeCount(spec.answerHoles) > 2 ** chain.length) bad.push(chain.join('') + '/' + n + '/OK-' + s + ' vượt trần vị trí lỗ')
      }
    }
    expect(bad, bad.slice(0, 4).join(' || ')).toEqual([])
  })

  it('(b3) pool suy từ CHAIN_ROWS không được chứa chuỗi chật hơn punchCount (không đề bị bớt điểm)', () => {
    const bad: string[] = []
    for (let s = 1; s <= 120; s++) {
      const cfg: ChapterLevelConfig = { ...cfgFor(8, s), foldCount: 3, punchCount: 2, useCut: false, useDiagonal: true }
      try {
        const spec = levelSpec('POOL-' + s, s, cfg)
        if (punchPointsOf(spec).length !== 2) bad.push('POOL-' + s + ' ' + spec.folds.join('') + ' -> ' + punchPointsOf(spec).length)
      } catch (e) {
        bad.push('POOL-' + s + ' ném: ' + (e instanceof Error ? e.message : String(e)))
      }
    }
    expect(bad, bad.slice(0, 3).join(' || ')).toEqual([])
  })
})