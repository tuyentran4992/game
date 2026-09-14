// Pattern: Ring buffer (mảng ô + con trỏ head, drop O(1))
// TRÁCH NHIỆM: bộ đếm sự kiện PC-15 — vòng đệm có TRẦN BYTE THẬT (đếm UTF-8 qua cache.utf8Length,
//   không ước lượng và không tự chứa codec), drop event CŨ NHẤT khi chạm trần (TC-NET-03), chặn
//   dữ liệu bẩn ở BIÊN bằng validateEvent, và không bao giờ làm game chết vì storage hỏng —
//   nhưng hỏng thì PHẢI báo ra ngoài bằng cờ `stored` (TC-NET-04 + A12).
// RÀNG BUỘC: 0 đồng hồ — `t` là timestamp do caller bơm (PC-02); state nằm trong closure của
//   createTelemetry (không có singleton module); ghi snapshot best-effort qua tham số storage.

import { CAPS, utf8Length } from './cache';

/** Một event: tên trong registry + timestamp (caller cung cấp) + dữ liệu kèm theo. */
export type Event = { name: string; t: number; data: Record<string, unknown> };

/** Khoá của EVENT_NAMES — mọi tên event snake_case, phủ đủ funnel P4-06 (§6 pack). */
export const EVENT_NAMES: readonly string[] = [
  'session_start',
  'session_end',
  'level_start',
  'level_correct',
  'level_wrong',
  'level_timeout',
  'fold',
  'undo',
  'punch',
  'cut',
  'option_pick',
  'hint_use',
  'retry',
  'share_copy',
  'ghost_beat',
  'wall_record',
  'spa_visit',
  'ink_spend',
  'album_add',
  'badge_award',
  'save_write',
  'save_rescue',
];

const EVENT_NAME_SET = new Set(EVENT_NAMES);

/** Khoá snapshot của vòng đệm — khác khoá save, có phiên bản rõ ràng. */
export const TELEMETRY_KEY = 'm11.paper.crease.telemetry.v1';

/** Number hữu hạn, không NaN/Infinity (dữ liệu bẩn phải bị chặn ở biên). */
function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}
function isStr(v: unknown): v is string {
  return typeof v === 'string';
}
function isBox(v: unknown): v is Record<string, unknown> {
  return !Array.isArray(v) && typeof v === 'object' && v !== null;
}

// ------------------------------------------------------------------ schema ---

export type Validation = { ok: boolean; errors: string[] };

type Check = (box: Record<string, unknown>) => string | null;

const checkName: Check = (b) =>
  isStr(b.name) && EVENT_NAME_SET.has(b.name) ? null : 'name: ngoai registry su kien';
const checkTime: Check = (b) => (isNum(b.t) && b.t >= 0 ? null : 't: phai la so khong am');
const checkData: Check = (b) => (isBox(b.data) ? null : 'data: phai la object');

/** Bảng kiểm ở biên — thêm ràng buộc = thêm một dòng CHECKS. */
const CHECKS: readonly Check[] = [checkName, checkTime, checkData];

/**
 * Input là `unknown`: event đến từ JSON/storage không tin trước hình dạng được ⇒ nhịp kiểm
 * object ĐÚNG MỘT LẦN ở đây (A6: không kiểm `isBox` trên value đã bị kiểu hoá `Event`).
 * Không ném với bất kỳ input nào: trả danh sách lỗi nêu ĐÚNG tên field phạm.
 */
export function validateEvent(ev: unknown): Validation {
  if (!isBox(ev)) return { ok: false, errors: ['ev: phai la object'] };
  const errors = CHECKS.map((check) => check(ev)).filter((e): e is string => e !== null);
  return { ok: errors.length === 0, errors };
}

// -------------------------------------------------------------------- ring ---

export type PushResult = {
  ok: boolean;
  bytes: number;
  dropped: number;
  /** false = snapshot KHÔNG xuống được bộ ghi ở lượt này (TC-NET-04 có tín hiệu, không nuốt). */
  stored: boolean;
};
export type TelemetryStorage = {
  setItem: (key: string, value: string) => void;
  getItem: (key: string) => string | null;
};
export type Telemetry = {
  push: (ev: Event) => PushResult;
  events: () => Event[];
  bytesOf: () => number;
};
export type TelemetryOptions = { capBytes?: number; storage?: TelemetryStorage };

