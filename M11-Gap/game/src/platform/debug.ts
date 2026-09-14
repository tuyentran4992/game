// Pattern: Table-driven parser + Decorator (4 debug hooks — SPEC §5.4)
// TRÁCH NHIỆM: chỗ DUY NHẤT đọc chuỗi search của URL và chỗ DUY NHẤT biến hook thành hành vi:
//   ?debug=1 (overlay, scene B3 tiêu thụ) · ?level=NN (nhảy màn + save in-memory, KHÔNG ghi
//   save thật) · ?seed=<hex> (khoá seed tái lập — PC-02) · ?ad=mock (SDK ad bằng mock).
// RÀNG BUỘC: parseDebugQuery là HÀM THUẦN nhận string ⇒ test chạy trong node (pack B2 §6);
//   logic chỉ nhận levelIndex/seed như tham số thường, 0 window.location trong src/logic.
//   Input rác ⇒ hành vi XÁC ĐỊNH, không crash, không NaN lọt xuống logic.
// CÁCH STRIP (B5): xoá đúng 1 dòng applyDebugHooks trong src/main.ts là 4 hook biến mất khỏi
//   đường chạy — cổng grep 'debug=' của bundle nộp mới kiểm được (pack §6). Ngoài 4 hook còn có
//   publishMotionProbe: cửa ĐO HOẠT CẢNH (`__pcMotion`) cho QA — cùng số phận strip qua debugNoop.

import { isCampaignLevel } from '../logic/progression';
import { MOTION } from '../ui/motion';
import { createMockAds, DEFAULT_MOCK_CONFIG, type MockAdConfig } from './adMock';
import { globalObject } from './sdkAdapter';
import { SAVE_STORAGE_KEYS } from './types';
import type { PlatformAdapter } from './types';

/** Kết quả parse — LUÔN đủ 5 field, không undefined, không NaN. */
export type DebugFlags = {
  readonly debug: boolean;
  readonly level: number | null;
  readonly seed: string | null;
  readonly adMock: boolean;
  /** true khi và chỉ khi level được bật: caller KHÔNG tự suy ra từ level (test chốt). */
  readonly ephemeralSave: boolean;
};

/** Tên 4 khoá query nguyên văn SPEC §5.4 (bảng dữ liệu — đổi tên là sửa ở ĐÂY). */
const QUERY_KEYS = { debug: 'debug', level: 'level', seed: 'seed', ad: 'ad' } as const;

/** Chỉ đúng hai chuỗi này bật công tắc (SPEC §5.4 viết nguyên văn ?debug=1 và ?ad=mock). */
const DEBUG_ON = '1';
const AD_MOCK_ON = 'mock';

/** Token chữ số thập phân thuần — còn DẢI HỢP LỆ là của logic (levelFrom), không khai ở đây (A8). */
const DIGITS_ONLY = /^[0-9]+$/;
const HEX_ONLY = /^[0-9a-fA-F]+$/;

/** %xx phải được giải TRƯỚC khi kiểm charset; chuỗi giải hỏng ⇒ giữ nguyên (không ném). */
function decode(token: string): string {
  try {
    return decodeURIComponent(token);
  } catch {
    return token;
  }
}

/** Cặp key/value đã giải mã, key TRỐNG bị bỏ; `key=value` chỉ cắt ở dấu `=` đầu tiên. */
function readPairs(search: string): Map<string, string> {
  const out = new Map<string, string>();
  const body = search.startsWith('?') ? search.slice(1) : search;
  for (const chunk of body.split('&')) {
    if (chunk === '') continue;
    const cut = chunk.indexOf('=');
    const key = decode(cut < 0 ? chunk : chunk.slice(0, cut));
    const value = cut < 0 ? '' : decode(chunk.slice(cut + 1));
    if (key !== '' && !out.has(key)) out.set(key, value); // key trùng ⇒ lần xuất hiện ĐẦU thắng
  }
  return out;
}

function flagFrom(pairs: Map<string, string>, key: string, wanted: string): boolean {
  return pairs.get(key) === wanted;
}

/**
 * Token chữ số thập phân THUẦN và là MÀN THẬT của chiến dịch — dải do `isCampaignLevel`
 * (logic/progression) chốt, platform không giữ con số nào (A8: đổi 120 ⇒ ?level tự theo).
 * 0 / âm / số thực / '1e6' / rác ⇒ null.
 */
function levelFrom(pairs: Map<string, string>): number | null {
  const raw = pairs.get(QUERY_KEYS.level);
  if (raw === undefined || !DIGITS_ONLY.test(raw)) return null;
  const value = Number.parseInt(raw, 10); // '007' ⇒ 7: hệ 10, không bát phân
  return isCampaignLevel(value) ? value : null;
}

