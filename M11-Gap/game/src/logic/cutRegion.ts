// Pattern: Candidate pool (vùng cắt + cụm tổn thương)
// TRÁCH NHIỆM: dựng ĐÁP ÁN của đề "cắt góc" SPEC §7.5 — bảng ứng viên nhát cắt
//   (mọi góc × mọi cỡ còn PHÂN BIỆT được trên lưới raster), chọn 1-2 nhát theo chương,
//   hợp nhất vùng phủ raster và gom ô thành CỤM 8-lân-cận (oracle đếm cụm, không đếm điểm).
// MỘT NGUỒN cho mỗi sự thật: góc packet + hình học vùng + phân loại cụm ở cutGeometry.ts
//   (validator dùng lại đúng bảng đó); ở đây chỉ là CHIẾN LƯỢC CHỌN của phía sinh đề.
// CHỖ PHẢI NÓI TRƯỚC: "hai cỡ cắt ra cùng một ảnh" là ĐỀ HỎNG ⇒ loại khỏi pool, pool rỗng
//   thì levelSpec NÉM (không trả đề mù cho người chơi đoán bừa).
import { cutRegionPoints, cutSnips, PACKET_CORNERS } from './cutGeometry';
import { makeLayers, unfoldPoints } from './foldRules';
import { boundedCache } from './cache';
import { rotate } from './rng';
import type { Rng } from './rng';
import { cmp, key, mul, rat } from './rational';
import { cellOf, cellKey, cellPoint, RASTER_GRID } from './raster';
import type { ChapterLevelConfig, CutAction, CutCorner, CutSnip, FoldKind, Point, Rat, SheetAction } from './types';

const ONE = rat(1);
const minOf = (a: Rat, b: Rat): Rat => (cmp(a, b) <= 0 ? a : b);
const maxOf = (a: Rat, b: Rat): Rat => (cmp(a, b) >= 0 ? a : b);

/**
 * Góc packet = BẢNG HÌNH HỌC DÙNG CHUNG với validator (cutGeometry.PACKET_CORNERS):
 * generator sinh nhát cắt từ góc nào thì validator kiểm lỗ đúng trên góc đó (review F-2).
 * Danh sách góc để quay số SUY RA từ bảng ⇒ thêm góc mới chỉ sửa cutGeometry.
 */
const CUT_CORNERS = Object.keys(PACKET_CORNERS) as readonly CutCorner[];
/** Cỡ nhát cắt = PHÂN SỐ cạnh NHỎ của packet — bảng dữ liệu §7.5, không switch. */
const CUT_SIZES: readonly Rat[] = [rat(1, 16), rat(1, 8), rat(1, 4)];
/** CẤM cỡ mà cạnh góc vuông nhỏ hơn MỘT Ô raster: mở bung ra y hệt cỡ bên cạnh ⇒ đề mù. */
const CUT_MIN_LEG = rat(1, RASTER_GRID);

/**
 * Số nhát cắt CHO PHÉP theo chương (DỮ LIỆU — từ chương 5 được 2 nhát ở 2 góc khác nhau,
 * chương 4 một nhát, trước đó chưa dạy luật cắt). Tìm từ mức rộng nhất xuống.
 */
const CUT_SNIP_LIMIT: readonly { readonly fromChapter: number; readonly snips: number }[] = [
  { fromChapter: 5, snips: 2 },
  { fromChapter: 4, snips: 1 },
  { fromChapter: 1, snips: 0 },
];
/**
 * Trần nhát cắt của bảng = số nhát lớn nhất (dẫn xuất, không khai hằng thứ hai).
 * Tầng vẽ đọc nó để tính trần số lỗ phải vẽ nổi (review F1) — xem src/render/holeView.ts.
 */
export const CUT_MAX_SNIPS = CUT_SNIP_LIMIT.reduce((m, r) => Math.max(m, r.snips), 0);
export const snipLimitFor = (chapter: number): number =>
  CUT_SNIP_LIMIT.find((r) => chapter >= r.fromChapter)?.snips ?? 0;
/** Số nhát cắt thật sự của một action (độ khó §6.1 đếm theo NHÁT, không theo điểm). */
export const snipCountOf = (action: SheetAction): number => (action.kind === 'cut' ? cutSnips(action).length : 0);

/** memo: vùng phủ raster của MỘT nhát + bảng ứng viên của MỘT chuỗi nếp (E6: có trần). */
const cutCellCache = boundedCache<readonly Point[]>('cutCells');
const cutPoolCache = boundedCache<readonly CutCandidate[]>('cutCandidates');

/** Vùng phủ raster của MỘT nhát cắt = tâm các ô mà ảnh mở bung của vùng rơi vào. */
function cutCells(folds: FoldKind[], snip: CutSnip): readonly Point[] {
  const k = folds.join('') + '#' + snip.corner + '#' + key(snip.size);
  return [...cutCellCache.memo(k, () => {
    const seen = new Map<string, Point>();
    for (const q of unfoldPoints(folds, ONE, cutRegionPoints(folds, ONE, snip))) {
      const c = cellOf(q, RASTER_GRID);
      const ck = c.col + ':' + c.row;
      if (!seen.has(ck)) seen.set(ck, cellPoint(c.col, c.row));
    }
    return [...seen.values()].sort((a, b) => cmp(a.y, b.y) || cmp(a.x, b.x));
  })];
}

/** Một ứng viên nhát cắt §7.5: nhát + vùng phủ raster + khoá bitmap để phát hiện va chạm cỡ. */
export type CutCandidate = { readonly snip: CutSnip; readonly cells: Point[]; readonly bitmap: string };

const bitmapOfCells = (cells: readonly Point[]): string => cells.map(cellKey).join(';');

