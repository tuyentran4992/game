// ============================================================================
// B1a · VÒNG FIX A — nhóm A1 + A3 (review F-1, F-4) trên src/logic/generator.ts.
//   A1: bảng tra thiếu khoá (foldCount 0/4/5) hoặc cfg khai sai (sai độ dài, kiểu nếp lạ,
//       nếp D mà useDiagonal=false) ⇒ PHẢI NÉM. cfg khai `folds` ⇒ dùng ĐÚNG chuỗi đó;
//       chỉ khi không khai mới suy từ bảng CHAIN_ROWS.
//   A3: LevelSpec.folds là BẢN SAO ĐÔNG CỨNG — không phải mảng nội bộ, người gọi
//       push/gán lại không đổi được đề của cùng seed+levelIndex (PC-02).
// F-3: mọi giá trị chờ đều VIẾT TAY trong file này; không lấy hàm của src/ làm oracle.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { levelConfigFor, levelSpec } from '../../src/logic/generator'
import type { ChapterLevelConfig } from '../../src/logic/generator'
import { FOLD_KIND_ALL, creaseLines, firstFoldDefect } from '../../src/logic/foldRules'
import type { FoldKind, LevelSpec } from '../../src/logic/types'
import { R, GAME_SEED, cfgFor, cfgCampaign, serializeSpec, insideSheet } from './helpers'

const ONE = R(1n)
const H: FoldKind = 'H'
const V: FoldKind = 'V'
const D: FoldKind = 'D'
/**
 * Kiểu nếp KHÔNG có trong bảng registry — tìm bằng PHÉP THỬ trên bảng chữ cái lạ, không đoán
 * tên: mở rộng FoldKind (thêm 'Z', 'Q'...) không làm đỏ test "chối kiểu nếp lạ" (E7/A14).
 */
const ALIEN = ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'Z'] as unknown as FoldKind[]
const JUNK: FoldKind = ALIEN.find((k) => !FOLD_KIND_ALL.includes(k)) ?? ALIEN[0]
const CHAIN_VH: FoldKind[] = [V, H]
const CHAIN_HV: FoldKind[] = [H, V]
const CHAIN_HHV: FoldKind[] = [H, H, V]
const CHAIN_DHV: FoldKind[] = [D, H, V]

/**
 * BẤT BIẾN HÀNH VI của chuỗi nếp được sinh ra (E7/A14). Bản cũ CHÉP TAY bảng CHAIN_ROWS
 * vào test (`POOL_1..3`) ⇒ test Khoá chết dữ liệu của src: thêm một dòng chuỗi hợp lệ vào
 * bảng là test đỏ, dù hành vi người chơi nhận được không đổi chút nào.
 */
function assertChainLaws(got: FoldKind[], want: ChapterLevelConfig, who: string): void {
  expect(got.length, who).toBe(want.foldCount) // PC-01: đúng số lượt gấp config khai
  expect(got.every((k) => FOLD_KIND_ALL.includes(k)), who).toBe(true) // chỉ kiểu nếp có trong bảng
  expect(firstFoldDefect(got), who).toBeNull() // D1: chuỗi sinh ra phải GẤP ĐƯỢC
  if (!want.useDiagonal) expect(got.includes('D'), who).toBe(false) // chưa dạy chéo ⇒ không chéo
}

function cfgPatch(count: number, chain: readonly FoldKind[] | undefined, diagonal: boolean): ChapterLevelConfig {
  const base = cfgFor(1, 1)
  return { ...base, foldCount: count, folds: chain, useDiagonal: diagonal }
}
/** Trả về LỖI nếu levelSpec ném, hoặc chính đề nếu nó còn trả đề. */
function tryLevelSpec(cfg: ChapterLevelConfig, seed: string, level: number): LevelSpec | Error {
  try {
    return levelSpec(seed, level, cfg)
  } catch (e) {
    return e instanceof Error ? e : new Error(String(e))
  }
}

