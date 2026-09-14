// Pattern: Composition Root
// TRÁCH NHIỆM (B2): đọc query qua platform/debug → factory chọn adapter theo môi trường → gắn
//   4 debug hooks (CHỖ GỌI DUY NHẤT: applyDebugHooks) → NỐI DÂY vào các mặt tiền của src/logic.
//   Không chứa luật nghiệp vụ, không import scene (B3 sẽ nối boot scene vào BootContext).
// ĐƯỜNG GHI HỒ SƠ (C10 + A1): bootRecords() lúc mở game và persistRecords() lúc một màn kết thúc
//   là hai call site production của logic/recordsStore.ts — codec, khoá, đo byte ở tầng logic hết;
//   còn KV thì đi qua ĐÚNG MỘT cửa là `adapter.storage` của tầng platform. Ở đây KHÔNG có tên nền
//   tảng nào được nhắc tới, và vì mọi chữ ký đều nằm trong adapter nên ?level=NN (debug.ts) chặn
//   được ghi hồ sơ thật — đó là lý do đường tắt `localStorage` bị xoá khỏi file này.
// STRIP BUILT-IN DEBUG (B5): xoá dòng applyDebugHooks + module src/platform/debug.ts khỏi entry.
// PC-15: tầng này được phép chạm global (location) — src/logic thì không.

import type { RecordsInput, RecordsRead, RecordsWrite } from './logic/recordsStore';
import { readRecords, writeRecords } from './logic/recordsStore';
import type { KV } from './logic/save';
import { createAdapter } from './platform';
import { applyDebugHooks, parseDebugQuery, readSearch, type DebugFlags } from './platform/debug';
import type { PlatformAdapter, PlatformStorage } from './platform/types';

/** Kết quả boot: adapter đã gắn debug hooks + cờ đã parse (scene B3 tiêu thụ). */
export type BootContext = {
  readonly adapter: PlatformAdapter;
  readonly flags: DebugFlags;
};

/**
 * Cổng vào của 4 debug hooks (SPEC §5.4): parse ĐÚNG MỘT LẦN từ location.search, rồi biến
 * adapter của môi trường thành adapter có hành vi debug (?level ⇒ save in-memory, ?ad=mock ⇒
 * mock ads). 0 side-effect ở top level để test còn dựng được runtime thật.
 */
export function bootGame(): BootContext {
  const flags = parseDebugQuery(readSearch());
  return { flags, adapter: applyDebugHooks(createAdapter(), flags) };
}

/**
 * Vật KV mà tầng logic cần, DẪN XUẤT từ một PlatformStorage (A1: không đường ghi thứ hai).
 * Adapter không có cửa xoá ⇒ `removeItem` là ghi chuỗi trống, và readRecords coi '' là "chưa
 * cất gì" nên hành vi giữ nguyên.
 */
export function adapterKV(storage: PlatformStorage): KV {
  return {
    getItem: (key) => storage.get(key),
    setItem: (key, value) => storage.set(key, value),
    removeItem: (key) => storage.set(key, ''),
  };
}

/** Nạp hồ sơ đã lưu: blob rác hoặc chưa có gì ⇒ bản trắng kèm source (luật ở recordsStore). */
export function bootRecords(adapter: PlatformAdapter): RecordsRead {
  return readRecords(adapterKV(adapter.storage));
}

/** Cất hồ sơ sau một màn: ?level=NN ⇒ debug.ts chặn, KV thật không thấy gì (A1). */
export function persistRecords(adapter: PlatformAdapter, records: RecordsInput): RecordsWrite {
  return writeRecords(adapterKV(adapter.storage), records);
}