/**
 * Mọi nhát cắt DÙNG ĐƯỢC của một chuỗi nếp — export cho QA/test để chứng minh cổng
 * "hai cỡ ra cùng một ảnh là đề hỏng" mà không phải đoán qua đề đã sinh.
 * Hai cỡ khác nhau mà cho CÙNG bitmap ở cùng một góc ⇒ người chơi không thể phân biệt
 * cỡ nào là cỡ nào: đó là ĐỀ HỎNG, loại khỏi pool (không trả đề, không "chấp nhận tạm").
 * Không còn ứng viên nào ⇒ levelSpec NÉM.
 * E6/A10: trả BẢN SAO (mảng + từng phần tử) — caller push/sort không ăn mòn memo bên trong.
 */
export function cutCandidates(folds: FoldKind[]): CutCandidate[] {
  const pool = cutPoolCache.memo(folds.join(''), () => {
    const packet = makeLayers(folds, ONE);
    const edge = minOf(packet.w, packet.h);
    const built: CutCandidate[] = [];
    for (const corner of CUT_CORNERS) {
      const made: CutCandidate[] = [];
      for (const frac of CUT_SIZES) {
        const leg = mul(edge, frac);
        if (cmp(leg, CUT_MIN_LEG) < 0) continue;
        const cells = cutCells(folds, { corner, size: leg });
        made.push({ snip: { corner, size: leg }, cells: [...cells], bitmap: bitmapOfCells(cells) });
      }
      const seen = new Map<string, number>();
      for (const c of made) seen.set(c.bitmap, (seen.get(c.bitmap) ?? 0) + 1);
      built.push(...made.filter((c) => (seen.get(c.bitmap) ?? 0) === 1));
    }
    return built;
  });
  return pool.map((c) => ({ snip: c.snip, cells: [...c.cells], bitmap: c.bitmap }));
}

/**
 * Lịch ra mắt luật CẮT trong chương (DỮ LIỆU — SPEC §6.1): màn `teachAt` đánh dấu luật mới,
 * các màn sau xen kẽ với xác suất 1/`seedOdds` theo seed. `period` = độ dài nhịp lặp.
 */
const CUT_CADENCE = { period: 3, teachAt: 2, seedOdds: 3 } as const;

/** Đề này có dùng nhát cắt §7.5 không (luật chương + nhịp dạy luật + xen kẽ theo seed). */
export const cutPlanFor = (cfg: ChapterLevelConfig, rng: Rng): boolean =>
  cfg.useCut && (cfg.levelInChapter % CUT_CADENCE.period === CUT_CADENCE.teachAt || rng.int(CUT_CADENCE.seedOdds) === 0);

/** Hợp nhất vùng phủ của nhiều nhát cắt (một ô chỉ tính một lần). */
function mergeCells(groups: readonly (readonly Point[])[]): Point[] {
  const seen = new Map<string, Point>();
  for (const g of groups) for (const q of g) seen.set(cellKey(q), q);
  return [...seen.values()].sort((a, b) => cmp(a.y, b.y) || cmp(a.x, b.x));
}

/** Chọn nhát cắt của một đề: 1 nhát, hoặc 2 ở 2 góc khác nhau khi chương cho phép. */
export function cornerCut(
  folds: FoldKind[],
  rng: Rng,
  limit: number,
): { action: CutAction; holes: Point[]; leg: Rat } {
  const pool = cutCandidates(folds);
  if (pool.length === 0) {
    throw new Error('cornerCut: chain ' + folds.join('') + ' không còn nhát cắt §7.5 nào phân biệt được trên lưới ' +
      RASTER_GRID + '×' + RASTER_GRID + ' (cỡ dưới 1/' + RASTER_GRID + ' ô, hoặc mọi cặp cỡ đều ra cùng một ảnh) — không trả đề hỏng');
  }
  const first = rotate(pool, rng.int(pool.length))[0];
  const others = pool.filter((c) => c.snip.corner !== first.snip.corner);
  const second = limit >= CUT_MAX_SNIPS && others.length > 0 ? rotate(others, rng.int(others.length))[0] : undefined;
  const snips: CutSnip[] = second ? [first.snip, second.snip] : [first.snip];
  const holes = mergeCells(snips.map((s) => cutCells(folds, s)));
  return {
    action: { kind: 'cut', corner: first.snip.corner, size: first.snip.size, extra: second?.snip },
    holes,
    leg: snips.reduce((m, s) => maxOf(m, s.size), snips[0].size),
  };
}

/** Tám ô kề của một ô raster (4 cạnh + 4 chéo) — định nghĩa "cùng một vệt tổn thương". */
const NEIGHBOURS: readonly [number, number][] = [
  [-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1],
];

/** Gom các ô của một phương án thành CỤM 8-lân-cận (§7.5: oracle đếm cụm, không đếm điểm). */
export function cellClusters(pts: readonly Point[]): Point[][] {
  const byCell = new Map<string, Point>();
  for (const q of pts) byCell.set(cellKey(q), q);
  const left = new Set(byCell.keys());
  const out: Point[][] = [];
  for (const seed of [...left]) {
    if (!left.has(seed)) continue;
    left.delete(seed);
    const group: Point[] = [];
    const queue = [seed];
    while (queue.length > 0) {
      const at = queue.pop() ?? '';
      const q = byCell.get(at);
      if (!q) continue;
      group.push(q);
      const { col, row } = cellOf(q, RASTER_GRID);
      for (const [dc, dr] of NEIGHBOURS) {
        const nk = (col + dc) + ':' + (row + dr);
        if (!left.has(nk)) continue;
        left.delete(nk);
        queue.push(nk);
      }
    }
    out.push(group);
  }
  return out;
}
