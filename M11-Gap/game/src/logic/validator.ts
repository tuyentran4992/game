// Pattern: Specification
// TRÁCH NHIỆM: cổng kiểm đề — PC-03 (đúng 1 đáp án trong 4, correctIndex trỏ đúng ô) +
//   PC-04 (không ô nào trùng đáp án, 2 ô bất kỳ khác nhau, đạt ngưỡng khác biệt raster),
//   cộng ràng buộc "toạ độ hợp lệ" (mọi lỗ nằm trên tờ giấy).
// CẤM quăng exception trên đề xấu: mỗi quy tắc là MỘT DÒNG bảng, trả về danh sách lỗi có chủ
//   ngữ + mã rule (TC-GEN-08 yêu cầu "nêu đúng lý do").
// NGUỒN SỐ (không tự bịa, không khai song song — E2/A9):
//   · RASTER_GRID = 16  SỐNG Ở raster.ts (g08_generator.py "G = 16  # 16x16 raster");
//     validator import để đo, không định nghĩa lại.
//   · MIN_RASTER_DISTANCE = 6 ← g08_verify.py "assert mind >= 6"; TEST-CASES §1 chuẩn hoá
//     ngưỡng PC-04 = "hai phương án phải nhìn khác nhau thật", máy đo bằng hamming raster.
//   · OPTION_COUNT = 4 ← SPEC.md §1.4 mục 3; đây là NGUỒN, generator import ngược lại.
//   · "1 đáp án duy nhất / 4 phương án / ≥1 lỗ khác nhau" ← SPEC.md §6 PC-03, PC-04.
import { cutRegionPoints, cutSnips, CUT_SOURCES } from './cutGeometry';
import { layerCount, unfoldPoints } from './foldRules';
import { inUnit, key, pointKey, rat, samePointSet, toPoints } from './rational';
import { bitmapOf, cellKeyOf, hamming, RASTER_GRID } from './raster';
import type { CutSnip, FoldKind, LevelSpec, Point, Rat, SheetAction } from './types';

/**
 * Hợp đồng công khai của tầng "cổng kiểm đề": lưới raster và hai thước đo SỐNG Ở raster.ts
 * (một nguồn duy nhất — E2/A9); validator chỉ GIỮ đường import cũ cho các test đã chốt tên.
 */
export { bitmapOf, hamming } from './raster';

export type ValidationResult = { readonly ok: boolean; readonly errors: string[] };

/** Ngưỡng khác biệt tối thiểu giữa 2 phương án (PC-04). NGUỒN: g08_verify.py "assert mind >= 6". */
export const MIN_RASTER_DISTANCE = 6;
/** Số phương án của một đề (SPEC §1.4 mục 3: chọn 1 trong 4) — NGUỒN DUY NHẤT, generator import. */
export const OPTION_COUNT = 4;

/** Decode FLAT an toàn: mảng lẻ ⇒ null (đề xấu phải bị KẾT LUẬN, không được crash). */
function decode(coords: readonly Rat[]): Point[] | null {
  return coords.length % 2 === 0 ? toPoints(coords) : null;
}

/** Khoảng cách nhỏ nhất giữa 2 phương án bất kỳ (PC-04: phải KHÁC nhau rõ ràng). */
export function minPairDistance(spec: LevelSpec, grid: number): number {
  const bm = spec.options.map((o) => bitmapOf(o.holes, grid));
  let min = Number.POSITIVE_INFINITY;
  for (let i = 0; i < bm.length; i++)
    for (let j = i + 1; j < bm.length; j++) min = Math.min(min, hamming(bm[i], bm[j]));
  // <2 phương án thì không có cặp nào để đo ⇒ coi như vi phạm PC-04 (0 khoảng cách).
  return bm.length < 2 ? 0 : min;
}

