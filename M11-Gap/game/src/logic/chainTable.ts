// Pattern: Table-driven selection (bảng chuỗi nếp + dải input hợp lệ)
// TRÁCH NHIỆM: trả lời hai câu hỏi trước khi sinh đề — (1) cfg này CÓ ĐƯỢC PHÉP không
//   (BOUNDS + requireCfg, chặn input bẩn ngay ở cửa vào, thông điệp nêu tên field),
//   (2) với cfg đã hợp lệ thì GẤP THEO CHUỖI NÀO (cfg.folds khai ⇒ dùng nguyên chuỗi;
//   không khai ⇒ xoay bảng CHAIN_ROWS theo seed, lọc theo foldCount/useDiagonal/punchCount).
// VÌ SAO HAI CHUYỆN Ở CÙNG MỘT FILE: trần foldCount DẪN XUẤT từ độ dài chuỗi dài nhất
//   trong bảng (MAX_CHAIN_LEN) — tách ra là khai hai nơi cái cùng một sự thật (E2/A9).
// CẤM if/else ≥3 nhánh: mọi lựa chọn đi qua bảng tra CHAIN_ROWS / BOUNDS / KIND_OF.
import { FOLD_KIND_ALL, firstFoldDefect } from './foldRules';
import { punchCapacity } from './punchPoints';
import { rotate } from './rng';
import type { Rng } from './rng';
import { key } from './rational';
import type { SheetSize } from './foldGeometry';
import type { ChapterLevelConfig, FoldKind } from './types';

// ---------------------------------------------------------------------------
// 1) Bảng chuỗi nếp. Thêm kiểu gấp / thêm chuỗi = THÊM 1 DÒNG, không sửa hàm.
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

/** Chuỗi suy ra từ bảng phải GẤP ĐƯỢC: độ dài tối đa của bảng = trần foldCount. */
export const MAX_CHAIN_LEN = CHAIN_ROWS.reduce((m, r) => Math.max(m, r.folds.length), 0);

/**
 * Nhịp dạy luật chéo D theo màn TRONG chương (DỮ LIỆU — SPEC §6.1: D ra mắt ở màn 3, tức
 * levelInChapter chia hết cho nhịp).
 */
const DIAGONAL_TEACH = { period: 3, at: 0 } as const;

// ---------------------------------------------------------------------------
// 2) Dải input hợp lệ của levelSpec — DỮ LIỆU (review F-2: levelSpec từng nuốt levelIndex
//    NaN/0/-7/1e6/1.5 và punchCount 0/-5/99 rồi sinh đề rác).
//    · levelIndex: màn chiến dịch thật là 1..120 (DATA-MODEL §3.1); trần 10000 là dải của
//      ca đếm máy TC-GEN-05 — trên mức đó là input bẩn, không phải đề thử.
//    · punchCount: ≥1; trần 8 = số lớp tối đa của dải foldCount 1..3 (mỗi điểm đục phải mở
//      ra ≥1 vị trí lỗ mới trong trần 2^số nếp). Vượt trần chuỗi ⇒ punchPoints NÉM.
//    · foldCount: trần = MAX_CHAIN_LEN. Không guard thì cfg.foldCount=12 + cfg.folds 12 nếp
//      ⇒ 2^12 = 4096 lớp, một đề mất 1,4 GIÂY và trả đề SAI (đo: 8/10/12 nếp → 183/291/1435
//      ms). Chặn ở cửa vào tốn ~0ms.
// ---------------------------------------------------------------------------
type GuardName = 'levelIndex' | 'punchCount' | 'foldCount';
type Bound = { readonly min: number; readonly max: number; readonly source?: string };

const BOUNDS: Readonly<Record<GuardName, Bound>> = {
  levelIndex: { min: 1, max: 10000 },
  punchCount: { min: 1, max: 8 },
  foldCount: { min: 1, max: MAX_CHAIN_LEN, source: 'CHAIN_ROWS' },
};

export function requireBound(name: GuardName, v: number): void {
  const b = BOUNDS[name];
  const where = b.source ? ' (xem ' + b.source + ')' : '';
  if (!Number.isInteger(v) || v < b.min || v > b.max) {
    throw new Error('levelSpec: ' + name + '=' + v + ' phải là số nguyên trong dải ' + b.min + '..' + b.max + where);
  }
}

