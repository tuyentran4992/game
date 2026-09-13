// Pattern: Registry + Strategy
// TRÁCH NHIỆM: bảng tra kiểu gấp (H/V/D) + dựng danh sách LỚP (affine map hữu tỉ) của tờ đã gấp,
//   và mở bung một điểm đục/ cắt qua mọi lớp ⇒ tập vị trí lỗ THẬT trên tờ đã mở.
// Thêm kiểu gấp mới = thêm 1 dòng dữ liệu ở FOLD_RULES, KHÔNG sửa chuỗi hàm.
// HỢP ĐỒNG 1-TRỤC (CONTRACT-AMBIGUITY-01, tests/logic/helpers.ts): khung khai
//   FoldRule.reflect(p, size) và Layer.map(p) chỉ nhận MỘT trục Rat. Vì vậy:
//     · reflect(p, size) = size - p  (đối xứng qua nếp giữa size/2) — H và V cùng một định luật
//       vô hướng, khác nhau ở TRỤC mà dòng registry đánh dấu (axis);
//     · D phản xạ qua chéo x=y ⇒ hoán vị (x,y) ⇒ mọi điểm trên chéo bất động ⇒ chiều vô hướng
//       của nó là phép đồng nhất (identity), và foldedSize không đổi (g01: nhánh 'D' không gán w/h).
//     · Layer.map(p) = lát cắt 1 trục của affine 2D: trục được chọn là trục mà packet CÒN chứa p
//       (x nếu p ≤ w, ngược lại y); nếu affine trộn hai trục (chéo D) thì trục khuyết lấy = p.
//   Bản 2-TRỤC thật (dùng cho luật chơi) là Layer.mapPoint — map() chỉ là mặt nạ tương thích
//   ngược với khung, không có mặt trong đường tính đáp án.
// NGUỒN HÌNH HỌC: /data/shared-board-agent-waves/game-gap-giay/code/g01_fold_sim.py (make_layers/img)
//   — bảng chân lý 22 dòng ở tests/logic/fold-unfold.test.ts chính là output của bản Python đó.
// NGƯỠNG tham khảo: ~150 dòng.
import { add, cmp, flatPoints, key, mul, point, rat, ratPoint, sub, toPoints } from './rational';
import type { FoldKind, Point, Rat, RatPoint } from './types';

/** Kích thước tờ/packet (2 trục — packet có thể chữ nhật khi gấp lẻ nếp). */
export type SheetSize = { readonly w: Rat; readonly h: Rat };

/** Affine folded→sheet: X = a*x + b*y + e ; Y = c*x + d*y + f (đúng 6 số của g01). */
export type Affine = {
  readonly a: Rat;
  readonly b: Rat;
  readonly c: Rat;
  readonly d: Rat;
  readonly e: Rat;
  readonly f: Rat;
};

export type FoldRule = {
  readonly label: string;
  /** Trục mà nếp này chia đôi: 'x' (H) | 'y' (V) | 'swap' (chéo, không chia đôi). */
  readonly axis: 'x' | 'y' | 'swap';
  /** Kích thước tờ SAU khi gấp theo kiểu này (theo trục bị chia đôi). */
  readonly foldedSize: (size: Rat) => Rat;
  /** Ảnh của điểm p (toạ độ tờ ĐÃ GẤP) qua phép phản chiếu của kiểu gấp. */
  readonly reflect: (p: Rat, size: Rat) => Rat;
  /** Ma trận phản chiếu 2D của nếp, dựng từ kích thước packet TRƯỚC khi gấp. */
  readonly crease: (sheet: SheetSize) => Affine;
};

const R0 = rat(0);
const R1 = rat(1);
const IDENTITY: Affine = { a: R1, b: R0, c: R0, d: R1, e: R0, f: R0 };

/** Định luật vô hướng chung của nếp thẳng: soi qua nếp giữa size/2 ⇒ size - p. */
const mirror = (p: Rat, size: Rat): Rat => sub(size, p);
const halve = (size: Rat): Rat => mul(size, rat(1, 2));

export const FOLD_RULES: Record<FoldKind, FoldRule> = {
  H: {
    label: 'fold right onto left (vertical crease)',
    axis: 'x',
    foldedSize: halve,
    reflect: mirror,
    crease: ({ w }) => ({ a: rat(-1), b: R0, c: R0, d: R1, e: w, f: R0 }),
  },
  V: {
    label: 'fold top onto bottom (horizontal crease)',
    axis: 'y',
    foldedSize: halve,
    reflect: mirror,
    crease: ({ h }) => ({ a: R1, b: R0, c: R0, d: rat(-1), e: R0, f: h }),
  },
  D: {
    label: 'diagonal crease along x=y (square only)',
    axis: 'swap',
    foldedSize: (size) => size,
    reflect: (p) => p,
    crease: () => ({ a: R0, b: R1, c: R1, d: R0, e: R0, f: R0 }),
  },
};