/** Tập điểm đã decode của một phương án (rỗng nếu mảng lẻ — lẻ sẽ do quy tắc khác báo). */
const ptsOf = (coords: readonly Rat[]): Point[] => decode(coords) ?? [];

/**
 * Số NGUỒN lỗ của đề: mỗi điểm đục là một nguồn; một nhát cắt góc = đúng 1 nguồn (góc packet).
 * F-2: KHÔNG floor `Math.max(1, ...)` như bản cũ — punch rỗng là 0 nguồn thật, và quy tắc
 * 'PC-03/holes' bên dưới buộc answerHoles khớp 0 nguồn đó (đề "0 điểm đục mà 4 lỗ" trước
 * đây trần=4 nên lọt qua cổng với ok=true).
 */
function sourcesOf(action: SheetAction): number {
  // §7.5: một NHÁT CẮT là một VÙNG = CUT_SOURCES điểm mẫu (không phải 1 điểm đục).
  return action.kind === 'punch' ? ptsOf(action.points).length : CUT_SOURCES * cutSnips(action).length;
}

const SHEET = rat(1);
/** Tập ô raster mà ảnh mở bung của MỘT vùng cắt phủ lên — "vùng cắt" của SPEC §7.5. */
const regionCells = (folds: FoldKind[], snip: CutSnip): Set<string> =>
  new Set(unfoldPoints(folds, SHEET, cutRegionPoints(folds, SHEET, snip)).map((q) => cellKeyOf(q, RASTER_GRID)));
const holesOf = (spec: LevelSpec): number => new Set(ptsOf(spec.answerHoles).map(pointKey)).size;

/**
 * PC-03/khớp-action (review F-2): SỐ LỖ của đáp án phải khớp CHÍNH action khai.
 * Một dòng bảng cho một kind của SheetAction ⇒ không có chuỗi if/else.
 *   · punch n: n = 0 ⇒ đáp án phải RỠNG; n ≥ 1 ⇒ phải có ≥ 1 lỗ (trần n×số lớp đã có
 *     ở rule 'PC-03/ceiling').
 *   · cut: mọi lỗ phải nằm trong quỹ đạo của GÓC PACKET bị cắt — "lỗ đến từ vùng cắt",
 *     dùng lại đúng bảng PACKET_CORNERS mà generator cắt (foldRules.ts), không tự bịa toạ độ.
 */
const HOLE_BINDINGS: Record<SheetAction['kind'], (spec: LevelSpec, action: SheetAction) => string | null> = {
  punch: (spec, action) => {
    const n = action.kind === 'punch' ? ptsOf(action.points).length : 0;
    const got = holesOf(spec);
    if (n === 0 && got > 0) return 'PC-03: action punch có 0 điểm đục nhưng answerHoles có ' + got + ' lỗ — số lỗ phải khớp action'; // i18n-ignore: chẩn đoán QA, không phải copy UI
    if (n > 0 && got === 0) return 'PC-03: action punch ' + n + ' điểm đục nhưng answerHoles rỗng — mỗi điểm đục mở ra ít nhất 1 lỗ'; // i18n-ignore: chẩn đoán QA
    return null;
  },
  cut: (spec, action) => {
    if (action.kind !== 'cut') return null;
    const got = holesOf(spec);
    if (got === 0) return 'PC-03: action cắt góc ' + action.corner + ' nhưng answerHoles rỗng — nhát cắt mở ra ít nhất 1 lỗ'; // i18n-ignore: chẩn đoán QA
    const inCut = new Set(cutSnips(action).flatMap((s) => [...regionCells(spec.folds, s)]));
    const outside = ptsOf(spec.answerHoles).filter((q) => !inCut.has(cellKeyOf(q, RASTER_GRID))).length;
    return outside > 0
      ? 'PC-03: ' + outside + ' lỗ của answerHoles không thuộc vùng cắt (góc ' + action.corner + ') — đáp án không sinh từ nhát cắt' // i18n-ignore: chẩn đoán QA
      : null;
  },
};

