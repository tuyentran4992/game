// Pattern: Null Object
// TRÁCH NHIỆM: bản "standalone: localStorage, không ad" (STRUCTURE §1) — MỌI method của
//   PlatformAdapter đều không ném khi 0 SDK được cài (PC-20, TC-SAO-01). Ads trả 'unavailable'
//   ngay trong microtask (TC-AD-07: không promise treo, không chặn màn); storage nền tảng
//   chết/quota ⇒ chơi tiếp bằng phiên hiện tại NHƯNG ĐỂ LẠI BỘ ĐẾM `faults` (A12: nuốt lỗi mà
//   không có tín hiệu quan sát được thì không ai biết mình đang mất tiếng).
// RÀNG BUỘC: không rải if (co ads) ở nơi gọi — chính object này LÀ nhánh "không có gì".
//   createNullAdapter() cho MỘT phiên (cách ly state — TC-SAO-02); `nullAdapter` là singleton
//   mà platformRegistry trả cho khoá 'standalone' (TC-SAO-03 chốt đúng reference đó).
// PC-15: chỉ đọc object đã có sẵn trên global (localStorage) — adapter không tự tạo request.

import type {
  AdCallResult,
  PlatformAds,
  PlatformAdapter,
  PlatformLifecycle,
  PlatformStorage,
  RewardedPlacement,
  StorageFaults,
} from './types';

/** Vật KV của trình duyệt (hình tối thiểu — đúng 2 hàm tầng platform cần). */
type KvHost = {
  getItem?: (key: string) => string | null;
  setItem?: (key: string, value: string) => void;
};

/** Đọc LAZY localStorage lúc gọi (vitest environment node không có window — pack B2 §8). */
function hostKv(): KvHost | null {
  const found: unknown = (globalThis as Record<string, unknown>)['localStorage'];
  if (typeof found !== 'object' || found === null) return null;
  const kv = found as KvHost;
  return typeof kv.getItem === 'function' && typeof kv.setItem === 'function' ? kv : null;
}

/**
 * Storage của phiên không nền tảng: bản sao trong bộ nhớ LUÔN chạy (nên KV chết vẫn đọc lại
 * được đúng chuỗi vừa ghi); khi có localStorage thì đọc/ghi thêm vật thật và bỏ qua lỗi của nó
 * (ẩn danh · quota — TC-SAV-07, TC-NET-04) NHƯNG đếm vào `faults` (A12).
 */
export function createMemoryStorage(): PlatformStorage {
  const mirror = new Map<string, string>();
  const faults: StorageFaults = { writeFailures: 0, readFailures: 0 };
  return {
    faults,
    get(key) {
      const kv = hostKv();
      if (kv !== null) {
        try {
          const live = kv.getItem === undefined ? null : kv.getItem(key);
          if (live !== null) return live;
        } catch {
          faults.readFailures += 1; // KV chết ⇒ dùng bản sao trong phiên, Có TÍN HIỆU (TC-NET-04)
        }
      }
      const cached = mirror.get(key);
      return cached === undefined ? null : cached;
    },
    set(key, value) {
      mirror.set(key, value);
      const kv = hostKv();
      if (kv === null) return;
      try {
        kv.setItem?.(key, value);
      } catch {
        faults.writeFailures += 1; // mất tiếng vẫn phải chơi được, nhưng ghi lại là MẤT (DATA-MODEL §7.2.5)
      }
    },
  };
}

/** Ads trống: mọi kết quả 'unavailable' settle trong microtask — không có cổng "còn ad không?" (PC-14, A6). */
const NO_ADS: PlatformAds = {
  showRewarded(place: RewardedPlacement): Promise<AdCallResult> {
    return Promise.resolve({ status: 'unavailable', place });
  },
  showInterstitial(): Promise<AdCallResult> {
    return Promise.resolve({ status: 'unavailable', place: 'interstitial' });
  },
};

/** Lifecycle cục bộ: handler được ghi nhận nhưng không có nguồn nào bắn; mute là cờ của phiên. */
function localLifecycle(): PlatformLifecycle {
  const pauses: Array<() => void> = [];
  const resumes: Array<() => void> = [];
  const mutes: Array<(muted: boolean) => void> = [];
  let muted = false;
  return {
    onPause: (handler) => void pauses.push(handler),
    onResume: (handler) => void resumes.push(handler),
    onMute: (handler) => void mutes.push(handler),
    mute: (on) => {
      muted = on;
    },
    isMuted: () => muted,
  };
}

/** Một phiên standalone (TC-SAO-01/02): storage riêng, không ad, lifecycle cục bộ. */
export function createNullAdapter(): PlatformAdapter {
  return { storage: createMemoryStorage(), ads: NO_ADS, lifecycle: localLifecycle() };
}

/** Singleton của khoá 'standalone'. */
export const nullAdapter: PlatformAdapter = createNullAdapter();
