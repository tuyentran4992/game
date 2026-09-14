// Pattern: Registry (bảng kiểu gấp)
// TRÁCH NHIỆM: BẢNG DUY NHẤT khai mỗi kiểu nếp là DỮ LIỆU (trục chia đôi, có cần packet
//   vuông, cỡ packet sau nếp, ma trận phản chiếu) + các DẪN XUẤT của bảng: danh sách kiểu
//   nếp, trục nếp thẳng, luật "chuỗi nào gấp được", mặt nạ mở bung (makeLayers/unfold*).
// PHÂN TẦNG (E1): số học affine 2 trục ở foldGeometry.ts, hình học vùng cắt §7.5 ở
//   cutGeometry.ts — file này không cộng ma trận, không biết góc packet.
// MỘT NGUỒN cho mỗi sự thật (E2/E5): FoldKind là KHOÁ của Record ⇒ thiếu dòng là LỖI BIÊN
//   DỊCH (annotation Record<FoldKind, FoldRule>), thừa dòng cũng vậy (satisfies).
//   FOLD_KIND_ALL và LINE_AXIS DẪN XUẤT từ bảng ⇒ không còn danh sách kiểu nếp viết tay.
// THÊM KIỂU NẾP MỚI = 1 NHÓC trong types.ts (FoldKind) + 1 DÒNG ở FOLD_RULES ⇒ đúng 2 file.
// NGUỒN HÌNH HỌC: /data/shared-board-agent-waves/game-gap-giay/code/g01_fold_sim.py (make_layers/img)
//   — bảng chân lý 22 dòng ở tests/logic/fold-unfold.test.ts chính là output của bản Python đó.
import { buildPacket, holeKey, unfoldVia } from './foldGeometry';
import type { Affine, Packet, SheetSize } from './foldGeometry';
import { cmp, flatPoints, mul, rat, ratPoint, toPoints } from './rational';
import type { FoldKind, Point, Rat, RatPoint } from './types';

/** Trục mà một nếp chia đôi: 'x' | 'y' | 'swap' (chéo — hoán vị trục, không chia đôi). */
export type FoldAxis = 'x' | 'y' | 'swap';

export type FoldRule = {
  readonly label: string;
  readonly axis: FoldAxis;
  /**
   * D1: nếp chỉ gấp được khi packet hiện tại CÒN VUÔNG (chéo x=y của hình chữ nhật không
   * phải là phép gấp giấy — oracle g01 ghi rõ "needs square"). Luật đặt ở REGISTRY để thêm
   * kiểu nếp mới chỉ sửa bảng, không rải if/else.
   */
  readonly needsSquare: boolean;
  /** Kích thước tờ SAU khi gấp theo kiểu này (theo trục bị chia đôi). */
  readonly foldedSize: (size: Rat) => Rat;
  /** Ma trận phản chiếu 2D của nếp, dựng từ kích thước packet TRƯỚC khi gấp. */
  readonly crease: (sheet: SheetSize) => Affine;
};

const R1 = rat(1);
const halve = (size: Rat): Rat => mul(size, rat(1, 2));

const R0 = rat(0);

/**
 * Registry KIÊU-ÉP-BIÊN-DỊCH (E5/A5): annotation `Record<FoldKind, FoldRule>` bắt bảng có
 * ĐỦ mọi kiểu nếp, `satisfies` bắt bảng KHÔNG thừa kiểu nào. Mở rộng FoldKind +'Z' mà
 * không thêm dòng 'Z' ⇒ tsc NÉM (bản cũ dùng key viết tay nên "đỗ sạch" với đề mù).
 */