const matchesAnswer = (spec: LevelSpec): number[] => {
  const answer = ptsOf(spec.answerHoles);
  return spec.options.filter((o) => samePointSet(ptsOf(o.holes), answer)).map((o) => o.id);
};

/** Bảng thông điệp theo SỐ Ô KHỚP đáp án (0 | 1 | ≥2) — thay cho chuỗi if/else (PC-03). */
const ANSWER_MESSAGES: readonly ((spec: LevelSpec, hit: number[]) => string | null)[] = [
  () => 'PC-03: không có phương án nào khớp answerHoles — đáp án phải SINH TỪ trạng thái đã mở (duy nhất 1 trong 4 ô)', // i18n-ignore: chẩn đoán QA
  (spec, hit) =>
    hit[0] === spec.correctIndex
      ? null
      : 'PC-03: correctIndex=' + spec.correctIndex + ' trỏ sai ô — ô khớp đáp án là ' + hit[0] + ' (đúng 1 đáp án trong 4, không xáo ngẫu nhiên)',
  (spec, hit) => 'PC-03: có ' + hit.length + ' ô cùng khớp đáp án (' + hit.join(',') + ') trong khi correctIndex=' + spec.correctIndex + ' — phải duy nhất 1 trong ' + OPTION_COUNT, // i18n-ignore: chẩn đoán QA
];

/** Một quy tắc = một dòng bảng (không có chuỗi if/else). Trả về [] khi đạt. */
type Rule = { readonly id: string; readonly errors: (spec: LevelSpec) => string[] };

