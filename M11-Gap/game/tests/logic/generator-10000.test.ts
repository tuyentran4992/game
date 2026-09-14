// ============================================================================
// B1a · NHÓM A — "ĐẾM BẰNG MÁY", không đếm bằng mắt (TEST-CASES §1 preamble).
// Phủ TC-GEN-05 (10.000 đề liên tiếp), TC-GEN-06, TC-GEN-07, và phần PC-03/PC-04 của
// TC-GEN-04 trên dải tổng hợp.
//
//   · Dải: levelIndex 1..10000 với seed CỐ ĐỊNH (GAME_SEED) + cfg biến thiên theo chương
//     (TC-GEN-05 ghi rõ "dải seed tổng hợp, không phải 120 màn chính"). Điểm 1 là đáy dải
//     hợp lệ: levelSpec đã chặn input bẩn 0 / âm / số thực / 1e6 (vòng fix B2).
//     validateSpec.ok KHÔNG là cổng duy nhất — ca quét còn đếm bằng Ô RASTER VIẾT TAY
//     (helpers.handCells) và đối chiếu thẳng cfg.punchCount vào action.points (vòng fix B3).
//   · Ngưỡng: validateSpec.ok (PC-03 + PC-04) VÀ minPairDistance(spec, 16) >= 6
//     (ngưỡng ghi trong header validator.ts, gốc g08_verify.py "bitmap + hamming >= 6").
//   · Mọi bộ đếm vi phạm phải = 0 ⇒ tại thời điểm bàn giao batch, đống test này phải XANH
//     và chứng minh TC-GEN-05 không phải "luôn xanh giả" (có fixture xấu ở validator.test.ts).
// ============================================================================
import { describe, it, expect, beforeAll } from 'vitest'
import { levelSpec } from '../../src/logic/generator'
import type { ChapterLevelConfig } from '../../src/logic/generator'
import { minPairDistance, validateSpec } from '../../src/logic/validator'
import {
  CHAPTERS,
  GAME_SEED,
  GRID,
  MIN_PAIR_DISTANCE,
  STRESS_COUNT,
  cfgSweep,
  diffHoles,
  handAnswerKeys,
  handCells,
  handPairwiseMinOf,
  holeCount,
  holeSet,
  insideSheet,
  punchPointsOf,
  sameSet,
  serializeSpec,
} from './helpers'

type Bucket = { n: number; samples: string[] }
const bucket = (): Bucket => ({ n: 0, samples: [] })
const add = (b: Bucket, msg: string): void => {
  b.n += 1
  if (b.samples.length < 4) b.samples.push(msg)
}

type Batch = {
  total: number
  perChapter: number[]
  distinctSpecs: number
  elapsedMs: number
  generation: Bucket
  decode: Bucket
  chapter: Bucket
  validate: Bucket
  oneAnswer: Bucket
  answerAtCorrect: Bucket
  distractorDiff: Bucket
  pairwise: Bucket
  distance: Bucket
  coords: Bucket
  punchCount: Bucket
  raster: Bucket
}

const batch: Batch = {
  total: 0,
  perChapter: Array.from({ length: CHAPTERS }, () => 0),
  distinctSpecs: 0,
  elapsedMs: 0,
  generation: bucket(),
  decode: bucket(),
  chapter: bucket(),
  validate: bucket(),
  oneAnswer: bucket(),
  answerAtCorrect: bucket(),
  distractorDiff: bucket(),
  pairwise: bucket(),
  distance: bucket(),
  coords: bucket(),
  punchCount: bucket(),
  raster: bucket(),
}

const why = (e: unknown): string => (e instanceof Error ? e.message : String(e))

