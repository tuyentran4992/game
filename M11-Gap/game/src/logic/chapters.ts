// Pattern: Parser + Table lookup (bảng chương → cấu hình màn)
// TRÁCH NHIỆM: đọc config/chapters.json (chưa tồn tại ở B1a ⇒ truyền tay khi test) và
//   đối chiếu levelIndex với VỊ TRÍ trong bảng 8 chương × 15 màn để dựng ChapterLevelConfig.
//   Không suy cấp số học cứng: đếm số màn của từng dòng chương, nên bảng thêm/bớt màn là
//   parser vẫn đúng (PC-18 chặn leak màn 121 nhờ tổng màn đọc được, không phải hằng 120).
// RÀNG BUỘC: field theo DATA-MODEL §3.1, mỗi field có cả dạng dẹt lẫn dạng nằm trong
//   gen_params ⇒ đọc qua readField (bảng tên field), không if/else cho từng alias.
import { FOLD_KIND_ALL } from './foldRules';
import type { ChapterLevelConfig, FoldKind } from './types';

type Row = Readonly<Record<string, unknown>>;

/** Tên field theo DATA-MODEL §3.1; mỗi field có cả dạng dẹt lẫn dạng nằm trong gen_params. */
const F_CHAPTER = ['chapter'];
const F_LEVELS = ['levels', 'level_params'];
const F_FOLDS = ['folds', 'gen_params.folds'];
const F_ACTION = ['action', 'gen_params.action'];
const F_LAYERS = ['layers'];
const F_TIMER = ['timer', 'timer_on'];
const F_TIMER_SEC = ['timer_sec', 'gen_params.timer_sec'];
const F_HOLES_MIN = ['holes_min', 'gen_params.holes_min'];
const F_HOLES_MAX = ['holes_max', 'gen_params.holes_max'];

/**
 * Giá trị mặc định khi bảng config KHÔNG khai field (DỮ LIỆU — E3/A8: không rải số trong
 * hàm). `layers` = 4 ⇒ 2 nếp (SPEC §1.4 "gấp 4 → 8"); `minCount` = 1 ⇒ không có cấu hình 0.
 */
const CFG_DEFAULTS: Readonly<Record<'layers' | 'holesMin' | 'timerSec' | 'minCount', number>> = {
  layers: 4,
  holesMin: 1,
  timerSec: 0,
  minCount: 1,
};

/** Đọc field đầu tiên xuất hiện trong danh sách dòng (màn trước, chương sau) — không if/else. */
function readField(source: readonly Row[], keys: readonly string[]): unknown {
  for (const row of source) {
    for (const k of keys) {
      const dot = k.indexOf('.');
      if (dot < 0) {
        if (k in row) return row[k];
      } else {
        const box = row[k.slice(0, dot)] as Row | undefined;
        if (box && typeof box === 'object' && k.slice(dot + 1) in box) return box[k.slice(dot + 1)];
      }
    }
  }
  return undefined;
}
const numOf = (source: readonly Row[], keys: readonly string[], fallback: number): number => {
  const v = readField(source, keys);
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
};
const boolOf = (source: readonly Row[], keys: readonly string[]): boolean => readField(source, keys) === true;
const stringOf = (source: readonly Row[], keys: readonly string[], fallback: string): string => {
  const v = readField(source, keys);
  return typeof v === 'string' ? v : fallback;
};

/**
 * FOLD_KINDS = MỌI kiểu nếp, DẪN XUẤT từ bảng hình học FOLD_RULES (foldRules.ts) —
 * không liệt kê tay ⇒ thêm FoldKind mới mà bảng thiếu là LỖI BIÊN DỊCH, còn dữ liệu
 * chứa kiểu lạ thì foldsOf NÉM (review F-1: trước đây filter âm thầm vứt 'Z').
 */
