// Pattern: Memento — MẶT TIỀN GHI/CỨU HỘ của blob save (PC-16 §4).
// TRÁCH NHIỆM: phần đụng kho — ghi có soi gương good (writeSave), luật rev khi gộp RAM/storage
//   (applyWrite), thang cứu hộ main → good → fresh (loadSave). HÌNH DẠNG blob + default +
//   serialize: saveSchema.ts; NÂNG CẤP version + điền default: saveMigrate.ts.
//   File này cũng là MẶT TIỀN CÔNG KHA: importer (records.ts, UI) chỉ nhập từ './save', không
//   nhập thẳng hai file kia ⇒ đổi cấu trúc trong không lan sang 20 điểm import.
// RÀNG BUỘC: 0 đồng hồ, 0 random; dữ liệu bẩn hoặc KV hỏng ⇒ KẾT QUẢ CÓ KIỂU (reason / mirror /
//   repaired), không ném (ERR-01, ERR-09/10).

import { utf8Length } from './cache';
import { defaultSave, isInt, isStr, listOf, SAVE_KEYS, safeJson, serializeSave } from './saveSchema';
import type { KV, Save } from './saveSchema';
import { parseSave } from './saveMigrate';

/** Mặt tiền: hai lớp trong được xuất lại tại đây (thêm bậc version mới = thêm dòng ở đây). */
export { defaultSave, SAVE_KEYS, SAVE_VERSION, serializeSave } from './saveSchema';
export type { KV, Save } from './saveSchema';
export { MIGRATIONS, migrateSave, parseSave } from './saveMigrate';
export type { Migrated, Migration, ParseReason, ParseResult } from './saveMigrate';

// --------------------------------------------------------------------- ghi ---

export type WriteReason = 'kv_error' | 'serialize_failed';
/** Số phận bản gương good: `kv_error` là TÍN HIỆU trả về caller, không phải thứ bị nuốt (A12). */
export type MirrorOutcome = 'skipped' | 'written' | 'kv_error';
export type WriteResult =
  | { ok: true; bytes: number; mirror: MirrorOutcome; reason?: undefined }
  | { ok: false; bytes: number; reason: WriteReason; mirror?: undefined };

const tryWrite = (kv: KV, key: string, text: string): boolean => {
  try {
    kv.setItem(key, text);
    return true;
  } catch {
    return false; // bo ghi nem ⇒ quy thanh KET QUA CO KIEU o caller, khong am tham mat tin
  }
};

/**
 * Ghi một bản save: rev+1 ⇒ round-trip parse OK ⇒ mới đụng KV ⇒ copy sang gương good.
 * Dung luong tra ve dem theo UTF-8 THAT (PC-15/16), khong phai do string.length.
 */
export function writeSave(kv: KV, key: string, save: Save): WriteResult {
  const rev = isInt(save.rev) && save.rev >= 0 ? save.rev : 0;
  const text = serializeSave({ ...save, rev: rev + 1 });
  if (!parseSave(text).ok) return { ok: false, bytes: 0, reason: 'serialize_failed' };
  if (!tryWrite(kv, key, text)) return { ok: false, bytes: 0, reason: 'kv_error' };
  const mirror: MirrorOutcome = key !== SAVE_KEYS.main
    ? 'skipped'
    : (tryWrite(kv, SAVE_KEYS.backup, text) ? 'written' : 'kv_error');
  return { ok: true, bytes: utf8Length(text), mirror };
}

// ------------------------------------------------------------ luật rev §4 ---

export type WriteDecision = 'take-storage' | 'write-storage';

const revOf = (save: Save | null): number => (save === null || !isInt(save.rev) ? -1 : save.rev);

/** rev trong storage cao hơn RAM ⇒ ưu tiên storage, không cho RAM ghi đè im lặng. */
export function applyWrite(input: { ram: Save | null; storage: Save | null }): WriteDecision {
  return revOf(input.storage) > revOf(input.ram) ? 'take-storage' : 'write-storage';
}

// ---------------------------------------------------------------- cứu hộ ---

export type SaveSource = 'main' | 'backup' | 'fresh';
export type LoadResult =
  | { ok: true; save: Save; source: SaveSource; repaired: boolean; reason?: undefined }
  | { ok: false; reason: 'kv_unavailable'; save?: undefined; source?: undefined; repaired?: undefined };

const RESCUE_ORDER: readonly { source: SaveSource; key: string }[] = [
  { source: 'main', key: SAVE_KEYS.main },
  { source: 'backup', key: SAVE_KEYS.backup },
];

type Read = { text: string | null; broken: boolean };

const safeGet = (kv: KV, key: string): Read => {
  try {
    const raw = kv.getItem(key);
    return { text: isStr(raw) ? raw : null, broken: false };
  } catch {
    return { text: null, broken: true };
  }
};

/** Dọn các blob ĐỌC ĐƯỢC mà KHÔNG PARSE ĐƯỢC sau khi đã cứu hộ thành công ⇒ lần boot sau
 *  không phải giải mã lại rác. Trả lời có kiểu: true khi mọi khoá rác đã bị xoá thật. */
const purgeCorrupt = (kv: KV, stale: readonly string[]): boolean =>
  stale.length > 0 && stale.every((key) => {
    try {
      kv.removeItem(key);
      return true;
    } catch {
      return false;
    }
  });

/** Tầng cuối: làm mới tiến trình nhưng GIỮ đồ đã trả tiền (wardrobe nằm ngoài save). */
function freshSave(kv: KV): Save {
  const read = safeGet(kv, SAVE_KEYS.wardrobe);
  const owned = read.text === null ? null : safeJson(read.text);
  const base = defaultSave();
  return listOf(isStr)(owned) ? { ...base, skins_owned: [...new Set(owned as string[])] } : base;
}

/** main → good → fresh (pack §4). KV hỏng hoàn toàn ⇒ kv_unavailable, vẫn không ném. */
export function loadSave(kv: KV): LoadResult {
  let broken = 0;
  const stale: string[] = [];
  for (const hop of RESCUE_ORDER) {
    const read = safeGet(kv, hop.key);
    if (read.broken) {
      broken += 1;
      continue;
    }
    if (read.text === null) continue;
    const parsed = parseSave(read.text);
    if (parsed.ok) return { ok: true, save: parsed.save, source: hop.source, repaired: purgeCorrupt(kv, stale) };
    stale.push(hop.key);
  }
  if (broken === RESCUE_ORDER.length) return { ok: false, reason: 'kv_unavailable' };
  return { ok: true, save: freshSave(kv), source: 'fresh', repaired: purgeCorrupt(kv, stale) };
}
