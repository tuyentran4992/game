// Pattern: Factory + Seed
// TRÁCH NHIỆM: từ (seed, levelIndex, cấu hình chương) sinh ra LevelSpec DETERMINISTIC:
//   đáp án đúng = kết quả MỞ BUNG thật của simulator (foldRules) + 3 ô nhiễu đạt ngưỡng
//   khác biệt raster. CẤM Math.random — mọi biến thiên đi từ hash(seed|levelIndex|cfg).
// NGUỒN SỐ (không tự bịa):
//   · LƯỚI ĐIỂM ĐỤC = bội số 1/8 của tờ  ← g08_generator.py "lattice_points: F(i,8)"; lý do:
//     bắt đúng mọi nếp 1/8..1/2 và mép 0/1.
//   · NGƯỠNG NHIỄU = MIN_RASTER_DISTANCE trên lưới RASTER_GRID  ← import từ validator.ts
//     (g08_verify.py "assert mind >= 6"), không định nghĩa lại ở đây.
//   · TRẦN SỐ LỖ = 2^số nếp ← SPEC §6 PC-03 + tests/logic/generator.test.ts "số lỗ khớp bậc lớp"
//     (công thức ở foldRules.layerCount — generator và validator dùng CHUNG một nguồn).
//   · VỊ TRÍ RA MẮT LUẬT MỚI (màn 2 = cắt góc, màn chia hết 3 = nếp chéo D) ← SPEC §6.1.
//   · G = 16 / các tham số chương là DỮ LIỆU (cfg truyền vào), không hardcode trong file.
// CẤM if/else ≥3 nhánh: mọi lựa chọn theo kiểu đi qua bảng tra (CHAIN_ROWS, CORNERS,
//   CUT_SIZES, DISTRACTOR_RULES, MIRRORS) — và hàng đợi thông điệp ở validator.
// CHỖ PHẢI NÓI TRƯỚC: fallbackOptions dựng 3 ô nhiễu bằng ĐẾM Ô RASTER (chứng minh ngay tại
//   hàm) — hợp lệ theo PC-04 nhưng độ "nhìn giống thật" của nó phải do vision QA chốt
//   (TEST-CASES §1: thẩm mỹ chỉ đo được bằng E2E, máy không đo được).
// NGƯỠNG tham khảo: ~180 dòng (file dày nhất của lõi vì mang cả registry ô nhiễu).
import { creaseLines, layerCount, makeLayers, unfoldPoints } from './foldRules';
import type { Packet } from './foldRules';
import { add, cmp, div, flatPoints, inSheet, key, mul, point, rat, samePointSet, sub, toNumber } from './rational';
import { bitmapOf, cellOf, hamming, MIN_RASTER_DISTANCE, RASTER_GRID } from './validator';
import type { CutAction, FoldKind, LevelSpec, Point, Rat, SheetAction } from './types';

export type ChapterLevelConfig = {
  readonly chapter: number;
  readonly levelInChapter: number;
  readonly foldCount: number;
  readonly punchCount: number;
  readonly useCut: boolean;
  readonly useDiagonal: boolean;
  readonly timerOn: boolean;
};

const ONE = rat(1);
const ZERO = rat(0);
const LATTICE = 8; // bội số 1/8 — nguồn: g08_generator.py lattice_points
const OPTIONS = 4; // "chọn 1 trong 4 hình" — SPEC §1.1
const FRESH_CELLS = MIN_RASTER_DISTANCE; // số ô phải khác nhau giữa 2 phương án (PC-04)

/** Ô raster của một điểm (đơn vị so sánh của PC-04). */
const cellKey = (q: Point): string => {
  const c = cellOf(q, RASTER_GRID);
  return c.col + ':' + c.row;
};
/** Khoá điểm theo GIÁ TRỊ đúng — dùng cho trần số lỗ (2^nếp). */
const exactKey = (q: Point): string => key(q.x) + '|' + key(q.y);


// ---------------------------------------------------------------------------
// PRNG tất định (thay Math.random — PC-02). FNV-1a 32 bít để băm chuỗi seed,
// mulberry32 để trải số. Không trạng thái toàn cục: mỗi dòng chảy tự lập từ tag.
// ---------------------------------------------------------------------------
type Rng = { readonly next: () => number; readonly int: (bound: number) => number };

function hash32(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
    h = Math.imul(h ^ (text.charCodeAt(i) >> 8), 0x01000193);
  }
  return h >>> 0;
}

