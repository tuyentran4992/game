// Pattern: Registry
// TRÁCH NHIỆM: PC-19 — từ điển copy EN (đúng 9 khoá nộp + explain.* của levelState), suy
//   placeholder {name}, và kiểm phủ khoá (thiếu / mồ côi). Copy hiển thị CHỈ sống ở đây.
// RÀNG BUỘC: mọi hàm nhận dict qua THAM SỐ nên có thể thay từ điển khác mà không sửa logic;
//   key thiếu ⇒ FALLBACK CÓ CHỦ ĐÍCH là chính key + cờ missing, không ném (TC-I18-04).

import type { ExplainKey } from './levelState';

/** Thay thế placeholder; giá trị là số hay chuỗi đều được (UI hay truyền số). */
export type Vars = Record<string, string | number>;
export type Dict = Record<string, string>;
export type Lookup = { text: string; missing: boolean };
export type KeyAudit = { ok: boolean; errors: string[]; missing: string[]; orphaned: string[] };

/** Copy nộp PC-19 (nút + nhãn). Giữ ≤ 8 từ, không chứa tên cũ của trò chơi. */
const UI_COPY: Dict = {
  'app.title': 'Paper Crease',
  'hud.continue': 'Continue — Level {n}',
  'hud.hint': 'Hint',
  'hud.undo': 'Undo',
  'hud.retry': 'Retry',
  'hud.next': 'Next',
};

/**
 * Copy của VÒNG TIẾN TRÌNH (B3b: map/score/shop/album/end + modal Settings). Vẫn là DỮ LIỆU từ
 * điển — scene chỉ tra key qua t() (PC-19), không được viết chuỗi hiển thị trong scene.
 * Thêm màn mới = thêm một dòng ở đây, không sửa scene.
 */
const PROGRESS_COPY: Dict = {
  'map.title': 'Chapter Map',
  'map.chapter': 'Chapter {n}',
  'map.gate': 'Locked — need {need}/{total} ★',
  'map.play': 'Play level {n}',
  'map.settings': 'Settings',
  'map.sound': 'Sound',
  'map.mute': 'Mute',
  'map.reset': 'Reset progress',
  'map.confirm': 'Tap again to erase progress',
  'map.close': 'Close',
  'score.title': 'Chapter complete',
  'score.stars': '{n} ★',
  'score.next': 'Next chapter',
  'score.map': 'View map',
  'shop.title': 'Ink Shop',
  'shop.price': '{n} ink',
  'shop.buy': 'Buy',
  'shop.use': 'Use',
  'shop.owned': 'Owned',
  'shop.equipped': 'In use',
  'shop.locked': 'Locked',
  'album.title': 'Fold Album',
  'album.badges': 'Badges',
  'end.title': 'You unfolded all 120',
  'end.total': 'Total {n}/{all} ★',
  'end.master': 'Master round',
  'end.map': 'View map',
  'end.menu': 'Title',
  'back.title': 'Back',
};

/** Bảng giải thích một thao tác sai — id lấy thẳng từ union ExplainKey của levelState. */
const EXPLAIN_COPY: Record<ExplainKey, string> = {
  'fold-axis-swapped': 'A cross fold swaps both axes',
  'fold-layer-count': 'Each fold doubles the layers',
  'punch-on-crease': 'A punch on a crease opens twice',
  'cut-corner-shape': 'One snip shapes all four corners',
};

const prefixed = (scope: string, table: Dict): Dict =>
  Object.fromEntries(Object.entries(table).map(([id, copy]) => [scope + id, copy]));

/** Khoá locale mà lõi nộp bản; thêm ngôn ngữ = thêm một khoá + một dòng DICTIONARIES. */
export type Locale = 'en';
/** Locale dùng khi caller không chọn (không có suy ra từ nền tảng ở lõi — tầng UI truyền vào). */
export const DEFAULT_LOCALE: Locale = 'en';

/**
 * REGISTRY locale → từ điển (A3: trước đây chỉ có `dictEn` treo lơ lửng, không có bảng nào để
 * thêm ngôn ngữ). `t`/`lookup` KHÔNG biết tên locale nào ⇒ thêm dictVi = THÊM MỘT DÒNG ở đây.
 */
export const DICTIONARIES: Record<Locale, Dict> = {
  en: { ...UI_COPY, ...PROGRESS_COPY, ...prefixed('explain.', EXPLAIN_COPY) },
};

/** Từ điển EN của bản nộp — giữ nguyên tên cũ cho caller đã dùng. */
export const dictEn: Dict = DICTIONARIES[DEFAULT_LOCALE];

/** Tra từ điển theo locale; locale lạ ⇒ về DEFAULT_LOCALE (fallback có chủ đích, không ném). */
export function dictOf(locale: string): Dict {
  return DICTIONARIES[locale as Locale] ?? DICTIONARIES[DEFAULT_LOCALE];
}

/** Danh sách locale đã có từ điển — để UI dựng bộ chọn ngôn ngữ từ DỮ LIỆU. */
export const locales = (): Locale[] => Object.keys(DICTIONARIES) as Locale[];

const PLACEHOLDER = /\{([a-zA-Z][a-zA-Z0-9]*)\}/g;

const hasKey = (box: object, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(box, key);

/** Thay {name} bằng biến đã cho; biến thiếu ⇒ GIỮ NGUYÊN "{name}" (không xoá mất chữ). */
function fill(text: string, vars: Vars): string {
  return text.replace(PLACEHOLDER, (whole: string, name: string) =>
    hasKey(vars, name) ? String(vars[name]) : whole);
}

/** Tra key: thấy ⇒ thế placeholder; không thấy ⇒ text là CHÍNH key, missing=true. */
export function lookup(key: string, dict: Dict, vars?: Vars): Lookup {
  const raw = dict[key];
  if (typeof raw !== 'string') return { text: key, missing: true };
  return { text: fill(raw, vars ?? {}), missing: false };
}

/** Nhãn cho UI: không bao giờ ném, kể cả dict rỗng (TC-I18-04). */
export function t(key: string, dict: Dict, vars?: Vars): string {
  return lookup(key, dict, vars).text;
}

/** Kiểm phủ khoá giữa từ điển và danh sách key UI thực dùng (đếm mồ côi, không ném). */
export function collectUsedKeys(
  dict: Dict,
  usedKeys: readonly string[],
  maxOrphans: number,
): KeyAudit {
  const used = new Set(usedKeys);
  const missing = usedKeys.filter((key) => !hasKey(dict, key));
  const orphaned = Object.keys(dict).filter((key) => !used.has(key));
  const errors: string[] = missing.map((key) => 'missing key ' + key);
  if (orphaned.length > maxOrphans) {
    errors.push('orphan keys: ' + orphaned.length + ' over ' + maxOrphans);
  }
  return { ok: errors.length === 0, errors, missing, orphaned };
}