/** Field BẮT BUỘC của cfg (D4) — 'optional' chỉ để nêu rõ được phép thiếu. */
type CfgKind = 'number' | 'boolean' | 'chain' | 'chain?';
const CFG_FIELDS: readonly [keyof ChapterLevelConfig, CfgKind][] = [
  ['chapter', 'number'],
  ['levelInChapter', 'number'],
  ['foldCount', 'number'],
  ['punchCount', 'number'],
  ['useCut', 'boolean'],
  ['useDiagonal', 'boolean'],
  ['timerOn', 'boolean'],
  ['folds', 'chain?'],
];
const KIND_OF: Readonly<Record<CfgKind, (v: unknown) => boolean>> = {
  number: (v) => typeof v === 'number',
  boolean: (v) => typeof v === 'boolean',
  chain: (v) => Array.isArray(v),
  'chain?': (v) => v === undefined || Array.isArray(v),
};

/**
 * D4 (review F2): `cfg` là input từ tầng QA/manifest — thiếu/null phải bị kết luận ở CỬA VÀO
 * với thông điệp nêu tên field, không để TypeError trần ("Cannot read properties of undefined
 * (reading 'punchCount')") lọt lên HUD.
 */
export function requireCfg(cfg: ChapterLevelConfig): void {
  if (typeof cfg !== 'object' || cfg === null) {
    throw new Error('levelSpec: cfg phải là object ChapterLevelConfig, thấy ' + String(cfg) +
      ' — bắt buộc ' + CFG_FIELDS.filter(([, k]) => k !== 'chain?').map(([n]) => n).join(','));
  }
  const box = cfg as Partial<ChapterLevelConfig>;
  const bad = CFG_FIELDS.filter(([name, kind]) =>
    box[name] === undefined ? kind !== 'chain?' : !KIND_OF[kind](box[name]))
    .map(([name, kind]) => name + '(' + kind + ', thấy ' + (box[name] === undefined ? 'thiếu' : typeof box[name]) + ')');
  if (bad.length > 0) {
    throw new Error('levelSpec: cfg không hợp lệ [' + bad.join(', ') + '] — ChapterLevelConfig cần ' +
      CFG_FIELDS.map(([n, k]) => n + (k === 'chain?' ? '?' : '')).join(','));
  }
}

// ---------------------------------------------------------------------------
// 3) Chọn chuỗi nếp.
// ---------------------------------------------------------------------------
/** Hàng hợp lệ của CHAIN_ROWS cho cfg: đúng foldCount, D chỉ khi useDiagonal. */
function legalPool(cfg: ChapterLevelConfig): readonly ChainRow[] {
  return CHAIN_ROWS.filter((r) => r.folds.length === cfg.foldCount && (!r.diagonal || cfg.useDiagonal));
}
/** Trong pool hợp lệ, chỉ giữ chuỗi còn đủ chỗ cho punchCount (punchCapacity ở punchPoints). */
function fittingPool(cfg: ChapterLevelConfig): readonly ChainRow[] {
  return legalPool(cfg).filter((r) => punchCapacity(r.folds) >= cfg.punchCount);
}
/** Lý do một foldCount bị từ chối: bảng thiếu hàng, hoặc mọi hàng đều chật hơn punchCount. */
function chainRejection(cfg: ChapterLevelConfig): string {
  const legal = legalPool(cfg);
  if (legal.length === 0) return 'chainFor: foldCount=' + cfg.foldCount + ' không có trong bảng (xem CHAIN_ROWS)'; // i18n-ignore: chẩn đoán QA
  const widest = legal.reduce((m, r) => Math.max(m, punchCapacity(r.folds)), 0);
  return 'chainFor: foldCount=' + cfg.foldCount + ' punchCount=' + cfg.punchCount +
    ' vượt trần hình học của mọi chuỗi hợp lệ (chứa tối đa ' + widest + ' điểm đục) — tăng foldCount hoặc hạ holes_max'; // i18n-ignore: chẩn đoán QA
}

