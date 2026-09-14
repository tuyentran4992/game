// Pattern: Memoised geometry + Greedy selection (chọn điểm đục)
// TRÁCH NHIỆM: packet/quỹ đạo lỗ theo chuỗi nếp (có MEMO CÓ TRẦN — E6/A10), lưới điểm đục
//   hợp lệ trong packet, và hai chiến lược chọn điểm (first-fit theo seed / tightest-fit)
//   bảo đảm ĐÚNG cfg.punchCount mà vẫn dưới trần 2^số nếp.
// NGUỒN SỐ (không tự bịa):
//   · LƯỚI ĐIỂM ĐỤC = bội số 1/8 của tờ ← g08_generator.py "lattice_points: F(i,8)"; lý do:
//     bắt đúng mọi nếp 1/8..1/2 và mép 0/1.
//   · TRẦN SỐ LỖ = 2^số nếp ← SPEC §6 PC-03, công thức ở foldRules.layerCount (dùng CHUNG).
//   · trần memo CACHE_MAX ← cache.ts.
// CHỖ PHẢI NÓI TRƯỚC: điểm đục LUÔN đúng cfg.punchCount hoặc NÉM (review F-1) — bản cũ âm
//   thầm bớt điểm đục ⇒ 338/6000 đề lệch cấu hình mà không ai biết.
import { makeLayers, layerCount, unfoldPoints } from './foldRules';
import type { Packet } from './foldGeometry';
import { boundedCache } from './cache';
import { rotate } from './rng';
import type { Rng } from './rng';
import { cmp, key, point, rat } from './rational';
import type { FoldKind, Point } from './types';

/** Bội số 1/8 của tờ — lưới ứng viên điểm đục (nguồn: g08_generator.py lattice_points). */
const LATTICE = 8;
const ONE = rat(1);

/** Khoá điểm theo GIÁ TRỊ đúng — dùng cho trần số lỗ (2^nếp). */
const exactKey = (q: Point): string => key(q.x) + '|' + key(q.y);
/** Khoá chuỗi nếp — mọi memo của module này dẫn xuất từ đúng chuỗi. */
const chainKey = (folds: readonly FoldKind[]): string => folds.join('');

// ---------------------------------------------------------------------------
// Memo có trần (E6/A10): 4 memo = 4 Cache, mỗi cái tối đa CACHE_MAX mục.
// ---------------------------------------------------------------------------
const packetCache = boundedCache<Packet>('packetOf');
const orbitCache = boundedCache<readonly Point[]>('orbitOf');
const latticeCache = boundedCache<readonly Point[]>('latticeOf');
const capacityCache = boundedCache<number>('punchCapacity');

/** Packet của một chuỗi nếp (memo theo chuỗi). */
export function packetOf(folds: FoldKind[]): Packet {
  return packetCache.memo(chainKey(folds), () => makeLayers(folds, ONE));
}

/** Quỹ đạo lỗ khi mở bung MỘT điểm đục — bản sao, người gọi không sửa được memo. */
export function orbitOf(folds: FoldKind[], q: Point): readonly Point[] {
  const made = orbitCache.memo(chainKey(folds) + '@' + exactKey(q), () => unfoldPoints(folds, ONE, [q]));
  return [...made];
}

/**
 * Lưới bội 1/8 nằm TRONG packet (đục ngoài packet là vô nghĩa về vật lý), sắp theo số lỗ
 * tăng dần để ưu tiên điểm ít lỗ (nằm trên nếp/mép) — dải nhiều lỗ không vượt trần 2^n.
 */
function buildLattice(folds: FoldKind[]): readonly Point[] {
  const { w, h } = packetOf(folds);
  const out: Point[] = [];
  for (let i = 0; i <= LATTICE; i++) {
    const x = rat(i, LATTICE);
    if (cmp(x, w) > 0) continue;
    for (let j = 0; j <= LATTICE; j++) {
      const y = rat(j, LATTICE);
      if (cmp(y, h) > 0) continue;
      out.push(point(x, y));
    }
  }
  const byOrbit = new Map(out.map((q) => [q, orbitOf(folds, q).length] as const));
  return [...out].sort((a, b) => (byOrbit.get(a) ?? 0) - (byOrbit.get(b) ?? 0) || cmp(a.x, b.x) || cmp(a.y, b.y));
}

/** Lưới điểm đục của một chuỗi (memo + bản sao ⇒ gọi lại không thấy mảng nội bộ). */
export function latticeOf(folds: FoldKind[]): readonly Point[] {
  return [...latticeCache.memo(chainKey(folds), () => buildLattice(folds))];
}

