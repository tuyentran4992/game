// Pattern: Registry (ô nhiễu) + Acceptance gate
// TRÁCH NHIỆM: dựng 3 phương án SAI mà "có lỗi thật" — mỗi dòng DISTRACTOR_RULES là MỘT
//   loại lỗi thị giác của người chơi (cùng bộ lỗi với g08/Burte 2019): soi nhầm trục, quên
//   nếp đếm thô, quên nếp cuối, lộn lỗ qua nhầm nếp, lỗ sai vị trí, đọc nhầm vệt cắt §7.5.
//   Cổng nhận là khoảng cách raster (PC-04); không đủ 3 ô thì fallbackOptions ĐẾM Ô chứng
//   minh tổ hợp khác biệt ngay trong hàm.
// SỐ LÀ DỮ LIỆU (E3/A8): nhịp rải ô, hệ số trộn biến thể, trần số ô bị động đều là hằng có tên.
import { classifyCluster } from './cutGeometry';
import { cellClusters } from './cutRegion';
import { creaseLines, unfoldPoints } from './foldRules';
import { packetOf } from './punchPoints';
import { range, rotate } from './rng';
import type { Rng } from './rng';
import { add, div, flatPoints, inSheet, mul, point, rat, samePointSet, sub, toNumber } from './rational';
import { cellOf, cellKey, cellPoint, RASTER_CELLS, RASTER_GRID, bitmapOf, hamming } from './raster';
import { MIN_RASTER_DISTANCE, OPTION_COUNT } from './validator';
import type { FoldKind, Point, Rat } from './types';

/** Trạng thái một đề đang dựng — input của mọi rule ô nhiễu. */
export type Draft = {
  readonly folds: FoldKind[];
  readonly punch: Point[];
  readonly answer: Point[];
  /** Cỡ nhát cắt lớn nhất của đề (null nếu đề punch) — ngưỡng phân loại cụm §7.5. */
  readonly leg: Rat | null;
};

/** Số phương án phải DỰNG (đáp án đúng chiếm một ô) — nguồn: validator.OPTION_COUNT. */
const DISTRACTOR_COUNT = OPTION_COUNT - 1;
/**
 * Số ô TỐI ĐA bị bỏ/thêm khi sửa đáp án thành ô nhiễu. Chọn = nửa ngưỡng PC-04 vì chứng
 * minh ở fallbackOptions cần r ≤ 6-r (bỏ r ô, thêm 6-r ô mới ⇒ đúng 6 ô khác biệt).
 */
const MAX_EDITED_CELLS = MIN_RASTER_DISTANCE / 2;
/**
 * Hệ số trộn PRNG của ô nhiễu (DỮ LIỆU — E3/A8). Bước rải phải nguyên tố cùng nhau với 256
 * ô của lưới ⇒ sinh hoán vị lưới, không trùng; mỗi cặp (stride, offset) tách vòng quét của
 * từng biến thể rule và từng ô trong bộ fallback đôi một khác nhau.
 */
const MIX = { scatterStride: 101, displaceStride: 17, displaceOffset: 3, fallbackStride: 23, fallbackOffset: 5 } as const;

// ---------------------------------------------------------------------------
// Hình học ô raster dùng riêng cho ô nhiễu (đọc cụm, phồng/bẹp cụm §7.5).
// ---------------------------------------------------------------------------
/** Hình vuông bao một cụm ô (raster) — nền cho hai cách "đọc nhầm" vệt cắt. */
function boxOf(group: readonly Point[]): { c0: number; r0: number; c1: number; r1: number } {
  const cells = group.map((q) => cellOf(q, RASTER_GRID));
  const col = (c: { col: number; row: number }): number => c.col;
  const row = (c: { col: number; row: number }): number => c.row;
  return {
    c0: Math.min(...cells.map(col)),
    r0: Math.min(...cells.map(row)),
    c1: Math.max(...cells.map(col)),
    r1: Math.max(...cells.map(row)),
  };
}

/** Phồng cụm thành khối ĐẶC: khuyết mép bị nhìn thành LỖ TRÒN (lỗi §7.5). */
function puff(group: readonly Point[]): Point[] {
  const b = boxOf(group);
  const out: Point[] = [];
  for (let c = b.c0; c <= b.c1; c++) for (let r = b.r0; r <= b.r1; r++) out.push(cellPoint(c, r));
  return out;
}

/** Bẹp cụm về hai cạnh trái/dưới: lỗ tròn bị nhìn thành KHUYẾT MÉP (lỗi §7.5 ngược lại). */
function shave(group: readonly Point[]): Point[] {
  const b = boxOf(group);
  return group.filter((q) => {
    const c = cellOf(q, RASTER_GRID);
    return c.col === b.c0 || c.row === b.r0;
  });
}

type Mirror = 'mx' | 'my' | 'rot90' | 'swap';
const MIRRORS: readonly Mirror[] = ['mx', 'my', 'rot90', 'swap'];