describe('A1/F-1 · chainFor cấm nuốt foldCount ngoài bảng', () => {
  it('foldCount 0 / -1 / 4 / 5 / 99 ⇒ NÉM, nêu tên bảng và giá trị thừa', () => {
    for (const n of [0, -1, 4, 5, 99]) {
      const res = tryLevelSpec(cfgPatch(n, undefined, false), GAME_SEED, 23)
      expect(res, 'foldCount=' + n + ' phải bị từ chối').toBeInstanceOf(Error)
      expect((res as Error).message).toContain('CHAIN_ROWS')
      expect((res as Error).message).toContain('foldCount=' + n)
    }
  })

  it('chốt hành vi chuẩn trước: foldCount 1..3 vẫn sinh đề và chuỗi tuân mọi luật', () => {
    for (const n of [1, 2, 3]) {
      const cfg = cfgPatch(n, undefined, false)
      assertChainLaws(levelSpec(GAME_SEED, 23, cfg).folds, cfg, 'foldCount=' + n)
    }
  })

  it('200 seed liên tiếp: mọi chuỗi tuân luật, tất định, và bảng không bị hẹp đến mức chỉ ra 1 chuỗi', () => {
    for (const n of [1, 2, 3]) {
      const cfg = cfgPatch(n, undefined, false)
      const seen = new Set<string>()
      for (let i = 1; i <= 200; i++) {
        const got = levelSpec('S-' + i, 23, cfg).folds.join('')
        assertChainLaws(got.split('') as FoldKind[], cfg, 'seed S-' + i + ' foldCount=' + n)
        expect(levelSpec('S-' + i, 23, cfg).folds.join(''), 'seed S-' + i).toBe(got)
        seen.add(got)
      }
      expect(seen.size, 'foldCount=' + n + ' chỉ đẻ ra 1 chuỗi ⇒ bảng mất đa dạng').toBeGreaterThan(1)
    }
  })

  it('cfg khai folds ⇒ dùng ĐÚNG chuỗi đó, mọi seed (trước đây chỉ giữ folds.length rồi vứt)', () => {
    for (const seed of [GAME_SEED, 'OTHER', 'SEED-7']) {
      for (const level of [1, 23, 88]) {
        expect(levelSpec(seed, level, cfgPatch(2, CHAIN_VH, false)).folds).toEqual(CHAIN_VH)
        expect(levelSpec(seed, level, cfgPatch(3, CHAIN_HHV, false)).folds).toEqual(CHAIN_HHV)
      }
    }
  })

  it('cfg folds SAI (độ dài / kiểu nếp lạ / D khi useDiagonal=false) ⇒ NÉM, không trả đề', () => {
    const wrongLength = cfgPatch(3, CHAIN_HV, false) // chuỗi 2 nếp cho foldCount 3
    const unknownKind = cfgPatch(2, [H, JUNK], false)
    const diagonalOff = cfgPatch(3, CHAIN_DHV, false)
    for (const cfg of [wrongLength, unknownKind, diagonalOff]) {
      const res = tryLevelSpec(cfg, GAME_SEED, 5)
      expect(res, JSON.stringify(cfg.folds)).toBeInstanceOf(Error)
    }
  })
})

describe('A1/F-1 · levelConfigFor trao đúng chuỗi folds của bảng config cho generator', () => {
  const NAME = 'chapter-1'
  const rowVH = { level_index: 1, folds: CHAIN_VH }
  const rowHHV = { level_index: 2, folds: CHAIN_HHV }
  const rowNoFolds = { level_index: 1, layers: 4 }
  const rowJunk = { level_index: 1, folds: [H, JUNK] }
  const tableOf = (levels: readonly object[]): unknown => ({
    chapters: [{ chapter: 1, name: NAME, timer: false, levels }],
  })

  it('folds khai ở dòng màn đi nguyên vẹn vào cfg và vào đề', () => {
    const chapters = tableOf([rowVH, rowHHV])
    expect(levelConfigFor(chapters, 1).folds).toEqual(CHAIN_VH)
    expect(levelConfigFor(chapters, 2).folds).toEqual(CHAIN_HHV)
    expect(levelSpec(GAME_SEED, 1, levelConfigFor(chapters, 1)).folds).toEqual(CHAIN_VH)
    expect(levelSpec('SEED-X', 2, levelConfigFor(chapters, 2)).folds).toEqual(CHAIN_HHV)
  })

  it('config không khai folds ⇒ foldCount suy từ layers (4 = 2^2) và chuỗi suy từ bảng', () => {
    const cfg = levelConfigFor(tableOf([rowNoFolds]), 1)
    expect(cfg.foldCount).toBe(2)
    expect(cfg.folds === undefined || cfg.folds.length === 0).toBe(true)
    const spec = levelSpec(GAME_SEED, 1, cfg)
    assertChainLaws(spec.folds, cfg, 'config không khai folds')
  })

  it('config khai kiểu nếp lạ ⇒ levelConfigFor NÉM (trước đây filter vứt Z âm thầm)', () => {
    expect(() => levelConfigFor(tableOf([rowJunk]), 1)).toThrow(JUNK)
  })
})

