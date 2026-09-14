// Pattern: Value Object (affine hữu tỉ 2 trục)
// TRÁCH NHIỆM: hình học THUẦN của tờ đã gấp — cộng ma trận, áp affine, dựng packet từ DANH
//   SÁCH NẾP (mỗi nếp = phản chiếu qua nếp giữa packet hiện hành, nhân đôi số lớp), và mở
//   bung điểm qua mọi lớp (đã gộp trùng + sắp khoá ⇒ định xác, PC-02).
// PHÂN TẦNG: module này KHÔNG biết FoldKind/FOLD_RULES (bảng kiểu gấp sống ở foldRules.ts)
//   ⇒ foldRules import xuống đây, không có chiều ngược lại (E1: tách 1 trách nhiệm/file).
// NGUỒN HÌNH HỌC: /data/shared-board-agent-waves/game-gap-giay/code/g01_fold_sim.py (make_layers/img).
import { add, cmp, key, mul, point, rat } from './rational';
import type { Point, Rat } from './types';

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

/** Lớp giấy: affine đầy đủ 2 trục từ toạ độ packet sang toạ độ tờ đã mở. */
export type Layer = {
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

const R0 = rat(0);
const R1 = rat(1);
/** Lớp dưới cùng: mặt nạ đồng nhất (điểm giữ nguyên toạ độ tờ). */
const IDENTITY: Affine = { a: R1, b: R0, c: R0, d: R1, e: R0, f: R0 };

/** new = old ∘ refl — đúng thứ tự nhân ma trận của g01 (toạ độ packet chui qua nếp trước). */
function composeAffine(old: Affine, refl: Affine): Affine {
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
function applyAffine(m: Affine, q: Point): Point {
  return point(
    add(add(mul(m.a, q.x), mul(m.b, q.y)), m.e),
    add(add(mul(m.c, q.x), mul(m.d, q.y)), m.f),
  );
}

function wrap(affine: Affine, packet: SheetSize): Layer {
  return { mapPoint: (p: Point) => applyAffine(affine, p), affine, packet };
}

/**
 * Một lớp KÈM LỊCH SỬ GẤP: `crossed` = chỉ số nếp mà lớp đó đi qua, theo thứ tự gấp tăng dần.
 * Hoạt cảnh gấp/mở (render/anim/foldShape) cần từng nếp riêng chứ không chỉ ma trận tổng,
 * và MỘT nguồn duy nhất của cặp (affine, crossed) là vòng nhân đôi lớp ở `layerTracks`.
 */
export type Tracked = { readonly affine: Affine; readonly crossed: readonly number[] };

/**
 * Danh sách lớp sau `creases` nếp, kèm tập nếp của từng lớp: mỗi nếp NHÂN ĐÔI số lớp và lớp
 * mới chính là lớp cũ ∘ phản chiếu của nếp đó (đúng thứ tự append của `buildPacket`).
 */
export function layerTracks(creases: readonly Affine[]): Tracked[] {
  let acc: Tracked[] = [{ affine: IDENTITY, crossed: [] }];
  creases.forEach((refl, j) => {
    const prev = acc;
    const moved: Tracked[] = prev.map((t) => ({ affine: composeAffine(t.affine, refl), crossed: [...t.crossed, j] }));
    acc = [...moved, ...prev]; // đúng thứ tự append cũ: mọi lớp MỚI đứng trước mọi lớp CŨ
  });
  return acc;
}

/**
 * Dựng packet từ danh sách nếp (theo thứ tự gấp) đã được tầng registry tính ma trận trước.
 * Mỗi nếp NHÂN ĐÔI số lớp: lớp mới = lớp cũ ∘ phép phản chiếu qua nếp giữa.
 * `final` = kích thước packet SAU cùng ⇒ mọi lát cắt tham chiếu về packet cuối.
 */
export function buildPacket(creases: readonly Affine[], final: SheetSize): Packet {
  const tracks = layerTracks(creases);
  return {
    packetSize: cmp(final.w, final.h) <= 0 ? final.w : final.h,
    w: final.w,
    h: final.h,
    layers: tracks.map((t) => wrap(t.affine, final)),
  };
}

/** Khoá dedupe lỗ theo GIÁ TRỊ đúng (1/2 và 2/4 là MỘT lỗ). */
export const holeKey = (q: Point): string => key(q.x) + '|' + key(q.y);

/** Ảnh của các điểm qua MỌI lớp, gộp trùng, sắp theo hàng rồi cột (định xác, PC-02). */
export function unfoldVia(layers: readonly Layer[], punch: readonly Point[]): Point[] {
  const seen = new Map<string, Point>();
  for (const q of punch) {
    for (const L of layers) {
      const img = L.mapPoint(q);
      const k = holeKey(img);
      if (!seen.has(k)) seen.set(k, img);
    }
  }
  return [...seen.values()].sort((a, b) => cmp(a.y, b.y) || cmp(a.x, b.x));
}
