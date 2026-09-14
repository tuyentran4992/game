// Pattern: Stub có kịch bản (bảng kết quả) + Recorder
// TRÁCH NHIỆM: bộ ads GIẢ bật bằng ?ad=mock (SPEC §5.4, pack B2 §3) trả kết quả CẤU HÌNH ĐƯỢC
//   (thành / thất bại / hẹn giờ) để test cả nhánh "ad không load" lẫn "xem xong", ĐỒNG THỜI ghi
//   lại MỌI lời gọi theo thứ tự cho test soi (pack B2 §4, tinh thần MockAds nhóm F).
// TRẢ THẲNG HỢP ĐỒNG (A6): `MockAds` CHÍNH LÀ `PlatformAds` + recorder ⇒ không có kiểu kết quả
//   riêng của mock, không có bảng dịch nhị tự trung gian, không có hàm "cắm mock vào adapter" —
//   mock được gán thẳng vào khe `ads`. Thêm kịch bản = thêm đúng MỘT DÒNG bảng SCRIPT_STATUS.
// RÀNG BUỘC: 0 nền tảng, 0 global, 0 mạng; mọi promise phải settle — chỉ kịch bản 'timeout' mới
//   hẹn giờ và độ dài lấy từ `timeoutMs` do caller truyền (không đồng hồ hệ thống — PC-20).

import type { AdCallResult, AdOutcome, PlatformAds, RewardedPlacement } from './types';

/** Kịch bản cho TỪNG lời gọi (nguyên văn test: MockAdResult). */
export type MockAdResult = 'ok' | 'fail' | 'timeout';

/** Loại API bị gọi — chỉ dùng cho bản ghi lời gọi. */
export type MockAdApi = 'rewarded' | 'interstitial';

/** Bản ghi một lời gọi — interstitial không có placement ⇒ place = null. */
export type MockAdCall = { readonly api: MockAdApi; readonly place: string | null };

export type MockAdConfig = {
  readonly results: readonly MockAdResult[];
  readonly timeoutMs?: number;
};

export type MockAds = PlatformAds & {
  readonly calls: readonly MockAdCall[];
};

/** Mặc định của ?ad=mock khi boot không truyền kịch bản: ad luôn "xem xong". */
export const DEFAULT_MOCK_CONFIG: MockAdConfig = { results: ['ok'] };

/** Trần chờ của kịch bản 'timeout' khi caller không hẹn (ms). */
const DEFAULT_TIMEOUT_MS = 1500;

/**
 * Kịch bản → trạng thái CỦA HỢP ĐỒNG (types.ts là nguồn từ vựng duy nhất — mock không phát minh
 * kiểu riêng, A6). 'fail'/'timeout' trả 'unavailable': đó chính là kênh "ad không load / host hết
 * ad" mà tầng gọi phân nhánh theo, ngay trong kết quả lần gọi.
 */
const SCRIPT_STATUS: Record<MockAdResult, AdOutcome> = {
  ok: 'granted',
  fail: 'unavailable',
  timeout: 'unavailable',
};

/** Mock ad theo kịch bản; hết `results` thì LẶP LẠI phần tử cuối (định biên xác định). */
export function createMockAds(config: MockAdConfig): MockAds {
  const script: readonly MockAdResult[] = config.results.length > 0 ? config.results : ['fail'];
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const calls: MockAdCall[] = [];
  /** Kịch bản của lời gọi thứ n (1-based): quá trần thì đứng mãi ở phần tử cuối. */
  const stepOf = (n: number): MockAdResult => script[Math.min(n, script.length) - 1];
  const outcome = (api: MockAdApi, place: string | null): Promise<AdOutcome> => {
    calls.push({ api, place });
    const result = stepOf(calls.length);
    const status = SCRIPT_STATUS[result];
    if (result !== 'timeout') return Promise.resolve(status);
    // 'timeout' = ad chưa về ⇒ promise chỉ settle SAU timeoutMs (TC-AD-07: hết chờ, luồng đi tiếp).
    return new Promise((resolve) => {
      setTimeout(() => resolve(status), timeoutMs);
    });
  };
  return {
    calls,
    showRewarded: (place: RewardedPlacement): Promise<AdCallResult> =>
      outcome('rewarded', place).then((status) => ({ status, place })),
    showInterstitial: (): Promise<AdCallResult> =>
      outcome('interstitial', null).then((status) => ({ status, place: 'interstitial' as const })),
  };
}
