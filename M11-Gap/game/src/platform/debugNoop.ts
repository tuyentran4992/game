// Pattern: Null Object cho một cửa hành vi (STRIP debug khỏi bundle nộp — SPEC §5.4, B5)
// TRÁCH NHIỆM: bản THAY THẾ src/platform/debug.ts ở mode nộp (ytgame/playgama). vite.config.ts đọc
//   cột `devTools` của bảng MODES và đặt alias trỏ specifier './platform/debug' sang file NÀY, nên
//   thân debug thật (parser + 4 khoá + chỗ đọc location) KHÔNG vào được graph của bundle nộp: hết
//   chuỗi, hết đường chạy — chứ không phải bị che. Standalone không có alias ⇒ dùng debug.ts thật;
//   test vẫn import debug.ts thật (vitest chạy theo vitest.config.ts, không alias).
// HỢP ĐỒNG: y HỆT chữ ký module thật, chốt bằng hằng STRIPPED_DEBUG_API dưới ⇒ thiếu/thừa/sai tham
//   số là typecheck chết, không lệch ngầm khi debug.ts thêm hook mới.
// CẤM ở đây: mọi khoá truy vấn và mọi dấu vết API debug (cổng check-bundle soi file này như code thường).

import type { MockAdConfig } from './adMock';
import type { DebugFlags } from './debug';
import type { PlatformAdapter } from './types';

/** Bộ cờ "không hook nào bật" — giống hệt bản dev khi URL sạch (5 field, không undefined, không NaN). */
const NO_FLAGS: DebugFlags = {
  debug: false,
  level: null,
  seed: null,
  adMock: false,
  ephemeralSave: false,
};

/** Không còn gì để đọc ⇒ chuỗi truy vấn luôn rỗng, 0 chạm global. */
export function readSearch(): string {
  return '';
}

/** Parse nhưng chẳng có khoá nào để nhận: luôn trả NO_FLAGS (tham số giữ cho khớp chữ ký gốc). */
export function parseDebugQuery(_search: string): DebugFlags {
  return NO_FLAGS;
}

/** ?level đã bị strip ⇒ save thật đi thẳng xuống KV của nền tảng. */
export function withEphemeralSave(adapter: PlatformAdapter): PlatformAdapter {
  return adapter;
}

/** Adapter của môi trường chính là adapter cuối cùng: 0 hook được gắn. */
export function applyDebugHooks(
  adapter: PlatformAdapter,
  _flags: DebugFlags,
  _mockConfig?: MockAdConfig
): PlatformAdapter {
  return adapter;
}

/** Bundle nộp KHÔNG công bố cửa đo hoạt cảnh nào — không global, không thiết bị nào để đọc. */
export function publishMotionProbe(): void {
  // Không có gì: toàn bộ thân của mặt đo (object + khoá) đã bị alias loại khỏi graph.
}

/** Bằng chứng hợp đồng: MỌI export giá trị của debug.ts phải có ở đây với đúng cùng kiểu. */
export const STRIPPED_DEBUG_API: typeof import('./debug') = {
  readSearch,
  parseDebugQuery,
  withEphemeralSave,
  applyDebugHooks,
  publishMotionProbe,
};
