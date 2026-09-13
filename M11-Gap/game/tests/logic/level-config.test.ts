// ============================================================================
// B1a · NHÓM A — src/logic/generator.ts: levelConfigFor(chapters, levelIndex)
// Pattern: config là DỮ LIỆU (SPEC §5.2 điểm cắm "generator độ khó", STRUCTURE §2).
// Rule phủ: PC-01 (8 chương × 15 màn, timer chỉ từ chương 7, cut/D theo chương)
//           + PC-02 (cùng bảng config + cùng levelIndex ⇒ cùng tham số sinh đề).
//
// config/chapters.json CHƯA TỒN TẠI ở B1a (thư mục config/ còn trống) ⇒ fixture dựng tay
// theo TÊN FIELD trong DATA-MODEL §3.1 (chapter, name, paper_theme, fold_vocab, layers,
// timer, gen_params, level_index, archetype, folds, action, hole_placement, inference_steps,
// noise_style, timer_sec). Ghi chú: §3.1 đặt "số lỗ min–max" trong gen_params cấp chương,
// fixture ở đây dẹt hoá thành holes_min/holes_max — chỉ là hình dạng chờ file config thật.
// Khi config/chapters.json ra đời: THAY FIXTURE, giữ nguyên các assert bên dưới.
// ============================================================================
import { describe, it, expect } from 'vitest'
import { levelConfigFor } from '../../src/logic/generator'
import type { ChapterLevelConfig } from '../../src/logic/generator'
import type { FoldKind } from '../../src/logic/types'
import { CAMPAIGN_LEVELS, CHAPTERS, LEVELS_PER_CHAPTER } from './helpers'

type LevelRow = {
  level_index: number
  archetype: string
  folds: FoldKind[]
  action: 'punch' | 'cut'
  hole_placement: string
  inference_steps: number
  noise_style: string
  timer_sec: number
}
type ChapterRow = {
  chapter: number
  name: string
  paper_theme: string
  fold_vocab: string
  layers: 4 | 8
  timer: boolean
  holes_min: number
  holes_max: number
  levels: LevelRow[]
}

/** Bảng 8 chương × 15 màn dựng theo §3.1: cut từ ch4, D từ ch6, timer chỉ ch7–ch8. */
function chaptersFixture(): ChapterRow[] {
  const rows: ChapterRow[] = []
  for (let c = 1; c <= CHAPTERS; c++) {
    const levels: LevelRow[] = []
    for (let k = 1; k <= LEVELS_PER_CHAPTER; k++) {
      const folds: FoldKind[] = c >= 6 ? ['D', 'H', 'V'] : c >= 5 ? ['H', 'V', 'H'] : ['H', 'V']
      levels.push({
        level_index: (c - 1) * LEVELS_PER_CHAPTER + k,
        archetype: k <= 2 ? 'teach' : 'practice',
        folds,
        action: c >= 4 ? 'cut' : 'punch',
        hole_placement: c >= 3 ? 'edge' : 'face',
        inference_steps: 1 + (k % 4),
        noise_style: 'flip-one',
        timer_sec: c >= 7 ? 60 : 0,
      })
    }
    rows.push({
      chapter: c,
      name: 'Chapter ' + c,
      paper_theme: 'theme-' + c,
      fold_vocab: 'vocab-' + c,
      layers: c >= 5 ? 8 : 4,
      timer: c >= 7,
      holes_min: c >= 7 ? 2 : 1,
      holes_max: c >= 7 ? 3 : 1,
      levels,
    })
  }
  return rows
}