function rngFor(tag: string): Rng {
  let s = hash32(tag);
  const next = (): number => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return { next, int: (bound: number) => Math.floor(next() * bound) };
}

const stream = (seed: string, levelIndex: number, cfg: ChapterLevelConfig, purpose: string): Rng =>
  rngFor([seed, levelIndex, cfg.chapter, cfg.levelInChapter, cfg.foldCount, cfg.punchCount, cfg.useCut, cfg.useDiagonal, purpose].join('|'));

/** Xoay mảng theo tất định (không shuffle bằng Math.random). */
function rotate<T>(xs: readonly T[], by: number): T[] {
  const k = xs.length === 0 ? 0 : ((by % xs.length) + xs.length) % xs.length;
  return [...xs.slice(k), ...xs.slice(0, k)];
}

const range = (n: number): number[] => Array.from({ length: Math.max(0, n) }, (_, i) => i);

// ---------------------------------------------------------------------------
// 1) Chuỗi nếp — bảng tra. Thêm kiểu gấp = thêm 1 dòng (SPEC §5.3).
// ---------------------------------------------------------------------------
type ChainRow = { readonly id: string; readonly folds: FoldKind[]; readonly diagonal: boolean };

const CHAIN_ROWS: readonly ChainRow[] = [
  { id: 'H', folds: ['H'], diagonal: false },
  { id: 'V', folds: ['V'], diagonal: false },
  { id: 'HV', folds: ['H', 'V'], diagonal: false },
  { id: 'VH', folds: ['V', 'H'], diagonal: false },
  { id: 'HH', folds: ['H', 'H'], diagonal: false }, // bẫy "4 lớp mà vẫn 2 lỗ"
  { id: 'VV', folds: ['V', 'V'], diagonal: false },
  { id: 'HVH', folds: ['H', 'V', 'H'], diagonal: false },
  { id: 'VHV', folds: ['V', 'H', 'V'], diagonal: false },
  { id: 'HHV', folds: ['H', 'H', 'V'], diagonal: false },
  { id: 'DHV', folds: ['D', 'H', 'V'], diagonal: true },
  { id: 'DVH', folds: ['D', 'V', 'H'], diagonal: true },
  { id: 'DHVH', folds: ['D', 'H', 'V', 'H'], diagonal: true },
];

function chainFor(cfg: ChapterLevelConfig, rng: Rng): FoldKind[] {
  const legal = CHAIN_ROWS.filter((r) => r.folds.length === cfg.foldCount && (!r.diagonal || cfg.useDiagonal));
  // D phải CÓ MẶT thật sự trong dải chương 6-8 (SPEC §6.1: nếp chéo ra mắt ở màn 3 của chương).
  const teachesD = cfg.useDiagonal && cfg.levelInChapter % 3 === 0;
  const wanted = teachesD ? legal.filter((r) => r.diagonal) : legal;
  const pool = wanted.length > 0 ? wanted : legal;
  const row = rotate(pool, rng.int(pool.length))[0] ?? CHAIN_ROWS[0];
  return row.folds;
}

// ---------------------------------------------------------------------------
// 2) Packet + quỹ đạo lỗ. Memo của hàm THUẦN: khoá đúng là input, không đổi output (PC-02).
// ---------------------------------------------------------------------------
const packetCache = new Map<string, Packet>();
const orbitCache = new Map<string, Point[]>();
const latticeCache = new Map<string, Point[]>();

function packetOf(folds: FoldKind[]): Packet {
  const k = folds.join('');
  const hit = packetCache.get(k);
  const made = hit ?? makeLayers(folds, ONE);
  if (!hit) packetCache.set(k, made);
  return made;
}

function orbitOf(folds: FoldKind[], q: Point): Point[] {
  const k = folds.join('') + '@' + exactKey(q);
  const hit = orbitCache.get(k);
  const made = hit ?? unfoldPoints(folds, ONE, [q]);
  if (!hit) orbitCache.set(k, made);
  return made;
}