/** Một ô của ring: event đã copy + số byte UTF-8 của nó, tính MỘT LẦN lúc vào ring. */
type Slot = { readonly ev: Event; readonly len: number };

/** Số ô chết ở đầu mảng được phép tích trước khi dồn mảng về 0 (đổi O(1) lấy không gian). */
const SWEEP_FROM = 64;

/** Bản copy giữ nguyên thứ tự khoá name/t/data ⇒ JSON dựng lại đúng như đầu vào. */
function normalize(ev: Event): Event {
  return { name: String(ev.name), t: Number(ev.t), data: { ...ev.data } };
}

/**
 * Vòng đệm byte-cap ĐÚNG NGHĨA: MỘT mảng ô + con trỏ `head` trỏ phần tử cũ nhất ⇒ drop lâu
 * nhất là `head += 1` (O(1), không hai mảng song song phải giữ cân bằng tay, không shift()).
 * `sum` = tổng byte của các event đang sống; dung lượng mảng là `2 + sum + (n-1)` (ngoặc vuông
 * + dấu phẩy) ⇒ bằng chính xác JSON.stringify(events()) đo bằng TextEncoder ở test, mà không
 * phải stringify lại cả mảng mỗi lần push.
 */
export function createTelemetry(options: TelemetryOptions): Telemetry {
  const cap = isNum(options.capBytes) && options.capBytes > 0
    ? options.capBytes
    : CAPS.telemetryCapBytes;
  const storage = options.storage;
  const slots: Slot[] = [];
  let head = 0;
  let sum = 0;
  /** Bộ ghi hỏng gần nhất chưa (A12: bắt được là phải thấy được ở PushResult.stored). */
  let storageDown = false;

  const size = (): number => slots.length - head;
  const bytesOf = (): number => (size() === 0 ? 0 : 2 + sum + size() - 1);
  const live = (): Slot[] => slots.slice(head);

  const sweep = (): void => {
    if (head < SWEEP_FROM || head * 2 < slots.length) return;
    slots.splice(0, head);
    head = 0;
  };

  const adopt = (ev: Event): void => {
    const kept = normalize(ev);
    const len = utf8Length(JSON.stringify(kept));
    slots.push({ ev: kept, len });
    sum += len;
  };

  const dropOldest = (): void => {
    if (size() === 0) return;
    sum -= slots[head].len;
    head += 1;
    sweep();
  };

  const trim = (): number => {
    let dropped = 0;
    while (size() > 1 && bytesOf() > cap) {
      dropOldest();
      dropped += 1;
    }
    return dropped;
  };

  /** Snapshot chỉ là bản sao dự phòng: hỏng/quota ⇒ dữ liệu RAM còn nguyên, nhưng CÓ CỜ. */
  const persist = (): boolean => {
    if (storage === undefined) return true;
    try {
      storage.setItem(TELEMETRY_KEY, JSON.stringify(live().slice(-CAPS.snapshotKeep)));
      storageDown = false;
      return true;
    } catch {
      storageDown = true; // TC-NET-04: không truyền lỗi lên game, nhưng báo ra ngoài
      return false;
    }
  };

  const restore = (): void => {
    if (storage === undefined) return;
    let raw: string | null = null;
    try {
      raw = storage.getItem(TELEMETRY_KEY);
    } catch {
      storageDown = true;
      return;
    }
    if (!isStr(raw)) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return;
    }
    if (!Array.isArray(parsed)) return;
    for (const item of parsed) {
      if (validateEvent(item).ok) adopt(item as Event);
    }
    trim();
  };

  const reject = (): PushResult => ({ ok: false, bytes: bytesOf(), dropped: 0, stored: !storageDown });

  const push = (ev: Event): PushResult => {
    if (!validateEvent(ev).ok) return reject();
    if (size() > 0 && ev.t < slots[slots.length - 1].ev.t) return reject();
    adopt(ev);
    const dropped = trim();
    const kept = size() > 0 && bytesOf() <= cap;
    if (!kept) dropOldest();
    persist();
    return { ok: kept, bytes: bytesOf(), dropped, stored: !storageDown };
  };

  restore();
  return { push, events: () => live().map((s) => s.ev), bytesOf };
}