/** Nhóm đối xứng tờ vuông (D4 thu hẹp 4 phép hay dùng làm lỗi — cùng bảng với g08 apply_D4). */
function flip(q: Point, g: Mirror): Point {
  const ONE = rat(1);
  const table: Record<Mirror, Point> = {
    mx: point(sub(ONE, q.x), q.y),
    my: point(q.x, sub(ONE, q.y)),
    rot90: point(q.y, sub(ONE, q.x)),
    swap: point(q.y, q.x),
  };
  return table[g];
}

/** Dãy ô rải đều trên lưới, bỏ qua ô đã dùng (used bị biến đổi — đó là bộ nhớ của cả bộ). */
function scatter(start: number, take: number, used: Set<string>): Point[] {
  const out: Point[] = [];
  for (let t = 0; out.length < take && t < RASTER_CELLS; t++) {
    const c = (((start + t) * MIX.scatterStride) % RASTER_CELLS + RASTER_CELLS) % RASTER_CELLS;
    const col = c % RASTER_GRID;
    const row = Math.floor(c / RASTER_GRID);
    const k = col + ':' + row;
    if (used.has(k)) continue;
    used.add(k);
    out.push(cellPoint(col, row));
  }
  return out;
}

/** Bỏ r ≤ MAX_EDITED_CELLS ô của đáp án, thay bằng (ngưỡng - r) ô trống mới — "lỗ ở sai chỗ". */
function displace(answer: readonly Point[], used: Set<string>, start: number): Point[] {
  const owned = new Set(answer.map(cellKey));
  const r = Math.min(MAX_EDITED_CELLS, owned.size);
  const drop = new Set([...owned].slice(0, r));
  const keep = answer.filter((q) => !drop.has(cellKey(q)));
  for (const k of owned) used.add(k);
  return [...keep, ...scatter(start, MIN_RASTER_DISTANCE - r, used)];
}

// ---------------------------------------------------------------------------
// Registry ô nhiễu. build trả [] khi không áp dụng được; cổng cứng là khoảng cách raster.
// ---------------------------------------------------------------------------
type DistractorRule = { readonly id: string; readonly variants: number; readonly build: (d: Draft, v: number) => Point[] };

/** id của rule §7.5 "đọc nhầm vệt cắt" — một nguồn khoá duy nhất cho bảng + test (D2). */
const NOTCH_RULE_ID = 'notch-vs-hole';

const DISTRACTOR_RULES: readonly DistractorRule[] = [
  {
    // "soi nhầm trục / xoay nhầm hình": phản xạ nguyên cụm (d_mirrorx, d_rotate90 của g08).
    id: 'wrong-axis',
    variants: 4,
    build: (d, v) => d.answer.map((q) => flip(q, MIRRORS[v % MIRRORS.length])),
  },
  {
    // "quên nếp, đếm thô": mỗi lỗ nhân bản theo mọi ô của packet (d_perceptual của g08).
    id: 'raw-count',
    variants: 1,
    build: (d) => {
      const ONE = rat(1);
      const { w, h } = packetOf(d.folds);
      const cols = Math.round(toNumber(div(ONE, w)));
      const rows = Math.round(toNumber(div(ONE, h)));
      const out: Point[] = [];
      for (const q of d.punch)
        for (let i = 0; i < cols; i++)
          for (let j = 0; j < rows; j++) out.push(point(add(q.x, mul(w, rat(i))), add(q.y, mul(h, rat(j)))));
      return out.filter(inSheet);
    },
  },
  {
    // "quên nếp cuối": mở ít hơn MỘT lượt gấp (d_rawcount nhánh dự phòng của g08).
    id: 'forget-last-fold',
    variants: 1,
    build: (d) => (d.folds.length < 2 || d.punch.length === 0 ? [] : unfoldPoints(d.folds.slice(0, -1), rat(1), d.punch)),
  },
  {
    // "lộn lỗ qua nhầm nếp" (d_flipone của g08) — nâng lên k lỗ để đạt ngưỡng raster 6.
    id: 'crease-flip',
    variants: 6,
    build: (d, v) => {
      const lines = creaseLines(d.folds, rat(1));
      const all = [...lines.x.map((at) => ({ axis: 'x' as const, at })), ...lines.y.map((at) => ({ axis: 'y' as const, at }))];
      const k = Math.min(MAX_EDITED_CELLS, d.answer.length);
      if (all.length === 0 || d.answer.length < 2) return [];
      const out: Point[] = [];
      d.answer.forEach((q, i) => {
        const line = all[(i + v) % all.length];
        const twice = mul(rat(2), line.at);
        const moved = line.axis === 'x' ? point(sub(twice, q.x), q.y) : point(q.x, sub(twice, q.y));
        const shouldMove = i < k || i >= d.answer.length - k;
        out.push(shouldMove && inSheet(moved) ? moved : q);
      });
      return out;
    },
  },
  {
    // "lỗ ở vị trí sai" — cũng là dòng fallback, xem fallbackOptions.
    id: 'displace',
    variants: 4,
    build: (d, v) => displace(d.answer, new Set(), v * MIX.displaceStride + MIX.displaceOffset),
  },
  {
    // §7.5 "đọc nhầm vệt cắt": đề cut có các CỤM tổn thương; biến khuyết mép thành lỗ tròn
    // (phồng cả cụm) hoặc ngược lại (bẹp về hai cạnh). Không áp dụng cho đề punch (leg = null).
    id: NOTCH_RULE_ID,
    variants: 2,
    build: (d, v) => {
      if (d.leg === null) return [];
      const out: Point[] = [];
      for (const group of cellClusters(d.answer)) {
        const notch = classifyCluster(group, d.leg) === 'edge-notch';
        out.push(...(notch === (v === 0) ? puff(group) : shave(group)));
      }
      return out;
    },
  },
];

