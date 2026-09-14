// Pattern: Registry (hình học vùng cắt §7.5)
// TRÁCH NHIỆM: biến một NHÁT CẮT thành HÌNH — góc packet (bảng PACKET_CORNERS), họ điểm
//   mẫu bên trong tam giác vuông của nhát, và định luật phân loại cụm tổn thương
//   (LỖ TRÒN hay KHUYẾT MÉP) đo bằng Ô RASTER.
// DÙNG CHUNG hai phía (review F-2): generator sinh nhát cắt từ bảng này, validator kiểm
//   "lỗ phải đến từ vùng cắt" trên CÙNG bảng ⇒ không thể mỗi bên đoán một kiểu.
// NGUỒN: oracle g01_fold_sim.py:55-83 (cắt tam giác rồi ĐẾM CỤM; bản cũ trả 1 điểm góc ⇒
//   đề "cut" ra lỗ tròn, thứ TEST-CASES TC-GEN-11 cấm).
import { makeLayers } from './foldRules';
import { add, cmp, div, mul, point, rat, sub } from './rational';
import { RASTER_CELL } from './raster';
import type { CutAction, CutCorner, CutSnip, FoldKind, Point, Rat } from './types';

/**
 * GÓC PACKET — bảng dữ liệu dùng CHUNG hai phía:
 *   · generator sinh nhát cắt từ góc này;
 *   · validator kiểm "lỗ phải đến từ vùng cắt" (PC-03, SPEC §7.5) trên đúng bảng đó.
 * Một nhát cắt = MỘT nguồn lỗ là góc packet; mở bung ⇒ quỹ đạo của góc đó.
 */
export const PACKET_CORNERS: Record<CutCorner, (packet: { w: Rat; h: Rat }) => Point> = {
  BL: () => point(rat(0), rat(0)),
  BR: (packet) => point(packet.w, rat(0)),
  TL: (packet) => point(rat(0), packet.h),
  TR: (packet) => point(packet.w, packet.h),
};

/** Hướng hai cạnh góc vuông theo từng góc packet — cùng khoá với PACKET_CORNERS. */
const CORNER_SIGNS: Record<CutCorner, { readonly sx: number; readonly sy: number }> = {
  BL: { sx: 1, sy: 1 },
  BR: { sx: -1, sy: 1 },
  TL: { sx: 1, sy: -1 },
  TR: { sx: -1, sy: -1 },
};

/**
 * Số mẫu trên mỗi cạnh góc vuông. Điểm mẫu = (i,j) với i+j ≤ N-2, đặt tại (i+½, j+½)/N
 * của cạnh — KHÔNG mẫu nào rơi đúng biên cắt/nếp/mép tờ ⇒ "có lỗ hay không" không phụ thuộc
 * cách làm tròn (kiểu đếm cụm của oracle, chỉ khác là ta lấy giữa ô).
 */
export const CUT_SAMPLE_ROWS = 9;
/** Số NGUỒN lỗ tương đương của một nhát cắt vùng (trần PC-03/ceiling = nguồn × số lớp). */
export const CUT_SOURCES = (CUT_SAMPLE_ROWS * (CUT_SAMPLE_ROWS - 1)) / 2;

/**
 * Mọi nhát cắt của một action: 1 nhát, hoặc 2 ở HAI GÓC KHÁC NHAU (chương 4+, §7.5).
 * Chính CutAction là một CutSnip (nó mang corner + size của nhát đầu) ⇒ generator và
 * validator đi qua hàm này thay vì tự đoán số nhát.
 */
export function cutSnips(action: CutAction): CutSnip[] {
  return action.extra ? [action, action.extra] : [action];
}

/**
 * Tập điểm mẫu bên TRONG vùng cắt của một nhát: góc packet + hướng đi vào trong packet,
 * cách đều (i+½)/N ⇒ không điểm nào rơi đúng biên cắt / nếp / mép tờ (biên là nơi
 * "có lỗ hay không" tuỳ cách làm tròn — giữa ô thì không).
 */
export function cutRegionPoints(folds: FoldKind[], sheet: Rat, snip: CutSnip): Point[] {
  const packet = makeLayers(folds, sheet);
  const at = PACKET_CORNERS[snip.corner](packet);
  const sign = CORNER_SIGNS[snip.corner];
  const step = div(snip.size, rat(2 * CUT_SAMPLE_ROWS));
  const out: Point[] = [];
  for (let i = 0; i < CUT_SAMPLE_ROWS; i++) {
    for (let j = 0; i + j < CUT_SAMPLE_ROWS - 1; j++) {
      const dx = mul(rat(2 * i + 1), step);
      const dy = mul(rat(2 * j + 1), step);
      out.push(point(add(at.x, mul(rat(sign.sx), dx)), add(at.y, mul(rat(sign.sy), dy))));
    }
  }
  return out;
}

/** Phân loại một CỤM tổn thương của vùng cắt (định luật oracle §7.5). */
export type NotchKind = 'full-hole' | 'edge-notch';
/** Số Ô RASTER tối thiểu mà một cụm phải phủ theo mỗi chiều để trông như LỖ TRÒN (D2). */
export const NOTCH_SPAN = 3;

/** Độ trải của một tập điểm theo một trục (bằng hữu tỉ, không float). */
function spanOf(pick: (q: Point) => Rat, pts: readonly Point[]): Rat {
  let lo = pick(pts[0]);
  let hi = lo;
  for (const q of pts) {
    const v = pick(q);
    if (cmp(v, lo) < 0) lo = v;
    if (cmp(v, hi) > 0) hi = v;
  }
  return sub(hi, lo);
}

/** Span của một cụm phủ đúng `cells` ô liền nhau trên lưới raster = (cells-1) ô. */
function spanOfCells(cells: number): Rat {
  return mul(rat(cells - 1), RASTER_CELL);
}

/**
 * Oracle §7.5 — ngưỡng ĐO BẰNG Ô RASTER (D2, thay cho "3×cỡ cắt" luôn xa hơn span thật):
 * một cụm là LỖ TRÒN khi nó RỘNG HƠN chính cỡ nhát cắt (nhiều ảnh của cùng một nhát nhập
 * làm một khối) VÀ phủ ≥ NOTCH_SPAN ô raster theo CẢ hai chiều; ngược lại là KHUYẾT MÉP.
 */
export function classifyCluster(pts: readonly Point[], leg: Rat): NotchKind {
  if (pts.length === 0) return 'edge-notch';
  const minSpan = spanOfCells(NOTCH_SPAN);
  const round = (pick: (q: Point) => Rat): boolean => {
    const s = spanOf(pick, pts);
    return cmp(s, leg) > 0 && cmp(s, minSpan) >= 0;
  };
  return round((q) => q.x) && round((q) => q.y) ? 'full-hole' : 'edge-notch';
}