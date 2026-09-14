// Pattern: Memento (codec) — bo tri luu tru do save.ts so huu (SAVE_KEYS + field cua Save).
// TRÁCH NHIỆM: hồ sơ kỷ lục (P2-01 ghost, P2-02 streak, P2-03 wall top-5, PC-16 blob) —
//   codec chuỗi nén bảng sao, cộng/trừ từng bản ghi, encode payload để save cất.
// RÀNG BUỘC: hàm THUẦN, không đồng hồ, không random (PC-02). Input bẩn ở CHUỖI LƯU ⇒ trả
//   kết quả có kiểu {ok:false, errors}; input sai ở tham số lập trình ⇒ NÉM. Streak là của
//   PHIÊN nên KHÔNG có chỗ trong blob (P2-02); blob chỉ mang whitelist field (TC-GEN-03).

import { isStarDigit, isStarText, STAR_SCALE } from './progression';
import { CAPS } from './cache';
import { SAVE_KEYS } from './save';

/** Trần của hồ sơ: wall lấy từ CAPS (cùng nguồn với save + config/album.json), ô sao lấy
 *  từ STAR_SCALE — records không còn tự khai trần riêng (A8). */
const LIMITS = { wallRows: CAPS.wallRowsPerLevel, slots: STAR_SCALE.slots } as const;

/** Khoá blob: NỘP VÈ registry khoá của save.ts (A2: records không tự sở hữu blob riêng;
 *  bản ghi chỉ là MỘT TẬP CON field của schema đã lưu — test chốt ⊆ field của Save).
 *  Đường ghi/đọc THẬT của khoá này là writeRecords/readRecords ở recordsStore.ts (C10);
 *  encodeRecords/decodeRecords là codec mà mặt tiền đó gọi — không ai setItem thẳng. */
export const STORAGE_KEY = SAVE_KEYS.records;

/** Một hàng xếp hạng: màn nào, bao lâu, sai mấy lần. KHÔNG chứa gì về đề bài. */
export type RankRow = { levelIndex: number; ms: number; wrongTaps: number };

/** Kết quả một lượt chơi mà hồ sơ cần biết (bản ghi đầu vào có thể mang field khác). */
export type AttemptLike = {
  readonly levelIndex: number;
  readonly ms: number;
  readonly wrongTaps: number;
  readonly cleared: boolean;
};

/** Input blob: chỉ ba thứ được phép xuống disk. */
export type RecordsInput = {
  stars: string;
  ghosts: readonly unknown[];
  walls?: readonly unknown[];
};

const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isPlain = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Xếp hạng: theo màn trước, rồi ms tăng dần, rồi wrongTaps tăng dần (P2-03). */
const rankOrder = (a: RankRow, b: RankRow): number =>
  a.levelIndex - b.levelIndex || a.ms - b.ms || a.wrongTaps - b.wrongTaps;

/** `a` hay hơn `b` trong cùng một màn ⇒ đè được bản ghi của b. */
const beats = (a: RankRow, b: RankRow): boolean =>
  a.ms < b.ms || (a.ms === b.ms && a.wrongTaps < b.wrongTaps);

const rowOf = (attempt: AttemptLike): RankRow => ({
  levelIndex: attempt.levelIndex,
  ms: attempt.ms,
  wrongTaps: attempt.wrongTaps,
});

const copyRows = (rows: readonly RankRow[]): RankRow[] => rows.map((r) => ({ ...r }));

// -------------------------------------------------------------- codec sao ---
/** Thang chu so lay tu STAR_SCALE (progression) — records khong tu viet lai regex nao (A9). */

/** 120 ô sao ⇒ chuỗi nén 120 ký tự '0'..'3'. Ô ngoài khoảng = lỗi lập trình ⇒ ném. */
export function starsEncode(cells: readonly number[]): string {
  return cells
    .map((cell) => {
      if (!isInt(cell) || !isStarDigit(String(cell))) {
        throw new Error('o sao phai 0..' + STAR_SCALE.max + ', nhan ' + cell);
      }
      return String(cell);
    })
    .join('');
}

export type StarsDecode = { ok: boolean; cells: number[] | null; errors: string[] };

