// Pattern: Pure geometric planner (hình của TỪNG lớp giấy đang gấp)
// TRÁCH NHIỆM: trả lời "lớp giấy thứ i, khi các nếp của nó mở tới tiến trình prog, chiếm hình
//   nào trên màn hình (px)". Một nếp mở dần = nội suy từ identity tới phép PHẢN CHIẾU của nếp đó
//   (đúng math của bản MVP `applyCombo` trong gap-playtest.html), nên:
//     prog = 0 mọi nếp => lớp nằm chồng khít lên packet (gói giấy đang gấp);
//     prog = 1 mọi nếp => ĐÚNG ảnh của lớp khi mở hẳn — cùng ma trận với packetOf(folds).layers[i].
//   Hai đầu mút đều là hình học THẬT của logic => hoạt cảnh không thể "vẽ nhầm chỗ lỗ".
// MỘT NGUỒN: ma trận từng nếp + lịch sử "nếp nào nằm trong lớp nào" lấy từ logic
//   (foldRules.creaseMatrices / layerCrossings — cả hai cùng sinh từ vòng nhân đôi lớp
//   foldGeometry.layerTracks nên không thể lệch với đáp án đã sinh).
// RÀNG BUỘC: module THUẦN, không import phaser, không đồng hồ, không ngẫu nhiên => test số chạy
//   trong node (tests/logic/view-motion.test.ts). Toạ độ lô-gích vẫn là Rat ở src/logic; đây là
//   chỗ duy nhất của phép gấp đổi Rat sang px của ô vẽ (cùng phép đổi tỷ lệ mà HolePool đang dùng).

import { creaseMatrices, layerCrossings } from '../../logic/foldRules';
import { packetOf } from '../../logic/punchPoints';
import { rat, toNumber } from '../../logic/rational';
import type { Affine } from '../../logic/foldGeometry';
import type { FoldKind, Point, Rat } from '../../logic/types';

/** Affine 2 trục ở hệ 0..1 (X = a*x + b*y + e ; Y = c*x + d*y + f). */
export type Mat = {
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly d: number;
  readonly e: number;
  readonly f: number;
};

/** Hình của một tờ đã gấp: ma trận từng nếp + nếp nào nằm trong lớp nào + cạnh packet (Rat). */
export type FoldModel = {
  readonly creases: readonly Mat[];
  readonly crossed: readonly (readonly number[])[];
  readonly packet: { readonly w: Rat; readonly h: Rat };
};

/** Tờ giấy chuẩn của tầng vẽ: vuông cạnh 1 (LevelSpec khai lỗ theo hệ 0..1). */
const UNIT: Rat = rat(1);

const IDENTITY: Mat = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

/** Rat-affine của logic -> number-affine (không còn Rat nào lọt xuống lệnh vẽ). */
const numeric = (m: Affine): Mat => ({
  a: toNumber(m.a), b: toNumber(m.b), c: toNumber(m.c),
  d: toNumber(m.d), e: toNumber(m.e), f: toNumber(m.f),
});

/** Model hình của một chuỗi nếp — gọi MỘT lần khi nạp đề, không tính lại mỗi khung hình. */
export function foldModel(folds: readonly FoldKind[]): FoldModel {
  const chain = [...folds];
  const packet = packetOf(chain);
  return {
    creases: creaseMatrices(chain, UNIT).map(numeric),
    crossed: layerCrossings(chain, UNIT),
    packet: { w: packet.w, h: packet.h },
  };
}

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * Một nếp mở tới `p` là nội suy identity -> phản chiếu: p = 1/2 nén lớp xuống ĐÚNG đường nếp
 * (ảnh của tờ đang gập nửa kín), p = 1 là phản chiếu trọn vẹn => không có bước nhảy.
 */
function hinge(crease: Mat, p: number): Mat {
  if (p <= 0) return IDENTITY;
  if (p >= 1) return crease;
  return {
    a: 1 + p * (crease.a - 1),
    b: p * crease.b,
    c: p * crease.c,
    d: 1 + p * (crease.d - 1),
    e: p * crease.e,
    f: p * crease.f,
  };
}

/**
 * Tiến trình của MỘT nếp trong một lớp khi lớp mở tới `q`: lớp có `count` nếp thì mỗi nếp chiếm
 * `1/count` khoảng mở, và nếp GẤP SAU CÙNG (chỉ số lớn nhất) MỞ TRƯỚC — đúng thứ tự lật giấy.
 */
export function creaseOpen(q: number, slot: number, count: number): number {
  return clamp01(count * clamp01(q) - slot);
}

/**
 * Vectơ tiến trình THEO NẾP của một lớp khi lớp mở tới `q` (khoá = chỉ số nếp; nếp mà lớp không
 * đi qua bị bỏ trống, vì ma trận của nó không được áp dụng cho lớp này).
 */
export function layerProgress(model: FoldModel, layer: number, q: number): number[] {
  const crossed = model.crossed[layer] ?? [];
  const out: number[] = [];
  crossed.forEach((crease, rank) => {
    out[crease] = creaseOpen(q, crossed.length - 1 - rank, crossed.length);
  });
  return out;
}

/** Độ mở trung bình của một lớp giấy — điều khiển lớp da giấy (grain) hiện dần theo hoạt cảnh. */
export const openness = (prog: readonly number[]): number => {
  const live = prog.filter((p) => p > 0);
  return live.length === 0 ? 0 : live.reduce((s, p) => s + p, 0) / live.length;
};

function through(m: Mat, x: number, y: number): [number, number] {
  return [m.a * x + m.b * y + m.e, m.c * x + m.d * y + m.f];
}

/** Một điểm hệ packet (0..1) chui qua đúng phần nếp của lớp `layer`, rồi nhân lên cạnh `side`. */
function trace(
  model: FoldModel, layer: number, prog: readonly number[],
  units: readonly (readonly [number, number])[], side: number,
): number[] {
  const crossed = model.crossed[layer] ?? [];
  const steps: Mat[] = crossed.map((j) => hinge(model.creases[j] ?? IDENTITY, prog[j] ?? 0));
  const out: number[] = [];
  for (const [ux, uy] of units) {
    let x = ux;
    let y = uy;
    // nếp gấp SAU cùng phải được mở RA TRƯỚC => áp ma trận ngược chiều thứ tự gấp.
    for (let t = steps.length - 1; t >= 0; t -= 1) [x, y] = through(steps[t], x, y);
    out.push(x * side, y * side);
  }
  return out;
}

/** Ảnh px của MỘT điểm đục qua lớp `layer` ở tiến trình `prog` (chấm lỗ bay theo lát giấy). */
export function layerPoint(
  model: FoldModel, layer: number, prog: readonly number[], p: Point, side: number,
): [number, number] {
  const px = trace(model, layer, prog, [[toNumber(p.x), toNumber(p.y)]], side);
  return [px[0] ?? 0, px[1] ?? 0];
}

/**
 * Tám số px [x0,y0,...,x3,y3] = bốn góc của lớp `layer` ở tiến trình `prog`; đó là lát giấy mà
 * tầng vẽ tô lên. Mở hẳn thì lát giấy về ĐÚNG ô của nó trên tờ (kín cả hình vuông).
 */
export function layerCorners(model: FoldModel, layer: number, prog: readonly number[], side: number): number[] {
  const w = toNumber(model.packet.w);
  const h = toNumber(model.packet.h);
  return trace(model, layer, prog, [[0, 0], [w, 0], [w, h], [0, h]], side);
}