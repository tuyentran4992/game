// Pattern: Adapter (hình trung hoà) + Null Object (đường rơi khi nền tảng vắng)
// TRÁCH NHIỆM: MỘT cài đặt adapter duy nhất cho MỌI bridge. Mỗi nền tảng chỉ khai báo
//   SdkSources — phần dịch TỪ VỰNG của mình; mọi hành vi chung (promise settle ngay, nuốt lỗi
//   storage CÓ ĐẾM vào `faults`, mute AND với nền tảng, đọc global LAZY, rơi về Null Object khi
//   host vắng) nằm ở đây đúng một lần ⇒ thêm nền tảng mới = thêm MỘT file dịch từ vựng, không rải if/else
//   (pack B2 §2 + PC-20). Đây cũng là cây cầu STRUCTURE §1 ghi cho `@game/sdk`: host TIÊM vào
//   object đã có sẵn, adapter không tự tạo request và không biết URL nào (PC-15).
// NỢ (B5): deadline cho callback bridge hung — mock ad đã có hẹn giờ ở adMock.ts, còn bridge
//   thật cần tuỳ chọn timeoutMs + hàm thời gian tiêm vào (không đồng hồ hệ thống trong game).

import { createNullAdapter } from './nullAdapter';
import type {
  AdCallResult,
  AdOutcome,
  PlatformAdapter,
  PlatformAds,
  PlatformLifecycle,
  PlatformStorage,
  RewardedPlacement,
} from './types';

/** Nguồn storage của host; null ⇒ nền tảng vắng mặt ở lời gọi này (đọc LAZY mỗi lần). */
export type SdkStorageSource = {
  read: (key: string) => string | null;
  write: (key: string, value: string) => void;
};

/** `done` PHẢI được gọi ngay trong lượt (hợp đồng callback đồng bộ — xem fakes.ts). */
/**
 * Nguồn ad của host: CHỈ hai đường gọi. Không có cờ "còn ad không" — host hết ad thì lần gọi
 * đó trả 'unavailable' (A3: một kênh duy nhất, không có chỗ nào để nói láo).
 */
export type SdkAdsSource = {
  rewarded: (place: RewardedPlacement, done: (outcome: AdOutcome) => void) => void;
  interstitial: (done: (outcome: AdOutcome) => void) => void;
};

export type SdkLifecycleSource = {
  onPause: (handler: () => void) => void;
  onResume: (handler: () => void) => void;
  onAudioEnabled: (handler: (enabled: boolean) => void) => void;
  setAudioEnabled: (on: boolean) => void;
};

export type SdkSources = {
  storage: () => SdkStorageSource | null;
  ads: () => SdkAdsSource | null;
  lifecycle: () => SdkLifecycleSource | null;
};

/** Bảng trạng thái hợp lệ — bridge nói láo (chuỗi lạ) vẫn không làm rò undefined lên tầng gọi. */
const LIVE_OUTCOMES: readonly AdOutcome[] = ['granted', 'failed', 'dismissed', 'unavailable'];

function knownOutcome(raw: AdOutcome): AdOutcome {
  return LIVE_OUTCOMES.includes(raw) ? raw : 'failed';
}

/**
 * Bản đồ từ vựng → outcome, CHỈ nhận khoá của CHÍNH bảng: host bắn 'toString'/'__proto__'
 * thì không được mượn giá trị trên Object.prototype (cùng lớp lỗi C10 — index ngoặc vuông).
 */
export function outcomeFor(table: Readonly<Record<string, AdOutcome>>, event: string): AdOutcome {
  const owned = Object.prototype.hasOwnProperty.call(table, event);
  return knownOutcome(owned ? table[event] : 'failed');
}

/** Bridge → Promise: callback đồng bộ ⇒ settle ở microtask; bridge ném ⇒ 'failed' (PC-20). */
function askBridge(run: (done: (outcome: AdOutcome) => void) => void): Promise<AdOutcome> {
  return new Promise((resolve) => {
    let settled = false;
    const done = (outcome: AdOutcome): void => {
      if (settled) return;
      settled = true;
      resolve(knownOutcome(outcome));
    };
    try {
      run(done);
    } catch {
      done('failed');
    }
  });
}

/** Kiểm MỘT hàm — host có thể kế thừa từ prototype nên KHÔNG đòi own-property. */
export function hasMethod(target: unknown, name: string): boolean {
  if (typeof target !== 'object' || target === null) return false;
  return typeof (target as Record<string, unknown>)[name] === 'function';
}

/**
 * Kiểm ĐỦ MỌI hàm mà một phần dịch từ vựng sẽ gọi — bridge_half-với (host dựng nửa object)
 * phải bị coi là "nền tảng vắng" chứ không được nổ TypeError ở lời gọi đầu tiên (PC-20).
 * Lý do có hàm này: gate một hàm rồi gọi hàm khác là lỗ hổng đo thật ở mục C9(a).
 */