/** Giải mã chuỗi đã lưu: mọi lỗi là KẾT QUẢ CÓ KIỂU (ERR-01), không ném, nêu rõ độ dài/chữ số. */
export function starsDecode(text: string): StarsDecode {
  if (!isStr(text)) return { ok: false, cells: null, errors: ['stars: phai la chuoi'] };
  if (isStarText(text)) {
    return { ok: true, cells: text.split('').map((ch) => Number(ch)), errors: [] };
  }
  const errors: string[] = [];
  if (text.length !== LIMITS.slots) {
    errors.push('stars do dai ' + text.length + ' khac ' + LIMITS.slots + ' o');
  }
  for (let i = 0; i < text.length; i += 1) {
    if (!isStarDigit(text[i])) errors.push('ky tu ' + text[i] + ' o vi tri ' + i);
  }
  return { ok: false, cells: null, errors };
}

// ------------------------------------------------- ghost + wall (P2-01/03) ---

/**
 * Ghost = kỷ lục RIÊNG từng màn, chỉ ghi khi màn ĐÃ clear và chỉ khi phá được bản tốt hơn
 * (nhanh hơn, hoặc cùng thời gian mà sai ít hơn). Mảng đầu vào không bị sửa.
 */
export function ghostInsert(ghosts: readonly RankRow[], attempt: AttemptLike): RankRow[] {
  if (!attempt.cleared) return copyRows(ghosts);
  const row = rowOf(attempt);
  const next = copyRows(ghosts);
  const at = next.findIndex((g) => g.levelIndex === row.levelIndex);
  if (at < 0) next.push(row);
  else if (beats(row, next[at])) next[at] = row;
  return next.sort(rankOrder);
}

/** Wall = top-5 của TỪNG màn; bảng của màn khác không lấn nhau, thứ tự là hạng. */
export function wallInsert(wall: readonly RankRow[], attempt: AttemptLike): RankRow[] {
  if (!attempt.cleared) return copyRows(wall);
  const merged = [...copyRows(wall), rowOf(attempt)].sort(rankOrder);
  const seen = new Map<number, number>();
  return merged.filter((row) => {
    const rank = (seen.get(row.levelIndex) ?? 0) + 1;
    seen.set(row.levelIndex, rank);
    return rank <= LIMITS.wallRows;
  });
}

// ------------------------------------------------------------ streak (P2-02) ---

/** Streak là của PHIÊN: thắng +1, sai về 0. Không đọc/ghi storage, không đồng hồ. */
export function streakNext(streak: number, cleared: boolean): number {
  return cleared ? Math.max(0, streak) + 1 : 0;
}

// -------------------------------------------------------------- blob PC-16 ---

/** whitelist field: chỉ lấy ba số; phần tử thiếu số ⇒ bỏ (chặn rò rỉ đề bài TC-GEN-03). */
function toRow(value: unknown): RankRow | null {
  if (!isPlain(value)) return null;
  const levelIndex = value.levelIndex;
  const ms = value.ms;
  const wrongTaps = value.wrongTaps;
  if (!isNum(levelIndex) || !isNum(ms) || !isNum(wrongTaps)) return null;
  return { levelIndex, ms, wrongTaps };
}

const toRows = (list: readonly unknown[]): RankRow[] =>
  list.map(toRow).filter((r): r is RankRow => r !== null);

const zeroStars = (): string => STAR_SCALE.blank.repeat(LIMITS.slots);

/** Encode blob để lưu: chỉ stars/ghosts/walls, không field nào của LevelSpec lọt xuống. */
export function encodeRecords(input: RecordsInput): string {
  const stars = starsDecode(input.stars).ok ? input.stars : zeroStars();
  return JSON.stringify({
    stars,
    ghosts: toRows(input.ghosts),
    walls: toRows(input.walls ?? []),
  });
}

export type RecordsDecode = { ok: boolean; stars: string; ghosts: RankRow[]; walls: RankRow[] };

/** Đọc blob trở lại; chuỗi rác ⇒ bản trắng CÓ KIỂU, không ném. */
export function decodeRecords(text: string): RecordsDecode {
  try {
    return fromBlob(text);
  } catch {
    return { ok: false, stars: zeroStars(), ghosts: [], walls: [] };
  }
}

function fromBlob(text: string): RecordsDecode {
  const raw: unknown = isStr(text) ? JSON.parse(text) : null;
  if (!isPlain(raw)) return { ok: false, stars: zeroStars(), ghosts: [], walls: [] };
  const decoded = starsDecode(isStr(raw.stars) ? raw.stars : '');
  return {
    ok: decoded.ok,
    stars: decoded.ok ? starsEncode(decoded.cells ?? []) : zeroStars(),
    ghosts: Array.isArray(raw.ghosts) ? toRows(raw.ghosts) : [],
    walls: Array.isArray(raw.walls) ? toRows(raw.walls) : [],
  };
}
