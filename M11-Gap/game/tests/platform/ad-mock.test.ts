// ============================================================================
// Pattern: Test Swarm (contract-first — src/platform/adMock.ts CHƯA tồn tại ⇒ suite này ĐỎ).
// TRÁCH NHIỆM: chốt hợp đồng mock ad cắm bằng hook ?ad=mock (SPEC §5.4, pack B2 §3 + §4):
//   "thay SDK ad bằng mock trả kết quả CẤU HÌNH ĐƯỢC (thành/thất bại/hẹn giờ) để test cả
//    nhánh 'ad không load' và 'xem xong'", và recorder phải ghi lại MỌI lời gọi theo thứ tự.
// RÀNG BUỘC: node — mock được chọn qua DebugFlags (parseDebugQuery), không đụng window;
//   0 mạng thật; mọi promise phải settle (PC-20: không có đường treo).
//
// TÊN chốt ở test này — code phải theo đúng:
//   src/platform/adMock.ts ::
//     export type MockAdResult = 'ok' | 'fail' | 'timeout';       // kịch bản từng lần gọi
//     export function createMockAds(config: {
//       readonly results: readonly MockAdResult[]; readonly timeoutMs?: number }): MockAds
//   MockAds CHÍNH LÀ PlatformAds (src/platform/types.ts — nguồn từ vựng duy nhất, A6) + recorder:
//     · showRewarded(place) / showInterstitial() trả Promise<AdCallResult> = { status, place }
//     · status ∈ AdOutcome = 'granted' | 'failed' | 'dismissed' | 'unavailable'
//     · KHÔNG có cổng "available" (A3/A6): "host hết ad" báo NGAY trong kết quả lần gọi.
//     · calls = recorder mọi lời gọi theo thứ tự (interstitial ⇒ place = null).
//   Ngữ nghĩa: 'ok' ⇒ granted (xem xong) · 'fail' ⇒ unavailable ngay (không treo) ·
//   'timeout' ⇒ chỉ settle SAU timeoutMs và trả unavailable (mô phỏng ad không load —
//   PC-20/TC-AD-07: hết chờ thì luồng chạy tiếp, 0 exception).
//   Hết `results` ⇒ lặp lại phần tử CUỐI (định biên xác định, không undefined, không ném).
// ============================================================================

import { describe, expect, it } from 'vitest';
// tên chốt ở test này (src/platform/adMock.ts)
import { createMockAds } from '../../src/platform/adMock';
// tên chốt ở test này (src/platform/debug.ts) — mock chỉ bật qua DebugFlags, không qua window
import { parseDebugQuery } from '../../src/platform/debug';
import { REWARDED_PLACEMENTS, installFetchRecorder } from './helpers/fakes';
import type { AdCallResult, RewardedPlacement } from './helpers/fakes';

/** Ngưỡng "treo" của test: mock đồng bộ phải settle jauh trước mức này. */
const HANG_MS = 250;
/** Hẹn giờ của kịch bản 'timeout' — dài hơn SLEEP_MS để chứng minh mock thật sự hẹn giờ. */
const TIMEOUT_MS = 200;
const SLEEP_MS = 20;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Racing với đồng hồ thật: 'HANG' nếu promise chưa settle (chứng minh "không treo"),
 * settle rồi thì soi ĐÚNG `status` của hợp đồng AdCallResult.
 */
async function settleOrHang(promise: Promise<AdCallResult>): Promise<string> {
  const settled = await Promise.race([promise, sleep(HANG_MS).then(() => null)]);
  return settled === null ? 'HANG' : settled.status;
}

/** Projection dung sai: chỉ soi api+place, để mock sau này thêm field vẫn không vỡ hợp đồng. */
function callLog(calls: readonly { api: string; place: string | null }[]): string[] {
  return calls.map((call) => call.api + ':' + (call.place === null ? '-' : call.place));
}

describe('?ad=mock — đường duy nhất bật mock (SPEC §5.4)', () => {
  it('flags.adMock bật đúng từ chuỗi search; mọi cách viết khác ⇒ tắt (không đọc window)', () => {
    expect(parseDebugQuery('?ad=mock').adMock).toBe(true);
    expect(parseDebugQuery('?ad=1').adMock).toBe(false);
    expect(parseDebugQuery('').adMock).toBe(false);
    const combo = parseDebugQuery('?debug=1&seed=beef&level=7&ad=mock');
    expect(combo.adMock).toBe(true);
    expect(combo.debug).toBe(true);
    expect(combo.level).toBe(7);
    expect(combo.seed).toBe('beef');
  });
});