beforeAll(() => {
  const seen = new Set<string>()
  const t0 = Date.now()
  for (let i = 1; i <= STRESS_COUNT; i++) {
    let spec
    try {
      spec = levelSpec(GAME_SEED, i, cfgSweep(i))
    } catch (e) {
      add(batch.generation, 'levelIndex ' + i + ' throw: ' + why(e))
      continue
    }
    batch.total += 1
    seen.add(serializeSpec(spec))
    const tag = 'level ' + spec.levelIndex + ' (ch' + spec.chapter + ')'

    if (spec.chapter >= 1 && spec.chapter <= CHAPTERS) batch.perChapter[spec.chapter - 1] += 1
    else add(batch.chapter, tag + ' chapter ngoài 1..8')

    // PC-04 chữ nghĩa + PC-03: đếm trên TẬP lỗ (decode được theo quy ước FLAT).
    let ok = true
    try {
      holeCount(spec.answerHoles)
      for (const o of spec.options) holeCount(o.holes)
    } catch (e) {
      ok = false
      add(batch.decode, tag + ' khong decode duoc toa do: ' + why(e))
    }
    if (!ok) continue

    // B1: cfg.punchCount là ĐỊNH LUẬT — đếm thẳng vào action.points, không tin cổng validator.
    if (spec.action.kind === 'punch' && punchPointsOf(spec).length !== cfgSweep(i).punchCount) {
      add(batch.punchCount, tag + ' punchCount=' + cfgSweep(i).punchCount + ' sinh ' + punchPointsOf(spec).length + ' diem duc')
    }
    // B3: ô raster tính bằng công thức VIẾT TAY (handCells) — hai lỗ chìm trong MỘT ô ảnh
    // là đề mờ mà bitmapOf+hamming của src vẫn có thể gọi là "đạt ngưỡng".
    if (handCells(spec.answerHoles, GRID).size !== holeCount(spec.answerHoles)) {
      add(batch.raster, tag + ' dap an co 2 loi roi vung cung 1 o raster')
    }
    for (const o of spec.options) {
      if (handCells(o.holes, GRID).size !== holeCount(o.holes)) add(batch.raster, tag + ' o ' + o.id + ' co 2 loi roi cung 1 o raster')
    }

    try {
      const res = validateSpec(spec)
      if (!res.ok) add(batch.validate, tag + ' validateSpec: ' + res.errors.join('; '))
    } catch (e) {
      add(batch.validate, tag + ' validateSpec throw: ' + why(e))
    }

    const matches = spec.options.filter((o) => sameSet(o.holes, spec.answerHoles))
    if (matches.length !== 1) add(batch.oneAnswer, tag + ' co ' + matches.length + ' o khop dap an (phai = 1)')
    if (spec.correctIndex < 0 || spec.correctIndex >= spec.options.length) {
      add(batch.answerAtCorrect, tag + ' correctIndex=' + spec.correctIndex + ' ngoai khoang')
    } else if (!sameSet(spec.options[spec.correctIndex].holes, spec.answerHoles)) {
      add(batch.answerAtCorrect, tag + ' correctIndex tro sai o khong phai dap an')
    }

    spec.options.forEach((o, idx) => {
      if (idx === spec.correctIndex) return
      const d = diffHoles(o.holes, spec.answerHoles)
      if (d < 1) add(batch.distractorDiff, tag + ' o nhieu ' + idx + ' giong dap an (khac ' + d + ' lo)')
    })

    for (let a = 0; a < spec.options.length; a++)
      for (let b = a + 1; b < spec.options.length; b++)
        if (sameSet(spec.options[a].holes, spec.options[b].holes))
          add(batch.pairwise, tag + ' cap ' + a + '/' + b + ' giong het nhau')

    try {
      const d = minPairDistance(spec, GRID)
      if (d < MIN_PAIR_DISTANCE) add(batch.distance, tag + ' minPairDistance=' + d + ' < ' + MIN_PAIR_DISTANCE)
    } catch (e) {
      add(batch.distance, tag + ' minPairDistance throw: ' + why(e))
    }

    if (!insideSheet(spec.answerHoles)) add(batch.coords, tag + ' dap an co lo ngoai to')
    for (const o of spec.options) if (!insideSheet(o.holes)) add(batch.coords, tag + ' o ' + o.id + ' co lo ngoai to')
  }
  batch.distinctSpecs = seen.size
  batch.elapsedMs = Date.now() - t0
  // Số liệu thô (TEST-CASES §1 TC-GEN-05: "ghi thời lượng chạy") được ASSERT ở it() bên dưới,
  // không in ra console — ca đếm chạy trong CI và log dài là thứ mà gate F2 cấm.
}, 600000)