export function hasMethods(target: unknown, names: readonly string[]): boolean {
  return names.every((name) => hasMethod(target, name));
}

/** Đọc LAZY object mà chủ nhà đã dựng trên global; null khi vắng (pack B2 §8 — không đọc lúc import). */
export function globalObject<T>(key: string): T | null {
  const found: unknown = (globalThis as Record<string, unknown>)[key];
  return typeof found === 'object' && found !== null ? (found as T) : null;
}

/**
 * Storage chung: host vắng ⇒ nhờ bản sao của Null Object; host từ chối đọc/ghi ⇒ giá trị có kiểu
 * (null / giữ bản sao) VÀ một lượt đếm vào `faults` của chính adapter (A12 — cùng bộ đếm với
 * phần offline nên tầng gọi chỉ có ĐÚNG MỘT chỗ phải nhìn).
 */
function storagePart(sources: SdkSources, offline: PlatformStorage): PlatformStorage {
  const faults = offline.faults;
  return {
    faults,
    get(key) {
      const live = sources.storage();
      if (live === null) return offline.get(key);
      try {
        const value = live.read(key);
        return value === undefined ? null : value;
      } catch {
        faults.readFailures += 1; // TC-SAV-07: nền tảng từ chối đọc ⇒ xem như chưa có gì, không ném
        return null;
      }
    },
    set(key, value) {
      const live = sources.storage();
      if (live === null) {
        offline.set(key, value);
        return;
      }
      try {
        live.write(key, value);
      } catch {
        faults.writeFailures += 1; // nuốt lỗi quota/ẩn danh CÓ ĐẾM — DATA-MODEL §7.2.5
      }
    },
  };
}

function adsPart(sources: SdkSources, offline: PlatformAds): PlatformAds {
  return {
    showRewarded(place) {
      const live = sources.ads();
      if (live === null) return offline.showRewarded(place);
      return askBridge((done) => live.rewarded(place, done)).then((status) => ({ status, place }));
    },
    showInterstitial() {
      const live = sources.ads();
      if (live === null) return offline.showInterstitial();
      const result: Promise<AdCallResult> = askBridge((done) => live.interstitial(done)).then((status) => ({
        status,
        place: 'interstitial' as const,
      }));
      return result;
    },
  };
}

/** PC-17 + TC-PSE-02: isMuted = (game mute) OR (nền tảng tắt tiếng) — bỏ một nguồn chưa đủ. */
function lifecyclePart(sources: SdkSources, offline: PlatformLifecycle): PlatformLifecycle {
  const mutes: Array<(muted: boolean) => void> = [];
  let gameMuted = false;
  let hostMuted = false;
  let audioWired = false;
  const onAudioEnabled = (enabled: boolean): void => {
    hostMuted = !enabled;
    for (const handler of mutes) handler(hostMuted);
  };
  /**
   * Nguộn mute của nền tảng PHẢI được nghe từ trước lần đặt cờ đầu tiên — TC-PSE-02 kiểm
   * `mute()` rồi mới nhận tín hiệu audio, nên cả `mute()` lẫn `onMute()` đều bảo đảm nối
   * (đúng MỘT lần cho mỗi nguồn, kẻo một emit bắn handler nhiều lượt).
   */
  const ensureAudioWired = (): void => {
    if (audioWired) return;
    const live = sources.lifecycle();
    if (live === null) return;
    audioWired = true;
    live.onAudioEnabled(onAudioEnabled);
  };
  return {
    onPause(handler) {
      const live = sources.lifecycle();
      if (live === null) offline.onPause(handler);
      else live.onPause(handler);
    },
    onResume(handler) {
      const live = sources.lifecycle();
      if (live === null) offline.onResume(handler);
      else live.onResume(handler);
    },
    onMute(handler) {
      mutes.push(handler);
      const live = sources.lifecycle();
      if (live === null) offline.onMute(handler);
      else ensureAudioWired();
    },
    mute(on) {
      gameMuted = on;
      ensureAudioWired();
      const live = sources.lifecycle();
      if (live === null) offline.mute(on);
      else live.setAudioEnabled(!on);
    },
    isMuted() {
      ensureAudioWired();
      return gameMuted || hostMuted;
    },
  };
}

/** Adapter trung hoà: mọi phần đều hỏi nguồn lại từng lời gọi, rơi về Null Object khi host vắng. */
export function createSdkAdapter(sources: SdkSources, offline: PlatformAdapter = createNullAdapter()): PlatformAdapter {
  return {
    storage: storagePart(sources, offline.storage),
    ads: adsPart(sources, offline.ads),
    lifecycle: lifecyclePart(sources, offline.lifecycle),
  };
}