export const FOLD_RULES: Record<FoldKind, FoldRule> = {
  H: {
    label: 'fold right onto left (vertical crease)',
    axis: 'x',
    needsSquare: false,
    foldedSize: halve,
    crease: ({ w }) => ({ a: rat(-1), b: R0, c: R0, d: R1, e: w, f: R0 }),
  },
  V: {
    label: 'fold top onto bottom (horizontal crease)',
    axis: 'y',
    needsSquare: false,
    foldedSize: halve,
    crease: ({ h }) => ({ a: R1, b: R0, c: R0, d: rat(-1), e: R0, f: h }),
  },
  D: {
    label: 'diagonal crease along x=y (square only)',
    axis: 'swap',
    needsSquare: true,
    foldedSize: (size) => size,
    crease: () => ({ a: R0, b: R1, c: R1, d: R0, e: R0, f: R0 }),
  },
} satisfies Record<FoldKind, FoldRule>;

/** Lý do một chuỗi nếp KHÔNG gấp được trên tờ vuông: nếp cần vuông rơi lúc packet chữ nhật. */
export type FoldDefect = { readonly at: number; readonly kind: FoldKind; readonly packet: SheetSize };

/**
 * CHỖ SAI ĐẦU TIÊN của một chuỗi nếp (null = gấp được). D1: `D` phản chiếu qua chéo x=y
 * nên chỉ nghĩa khi packet còn VUÔNG; đặt sai vị trí ⇒ ảnh mở bung nhảy ra NGOÀI tờ.
 * Đọc thẳng từ registry (needsSquare) ⇒ thêm kiểu nếp cần vuông chỉ sửa FOLD_RULES.
 */
export function firstFoldDefect(folds: readonly FoldKind[]): FoldDefect | null {
  let sheet: SheetSize = { w: R1, h: R1 };
  let at = 0;
  for (const kind of folds) {
    const rule = FOLD_RULES[kind];
    if (rule.needsSquare && cmp(sheet.w, sheet.h) !== 0) return { at, kind, packet: sheet };
    sheet = nextSize(sheet, rule);
    at += 1;
  }
  return null;
}

/** Kích thước packet sau một nếp (registry dẫn, không switch theo kiểu gấp). */
function nextSize(sheet: SheetSize, rule: FoldRule): SheetSize {
  const axes: Record<FoldAxis, SheetSize> = {
    x: { w: rule.foldedSize(sheet.w), h: sheet.h },
    y: { w: sheet.w, h: rule.foldedSize(sheet.h) },
    swap: sheet,
  };
  return axes[rule.axis];
}

/**
 * Tờ gấp `folds` (theo thứ tự) từ tờ vuông cạnh `size` ⇒ packet + danh sách lớp.
 * Phần nhân đôi lớp là hình học thuần (foldGeometry.buildPacket); ở đây chỉ DỊCH
 * kiểu nếp ⇒ ma trận phản chiếu, nhờ bảng FOLD_RULES.
 */
export function makeLayers(folds: FoldKind[], size: Rat): Packet {
  let sheet: SheetSize = { w: size, h: size };
  const creases: Affine[] = [];
  for (const kind of folds) {
    const rule = FOLD_RULES[kind];
    creases.push(rule.crease(sheet));
    sheet = nextSize(sheet, rule);
  }
  return buildPacket(creases, sheet);
}

/**
 * Số lớp giấy chồng lên nhau sau `folds`: MỖI NẾP NHÂN ĐÔI số lớp (đúng như makeLayers —
 * kể cả nếp chéo D, xem fold-rules.test.ts "makeLayers(['D']).layers.length == 2").
 * Trần số VỊ TRÍ lỗ mà một điểm đục tạo ra khi mở bung = số lớp này (SPEC §6 PC-03 —
 * nguồn ghi ở header generator.ts "TRẦN SỐ LỖ = 2^số nếp"). Một hàm duy nhất để
 * generator và validator KHÔNG định nghĩa lại công thức (anti god-class / one source).
 */
export function layerCount(folds: FoldKind[]): number {
  return 2 ** folds.length;
}

/**
 * Mở bung: ảnh của các điểm đục qua MỌI lớp, đã gộp trùng và sắp thứ tự khoá (định xác, PC-02).
 * Không kiểm tra "điểm đục có nằm trong packet hay không" — đúng như g01; generator là nơi
 * chỉ chọn điểm trong packet (xem generator.ts).
 */