/** Bản sao ĐÔNG CỨNG: mảng trong CHAIN_ROWS không bao giờ lọt ra ngoài (review F-4). */
function frozenCopy(ks: readonly FoldKind[]): FoldKind[] {
  const copy: FoldKind[] = [...ks];
  Object.freeze(copy);
  return copy;
}

/**
 * cfg khai `folds` ⇒ dùng ĐÚNG chuỗi đó (review F-1: trước đây chỉ giữ folds.length, chuỗi
 * bị vứt). Chuỗi không khớp foldCount / chứa kiểu lạ / có D mà useDiagonal=false ⇒ NÉM.
 */
function declaredChain(cfg: ChapterLevelConfig, declared: readonly FoldKind[]): FoldKind[] {
  const unknown = declared.filter((k) => !FOLD_KIND_ALL.includes(k));
  if (unknown.length > 0) {
    throw new Error('chainFor: cfg.folds chứa kiểu lạ [' + unknown.join(',') + '] — chỉ có ' + FOLD_KIND_ALL.join(','));
  }
  if (declared.length !== cfg.foldCount) {
    throw new Error('chainFor: cfg.folds "' + declared.join('') + '" dài ' + declared.length + ' ≠ foldCount=' + cfg.foldCount);
  }
  if (declared.includes('D') && !cfg.useDiagonal) {
    throw new Error('chainFor: cfg.folds "' + declared.join('') + '" có nếp chéo D nhưng useDiagonal=false');
  }
  return frozenCopy(declared);
}

/**
 * D1: nếp chéo CHỈ gấp được lúc packet còn VUÔNG. Chuỗi sai ⇒ NÉM ngay (kèm vị trí + lý do),
 * tuyệt đối không trả đề — ảnh mở bung của chuỗi sai nhảy ra ngoài tờ giấy [0,1]².
 */
function requireFoldable(source: string, folds: readonly FoldKind[]): void {
  const bad = firstFoldDefect(folds);
  if (!bad) return;
  const packet: SheetSize = bad.packet;
  throw new Error('chainFor: ' + source + ' "' + folds.join('') + '" không gấp được — nếp ' + bad.kind +
    ' ở vị trí ' + (bad.at + 1) + ' cần packet VUÔNG, lúc đó packet ' + key(packet.w) + '×' + key(packet.h) +
    ' (đổi D lên đầu chuỗi hoặc bỏ nếp H/V lẻ trước nó)');
}

/** Chuỗi suy từ bảng CHAIN_ROWS (không khai `folds`): tôn trọng foldCount/useDiagonal/punchCount. */
function tableChain(cfg: ChapterLevelConfig, rng: Rng): FoldKind[] {
  const legal = fittingPool(cfg);
  const teachesD = cfg.useDiagonal && cfg.levelInChapter % DIAGONAL_TEACH.period === DIAGONAL_TEACH.at;
  const wanted = teachesD ? legal.filter((r) => r.diagonal) : legal;
  const pool = wanted.length > 0 ? wanted : legal;
  // F-1: bảng KHÔNG có hàng cho foldCount này ⇒ NÉM rõ ràng. Trước đây `?? CHAIN_ROWS[0]`
  // nuốt âm thầm foldCount 4/5 xuống 1 nếp 'H' — đề sai mà không ai biết.
  if (pool.length === 0) throw new Error(chainRejection(cfg));
  const row = rotate(pool, rng.int(pool.length))[0];
  if (row === undefined) throw new Error(chainRejection(cfg));
  return frozenCopy(row.folds);
}

/**
 * Chuỗi nếp của một màn: cfg.folds được TRAO NGUYÊN (khai gì dùng nấy), không khai thì suy
 * từ bảng. Mọi chuỗi trả ra đều đông cứng và đã qua luật "gấp được" (D1).
 */
export function chainFor(cfg: ChapterLevelConfig, rng: Rng): FoldKind[] {
  const folds = cfg.folds !== undefined ? declaredChain(cfg, cfg.folds) : tableChain(cfg, rng);
  requireFoldable(cfg.folds !== undefined ? 'cfg.folds' : 'CHAIN_ROWS', folds);
  return folds;
}