/** Seed là KHOÁ SINH ĐỀ ⇒ giữ nguyên literal (không lower-case: đổi chữ hoa là đổi đề). */
function seedFrom(pairs: Map<string, string>): string | null {
  const raw = pairs.get(QUERY_KEYS.seed);
  return raw !== undefined && HEX_ONLY.test(raw) ? raw : null;
}

/** Parse THUẦN: vào chuỗi, ra cờ; 0 đọc window/document, 0 side-effect. */
export function parseDebugQuery(search: string): DebugFlags {
  const pairs = readPairs(search);
  const level = levelFrom(pairs);
  return {
    debug: flagFrom(pairs, QUERY_KEYS.debug, DEBUG_ON),
    level,
    seed: seedFrom(pairs),
    adMock: flagFrom(pairs, QUERY_KEYS.ad, AD_MOCK_ON),
    ephemeralSave: level !== null,
  };
}

/** Chuỗi search của môi trường thật — main.ts truyền vào parseDebugQuery (test truyền tay). */
export function readSearch(): string {
  const host = globalObject<{ search?: unknown }>('location');
  return typeof host?.search === 'string' ? host.search : '';
}

const EPHEMERAL_KEYS = new Set<string>(SAVE_STORAGE_KEYS);

/**
 * ?level=NN: MỌI khoá save thật (SAVE_STORAGE_KEYS — gồm cả blob hồ sơ) đi bản trong bộ nhớ;
 * đọc vẫn thấy save thật (SPEC §5.4). Bộ đếm `faults` dùng CHUNG với adapter thật ⇒ ?level
 * không xoá mất tín hiệu nuốt lỗi KV của nền tảng (A1 + A12).
 */
export function withEphemeralSave(adapter: PlatformAdapter): PlatformAdapter {
  const scratch = new Map<string, string>();
  return {
    ...adapter,
    storage: {
      faults: adapter.storage.faults,
      get(key) {
        if (!EPHEMERAL_KEYS.has(key)) return adapter.storage.get(key);
        const cached = scratch.get(key);
        return cached === undefined ? adapter.storage.get(key) : cached;
      },
      set(key, value) {
        if (!EPHEMERAL_KEYS.has(key)) {
          adapter.storage.set(key, value);
          return;
        }
        scratch.set(key, value);
      },
    },
  };
}

/** Một bước của chuỗi hook — thêm hook mới là THÊM MỘT DÒNG, không rải if. */
type DebugTransform = {
  readonly when: (flags: DebugFlags) => boolean;
  readonly apply: (adapter: PlatformAdapter, mockConfig: MockAdConfig) => PlatformAdapter;
};

const HOOK_PIPELINE: readonly DebugTransform[] = [
  { when: (flags) => flags.ephemeralSave, apply: (adapter) => withEphemeralSave(adapter) },
  {
    when: (flags) => flags.adMock,
    // MockAds ĐÃ là PlatformAds (A6) ⇒ gán thẳng vào khe `ads`, không qua hàm cắm.
    apply: (adapter, mockConfig) => ({ ...adapter, ads: createMockAds(mockConfig) }),
  },
];

/** CHỖ GỌI DUY NHẤT (main.ts): adapter thật → adapter đã gắn debug hooks. */
export function applyDebugHooks(
  adapter: PlatformAdapter,
  flags: DebugFlags,
  mockConfig: MockAdConfig = DEFAULT_MOCK_CONFIG,
): PlatformAdapter {
  return HOOK_PIPELINE.reduce<PlatformAdapter>(
    (acc, hook) => (hook.when(flags) ? hook.apply(acc, mockConfig) : acc),
    adapter,
  );
}

/** Tên global QA đọc để xem hoạt cảnh giấy đang ở đâu (chỉ KÊNH DEV có — xem debugNoop.ts). */
const MOTION_PROBE_KEY = '__pcMotion';

/**
 * Công bố CỬA ĐO HOẠT CẢNH: trỏ THẲNG vào object MOTION của ui/motion (object đó không bao giờ
 * bị thay thế) nên SheetView ghi tới đâu QA đọc tới đó, không cần poll lại. Kênh nộp alias cửa
 * debug sang debugNoop ⇒ hàm này KHÔNG tồn tại trong bundle ytgame/playgama (SPEC §5.4).
 */
export function publishMotionProbe(): void {
  (globalThis as Record<string, unknown>)[MOTION_PROBE_KEY] = MOTION;
}