/** Lưới bội 1/8 nằm TRONG packet (đục ngoài packet là vô nghĩa về vật lý). */
function latticeOf(folds: FoldKind[]): Point[] {
  const k = folds.join('');
  const hit = latticeCache.get(k);
  if (hit) return hit;
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
  // ưu tiên điểm ít lỗ (nằm trên nếp/mép) để dải nhiều lỗ không vượt trần 2^n.
  const byOrbit = new Map(out.map((q) => [q, orbitOf(folds, q).length] as const));
  const sorted = [...out].sort((a, b) => (byOrbit.get(a) ?? 0) - (byOrbit.get(b) ?? 0) || cmp(a.x, b.x) || cmp(a.y, b.y));
  latticeCache.set(k, sorted);
  return sorted;
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
function punchRun(folds: FoldKind[], order: readonly Point[], cap: number, count: number, pick: PunchPick): Point[] {
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
 * (layerCount = 2^số nếp — nguồn: SPEC §6 PC-03, generator.test.ts "số lỗ khớp bậc số lớp"),
 * khởi đầu do seed ⇒ cùng seed cùng đề (PC-02).
 * HAI LƯỢT: first-fit theo seed (là hành vi cũ, đúng cho mọi màn mà cfg.punchCount còn chỗ);
 * nếu lượt đó phải dừng sớm hơn cfg thì chạy lượt "ít lỗ mới nhất" — PC-01 bắt buộc
 * cấu hình là DỮ LIỆU: không được âm thầm sinh ÍT điểm đục hơn cfg khi vẫn còn tổ hợp hợp lệ.
 */
function punchPoints(folds: FoldKind[], count: number, rng: Rng): Point[] {
  const cap = layerCount(folds);
  const grid = latticeOf(folds);
  const order = rotate(grid, rng.int(Math.max(1, grid.length)));
  const loose = punchRun(folds, order, cap, count, firstFit);
  const tight = loose.length >= count ? loose : punchRun(folds, order, cap, count, tightestFit);
  return tight.length >= loose.length ? tight : loose;
}

// ---------------------------------------------------------------------------
// 3) Cắt góc chéo — góc packet + cỡ nhát cắt (bảng dữ liệu, không switch).
// ---------------------------------------------------------------------------
const minOf = (a: Rat, b: Rat): Rat => (cmp(a, b) <= 0 ? a : b);

const CORNERS: Record<CutAction['corner'], (packet: Packet) => Point> = {
  BL: () => point(ZERO, ZERO),
  BR: (packet) => point(packet.w, ZERO),
  TL: (packet) => point(ZERO, packet.h),
  TR: (packet) => point(packet.w, packet.h),
};
const CUT_CORNERS: readonly CutAction['corner'][] = ['BL', 'BR', 'TL', 'TR'];
/** Cỡ nhát cắt = 1/4..3/4 cạnh NHỎ của packet — tương đối, không phải số tuyệt đối. */
const CUT_SIZES: readonly Rat[] = [rat(1, 4), rat(1, 2), rat(3, 4)];

function cornerCut(folds: FoldKind[], rng: Rng): { action: CutAction; holes: Point[] } {
  const packet = packetOf(folds);
  const corner = CUT_CORNERS[rng.int(CUT_CORNERS.length)];
  const size = CUT_SIZES[rng.int(CUT_SIZES.length)];
  return {
    action: { kind: 'cut', corner, size: mul(minOf(packet.w, packet.h), size) },
    holes: unfoldPoints(folds, ONE, [CORNERS[corner](packet)]),
  };
}

// ---------------------------------------------------------------------------
// 4) Ô nhiễu — registry. Mỗi dòng = MỘT loại lỗi thị giác (cùng bộ lỗi với g08/Burte 2019).
//    build trả [] khi không áp dụng được; cổng cứng là khoảng cách raster (PC-04).
// ---------------------------------------------------------------------------
type Draft = {
  readonly folds: FoldKind[];
  readonly punch: Point[];
  readonly answer: Point[];
};

type Mirror = 'mx' | 'my' | 'rot90' | 'swap';
const MIRRORS: readonly Mirror[] = ['mx', 'my', 'rot90', 'swap'];

/** Nhóm đối xứng tờ vuông (D4 thu hẹp 4 phép hay dùng làm lỗi — cùng bảng với g08 apply_D4). */
function flip(q: Point, g: Mirror): Point {
  const table: Record<Mirror, Point> = {
    mx: point(sub(ONE, q.x), q.y),
    my: point(q.x, sub(ONE, q.y)),
    rot90: point(q.y, sub(ONE, q.x)),
    swap: point(q.y, q.x),
  };
  return table[g];
}

/** Tâm ô raster (col,row) — bảo đảm ⌊x*grid⌋ trả đúng ô đó, không lệ thuộc làm tròn float. */
function cellPoint(col: number, row: number): Point {
  return point(rat(2 * col + 1, 2 * RASTER_GRID), rat(2 * row + 1, 2 * RASTER_GRID));
}

/** Dãy ô rải đều: bước 101 nguyên tố cùng nhau với 256 ⇒ hoán vị lưới, không trùng nhau. */
function scatter(start: number, take: number, used: Set<string>): Point[] {
  const cells = RASTER_GRID * RASTER_GRID;
  const out: Point[] = [];
  for (let t = 0; out.length < take && t < cells; t++) {
    const c = (((start + t) * 101) % cells + cells) % cells;
    const col = c % RASTER_GRID;
    const row = Math.floor(c / RASTER_GRID);
    const k = col + ':' + row;
    if (used.has(k)) continue;
    used.add(k);
    out.push(cellPoint(col, row));
  }
  return out;
}

/** Bỏ r ≤ 3 ô của đáp án, thay bằng (6-r) ô trống mới — "lỗ ở vị trí sai". */
function displace(answer: Point[], used: Set<string>, start: number): Point[] {
  const owned = new Set(answer.map(cellKey));
  const r = Math.min(3, owned.size);
  const drop = new Set([...owned].slice(0, r));
  const keep = answer.filter((q) => !drop.has(cellKey(q)));
  for (const k of owned) used.add(k);
  return [...keep, ...scatter(start, FRESH_CELLS - r, used)];
}

type DistractorRule = { readonly id: string; readonly variants: number; readonly build: (d: Draft, v: number) => Point[] };

export const DISTRACTOR_RULES: readonly DistractorRule[] = [
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
    build: (d) => (d.folds.length < 2 || d.punch.length === 0 ? [] : unfoldPoints(d.folds.slice(0, -1), ONE, d.punch)),
  },
  {
    // "lộn lỗ qua nhầm nếp" (d_flipone của g08) — nâng lên k lỗ để đạt ngưỡng raster 6.
    id: 'crease-flip',
    variants: 6,
    build: (d, v) => {
      const lines = creaseLines(d.folds, ONE);
      const all = [...lines.x.map((at) => ({ axis: 'x' as const, at })), ...lines.y.map((at) => ({ axis: 'y' as const, at }))];
      const k = Math.min(3, d.answer.length);
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
    build: (d, v) => displace(d.answer, new Set(), v * 17 + 3),
  },
];

/**
 * Bộ ba ô nhiễu dựng bằng ĐẾM Ô — dùng khi pool registry không gom đủ 3 ô đạt ngưỡng.
 * Chứng minh: D_i = (A \ S) ∪ T_i, |S| = r ≤ 3, T_i đôi một rời và rời mọi ô của A,
 *   |T_i| = 6 - r ⇒ hamming(A, D_i) = r + (6 - r) = 6 (đúng ngưỡng PC-04);
 *   hamming(D_i, D_j) ≥ |T_i| + |T_j| = 2(6 - r) ≥ 6 vì T_i ∩ T_j = ∅ và T_i ∩ A = ∅.
 * Lưới 16×16 = 256 ô trong khi một đề nhiều nhất 16 lỗ ⇒ T_i luôn tìm được ⇒ không sinh ra
 * đề "không bán được" (khác g08: build_options trả None rồi bỏ màn).
 */
function fallbackOptions(answer: Point[]): Point[][] {
  const used = new Set<string>();
  return range(OPTIONS - 1).map((i) => displace(answer, used, i * 23 + 5));
}

const rasterOf = (pts: Point[]): boolean[] => bitmapOf(flatPoints(pts), RASTER_GRID);

/** Cổng PC-04 cho MỘT ứng viên: khác đáp án ≥1 lỗ và cách mọi ô đã chọn ≥ ngưỡng raster. */
function accept(d: Draft, picked: Point[][], cand: Point[]): boolean {
  const cells = new Set(cand.map(cellKey));
  if (cand.length === 0 || cells.size !== cand.length) return false; // 2 lỗ cùng 1 ô ⇒ ảnh mờ
  if (!cand.every(inSheet)) return false;
  if (samePointSet(cand, d.answer)) return false; // PC-04: không ô nào trùng đáp án
  const bm = rasterOf(cand);
  return [d.answer, ...picked].every((o) => hamming(bm, rasterOf(o)) >= MIN_RASTER_DISTANCE);
}

/** Thử registry trước (ô nhiễu "có lỗi thật"); không đủ 3 ô thì dựng cả bộ bằng fallback. */
function pickOptions(d: Draft, rng: Rng): Point[][] {
  const picked: Point[][] = [];
  for (const rule of rotate(DISTRACTOR_RULES, rng.int(DISTRACTOR_RULES.length))) {
    for (const v of rotate(range(rule.variants), rng.int(rule.variants))) {
      const cand = rule.build(d, v);
      if (!accept(d, picked, cand)) continue;
      picked.push(cand);
      if (picked.length === OPTIONS - 1) return picked;
    }
  }
  return fallbackOptions(d.answer);
}

// ---------------------------------------------------------------------------
// 5) Dựng đề
// ---------------------------------------------------------------------------
type Built = { readonly action: SheetAction; readonly holes: Point[]; readonly punch: Point[] };

function answerOf(folds: FoldKind[], cfg: ChapterLevelConfig, rng: Rng): Built {
  // Cắt góc ra mắt ở màn 2 của chương 4 (SPEC §6.1), các màn sau xen kẽ theo seed.
  const usesCut = cfg.useCut && (cfg.levelInChapter % 3 === 2 || rng.int(3) === 0);
  const cut = usesCut ? cornerCut(folds, rng) : null;
  if (cut && cut.holes.length > 0) return { action: cut.action, holes: cut.holes, punch: [] };
  const punch = punchPoints(folds, Math.max(1, cfg.punchCount), rng);
  return { action: { kind: 'punch', points: flatPoints(punch) }, holes: unfoldPoints(folds, ONE, punch), punch };
}


/** Sinh đề cho 1 màn. CÙNG (seed, levelIndex, cfg) ⇒ CÙNG đề (PC-02). */
export function levelSpec(seed: string, levelIndex: number, cfg: ChapterLevelConfig): LevelSpec {
  const folds = chainFor(cfg, stream(seed, levelIndex, cfg, 'chain'));
  const built = answerOf(folds, cfg, stream(seed, levelIndex, cfg, 'answer'));
  const draft: Draft = { folds, punch: built.punch, answer: built.holes };
  const rest = pickOptions(draft, stream(seed, levelIndex, cfg, 'options')).map((holes) => flatPoints(holes));
  const correctIndex = stream(seed, levelIndex, cfg, 'index').int(OPTIONS);
  // Đáp án đúng đặt ở ô correctIndex; chỗ đặt do seed quyết (tái lập được) — KHÔNG xáo ngẫu nhiên.
  const answerFlat = flatPoints(built.holes);
  const ordered = [...rest.slice(0, correctIndex), answerFlat, ...rest.slice(correctIndex)];
  return {
    seed,
    levelIndex,
    chapter: cfg.chapter,
    folds,
    action: built.action,
    answerHoles: answerFlat,
    options: ordered.map((holes, id) => ({ id, holes })),
    correctIndex,
    // "số bước suy luận" = số lượt gấp + (1 nhát cắt | số điểm đục) — SPEC §6.1 (độ khó là
    // số bước suy luận, không phải đồng hồ). Chỉ cần hữu hạn để xếp bậc tiến trình (PC-01).
    difficulty: folds.length + (built.action.kind === 'cut' ? 1 : built.punch.length),
    timerOn: cfg.timerOn,
  };
}

/** Mã chia sẻ offline dạng GAP-<5 ký tự>-<điểm> (records dùng ở B1c). */
export function shareCode(levelIndex: number, score: number): string {
  const raw = (hash32('GAP|' + levelIndex + '|' + score) >>> 0).toString(36).toUpperCase();
  return 'GAP-' + raw.padStart(5, '0').slice(-5) + '-' + score;
}

// ---------------------------------------------------------------------------
// 6) levelConfigFor — bảng chương là DỮ LIỆU (SPEC §5.2). Đọc config/chapters.json
//    (chưa tồn tại ở B1a ⇒ truyền tay). Field theo DATA-MODEL §3.1.
// ---------------------------------------------------------------------------
type Row = Readonly<Record<string, unknown>>;

/** Tên field theo DATA-MODEL §3.1; mỗi field có cả dạng dẹt lẫn dạng nằm trong gen_params. */
const F_CHAPTER = ['chapter'];
const F_LEVELS = ['levels', 'level_params'];
const F_FOLDS = ['folds', 'gen_params.folds'];
const F_ACTION = ['action', 'gen_params.action'];
const F_LAYERS = ['layers'];
const F_TIMER = ['timer', 'timer_on'];
const F_TIMER_SEC = ['timer_sec', 'gen_params.timer_sec'];
const F_HOLES_MIN = ['holes_min', 'gen_params.holes_min'];
const F_HOLES_MAX = ['holes_max', 'gen_params.holes_max'];

/** Đọc field đầu tiên xuất hiện trong danh sách dòng (màn trước, chương sau) — không if/else. */
function readField(source: readonly Row[], keys: readonly string[]): unknown {
  for (const row of source) {
    for (const k of keys) {
      const dot = k.indexOf('.');
      if (dot < 0) {
        if (k in row) return row[k];
      } else {
        const box = row[k.slice(0, dot)] as Row | undefined;
        if (box && typeof box === 'object' && k.slice(dot + 1) in box) return box[k.slice(dot + 1)];
      }
    }
  }
  return undefined;
}
const numOf = (source: readonly Row[], keys: readonly string[], fallback: number): number => {
  const v = readField(source, keys);
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
};
const boolOf = (source: readonly Row[], keys: readonly string[]): boolean => readField(source, keys) === true;
const stringOf = (source: readonly Row[], keys: readonly string[], fallback: string): string => {
  const v = readField(source, keys);
  return typeof v === 'string' ? v : fallback;
};
const FOLD_KINDS: readonly FoldKind[] = ['H', 'V', 'D'];
const foldsOf = (source: readonly Row[]): FoldKind[] => {
  const v = readField(source, F_FOLDS);
  return Array.isArray(v) ? (v.filter((k) => FOLD_KINDS.includes(k as FoldKind)) as FoldKind[]) : [];
};

function chapterRows(chapters: unknown): Row[] {
  const box = (chapters ?? {}) as { chapters?: unknown } | unknown;
  const list = Array.isArray(box) ? box : Array.isArray((box as { chapters?: unknown }).chapters) ? (box as { chapters: unknown[] }).chapters : [];
  return list.filter((r) => r && typeof r === 'object') as Row[];
}

/** Tìm (dòng chương, dòng màn) theo VỊ TRÍ trong bảng — không suy cấp số học cứng. */
function locate(table: { chapter: Row; levels: Row[] }[], levelIndex: number): { chapter: Row; level: Row; at: number; pos: number } | null {
  let seen = 0;
  for (let i = 0; i < table.length; i++) {
    const { levels } = table[i];
    if (levelIndex > seen && levelIndex <= seen + levels.length) return { chapter: table[i].chapter, level: levels[levelIndex - seen - 1], at: i, pos: levelIndex - seen };
    seen += levels.length;
  }
  return null;
}

/** Bảng cấu hình 8 chương × 15 màn — đọc từ config/chapters.json (chưa có ở B1a, truyền vào khi test). */
export function levelConfigFor(chapters: unknown, levelIndex: number): ChapterLevelConfig {
  const list = chapterRows(chapters);
  const table = list.map((chapter) => {
    const raw = readField([chapter], F_LEVELS);
    const levels = Array.isArray(raw) && raw.length > 0 ? (raw as Row[]) : [{}];
    return { chapter, levels };
  });
  const total = table.reduce((n, t) => n + t.levels.length, 0);
  const found = Number.isInteger(levelIndex) && levelIndex >= 1 && levelIndex <= total ? locate(table, levelIndex) : null;
  if (!found) throw new Error('levelConfigFor: levelIndex ' + levelIndex + ' ngoài dải 1..' + total + ' (chặn leak màn 121 — PC-18)');
  const scope = [found.level, found.chapter];
  const folds = foldsOf(scope);
  const layers = numOf(scope, F_LAYERS, 4);
  const holesMin = Math.max(1, numOf(scope, F_HOLES_MIN, 1));
  const holesMax = Math.max(holesMin, numOf(scope, F_HOLES_MAX, holesMin));
  return {
    chapter: numOf(scope, F_CHAPTER, found.at + 1),
    levelInChapter: found.pos,
    // foldCount: dòng màn nếu có; không thì suy từ layers = 2^foldCount (SPEC §1.4 "gấp 4 → 8")
    foldCount: folds.length > 0 ? folds.length : Math.max(1, Math.round(Math.log2(layers))),
    punchCount: holesMin + ((found.pos - 1) % (holesMax - holesMin + 1)),
    useCut: stringOf(scope, F_ACTION, 'punch') === 'cut',
    useDiagonal: folds.includes('D'),
    timerOn: boolOf([found.chapter], F_TIMER) && numOf(scope, F_TIMER_SEC, 0) > 0,
  };
}