describe('TC-GEN-05 · đếm bằng máy trên 10.000 đề liên tiếp (PC-03, PC-04)', () => {
  it('PC-02 + PC-03: ca quét phải SINH ĐỦ 10.000 đề levelIndex 1..10000 (seed cố định) không exception — chống "xanh rỗng"', () => {
    expect(batch.generation.n, 'de throw: ' + batch.generation.samples.join(' || ')).toBe(0)
    expect(batch.total).toBe(STRESS_COUNT)
    // Mọi biến thể cfg của 8 chương đều phải được chạy thật (không phải chỉ 1 kiểu đề lặp lại).
    expect(batch.perChapter).toEqual(Array.from({ length: CHAPTERS }, () => STRESS_COUNT / CHAPTERS))
    // Ca đếm CHẠY THẬT (đo được thời lượng > 0) — thay cho dòng console.log mà F2 cấm.
    expect(batch.elapsedMs).toBeGreaterThan(0)
    expect(batch.distinctSpecs).toBeGreaterThan(1)
  })

  it('PC-03 + PC-04: validateSpec ok trên 10.000/10.000 đề — bộ đếm vi phạm = 0', () => {
    expect(batch.validate.n, 'validateSpec fail: ' + batch.validate.samples.join(' || ')).toBe(0)
    expect(batch.decode.n, 'toạ độ không decode được: ' + batch.decode.samples.join(' || ')).toBe(0)
    expect(batch.chapter.n, 'chapter ngoài dải: ' + batch.chapter.samples.join(' || ')).toBe(0)
    expect(batch.coords.n, 'lỗ ngoài tờ giấy: ' + batch.coords.samples.join(' || ')).toBe(0)
  })

  it('PC-03: mỗi đề trong 10.000 có ĐÚNG 1 đáp án trong 4 ô, và correctIndex trỏ đúng ô đó (không xáo random)', () => {
    expect(batch.oneAnswer.n, 'so o khop dap an != 1: ' + batch.oneAnswer.samples.join(' || ')).toBe(0)
    expect(batch.answerAtCorrect.n, 'correctIndex tro sai: ' + batch.answerAtCorrect.samples.join(' || ')).toBe(0)
  })

  it('TC-GEN-06 · PC-04: không ô nhiễu nào trùng đáp án — mọi ô phải khác đáp án ≥1 lỗ (đo trên 10.000 đề)', () => {
    expect(batch.distractorDiff.n, 'o nhieu giong dap an: ' + batch.distractorDiff.samples.join(' || ')).toBe(0)
  })

  it('TC-GEN-07 · PC-04: 6 cặp phương án đôi một khác nhau trên toàn 10.000 đề', () => {
    expect(batch.pairwise.n, 'hai o giong het nhau: ' + batch.pairwise.samples.join(' || ')).toBe(0)
  })

  it('PC-04: khoảng cách nhỏ nhất ≥ ngưỡng validator (6 ô trên lưới 16×16) cho mọi đề đã sinh', () => {
    expect(batch.distance.n, 'duoi nguong khac biet: ' + batch.distance.samples.join(' || ')).toBe(0)
  })

  it('B1/F-1 · PC-01: 10.000/10.000 đề có SỐ ĐIỂM ĐỤC đúng bằng cfg.punchCount (không màn nào thiếu)', () => {
    expect(batch.punchCount.n, 'punchCount khong duoc ton trong: ' + batch.punchCount.samples.join(' || ')).toBe(0)
  })

  it('B3/F-8 · PC-04: cổng ĐỘC LẬP bằng ô raster viết tay — không hai lỗ nào chìm trong một ô ảnh', () => {
    expect(batch.raster.n, 'o raster trung nhau (handCells): ' + batch.raster.samples.join(' || ')).toBe(0)
  })

  it('PC-02: chạy lại ca quét lần 2 trên cùng (seed, dải levelIndex) cho đúng cùng số đề và cùng số đề khác nhau', () => {
    const once = new Set<string>()
    for (const i of [1, 7, 23, 88, 991, 4999, 9999, STRESS_COUNT]) once.add(serializeSpec(levelSpec(GAME_SEED, i, cfgSweep(i))))
    const twice = new Set<string>()
    for (const i of [1, 7, 23, 88, 991, 4999, 9999, STRESS_COUNT]) twice.add(serializeSpec(levelSpec(GAME_SEED, i, cfgSweep(i))))
    expect([...twice]).toEqual([...once])
    expect(once.size).toBeGreaterThan(1)
  })
})

