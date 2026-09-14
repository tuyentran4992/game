// Pattern: Value Object (lưới ảnh)
// TRÁCH NHIỆM: NGUỒN DUY NHẤT của "ô ảnh" mà PC-04 dùng để đo khoảng cách — cạnh lưới
//   RASTER_GRID, cạnh ô RASTER_CELL (SUY RA từ lưới, không khai song song — E2/A9),
//   chỉ mục ô / khoá ô / tâm ô / bitmap / hamming. KHÔNG chứa luật chơi, không biết gì
//   về nếp gấp ⇒ mọi tầng khác import xuống đây (import 1 chiều, không vòng).
// NGUỒN SỐ: RASTER_GRID = 16 ← g08_generator.py "G = 16  # 16x16 raster".
import { point, rat, toPoints } from './rational';
import type { Point, Rat } from './types';

/** Số ô mỗi chiều của lưới raster (16×16). */
export const RASTER_GRID = 16;
/** Cạnh của MỘT ô raster = 1/RASTER_GRID cạnh tờ — dẫn xuất, không phải hằng thứ hai. */
export const RASTER_CELL: Rat = rat(1, RASTER_GRID);
/** Tổng số ô của lưới (chu kỳ của dãy rải ô nhiễu). */
export const RASTER_CELLS = RASTER_GRID * RASTER_GRID;

/** ⌊a*grid⌋ bằng số học bigint chính xác (float chỉ để chỉ mục ô, không để so khớp). */
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

/** Chỉ số ô (col, row) của một điểm trên lưới raster. */
export function cellOf(hole: Point, grid: number): { col: number; row: number } {
  return { col: cellIndex(hole.x, grid), row: cellIndex(hole.y, grid) };
}

/** Khoá ô "col:row" — "hai lỗ rơi vào cùng một ô ảnh" được kết luận bằng khoá này. */
export function cellKeyOf(hole: Point, grid: number): string {
  const c = cellOf(hole, grid);
  return c.col + ':' + c.row;
}

/** Khoá ô trên LƯỚI CHUẨN của game (đơn vị so sánh của PC-04). */
export const cellKey = (q: Point): string => cellKeyOf(q, RASTER_GRID);

/** Tâm ô (col,row) — bảo đảm ⌊x*grid⌋ trả đúng ô đó, không lệ thuộc làm tròn float. */
export function cellPoint(col: number, row: number): Point {
  return point(rat(2 * col + 1, 2 * RASTER_GRID), rat(2 * row + 1, 2 * RASTER_GRID));
}

/** Lưới bitmap thô của 1 phương án (Rat[] FLAT; mảng lẻ ⇒ rỗng — validator sẽ báo lẻ). */
export function bitmapOf(holes: Rat[], grid: number): boolean[] {
  const bm: boolean[] = new Array<boolean>(grid * grid).fill(false);
  const pts = holes.length % 2 === 0 ? toPoints(holes) : [];
  for (const q of pts) bm[cellIndex(q.y, grid) * grid + cellIndex(q.x, grid)] = true;
  return bm;
}

/** Số ô lệch giữa hai bitmap — thước đo "hai phương án nhìn có thật khác nhau không". */
export function hamming(a: boolean[], b: boolean[]): number {
  const n = Math.max(a.length, b.length);
  let d = 0;
  for (let i = 0; i < n; i++) if (Boolean(a[i]) !== Boolean(b[i])) d += 1;
  return d;
}