/** Số lỗ MỚI mà một quỹ đạo đóng góp; -1 nếu chọn nó làm tổng số vị trí VƯỢT TRẦN bậc lớp. */
function usable(img: readonly string[], holes: ReadonlySet<string>, cap: number): number {
  const added = img.reduce((n, k) => (holes.has(k) ? n : n + 1), 0);
  return holes.size + added > cap ? -1 : added;
}

/** Chiến lược chọn điểm đục kế tiếp trong mảng "số lỗ mới" (-1 = bị trần bậc lớp chặn). */
type PunchPick = (gains: readonly number[], from: number) => number;

/** first-fit: ứng viên hợp lệ ĐẦU TIÊN theo vòng quét xuất phát từ seed (PC-02). */
const firstFit: PunchPick = (gains, from) => {
  const n = gains.length;
  for (let i = 0; i < n; i++) {
    const at = (i + from) % n;
    if (gains[at] >= 1) return at;
  }
  return -1;
};

/** tightest-fit: ứng viên thêm ÍT lỗ mới NHẤT — giữ chỗ cho các điểm còn lại của cfg. */
const tightestFit: PunchPick = (gains, from) => {
  const n = gains.length;
  let best = -1;
  let bestGain = Number.POSITIVE_INFINITY;
  for (let i = 0; i < n; i++) {
    const at = (i + from) % n;
    const g = gains[at];
    if (g < 1 || g >= bestGain) continue;
    best = at;
    bestGain = g;
  }
  return best;
};

/** Một lượt dựng điểm đục: dừng khi đủ `count` hoặc không còn điểm hợp lệ dưới trần bậc lớp. */
function punchRun(
  folds: FoldKind[],
  order: readonly Point[],
  cap: number,
  count: number,
  pick: PunchPick,
): Point[] {
  const orbits = order.map((q) => orbitOf(folds, q).map(exactKey));
  const picked: Point[] = [];
  const holes = new Set<string>();
  for (let round = 0; round < count; round++) {
    const at = pick(orbits.map((img) => usable(img, holes, cap)), round);
    if (at < 0) return picked;
    picked.push(order[at]);
    for (const k of orbits[at]) holes.add(k);
  }
  return picked;
}

/**
 * Danh sách điểm đục: nằm trong packet, tổng số vị trí lỗ KHÔNG vượt trần bậc lớp
 * (layerCount = 2^số nếp — SPEC §6 PC-03), khởi đầu do seed ⇒ cùng seed cùng đề (PC-02).
 * HAI LƯỢT: first-fit theo seed (đa dạng đề) và tightest-fit khi first-fit dừng sớm.
 * SỐ ĐIỂM ĐỤC PHẢI ĐÚNG BẰNG `count` (PC-01: cấu hình là dữ liệu) — không đủ chỗ ⇒ NÉM.
 */
export function punchPoints(folds: FoldKind[], count: number, rng: Rng): Point[] {
  const cap = layerCount(folds);
  const grid = latticeOf(folds);
  const order = rotate(grid, rng.int(Math.max(1, grid.length)));
  const loose = punchRun(folds, order, cap, count, firstFit);
  const tight = loose.length >= count ? loose : punchRun(folds, order, cap, count, tightestFit);
  const best = tight.length >= loose.length ? tight : loose;
  if (best.length < count) {
    throw new Error('punchPoints: chain ' + folds.join('') + ' chỉ còn chỗ cho ' + best.length + '/' + count +
      ' điểm đục dưới trần ' + cap + ' vị trí lỗ (punchCount=' + count + ') — tăng foldCount hoặc hạ holes_max, không sinh thiếu');
  }
  return best;
}

/**
 * Số điểm đục TỐI ĐA một chuỗi chứa nổi = độ dài lượt tightest-fit chạy tới trần
 * (mỗi quỹ đạo lớp là tập rời nhau ⇒ lấy dần quỹ đạo nhỏ nhất là cực đại hoá số điểm).
 * Dùng để lọc CHAIN_ROWS theo cfg.punchCount (chainTable.fittingPool).
 */
export function punchCapacity(folds: FoldKind[]): number {
  const k = chainKey(folds);
  return capacityCache.memo(k, () => {
    const cap = layerCount(folds);
    return punchRun(folds, latticeOf(folds), cap, cap, tightestFit).length;
  });
}