describe('A1/F-1 · bảng kiểu nếp phủ toàn bộ FoldKind', () => {
  it('FOLD_KIND_ALL dẫn xuất từ bảng registry, đã sorted và không trùng (E5: test không chép tên kiểu nếp)', () => {
    expect(FOLD_KIND_ALL.length).toBeGreaterThanOrEqual(3) // H, V, D phải có mặt
    for (const k of [H, V, D]) expect(FOLD_KIND_ALL, 'thiếu kiểu ' + k).toContain(k)
    expect(new Set(FOLD_KIND_ALL).size).toBe(FOLD_KIND_ALL.length)
    expect(FOLD_KIND_ALL.every((k, i) => i === 0 || FOLD_KIND_ALL[i - 1] <= k)).toBe(true)
  })

  it('mọi FoldKind có dòng trong bảng hình học: creaseLines không ném; D không tạo nếp thẳng', () => {
    for (const kind of FOLD_KIND_ALL) expect(() => creaseLines([kind], ONE)).not.toThrow()
    expect(creaseLines([H], ONE).x.length).toBe(1)
    expect(creaseLines([V], ONE).y.length).toBe(1)
    expect(creaseLines([D], ONE).x.length).toBe(0)
    expect(creaseLines([D], ONE).y.length).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// B2/F-2 — levelSpec phải TỰ VỆ trước input bẩn. Bản cũ chỉ kiểm cfg.folds/foldCount rồi
// sinh đề: levelIndex NaN/0/-7/1e6/1.5 và punchCount 0/-5/99 lọt hết qua (QA dựng màn rác,
// manifest NaN). Chặn ngay ở cửa vào, thông điệp nêu tên field + dải hợp lệ (như shareCode đã làm).
// ---------------------------------------------------------------------------
describe('B2/F-2 · levelSpec từ chối levelIndex và punchCount bẩn', () => {
  const base = cfgFor(1, 1)
  const punchCfg = (n: number): ChapterLevelConfig => ({ ...base, punchCount: n })

  it('levelIndex NaN / 0 / -7 / 1e6 / 1.5 / Infinity ⇒ NÉM nêu tên levelIndex', () => {
    for (const bad of [Number.NaN, 0, -7, 1e6, 1.5, Number.POSITIVE_INFINITY]) {
      expect(() => levelSpec(GAME_SEED, bad, base), 'levelIndex=' + bad).toThrow(/levelIndex/)
      expect(() => levelSpec(GAME_SEED, bad, base), 'levelIndex=' + bad).toThrow(/số nguyên/)
    }
  })

  it('punchCount 0 / -5 / 99 / 1.5 / NaN ⇒ NÉM nêu tên punchCount (bỏ floor Math.max(1, ...))', () => {
    for (const bad of [0, -5, 99, 1.5, Number.NaN, Number.NEGATIVE_INFINITY]) {
      expect(() => levelSpec(GAME_SEED, 7, punchCfg(bad)), 'punchCount=' + bad).toThrow('punchCount=' + bad)
    }
  })

  it('chốt hành vi chuẩn: biên trong dải vẫn sinh đề (levelIndex 1 và 10000, punchCount 1..2)', () => {
    expect(levelSpec(GAME_SEED, 1, base).levelIndex).toBe(1)
    expect(levelSpec(GAME_SEED, 10000, base).levelIndex).toBe(10000)
    expect(levelSpec(GAME_SEED, 7, punchCfg(1)).action.kind).toBe('punch')
    expect(levelSpec(GAME_SEED, 7, punchCfg(2)).action.kind).toBe('punch')
  })

  it('thông báo lỗi nêu cả giá trị thừa lẫn dải cho phép (debug QA)', () => {
    const msg = ((): string => {
      try {
        levelSpec(GAME_SEED, 0, base)
      } catch (e) {
        return e instanceof Error ? e.message : String(e)
      }
      return 'KHONG-NEM'
    })()
    expect(msg).toContain('levelIndex=0')
    expect(msg).toContain('1..')
    expect(msg).not.toBe('KHONG-NEM')
  })
})

// ---------------------------------------------------------------------------
// VÒNG FIX D1 (BUG THẬT #1) — 0,43% đề fuzz có lỗ NGOÀI TỜ vì cfg.folds cho phép
// nếp chéo D rơi lúc packet đã CHỮ NHẬT (D soi qua chéo x=y, chỉ nghĩa khi vuông).
// Yêu cầu: chuỗi sai ⇒ NÉM nêu chuỗi + lý do; chuỗi đúng ⇒ mọi toạ độ trong [0,1]².
// ---------------------------------------------------------------------------
describe('D1 · nếp chéo D chỉ hợp lệ khi packet còn VUÔNG tại lúc gấp', () => {
  /** 6 chuỗi bắt buộc của vòng fix D: 2 chuỗi hợp lệ (D lúc còn vuông) + 4 chuỗi sai. */
  const CHAINS: FoldKind[][] = [['D'], ['D', 'H'], ['H', 'D'], ['H', 'H', 'D'], ['V', 'V', 'D'], ['D', 'V', 'V', 'D']]
  const ILLEGAL = ['HD', 'HHD', 'VVD', 'DVVD']
  const cfgOf = (chain: readonly FoldKind[]): ChapterLevelConfig => ({
    ...cfgFor(6, 3), foldCount: chain.length, folds: chain, punchCount: 1, useCut: false, useDiagonal: true,
  })

  it('D1 · repro báo cáo: folds ["H","H","D"] NÉM, nêu chuỗi + lý do vuông, không trả đề', () => {
    const res = tryLevelSpec(cfgOf(['H', 'H', 'D']), 'DPROOF', 5)
    expect(res).toBeInstanceOf(Error)
    const msg = (res as Error).message
    expect(msg).toContain('HHD')
    expect(msg).toMatch(/vuông/i)
    expect(msg).toMatch(/vị trí 3/)
  })

  it('D1 · cả 6 chuỗi test: hoặc NÉM có chủ ngữ, hoặc đề sạch — không chuỗi nào trả lỗ ngoài tờ', () => {
    const bad: string[] = []
    for (const chain of CHAINS) {
      const who = chain.join('')
      const res = tryLevelSpec(cfgOf(chain), 'DPROOF', 5)
      if (res instanceof Error) {
        if (ILLEGAL.indexOf(who) < 0) bad.push(who + ' hợp lệ nhưng ném: ' + res.message)
        else if (!res.message.includes(who) || !/vuông/i.test(res.message)) bad.push(who + ' ném không nêu chuỗi+lý do: ' + res.message)
        continue
      }
      if (ILLEGAL.indexOf(who) >= 0) bad.push(who + ' (D lúc packet chữ nhật) vẫn trả đề')
      if (!insideSheet(res.answerHoles)) bad.push(who + ' answerHoles có lỗ ngoài tờ')
      res.options.forEach((o, i) => { if (!insideSheet(o.holes)) bad.push(who + ' ô ' + i + ' có lỗ ngoài tờ') })
    }
    expect(bad, bad.join(' || ')).toEqual([])
  })

  it('D1 · 39 chuỗi nếp độ dài 1..3: mọi đề sinh được đều có toạ độ trong tờ [0,1]×[0,1]', () => {
    const kinds: FoldKind[] = ['H', 'V', 'D']
    const chains = kinds.flatMap((a) => kinds.flatMap((b) => kinds.flatMap((c) => [[a], [a, b], [a, b, c]] as FoldKind[][])))
    const seen = new Set(chains.map((c) => c.join('')))
    let generated = 0
    let rejected = 0
    for (const key of [...seen].sort()) {
      const chain = key.split('') as FoldKind[]
      const res = tryLevelSpec(cfgOf(chain), 'SWEEP', 11)
      if (res instanceof Error) { rejected += 1; continue }
      generated += 1
      expect(insideSheet(res.answerHoles), key + ' answerHoles').toBe(true)
      for (const o of res.options) expect(insideSheet(o.holes), key + ' option ' + o.id).toBe(true)
    }
    expect(generated).toBeGreaterThan(0)
    expect(rejected).toBeGreaterThan(0) // chuỗi sai phải bị chặn, không im lặng
  })

  it('D1 · chuỗi từ bảng CHAIN_ROWS vẫn dùng được (không ném oan): mọi foldCount 1..3 useDiagonal', () => {
    for (const n of [1, 2, 3]) {
      const cfg: ChapterLevelConfig = { ...cfgFor(6, 3), foldCount: n, folds: undefined, punchCount: 1, useCut: false, useDiagonal: true }
      for (let s = 1; s <= 40; s++) {
        const spec = levelSpec('LEGAL-' + s, s, cfg)
        expect(insideSheet(spec.answerHoles), 'seed ' + s + ' ' + spec.folds.join('')).toBe(true)
      }
    }
  })
})

// ---------------------------------------------------------------------------
// VÒNG FIX D4 (review F2) — cfg KHÔNG PHẢI object hợp lệ (QA truyền thiếu field, manifest
// rỗng) từng làm levelSpec ném TypeError trần "Cannot read properties of undefined
// (reading 'punchCount')": sai ở TẦNG BÁO LỖI, không nêu được field nào thiếu.
// ---------------------------------------------------------------------------
describe('D4/F-2 · levelSpec kết luận cfg hỏng bằng thông điệp, không bằng TypeError', () => {
  const base = cfgFor(1, 1)
  const REQUIRED = ['chapter', 'levelInChapter', 'foldCount', 'punchCount', 'useCut', 'useDiagonal', 'timerOn'] as const

  it('D4 · cfg = undefined / null / số / chuỗi ⇒ NÉM nêu ChapterLevelConfig, không phải TypeError', () => {
    for (const bad of [undefined, null, 7, 'cfg', true]) {
      const res = tryLevelSpec(bad as unknown as ChapterLevelConfig, GAME_SEED, 5)
      expect(res, 'cfg=' + String(bad)).toBeInstanceOf(Error)
      const msg = (res as Error).message
      expect(msg, 'cfg=' + String(bad)).toContain('ChapterLevelConfig')
      expect(msg).not.toMatch(/Cannot read propert|is not a function|undefined is not an object/)
    }
  })

  it('D4 · thiếu TỪNG field bắt buộc ⇒ thông điệp nêu đích danh field đó', () => {
    for (const name of REQUIRED) {
      const partial: Record<string, unknown> = { ...base }
      delete partial[name]
      const res = tryLevelSpec(partial as unknown as ChapterLevelConfig, GAME_SEED, 5)
      expect(res, 'thiếu ' + name).toBeInstanceOf(Error)
      expect((res as Error).message).toContain(name)
      expect((res as Error).message).toMatch(/thiếu|phải là/)
    }
  })

  it('D4 · field sai kiểu (punchCount chuỗi, useCut số, folds không phải mảng) ⇒ NÉM rõ ràng', () => {
    const wrong: ChapterLevelConfig[] = [
      { ...base, punchCount: '2' as unknown as number },
      { ...base, useCut: 1 as unknown as boolean },
      { ...base, folds: 'HV' as unknown as FoldKind[] },
    ]
    for (const cfg of wrong) {
      const res = tryLevelSpec(cfg, GAME_SEED, 5)
      expect(res, JSON.stringify(cfg)).toBeInstanceOf(Error)
      expect((res as Error).message).not.toMatch(/Cannot read propert/)
    }
  })

  it('D4 · điều khiển dương: cfg đủ field và folds:undefined vẫn sinh đề bình thường', () => {
    const spec = levelSpec(GAME_SEED, 5, { ...base, folds: undefined })
    expect(spec.folds.length).toBe(base.foldCount)
    expect(spec.options.length).toBe(4)
  })
})

// ---------------------------------------------------------------------------
// VÒNG FIX E (E7/A14) — thay test "chép tay bảng CHAIN_ROWS" bằng LUẬT HÀNH VI của nhịp
// dạy luật (SPEC §6.1: nếp chéo D ra mắt ở màn 3 của chương dùng chéo). Test kiểu này vẫn
// xanh khi bảng CHAIN_ROWS được THÊM dòng, và đỏ khi Generator đổi nhịp dạy luật.
// ---------------------------------------------------------------------------
describe('E7 · nhịp dạy luật: nếp chéo D xuất hiện đúng màn chia hết 3 của chương dùng chéo', () => {
  const cfgDiagonal = (levelInChapter: number, foldCount: number): ChapterLevelConfig => ({
    ...cfgFor(6, levelInChapter), foldCount, punchCount: 1, useCut: false, useDiagonal: true,
  })

  it('màn 3 của chương chéo, foldCount 3 ⇒ MỌI seed đều ra chuỗi CHỨA D', () => {
    const cfg = cfgDiagonal(3, 3)
    for (let s = 1; s <= 40; s++) {
      const folds = levelSpec('TEACH-' + s, s, cfg).folds
      expect(folds, 'seed TEACH-' + s).toContain(D)
      assertChainLaws(folds, cfg, 'TEACH-' + s)
    }
  })

  it('màn 1 (chưa đến nhịp dạy) với foldCount 1 ⇒ không chuỗi chéo nào lọt vào đề', () => {
    const cfg = cfgDiagonal(1, 1)
    for (let s = 1; s <= 40; s++) expect(levelSpec('NO-TEACH-' + s, s, cfg).folds).not.toContain(D)
  })
})

describe('A3/F-4 · LevelSpec.folds là bản sao đông cứng, không phải mảng nội bộ', () => {
  it('spec.folds frozen; 2 lời gọi cùng seed cho 2 mảng khác nhau nhưng cùng nội dung', () => {
    const a = levelSpec(GAME_SEED, 23, cfgCampaign(23))
    const b = levelSpec(GAME_SEED, 23, cfgCampaign(23))
    expect(Object.isFrozen(a.folds)).toBe(true)
    expect(a.folds).toEqual(b.folds)
    expect(a.folds).not.toBe(b.folds)
  })

  it('gán lại phần tử của spec.folds ⇒ TypeError (strict mode) và đề không đổi ở lời gọi sau', () => {
    const a = levelSpec(GAME_SEED, 23, cfgCampaign(23))
    const before = serializeSpec(a)
    expect(() => {
      a.folds[0] = a.folds[0] === H ? V : H
    }).toThrow(TypeError)
    expect(serializeSpec(a)).toBe(before)
    expect(serializeSpec(levelSpec(GAME_SEED, 23, cfgCampaign(23)))).toBe(before)
  })

  it('push() vào folds của lời gọi trước không làm lệch lời gọi sau; mảng cfg cũng không bị lộ', () => {
    const declared: FoldKind[] = [V, H]
    const x = levelSpec('S1', 44, cfgPatch(2, declared, false))
    expect(x.folds).not.toBe(declared) // generator không trả lại chính mảng người gọi đưa vào
    let threw = false
    try {
      x.folds.push(H)
    } catch {
      threw = true
    }
    expect(threw).toBe(true)
    expect(x.folds).toEqual(levelSpec('S1', 44, cfgPatch(2, declared, false)).folds)
  })
})
