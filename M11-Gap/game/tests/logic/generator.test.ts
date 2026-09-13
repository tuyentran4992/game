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
import { levelSpec } from '../../src/logic/generator'
import type { ChapterLevelConfig } from '../../src/logic/generator'
import { unfoldHoles } from '../../src/logic/foldRules'
import { minPairDistance, validateSpec } from '../../src/logic/validator'
import type { LevelSpec } from '../../src/logic/types'
import {
  CAMPAIGN_LEVELS,
  CHAPTERS,
  GAME_SEED,
  GRID,
  LEVELS_PER_CHAPTER,
  MIN_PAIR_DISTANCE,
  R,
  diffHoles,
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
    const cfg = cfgFor(1, 1)
    const keys = new Set<string>()
    for (let i = 0; i < 30; i++) keys.add(serializeSpec(levelSpec(GAME_SEED, i, cfg)))
    expect(keys.size).toBeGreaterThanOrEqual(2)
    const counts = new Set<string>()
    for (let i = 0; i < 200; i++) counts.add(String(holeCount(levelSpec(GAME_SEED, i, cfg).answerHoles)))
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
    const over = campaign().filter((spec) => {
      const cap = 2 ** spec.folds.length
      return holeCount(spec.answerHoles) > cap || holeCount(spec.answerHoles) < 1
    })
    expect(over.map((s) => s.levelIndex)).toEqual([])
    const ch1 = campaign().filter((s) => chapterOf(s) === 1)
    expect(ch1.every((s) => holeCount(s.answerHoles) <= 4)).toBe(true)
    const late = campaign().filter((s) => chapterOf(s) >= 5)
    expect(late.every((s) => holeCount(s.answerHoles) <= 8)).toBe(true)
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