// ---------------------------------------------------------------------------
// B3/F-8 — "bảng chân lý hình học" viết TAY (helpers.handLayers/handAnswerKeys), không
// callsrc/logic. Trước đây ca quét chỉ tin validateSpec.ok ⇒ lỗi chung của generator VÀ
// validator (hai bên cùng suy ra từ một công thức) lọt qua. Ở đây 24 seed khác nhau được
// đối chiếu lỗ của đáp án với quỹ đạo mở bung tính bằng affine số nguyên lưới 1/8.
// ---------------------------------------------------------------------------
describe('B3/F-8 · đối chiếu độc lập 24 seed với mô hình hình học viết tay', () => {
  const SAMPLE = 24
  const checked = (() => {
    const bad: string[] = []
    let n = 0
    for (let k = 0; k < SAMPLE; k++) {
      const level = 1 + k * 417 // rải khắp dải 1..10000 ⇒ đổi cả chương lẫn levelInChapter
      const cfg: ChapterLevelConfig = { ...cfgSweep(level), useCut: false }
      const spec = levelSpec('B3-SEED-' + k, level, cfg)
      if (spec.action.kind !== 'punch') {
        bad.push('level ' + level + ' khong phai punch du useCut=false')
        continue
      }
      n += 1
      const tag = 'level ' + level + ' (ch' + spec.chapter + ', ' + spec.folds.join('') + ')'
      // (1) số điểm đục == cfg.punchCount (B1).
      if (punchPointsOf(spec).length !== cfg.punchCount) bad.push(tag + ' punchCount=' + cfg.punchCount + ' -> ' + punchPointsOf(spec).length + ' diem')
      // (2) đáp án == union quỹ đạo của chính các điểm đục, tính bằng affine viết tay.
      const truth = handAnswerKeys(spec.folds, spec.action.points)
      if (truth === null) bad.push(tag + ' diem duc ngoai luoi 1/8 (mo tay khong do duoc)')
      else if (truth.join(';') !== holeSet(spec.answerHoles).join(';')) bad.push(tag + ' tap loi khong khop mo tay: tay=' + truth.length + ' gen=' + holeCount(spec.answerHoles))
      else if (truth.length > 2 ** spec.folds.length) bad.push(tag + ' so loi ' + truth.length + ' vuot tran 2^' + spec.folds.length)
      // (3) khác biệt raster đo bằng handPairwiseMinOf (không dùng hamming/bitmapOf của src).
      const d = handPairwiseMinOf(spec.options.map((o) => o.holes), GRID)
      if (d < MIN_PAIR_DISTANCE) bad.push(tag + ' handPairwiseMin=' + d + ' < ' + MIN_PAIR_DISTANCE)
    }
    return { n, bad }
  })()

  it('24 seed phải thật sự được kiểm (không phải vòng lặp rỗng)', () => {
    expect(checked.n).toBeGreaterThanOrEqual(20)
  })

  it('mọi seed mẫu: đáp án khớp mở bung viết tay + đủ punchCount + đạt ngưỡng raster', () => {
    expect(checked.bad, checked.bad.slice(0, 5).join(' || ')).toEqual([])
  })
})