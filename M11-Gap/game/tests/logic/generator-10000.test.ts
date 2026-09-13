// ============================================================================
// B1a · NHÓM A — "ĐẾM BẰNG MÁY", không đếm bằng mắt (TEST-CASES §1 preamble).
// Phủ TC-GEN-05 (10.000 đề liên tiếp), TC-GEN-06, TC-GEN-07, và phần PC-03/PC-04 của
// TC-GEN-04 trên dải tổng hợp.
//
//   · Dải: levelIndex 0..9999 với seed CỐ ĐỊNH (GAME_SEED) + cfg biến thiên theo chương
//     (TC-GEN-05 ghi rõ "dải seed tổng hợp, không phải 120 màn chính").
//   · Ngưỡng: validateSpec.ok (PC-03 + PC-04) VÀ minPairDistance(spec, 16) >= 6
//     (ngưỡng ghi trong header validator.ts, gốc g08_verify.py "bitmap + hamming >= 6").
//   · Mọi bộ đếm vi phạm phải = 0 ⇒ tại thời điểm bàn giao batch, đống test này phải XANH
//     và chứng minh TC-GEN-05 không phải "luôn xanh giả" (có fixture xấu ở validator.test.ts).
// ============================================================================
import { describe, it, expect, beforeAll } from 'vitest'
import { levelSpec } from '../../src/logic/generator'
import { minPairDistance, validateSpec } from '../../src/logic/validator'
import {
  CHAPTERS,
  GAME_SEED,
  GRID,
  MIN_PAIR_DISTANCE,
  STRESS_COUNT,
  cfgSweep,
  diffHoles,
  holeCount,
  insideSheet,
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
}

const why = (e: unknown): string => (e instanceof Error ? e.message : String(e))

beforeAll(() => {
  const seen = new Set<string>()
  const t0 = Date.now()
  for (let i = 0; i < STRESS_COUNT; i++) {
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
  // Số liệu thô cho báo cáo bàn giao (TEST-CASES §1 TC-GEN-05: "ghi thời lượng chạy").
  console.log(
    '[B1a][TC-GEN-05] generated=' + batch.total + '/' + STRESS_COUNT +
      ' distinctSpecs=' + batch.distinctSpecs +
      ' elapsedMs=' + batch.elapsedMs,
  )
}, 600000)

describe('TC-GEN-05 · đếm bằng máy trên 10.000 đề liên tiếp (PC-03, PC-04)', () => {
  it('PC-02 + PC-03: ca quét phải SINH ĐỦ 10.000 đề levelIndex 0..9999 (seed cố định) không exception — chống "xanh rỗng"', () => {
    expect(batch.generation.n, 'de throw: ' + batch.generation.samples.join(' || ')).toBe(0)
    expect(batch.total).toBe(STRESS_COUNT)
    // Mọi biến thể cfg của 8 chương đều phải được chạy thật (không phải chỉ 1 kiểu đề lặp lại).
    expect(batch.perChapter).toEqual(Array.from({ length: CHAPTERS }, () => STRESS_COUNT / CHAPTERS))
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

  it('PC-02: chạy lại ca quét lần 2 trên cùng (seed, dải levelIndex) cho đúng cùng số đề và cùng số đề khác nhau', () => {
    const once = new Set<string>()
    for (const i of [0, 1, 7, 23, 88, 991, 4999, 9999]) once.add(serializeSpec(levelSpec(GAME_SEED, i, cfgSweep(i))))
    const twice = new Set<string>()
    for (const i of [0, 1, 7, 23, 88, 991, 4999, 9999]) twice.add(serializeSpec(levelSpec(GAME_SEED, i, cfgSweep(i))))
    expect([...twice]).toEqual([...once])
    expect(once.size).toBeGreaterThan(1)
  })
})