export function unfoldPoints(folds: FoldKind[], size: Rat, punch: readonly Point[]): Point[] {
  return unfoldVia(makeLayers(folds, size).layers, punch);
}

/** Vị trí lỗ THẬT trên tờ đã mở: ảnh của điểm đục qua TẤT CẢ các lớp (đã gộp trùng). */
export function unfoldHoles(folds: FoldKind[], size: Rat, punchPoints: Rat[]): Rat[] {
  return flatPoints(unfoldPoints(folds, size, toPoints(punchPoints)));
}

/**
 * Như unfoldHoles nhưng giữ cả số lớp chồng tại mỗi vị trí (dữ liệu cho animation D1).
 * `at` là RatPoint: vừa là Point (x,y) vừa là Rat hợp lệ (n/d = x) — CONTRACT-AMBIGUITY-02.
 */
export function unfoldPointsWithCount(folds: FoldKind[], size: Rat, punch: readonly Point[]): { at: RatPoint; layers: number }[] {
  const set = makeLayers(folds, size);
  const groups = new Map<string, { at: RatPoint; layers: number }>();
  for (const q of punch) {
    for (const L of set.layers) {
      const img = L.mapPoint(q);
      const k = holeKey(img);
      const hit = groups.get(k);
      if (hit) hit.layers += 1;
      else groups.set(k, { at: ratPoint(img.x, img.y), layers: 1 });
    }
  }
  return [...groups.values()].sort((a, b) => cmp(a.at.y, b.at.y) || cmp(a.at.x, b.at.x));
}

/** Như unfoldHoles nhưng giữ cả số lớp chồng tại mỗi vị trí (dùng cho animation D1). */
export function unfoldHolesWithCount(folds: FoldKind[], size: Rat, punchPoints: Rat[]): { at: RatPoint; layers: number }[] {
  return unfoldPointsWithCount(folds, size, toPoints(punchPoints));
}

/**
 * Mọi FoldKind — DẪN XUẤT từ khoá của FOLD_RULES (sorted ⇒ tất định), đông cứng để không
 * lời gọi nào sửa được danh sách toàn cục. F-1: không liệt kê tay ở đâu khác.
 */
export const FOLD_KIND_ALL: readonly FoldKind[] = Object.freeze(
  (Object.keys(FOLD_RULES) as FoldKind[]).sort(),
);

/** Trục nếp THẲNG của mỗi kiểu (chéo ⇒ null, không phải nếp thẳng). */
const LINE_OF_AXIS: Record<FoldAxis, 'x' | 'y' | null> = { x: 'x', y: 'y', swap: null };
/** Trục nếp theo kiểu — DẪN XUẤT 100% từ registry (thêm kiểu nếp: KHÔNG phải sửa chỗ này). */
const LINE_AXIS = Object.fromEntries(
  FOLD_KIND_ALL.map((k) => [k, LINE_OF_AXIS[FOLD_RULES[k].axis]]),
) as Record<FoldKind, 'x' | 'y' | null>;

/** Đường nếp đang có trên tờ đã mở (theo trục) — dữ liệu cho hint PC-08 + ô nhiễu "sai nếp". */
export function creaseLines(folds: FoldKind[], size: Rat): { x: Rat[]; y: Rat[] } {
  let sheet: SheetSize = { w: size, h: size };
  const lines: Record<'x' | 'y', Rat[]> = { x: [], y: [] };
  const half = rat(1, 2);
  for (const kind of folds) {
    const axis = LINE_AXIS[kind];
    if (axis) lines[axis].push(mul(axis === 'x' ? sheet.w : sheet.h, half));
    sheet = nextSize(sheet, FOLD_RULES[kind]);
  }
  return lines;
}

// HINH HỌC VÙNG CẮT §7.5 (góc packet, điểm mẫu, phân loại cụm) → cutGeometry.ts.