const FOLD_KINDS: readonly FoldKind[] = FOLD_KIND_ALL;
const foldsOf = (source: readonly Row[]): FoldKind[] => {
  const v = readField(source, F_FOLDS);
  if (v === undefined) return []; // cfg không khai => levelSpec suy từ CHAIN_ROWS
  if (!Array.isArray(v)) throw new Error('foldsOf: folds phải là mảng, thấy ' + typeof v);
  const unknown = v.filter((k) => !FOLD_KINDS.includes(k as FoldKind));
  if (unknown.length > 0) {
    throw new Error('foldsOf: folds chứa kiểu lạ [' + unknown.join(',') + '] — chỉ có ' + FOLD_KINDS.join(','));
  }
  return v as FoldKind[];
};

function chapterRows(chapters: unknown): Row[] {
  const box = (chapters ?? {}) as { chapters?: unknown } | unknown;
  const list = Array.isArray(box) ? box : Array.isArray((box as { chapters?: unknown }).chapters) ? (box as { chapters: unknown[] }).chapters : [];
  return list.filter((r) => r && typeof r === 'object') as Row[];
}

/** Tìm (dòng chương, dòng màn) theo VỊ TRÍ trong bảng — không suy cấp số học cứng. */
function locate(table: { chapter: Row; levels: Row[] }[], levelIndex: number): { chapter: Row; level: Row; at: number; pos: number } | null {
  let seen = 0;
  for (let i = 0; i < table.length; i++) {
    const { levels } = table[i];
    if (levelIndex > seen && levelIndex <= seen + levels.length) return { chapter: table[i].chapter, level: levels[levelIndex - seen - 1], at: i, pos: levelIndex - seen };
    seen += levels.length;
  }
  return null;
}

/** Bảng cấu hình 8 chương × 15 màn — đọc từ config/chapters.json (chưa có ở B1a, truyền vào khi test). */
export function levelConfigFor(chapters: unknown, levelIndex: number): ChapterLevelConfig {
  const list = chapterRows(chapters);
  const table = list.map((chapter) => {
    const raw = readField([chapter], F_LEVELS);
    const levels = Array.isArray(raw) && raw.length > 0 ? (raw as Row[]) : [{}];
    return { chapter, levels };
  });
  const total = table.reduce((n, t) => n + t.levels.length, 0);
  const found = Number.isInteger(levelIndex) && levelIndex >= 1 && levelIndex <= total ? locate(table, levelIndex) : null;
  if (!found) throw new Error('levelConfigFor: levelIndex ' + levelIndex + ' ngoài dải 1..' + total + ' (chặn leak màn 121 — PC-18)');
  const scope = [found.level, found.chapter];
  const folds = foldsOf(scope);
  const layers = numOf(scope, F_LAYERS, CFG_DEFAULTS.layers);
  const holesMin = Math.max(CFG_DEFAULTS.holesMin, numOf(scope, F_HOLES_MIN, CFG_DEFAULTS.holesMin));
  const holesMax = Math.max(holesMin, numOf(scope, F_HOLES_MAX, holesMin));
  return {
    chapter: numOf(scope, F_CHAPTER, found.at + 1),
    levelInChapter: found.pos,
    // foldCount: dòng màn nếu có; không thì suy từ layers = 2^foldCount (SPEC §1.4 "gấp 4 → 8")
    foldCount: folds.length > 0 ? folds.length : Math.max(CFG_DEFAULTS.minCount, Math.round(Math.log2(layers))),
    // LUẬT (review F-1): chuỗi `folds` config KHAI được trao NGUYÊN CHO levelSpec dùng —
    // trước đây chỉ giữ folds.length rồi vứt, nên 'V,H' bị âm thầm đổi thành 'H,V'.
    // Không khai (mảng rỗng) => để undefined, levelSpec sẽ suy từ bảng CHAIN_ROWS.
    folds: folds.length > 0 ? folds : undefined,
    punchCount: holesMin + ((found.pos - 1) % (holesMax - holesMin + 1)),
    useCut: stringOf(scope, F_ACTION, 'punch') === 'cut',
    useDiagonal: folds.includes('D'),
    timerOn: boolOf([found.chapter], F_TIMER) && numOf(scope, F_TIMER_SEC, CFG_DEFAULTS.timerSec) > CFG_DEFAULTS.timerSec,
  };
}