/** Kích thước packet sau một nếp (registry dẫn, không switch theo kiểu gấp). */
function nextSize(sheet: SheetSize, rule: FoldRule): SheetSize {
  const axes: Record<FoldRule['axis'], SheetSize> = {
    x: { w: rule.foldedSize(sheet.w), h: sheet.h },
    y: { w: sheet.w, h: rule.foldedSize(sheet.h) },
    swap: sheet,
  };
  return axes[rule.axis];
}

/** new = old ∘ refl — đúng thứ tự nhân ma trận của g01 (toạ độ packet chui qua nếp trước). */
function compose(old: Affine, refl: Affine): Affine {
  const lin = (p: Rat, q: Rat, x: Rat, y: Rat): Rat => add(mul(p, x), mul(q, y));
  return {
    a: lin(old.a, old.b, refl.a, refl.c),
    b: lin(old.a, old.b, refl.b, refl.d),
    c: lin(old.c, old.d, refl.a, refl.c),
    d: lin(old.c, old.d, refl.b, refl.d),
    e: add(lin(old.a, old.b, refl.e, refl.f), old.e),
    f: add(lin(old.c, old.d, refl.e, refl.f), old.f),
  };
}

/** Áp affine 2D lên một điểm. */
function apply(m: Affine, q: Point): Point {
  return point(
    add(add(mul(m.a, q.x), mul(m.b, q.y)), m.e),
    add(add(mul(m.c, q.x), mul(m.d, q.y)), m.f),
  );
}

export type Layer = {
  /** Lát cắt 1 trục của affine (mặt nạ tương thích khung — xem header CONTRACT-AMBIGUITY-01). */
  readonly map: (p: Rat) => Rat;
  /** Bản 2 trục đầy đủ: đường sinh của mọi luật chơi. */
  readonly mapPoint: (p: Point) => Point;
  readonly affine: Affine;
  readonly packet: SheetSize;
};

export type Packet = {
  /** Cạnh packet khi tờ còn VUÔNG; packet chữ nhật (vd H,V,H) ⇒ cạnh NHỎ = miền an toàn. */
  readonly packetSize: Rat;
  readonly w: Rat;
  readonly h: Rat;
  readonly layers: Layer[];
};

function wrap(affine: Affine, packet: SheetSize): Layer {
  const slice = (p: Rat): Rat => {
    const useX = cmp(p, packet.w) <= 0;
    const k = useX ? affine.a : affine.c;
    const o = useX ? affine.b : affine.d;
    const t = useX ? affine.e : affine.f;
    // affine trộn trục (chéo D): trục khuyết được lấy = chính p.
    return add(add(mul(k, p), mul(o, p)), t);
  };
  return {
    map: slice,
    mapPoint: (p: Point) => apply(affine, p),
    affine,
    packet,
  };
}

/**
 * Tờ gấp `folds` (theo thứ tự) từ tờ vuông cạnh `size` ⇒ packet + danh sách lớp.
 * Mỗi nếp NHÂN ĐÔI số lớp: lớp mới = lớp cũ ∘ phép phản chiếu qua nếp giữa.
 */
export function makeLayers(folds: FoldKind[], size: Rat): Packet {
  let sheet: SheetSize = { w: size, h: size };
  let layers: Affine[] = [IDENTITY];
  for (const kind of folds) {
    const rule = FOLD_RULES[kind];
    const refl = rule.crease(sheet);
    const moved = layers.map((L) => compose(L, refl));
    layers = moved.concat(layers);
    sheet = nextSize(sheet, rule);
  }
  const packet: SheetSize = sheet;
  return {
    packetSize: cmp(packet.w, packet.h) <= 0 ? packet.w : packet.h,
    w: packet.w,
    h: packet.h,
    layers: layers.map((L) => wrap(L, packet)),
  };
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
  const layers = makeLayers(folds, size).layers;
  const seen = new Map<string, Point>();
  for (const q of punch) {
    for (const L of layers) {
      const img = L.mapPoint(q);
      const k = key(img.x) + '|' + key(img.y);
      if (!seen.has(k)) seen.set(k, img);
    }
  }
  return [...seen.values()].sort((a, b) => cmp(a.y, b.y) || cmp(a.x, b.x));
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
      const k = key(img.x) + '|' + key(img.y);
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

/** Kiểu gấp → trục mà nếp cắt ngang. D (chéo) không tạo đường thẳng trục nào ⇒ không có dòng. */
const LINE_AXIS: Partial<Record<FoldKind, 'x' | 'y'>> = { H: 'x', V: 'y' };

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