describe('generator.levelConfigFor — bảng chương là dữ liệu, không hardcode trong scene (PC-01)', () => {
  it('PC-01: mapping level_index → (chapter, levelInChapter) đúng ceil(level/15), 15 màn/chương, 120 màn', () => {
    const chapters = chaptersFixture()
    for (const level of [1, 15, 16, 23, 30, 31, 60, 75, 90, 105, 106, CAMPAIGN_LEVELS]) {
      const cfg = levelConfigFor(chapters, level)
      const chapter = Math.ceil(level / LEVELS_PER_CHAPTER)
      expect(cfg.chapter, 'level ' + level).toBe(chapter)
      expect(cfg.levelInChapter, 'level ' + level).toBe(level - (chapter - 1) * LEVELS_PER_CHAPTER)
    }
  })

  it('PC-01: foldCount lấy từ dòng config folds (1–3 lượt gấp liên tiếp — độ sâu D2 của SPEC)', () => {
    const chapters = chaptersFixture()
    for (const level of [1, 16, 61, 76, 120]) {
      const chapter = Math.ceil(level / LEVELS_PER_CHAPTER)
      const row = chapters[chapter - 1].levels.find((l) => l.level_index === level)
      expect(levelConfigFor(chapters, level).foldCount).toBe(row?.folds.length)
    }
  })

  it('PC-01: useCut chỉ bật từ chương 4 ("cắt góc chéo" — SPEC §6.1), useDiagonal từ chương 6 ("nếp chéo D")', () => {
    const chapters = chaptersFixture()
    for (let level = 1; level <= CAMPAIGN_LEVELS; level++) {
      const chapter = Math.ceil(level / LEVELS_PER_CHAPTER)
      const cfg = levelConfigFor(chapters, level)
      expect(cfg.useCut, 'level ' + level).toBe(chapter >= 4)
      expect(cfg.useDiagonal, 'level ' + level).toBe(chapter >= 6)
    }
  })

  it('PC-01: timerOn ONLY khi chapter.timer bật VÀ dòng level có timer_sec > 0 (timer từ chương 7, màn 7.x có timer)', () => {
    const chapters = chaptersFixture()
    for (let level = 1; level <= CAMPAIGN_LEVELS; level++) {
      const chapter = Math.ceil(level / LEVELS_PER_CHAPTER)
      const timerOn = levelConfigFor(chapters, level).timerOn
      expect(timerOn, 'level ' + level).toBe(chapter >= 7)
    }
    // chương 1–6 tuyệt đối không có timer (PC-01), chương 7–8 có
    expect(chapters.slice(0, 6).every((c) => c.timer === false)).toBe(true)
  })

  it('PC-01 + PC-02: punchCount nằm trong dải holes_min..holes_max của chương và là số nguyên ≥1; cùng bảng + cùng level ⇒ cùng tham số', () => {
    const chapters = chaptersFixture()
    for (let level = 1; level <= CAMPAIGN_LEVELS; level++) {
      const chapter = Math.ceil(level / LEVELS_PER_CHAPTER)
      const row = chapters[chapter - 1]
      const cfg = levelConfigFor(chapters, level)
      expect(Number.isInteger(cfg.punchCount), 'level ' + level).toBe(true)
      expect(cfg.punchCount).toBeGreaterThanOrEqual(row.holes_min)
      expect(cfg.punchCount).toBeLessThanOrEqual(row.holes_max)
    }
    expect(levelConfigFor(chapters, 23)).toEqual(levelConfigFor(chapters, 23))
  })

  it('PC-01: level_index NGOÀI dải 1..120 không được im lặng trả cfg rác (chặn leak màn 121 — PC-18 / TC-ERR-07)', () => {
    const chapters = chaptersFixture()
    // Chốt hành vi chuẩn TRƯỚC, để bảo đảm case này đỏ thật khi src chưa implement
    // (nếu chỉ test nhánh "bị chặn" thì một hàm luôn ném lỗi cũng qua — self-satisfying).
    expect(levelConfigFor(chapters, 23).chapter).toBe(2)
    for (const level of [0, -3, CAMPAIGN_LEVELS + 1, 99999]) {
      let res: ChapterLevelConfig | undefined | null
      try {
        res = levelConfigFor(chapters, level)
      } catch {
        continue // từ chối bằng exception là hợp lệ
      }
      expect(res == null, 'level ' + level + ' phai bi tu choi (throw hoac tra undefined/null)').toBe(true)
    }
  })
})