/**
 * Bộ ba ô nhiễu dựng bằng ĐẾM Ô — dùng khi pool registry không gom đủ 3 ô đạt ngưỡng.
 * Chứng minh: D_i = (A \ S) ∪ T_i, |S| = r ≤ MAX_EDITED_CELLS, T_i đôi một rời và rời mọi ô
 *   của A, |T_i| = ngưỡng - r ⇒ hamming(A, D_i) = r + (ngưỡng - r) = ngưỡng (đúng PC-04);
 *   hamming(D_i, D_j) ≥ |T_i| + |T_j| = 2(ngưỡng - r) ≥ ngưỡng vì T_i ∩ T_j = ∅, T_i ∩ A = ∅.
 * Lưới 16×16 = 256 ô trong khi một đề nhiều nhất 16 lỗ ⇒ T_i luôn tìm được ⇒ không sinh ra
 * đề "không bán được" (khác g08: build_options trả None rồi bỏ màn).
 */
function fallbackOptions(answer: readonly Point[]): Point[][] {
  const used = new Set<string>();
  return range(DISTRACTOR_COUNT).map((i) => displace(answer, used, i * MIX.fallbackStride + MIX.fallbackOffset));
}

const rasterOf = (pts: readonly Point[]): boolean[] => bitmapOf(flatPoints(pts), RASTER_GRID);

/** Cổng PC-04 cho MỘT ứng viên: khác đáp án ≥1 lỗ và cách mọi ô đã chọn ≥ ngưỡng raster. */
function accept(d: Draft, picked: Point[][], cand: Point[]): boolean {
  const cells = new Set(cand.map(cellKey));
  if (cand.length === 0 || cells.size !== cand.length) return false; // 2 lỗ cùng 1 ô ⇒ ảnh mờ
  if (!cand.every(inSheet)) return false;
  if (samePointSet(cand, d.answer)) return false; // PC-04: không ô nào trùng đáp án
  const bm = rasterOf(cand);
  return [d.answer, ...picked].every((o) => hamming(bm, rasterOf(o)) >= MIN_RASTER_DISTANCE);
}

/**
 * Rule CHỦ LỰC theo loại đề (bảng dữ liệu). Đề cut phải được THỬ ĐẦU TIÊN bằng rule §7.5:
 * D2 — nếu không, 3 rule khác lấp hết chỗ và notch-vs-hole không bao giờ đẻ ra ô nhiễu.
 * null = không ưu tiên gì, giữ nguyên thứ tự xoay theo seed.
 */
const LEAD_RULE: Readonly<Record<'cut' | 'punch', string | null>> = { cut: NOTCH_RULE_ID, punch: null };

/** Hàng đợi rule: xoay theo seed (đa dạng đề) nhưng đặt rule chủ lực của loại đề lên đầu. */
function ruleQueue(d: Draft, rng: Rng): DistractorRule[] {
  const all = rotate(DISTRACTOR_RULES, rng.int(DISTRACTOR_RULES.length));
  const lead = LEAD_RULE[d.leg === null ? 'punch' : 'cut'];
  if (lead === null) return all;
  return [...all.filter((r) => r.id === lead), ...all.filter((r) => r.id !== lead)];
}

/** Thử registry trước (ô nhiễu "có lỗi thật"); không đủ 3 ô thì dựng cả bộ bằng fallback. */
export function pickOptions(d: Draft, rng: Rng): Point[][] {
  const picked: Point[][] = [];
  for (const rule of ruleQueue(d, rng)) {
    for (const v of rotate(range(rule.variants), rng.int(rule.variants))) {
      const cand = rule.build(d, v);
      if (!accept(d, picked, cand)) continue;
      picked.push(cand);
      if (picked.length === DISTRACTOR_COUNT) return picked;
    }
  }
  return fallbackOptions(d.answer);
}

