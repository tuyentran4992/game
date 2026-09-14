// Pattern: Registry — HÌNH DẠNG blob save là DỮ LIỆU (PC-16).
// TRÁCH NHIỆM: không gian khoá, vật KV, kiểm thô ở biên và MỘT bảng FIELDS duy nhất (default +
//   valid + tidy); kiểu `Save`, `defaultSave()`, `FIELD_NAMES` (thứ tự serialize) đều DẪN XUẤT từ
//   bảng đó ⇒ thêm field = THÊM ĐÚNG MỘT DÒNG. Nâng cấp version: saveMigrate.ts. Ghi + cứu hộ: save.ts.
// RÀNG BUỘC: 0 đồng hồ, 0 random; trần tài nguyên đọc từ CAPS (cache.ts), thang sao từ
//   STAR_SCALE (progression.ts) — không khai lại ở đây.

import { CAMPAIGN_LEVELS, isStarText, STAR_SCALE } from './progression';
import { CAPS } from './cache';
import type { AlbumItem, Badge } from './economy';

/** Phiên bản blob hiện tại = bậc cuối của chuỗi MIGRATIONS. */
export const SAVE_VERSION = 1;

/** Ba khoá của tiến trình + một khoá hồ sơ: save.ts là CHỦ DUY NHẤT của không gian khoá
 *  storage (A2: records.ts phải lấy về đây, không tự đặt khoá riêng). Đường ghi/đọc của
 *  `records` nằm ở recordsStore.ts (writeRecords/readRecords qua STORAGE_KEY) — mỗi khoá ở
 *  đây đều có ÍT NHẤT một hộ dùng ngoài file này, test ở records-store.test.ts chốt. */
export const SAVE_KEYS = {
  main: 'm11.save', backup: 'm11.save.good', wardrobe: 'm11.wardrobe',
  records: 'm11.paper.crease.records.v1',
} as const;

/** Vật kiểu localStorage, truyền vào dưới dạng tham số (logic không tự tìm nền tảng). */
export type KV = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  /** Có CALL SITE thật: loadSave dọn blob rác sau khi cứu hộ xong (A6: không có cổng chết). */
  removeItem: (key: string) => void;
};

// ------------------------------------------------------------- kiểm dữ liệu ---

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
export const isStr = (v: unknown): v is string => typeof v === 'string';
const isBool = (v: unknown): v is boolean => typeof v === 'boolean';
export const isPlain = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
export const listOf = (pred: (v: unknown) => boolean) => (v: unknown): boolean => Array.isArray(v) && v.every(pred);
const inRange = (v: unknown, lo: number, hi: number): boolean => isInt(v) && v >= lo && v <= hi;
const isAlbumItem = (v: unknown): boolean => isPlain(v) && isStr(v.id) && isStr(v.title);
const isBadge = (v: unknown): boolean => isPlain(v) && isStr(v.id) && isInt(v.level);
const isStars = (v: unknown): boolean => isStr(v) && isStarText(v);
const isDate = (v: unknown): boolean => isStr(v) && DATE_RE.test(v);
const clip = (max: number) => <T>(list: readonly T[]): T[] => list.slice(0, max);
const copyOf = <T>(v: unknown): T[] => [...(v as T[])];

/** JSON rác ⇒ null, KHÔNG ném (ERR-01) — dùng cho cả blob save lẫn wardrobe ngoài đời. */
export const safeJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

/**
 * BẢNG FIELD DUY NHẤT của blob. `def` vừa là giá trị default vừa KHAI KIỂU cho `Save`;
 * `valid` kiểm thô ở biên; `tidy` CHỈ có ở field cần cắt/dedupe (không có hàm identity).
 * Thêm một field mới = THÊM ĐÚNG MỘT DÒNG ở đây (+ một dòng MIGRATIONS nếu nó sinh ra ở
 * version sau) — không phải sửa type Save, không phải sửa defaultSave, không phải sửa serialize.
 */
export type FieldSpec<T> = {
  readonly def: T;
  readonly valid: (v: unknown) => boolean;
  readonly tidy?: (v: unknown) => unknown;
};

const GHOST_SLOTS = CAMPAIGN_LEVELS * CAPS.ghostsPerLevel;

export const FIELDS = {
  version: { def: SAVE_VERSION as number, valid: isInt },
  level: { def: 1, valid: (v: unknown) => inRange(v, 1, CAMPAIGN_LEVELS) },
  stars: { def: STAR_SCALE.blank.repeat(STAR_SCALE.slots), valid: isStars },
  ink: { def: 0, valid: (v: unknown) => inRange(v, 0, Number.MAX_SAFE_INTEGER) },
  skins_owned: { def: [CAPS.starterSkin] as string[], valid: listOf(isStr), tidy: (v: unknown) => [...new Set(copyOf<string>(v))] },
  album_items: { def: [] as AlbumItem[], valid: listOf(isAlbumItem), tidy: (v: unknown) => clip(CAPS.albumItems)(v as AlbumItem[]).map((a) => ({ id: a.id, title: a.title })) },
  badges: { def: [] as Badge[], valid: listOf(isBadge), tidy: (v: unknown) => clip(CAPS.badges)(v as Badge[]).map((b) => ({ id: b.id, level: b.level })) },
  sound_on: { def: true, valid: isBool },
  rev: { def: 0, valid: (v: unknown) => inRange(v, 0, Number.MAX_SAFE_INTEGER) },
  ghosts: { def: [] as string[], valid: listOf(isStr), tidy: (v: unknown) => clip(GHOST_SLOTS)(copyOf<string>(v)) },
  walls: {
    def: [] as number[][],
    valid: listOf((v) => listOf(isInt)(v)),
    tidy: (v: unknown) => clip(GHOST_SLOTS)(v as number[][]).map((r) => clip(CAPS.wallRowsPerLevel)(r)),
  },
  dates: { def: [] as string[], valid: listOf(isDate), tidy: (v: unknown) => clip(CAPS.days)(copyOf<string>(v)) },
} satisfies Record<string, FieldSpec<unknown>>;

/** Kiểu blob SUY RA từ bảng FIELDS ⇒ không còn bản khai thứ hai để lệch. */
export type Save = { [K in keyof typeof FIELDS]: (typeof FIELDS)[K]['def'] };
export type FieldName = keyof Save;

/** Thứ tự khoá cố định (thứ tự khai) ⇒ serialize tất định, so được từng byte. */
export const FIELD_NAMES = Object.keys(FIELDS) as FieldName[];

export const cloneDef = (v: unknown): unknown => (Array.isArray(v) ? [...v] : v);

/** Bản ghi lành từ đầu: dựng thẳng từ cột `def` của FIELDS — không có bản khai thứ hai. */
export function defaultSave(): Save {
  const out: Record<string, unknown> = {};
  for (const name of FIELD_NAMES) out[name] = cloneDef(FIELDS[name].def);
  return out as Save;
}

/** Thứ tự khoá lấy theo thứ tự khai trong FIELDS ⇒ serialize tất định, so được từng byte. */
export function serializeSave(save: Save): string {
  const ordered: Record<string, unknown> = {};
  for (const name of FIELD_NAMES) ordered[name] = save[name];
  return JSON.stringify(ordered);
}