export const SPEC_RULES: Rule[] = [
  {
    id: 'PC-04/shape',
    errors: (spec) => {
      const out: string[] = [];
      if (spec.options.length !== OPTION_COUNT)
        out.push('PC-04: đề phải có đủ ' + OPTION_COUNT + ' phương án, thấy ' + spec.options.length);
      const ids = new Set(spec.options.map((o) => o.id));
      if (ids.size !== spec.options.length) out.push('PC-04: id phương án trùng nhau (khác nhau từng ô một)');
      return out;
    },
  },
  {
    id: 'PC-04/coords',
    errors: (spec) => {
      const out: string[] = [];
      const seen = new Map<string, string>();
      const scan = (coords: readonly Rat[], where: string) => {
        const pts = decode(coords);
        if (!pts) out.push('PC-04: ' + where + ' có mảng toạ độ lẻ — không decode được FLAT [x0,y0,...]');
        else for (const q of pts) if (!(inUnit(q.x) && inUnit(q.y))) seen.set(where, key(q.x) + ',' + key(q.y));
      };
      scan(spec.answerHoles, 'answerHoles');
      spec.options.forEach((o, i) => scan(o.holes, 'option ' + (Number.isInteger(o.id) ? o.id : i)));
      for (const [where, at] of seen) out.push('PC-04: toạ độ ngoài tờ giấy [0,1]×[0,1] tại ' + where + ' (' + at + ')');
      return out;
    },
  },
  {
    id: 'PC-03/answer',
    errors: (spec) => {
      const hit = matchesAnswer(spec);
      const build = ANSWER_MESSAGES[Math.min(hit.length, ANSWER_MESSAGES.length - 1)];
      const msg = build(spec, hit);
      return msg ? [msg] : [];
    },
  },
  {
    id: 'PC-03/ceiling',
    errors: (spec) => {
      // BẤT CẦN KIỆN của "đáp án phải SINH TỪ trạng thái đã mở": mọi vị trí lỗ đáp án là ảnh
      // của MỘT điểm đục qua MỘT lớp giấy ⇒ không thể nhiều hơn (số nguồn lỗ × số lớp).
      // Nguồn trần số lớp: foldRules.layerCount + SPEC §6 PC-03 (generator.test.ts:189 khoá
      // cùng trần này phía generator). Vượt trần ⇒ answerHoles là tập chép tuỳ ý, không phải
      // kết quả mở bung — kể cả khi correctIndex trỏ đúng ô có answerHoles.
      const cap = layerCount(spec.folds) * sourcesOf(spec.action);
      const got = new Set(ptsOf(spec.answerHoles).map(pointKey)).size;
      return got > cap
        ? ['PC-03: answerHoles=' + got + ' vị trí nhưng ' + spec.folds.length + ' nếp × ' + sourcesOf(spec.action) + ' điểm đục mở bung tối đa ' + cap + ' lỗ — đáp án không sinh từ trạng thái đã mở']
        : [];
    },
  },
  {
    id: 'PC-03/holes',
    errors: (spec) => {
      // Ràng buộc action ↔ số lỗ (review F-2). Chọn xử lý theo BẢNG HOLE_BINDINGS, không if/else.
      const bind = HOLE_BINDINGS[spec.action.kind];
      const msg = bind
        ? bind(spec, spec.action)
        : 'PC-03: action.kind="' + String(spec.action.kind) + '" không thuộc bảng punch/cut';
      return msg ? [msg] : [];
    },
  },
  {
    id: 'PC-04/duplicate',
    errors: (spec) => {
      const out: string[] = [];
      const answer = ptsOf(spec.answerHoles);
      spec.options.forEach((o, i) => {
        if (i !== spec.correctIndex && samePointSet(ptsOf(o.holes), answer))
          out.push('PC-04: ô nhiễu ' + i + ' trùng đáp án — mỗi ô phải khác đáp án ≥1 lỗ');
      });
      for (let i = 0; i < spec.options.length; i++)
        for (let j = i + 1; j < spec.options.length; j++)
          if (samePointSet(ptsOf(spec.options[i].holes), ptsOf(spec.options[j].holes)))
            out.push('PC-04: hai ô ' + i + '/' + j + ' trùng nhau — 2 ô bất kỳ phải khác nhau');
      return out;
    },
  },
  {
    id: 'PC-04/raster',
    errors: (spec) => {
      const d = minPairDistance(spec, RASTER_GRID);
      return d < MIN_RASTER_DISTANCE
        ? ['PC-04: minPairDistance=' + d + ' dưới ngưỡng khác biệt ' + MIN_RASTER_DISTANCE + ' trên lưới ' + RASTER_GRID + '×' + RASTER_GRID]
        : [];
    },
  },
];

/** Field bắt buộc của LevelSpec (types.ts) — spec cụt field là ĐỀ XẤU, không được crash (F-2). */
const REQUIRED_FIELDS: readonly (keyof LevelSpec)[] = ['seed', 'levelIndex', 'chapter', 'folds', 'action', 'answerHoles', 'options', 'correctIndex', 'difficulty', 'timerOn'];
/** Một rule ném = một vi phạm có chủ ngữ (header: CẤM quăng exception trên đề xấu). */
const runRule = (rule: Rule, spec: LevelSpec): string[] => {
  try { return rule.errors(spec); } catch (e) { return [rule.id + ': không đo được — ' + (e instanceof Error ? e.message : String(e))]; }
};
/** Cổng kiểm 1 đề: đúng 1 đáp án, 4 phương án phân biệt, toạ độ hợp lệ. Không bao giờ ném. */
export function validateSpec(spec: LevelSpec): ValidationResult {
  const box = (spec ?? {}) as Partial<LevelSpec>;
  const missing = REQUIRED_FIELDS.filter((f) => box[f] === undefined).map((f) => 'PC-04: spec thiếu field "' + f + '" — LevelSpec phải đủ ' + REQUIRED_FIELDS.join(',')); // i18n-ignore: chẩn đoán QA
  if (missing.length > 0) return { ok: false, errors: missing };
  const errors = SPEC_RULES.flatMap((rule) => runRule(rule, spec));
  return { ok: errors.length === 0, errors };
}

