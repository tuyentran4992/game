// Pattern: Facade (Memento ghép KV) — đường ra/vào DUY NHẤT của blob hồ sơ.
// TRÁCH NHIỆM: PC-16 — cất blob hồ sơ xuống ĐÚNG KHOÁ mà save.ts sở hữu (STORAGE_KEY =
//   SAVE_KEYS.records) rồi đọc ngược lên. Codec do records.ts trả (encodeRecords/
//   decodeRecords), dung lượng do cache.utf8Length đo thật, khoá do records.ts nối về
//   registry của save.ts. Tầng UI (B2) KHÔNG được setItem/getItem thẳng vào khoá này mà chỉ
//   gọi hai hàm dưới đây ⇒ không còn "khoá mồ côi" (A2) và không ai tự viết lại codec.
// RÀNG BUỘC: 0 đồng hồ, 0 random, không sửa input; KV hỏng hoặc blob rác ⇒ KẾT QUẢ CÓ KIỂU
//   (reason/source) kèm bản trắng, KHÔNG ném (ERR-01) — cùng kỷ luật với loadSave.

import { utf8Length } from './cache';
import { decodeRecords, encodeRecords, STORAGE_KEY } from './records';
import type { RecordsDecode, RecordsInput } from './records';
import type { KV } from './save';

/** Mặt tiền thuận tiện: UI nhập từ file này, không nhập thẳng './records'. */
export type { RankRow, RecordsInput } from './records';

/** Lí do ghi thất bại — tín hiệu trả về caller, không nuốt (A12). */
export type RecordsWrite =
  | { ok: true; key: string; bytes: number; reason?: undefined }
  | { ok: false; key: string; bytes: 0; reason: 'kv_error' };

/** Vì sao bản đọc ra như vậy: có blob, chưa cất gì, KV lỗi, blob đọc được mà rác. */
export type RecordsSource = 'storage' | 'empty' | 'kv_error' | 'corrupt';
export type RecordsRead = RecordsDecode & { source: RecordsSource };

const BLOB_EMPTY = '';

/** Bản trắng dựng từ chính codec (120 ô trắng, ghosts/walls rỗng) — không khai hằng riêng. */
function blankOf(source: RecordsSource): RecordsRead {
  return { ...decodeRecords(BLOB_EMPTY), source };
}

/** Cất một bản hồ sơ: encode trước rồi mới đụng KV; KV từ chối (quota) ⇒ kv_error trả caller. */
export function writeRecords(kv: KV, records: RecordsInput): RecordsWrite {
  const text = encodeRecords(records);
  try {
    kv.setItem(STORAGE_KEY, text);
  } catch {
    return { ok: false, key: STORAGE_KEY, bytes: 0, reason: 'kv_error' };
  }
  return { ok: true, key: STORAGE_KEY, bytes: utf8Length(text) };
}

/** Nạp bản hồ sơ: mọi đường hỏng đều về bản trắng CÓ KIỂU, kèm source để tầng trên báo đúng. */
export function readRecords(kv: KV): RecordsRead {
  let text: string | null;
  try {
    text = kv.getItem(STORAGE_KEY);
  } catch {
    return blankOf('kv_error');
  }
  if (typeof text !== 'string' || text === BLOB_EMPTY) return blankOf('empty');
  const decoded: RecordsDecode = decodeRecords(text);
  const source: RecordsSource = decoded.ok ? 'storage' : 'corrupt';
  return { ...decoded, source };
}
