// Pattern: Specification
// TRÁCH NHIỆM: cổng kiểm đề — PC-03 (đúng 1 đáp án trong 4, correctIndex trỏ đúng ô) +
//   PC-04 (không ô nào trùng đáp án, 2 ô bất kỳ khác nhau, đạt ngưỡng khác biệt raster),
//   cộng ràng buộc "toạ độ hợp lệ" (mọi lỗ nằm trên tờ giấy).
// CẤM quăng exception trên đề xấu: mỗi quy tắc là MỘT DÒNG bảng, trả về danh sách lỗi có chủ
//   ngữ + mã rule (TC-GEN-08 yêu cầu "nêu đúng lý do").
// NGUỒN SỐ (không tự bịa):
//   · RASTER_GRID = 16  ← g08_generator.py "G = 16  # 16x16 raster" (đọc ở header file này).
//   · MIN_RASTER_DISTANCE = 6 ← g08_verify.py "assert mind >= 6"; TEST-CASES §1 chuẩn hoá
//     ngưỡng PC-04 = "hai phương án phải nhìn khác nhau thật", máy đo bằng hamming raster.
//   · "1 đáp án duy nhất / 4 phương án / ≥1 lỗ khác nhau" ← SPEC.md §6 PC-03, PC-04.
// NGƯỠNG tham khảo: ~100 dòng.
import { layerCount } from './foldRules';
import { inUnit, key, pointKey, samePointSet, toPoints } from './rational';
import type { LevelSpec, Point, Rat, SheetAction } from './types';

export type ValidationResult = { readonly ok: boolean; readonly errors: string[] };

export const RASTER_GRID = 16;
export const MIN_RASTER_DISTANCE = 6;
/** Số phương án của một đề hợp lệ (SPEC §1.4 mục 3: chọn 1 trong 4). */
export const OPTION_COUNT = 4;

/** Số nguyên ⌊a*grid⌋ bằng số học bigint chính xác (float chỉ để chỉ mục ô, không để so khớp). */
function cellIndex(a: Rat, grid: number): number {
  const g = BigInt(grid);
  const n = a.d < 0n ? -a.n : a.n;
  const d = a.d < 0n ? -a.d : a.d;
  const scaled = n * g;
  let q = scaled / d;
  if (scaled % d !== 0n && scaled < 0n) q -= 1n;
  const i = Number(q);
  return i < 0 ? 0 : i > grid - 1 ? grid - 1 : i;
}

/** Decode FLAT an toàn: mảng lẻ ⇒ null (đề xấu phải bị KẾT LUẬN, không được crash). */
function decode(coords: readonly Rat[]): Point[] | null {
  return coords.length % 2 === 0 ? toPoints(coords) : null;
}

/** Lưới bitmap thô của 1 phương án (mỗi ô = 1 điểm lỗ, kích thước lưới `grid`×`grid`). */
export function bitmapOf(holes: Rat[], grid: number): boolean[] {
  const bm: boolean[] = new Array<boolean>(grid * grid).fill(false);
  const pts = decode(holes) ?? [];
  for (const q of pts) bm[cellIndex(q.y, grid) * grid + cellIndex(q.x, grid)] = true;
  return bm;
}

export function hamming(a: boolean[], b: boolean[]): number {
  const n = Math.max(a.length, b.length);
  let d = 0;
  for (let i = 0; i < n; i++) if (Boolean(a[i]) !== Boolean(b[i])) d += 1;
  return d;
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
 * Mảng toạ độ lẻ ⇒ ptsOf trả [] nhưng luôn ≥1 (đề xấu đã có quy tắc khác báo).
 */
function sourcesOf(action: SheetAction): number {
  const coords = action.kind === 'punch' ? action.points : [];
  return Math.max(1, ptsOf(coords).length);
}

const matchesAnswer = (spec: LevelSpec): number[] => {
  const answer = ptsOf(spec.answerHoles);
  return spec.options.filter((o) => samePointSet(ptsOf(o.holes), answer)).map((o) => o.id);
};

/** Bảng thông điệp theo SỐ Ô KHỚP đáp án (0 | 1 | ≥2) — thay cho chuỗi if/else (PC-03). */
const ANSWER_MESSAGES: readonly ((spec: LevelSpec, hit: number[]) => string | null)[] = [
  () => 'PC-03: không có phương án nào khớp answerHoles — đáp án phải SINH TỪ trạng thái đã mở (duy nhất 1 trong 4 ô)',
  (spec, hit) =>
    hit[0] === spec.correctIndex
      ? null
      : 'PC-03: correctIndex=' + spec.correctIndex + ' trỏ sai ô — ô khớp đáp án là ' + hit[0] + ' (đúng 1 đáp án trong 4, không xáo ngẫu nhiên)',
  (spec, hit) => 'PC-03: có ' + hit.length + ' ô cùng khớp đáp án (' + hit.join(',') + ') trong khi correctIndex=' + spec.correctIndex + ' — phải duy nhất 1 trong ' + OPTION_COUNT,
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

/** Cổng kiểm 1 đề: đúng 1 đáp án, 4 phương án phân biệt, toạ độ hợp lệ. */
export function validateSpec(spec: LevelSpec): ValidationResult {
  const errors = SPEC_RULES.flatMap((rule) => rule.errors(spec));
  return { ok: errors.length === 0, errors };
}

/** Khoá ô raster của một điểm — để khớp chính xác "hai lỗ rơi vào cùng một ô ảnh". */
export function cellKeyOf(hole: Point, grid: number): string {
  return cellIndex(hole.x, grid) + ':' + cellIndex(hole.y, grid);
}

/** Chỉ số ô (col, row) của một điểm trên lưới raster — generator dùng khi dựng ô nhiễu. */
export function cellOf(hole: Point, grid: number): { col: number; row: number } {
  return { col: cellIndex(hole.x, grid), row: cellIndex(hole.y, grid) };
}

