// Pattern: Interface (Strategy)
// TRÁCH NHIỆM: hợp đồng DUY NHẤT giữa game và nền tảng (STRUCTURE §4) — storage / ads / lifecycle.
//   Tầng logic và tầng render chỉ nhìn thấy 3 mặt tiền này; khác biệt standalone · Playgama ·
//   ytgame nằm hẳn ở adapter (pack B2 §1). CẤM thêm method: bề mặt đã bị tests/platform chốt
//   đúng 9 hàm (ADAPTER_METHODS dẫn xuất THẲNG từ 3 interface dưới đây ⇒ thừa/thiếu một hàm là
//   typecheck đỏ ngay trong test, không phải danh sách ai tự chép tay: A14).
// RÀNG BUỘC: chỉ type + BẢNG KHOÁ (dữ liệu) — 0 logic chạy được, 0 đọc global.
// NGUỒN tên: pack B2 §1 (STRUCTURE §4) · placement rewarded: DATA-MODEL §5.1 · khoá: §1.2.

import { SAVE_KEYS } from '../logic/saveSchema';

/** Bốn điểm rewarded nguyên văn DATA-MODEL §5.1 — không có chỗ thứ năm. */
export type RewardedPlacement = 'undo' | 'hint' | 'continue' | 'ink_x2';

/** Placement trong kết quả trả lên tầng gọi (interstitial không có điểm). */
export type AdPlacement = RewardedPlacement | 'interstitial';

/**
 * Bốn trạng thái ad mà tầng gọi phân nhánh theo (PC-13/PC-14). Adapter tự quyết bằng bảng từ
 * vựng của từng nền tảng; nơi gọi KHÔNG viết if (co ads) (PC-20).
 * 'unavailable' CHÍNH LÀ kênh "host có mà hết ad": báo NGAY TRONG kết quả lần gọi, không qua
 * một cổng hỏi "còn ad không?" riêng (A3 + A6 — cổng đó chỉ nói láo hoặc thành `if (cóAds)`).
 */
export type AdOutcome = 'granted' | 'failed' | 'dismissed' | 'unavailable';

export type AdCallResult = { readonly status: AdOutcome; readonly place: AdPlacement };

/**
 * Tín hiệu của mỗi lần nuốt lỗi KV (A12): bộ đếm này là GIÁ TRỊ QUAN SÁT ĐƯỢC — nền tảng từ chối
 * đọc/ghi thì game vẫn chơi (PC-20) nhưng không ai bị điếc, test đọc `storage.faults` mà thấy.
 */
export type StorageFaults = { writeFailures: number; readFailures: number };

/** Lưu trữ key/value ĐỒNG BỘ (hợp đồng fakes.ts: callback của bridge phải trả ngay trong lượt). */
export type PlatformStorage = {
  get(key: string): string | null;
  set(key: string, value: string): void;
  /** DỮ LIỆU chứ không phải method ⇒ không tính vào bề mặt 9 hàm; MỌI storage phải có. */
  readonly faults: StorageFaults;
};

export type PlatformAds = {
  showRewarded(place: RewardedPlacement): Promise<AdCallResult>;
  showInterstitial(): Promise<AdCallResult>;
};

/** PC-17: pause/resume dừng timer + nhạc; mute là AND giữa cờ trong game và lệnh của nền tảng. */
export type PlatformLifecycle = {
  onPause(handler: () => void): void;
  onResume(handler: () => void): void;
  onMute(handler: (muted: boolean) => void): void;
  mute(on: boolean): void;
  isMuted(): boolean;
};

export type PlatformAdapter = {
  readonly storage: PlatformStorage;
  readonly ads: PlatformAds;
  readonly lifecycle: PlatformLifecycle;
};

/**
 * Khoá nhật ký phiên — KHÔNG phải save thật (SPEC §5.4 cho ghi bình thường).
 * Không có trong SAVE_KEYS của logic vì đó là blob telemetry/log do tầng trên tự do dùng.
 */
export const LOG_STORAGE_KEY = 'm11.log';

/**
 * Ba KHOÁ SAVE THẬT (DATA-MODEL §1.2 + khoá hồ sơ của recordsStore) — đúng bảng này bị
 * ?level=NN chặn ghi (SPEC §5.4 "nhảy thẳng màn NN KHÔNG ghi vào save thật"). DẪN XUẤT từ
 * SAVE_KEYS của logic: đổi khoá trong logic là đổi ở đây, không có chuỗi thứ hai (A9).
 */
export const SAVE_STORAGE_KEYS: readonly string[] = [
  SAVE_KEYS.main,
  SAVE_KEYS.backup,
  SAVE_KEYS.records,
];

/** Đủ bốn khoá KV mà một phiên chạm vào (test soi cả 4, không tự khai lại danh sách — A9). */
export const PLATFORM_STORAGE_KEYS: readonly string[] = [
  SAVE_KEYS.main,
  SAVE_KEYS.backup,
  SAVE_KEYS.wardrobe,
  LOG_STORAGE_KEY,
];