describe('PC-20 — ba kịch bản của mock đều settle, không có đường treo', () => {
  it("kịch bản 'ok' ⇒ caller nhận granted (xem xong)", async () => {
    const ads = createMockAds({ results: ['ok'] });
    expect(await settleOrHang(ads.showRewarded('hint'))).toBe('granted');
  });

  it("kịch bản 'fail' ⇒ nhận unavailable NGAY, không chờ hẹn giờ, không treo", async () => {
    const ads = createMockAds({ results: ['fail'], timeoutMs: TIMEOUT_MS });
    expect(await settleOrHang(ads.showRewarded('undo'))).toBe('unavailable');
    expect(callLog(ads.calls)).toEqual(['rewarded:undo']);
  });

  it("kịch bản 'timeout' ⇒ còn chờ tới hạn, hết hẹn giờ trả unavailable, luồng chạy tiếp 0 exception (TC-AD-07)", async () => {
    const ads = createMockAds({ results: ['timeout', 'ok'], timeoutMs: TIMEOUT_MS });
    let settled = false;
    const first = ads.showRewarded('continue').then((outcome) => {
      settled = true;
      return outcome;
    });
    await sleep(SLEEP_MS);
    expect(settled, 'timeout phải hẹn giờ, không settle tức thì').toBe(false);
    expect(await settleOrHang(first)).toBe('unavailable'); // hết chờ — không exception
    expect(await settleOrHang(ads.showRewarded('ink_x2'))).toBe('granted'); // luồng đi tiếp
    expect(callLog(ads.calls)).toEqual(['rewarded:continue', 'rewarded:ink_x2']);
  });

  it('hết kịch bản ⇒ lặp lại phần tử CUỐI (định biên xác định, không undefined, không ném)', async () => {
    const ads = createMockAds({ results: ['ok', 'fail'] });
    const places: RewardedPlacement[] = [...REWARDED_PLACEMENTS];
    const outcomes: string[] = [];
    for (const place of places) {
      outcomes.push(await settleOrHang(ads.showRewarded(place)));
    }
    expect(outcomes).toEqual(['granted', 'unavailable', 'unavailable', 'unavailable']);
  });
});

describe('pack §4 — adapter/mock GHI LẠI mọi cuộc gọi theo thứ tự', () => {
  it('4 placement rewarded đúng nguyên văn DATA-MODEL §5.1, theo đúng thứ tự gọi', async () => {
    const ads = createMockAds({ results: ['ok'] });
    for (const place of REWARDED_PLACEMENTS) {
      expect(await settleOrHang(ads.showRewarded(place))).toBe('granted');
    }
    expect(callLog(ads.calls)).toEqual(['rewarded:undo', 'rewarded:hint', 'rewarded:continue', 'rewarded:ink_x2']);
  });

  it('rewarded xen interstitial ⇒ recorder giữ nguyên xen kẽ; interstitial không placement ⇒ place null', async () => {
    const ads = createMockAds({ results: ['ok', 'ok', 'fail'] });
    await settleOrHang(ads.showRewarded('undo'));
    await settleOrHang(ads.showInterstitial());
    await settleOrHang(ads.showRewarded('hint'));
    expect(callLog(ads.calls)).toEqual(['rewarded:undo', 'interstitial:-', 'rewarded:hint']);
  });

  it("mock không có cổng 'available' (A6) nhưng kịch bản vẫn grant/fail/unavailable đúng định biên — và 0 lời gọi mạng", async () => {
    const recorder = installFetchRecorder();
    try {
      const ads = createMockAds({ results: ['ok', 'fail', 'timeout'], timeoutMs: 5 });
      expect('available' in ads).toBe(false);
      expect(await settleOrHang(ads.showRewarded('hint'))).toBe('granted'); // 'ok'
      expect(await settleOrHang(ads.showRewarded('undo'))).toBe('unavailable'); // 'fail'
      expect(await settleOrHang(ads.showRewarded('continue'))).toBe('unavailable'); // 'timeout' — vẫn settle, không HANG
      expect(recorder.called).toEqual([]);
    } finally {
      recorder.restore();
    }
  });
});
