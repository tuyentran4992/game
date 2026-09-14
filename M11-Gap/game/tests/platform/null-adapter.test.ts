// TC-SAO-01 (nhóm L, TEST-CASES §12) — Null Object standalone: mọi method của PlatformAdapter
// đều KHÔNG quăng lỗi khi 0 SDK được cài; ads trả "unavailable" NGAY; storage đọc null / ghi no-op.
//
// HỢP ĐỒNG CHỐT Ở TEST NÀY (code phải theo — test là hợp đồng):
//   src/platform/nullAdapter.ts
//     export const nullAdapter: PlatformAdapter            // tên chốt ở test này (pack B2 §1)
//     export function createNullAdapter(): PlatformAdapter // tên chốt ở test này
//   src/platform/types.ts
//     PlatformAdapter = { storage: {get,set}, ads: {showRewarded, showInterstitial},
//                         lifecycle: {onPause, onResume, onMute, mute, isMuted} }   // onMute/isMuted: tên chốt ở test này
import { describe, expect, it } from 'vitest';
import { createNullAdapter, nullAdapter } from '../../src/platform/nullAdapter';
import {
  ADAPTER_METHODS,
  PLATFORM_STORAGE_KEYS,
  REWARDED_PLACEMENTS,
  adapterSurface,
  settlesImmediately,
  type AdCallResult,
  type AnyAdapter,
} from './helpers/fakes';

describe('nullAdapter — TC-SAO-01 / PC-20 (standalone, 0 SDK)', () => {
  it('môi trường test không có SDK: global Playgama/ytgame/localStorage đều vắng (điều kiện của TC-ERR-04)', () => {
    const host = globalThis as Record<string, unknown>;
    expect(host['Playgama']).toBeUndefined();
    expect(host['ytgame']).toBeUndefined();
    expect(host['localStorage']).toBeUndefined();
  });

  it('TC-SAO-01: storage.get trả null cho cả 4 khoá DATA-MODEL khi chưa ghi gì', () => {
    const adapter = createNullAdapter();
    for (const key of PLATFORM_STORAGE_KEYS) {
      expect(adapter.storage.get(key)).toBeNull();
    }
  });

  it('TC-SAO-01 / PC-16: storage.set không ném, đọc lại đúng chuỗi đã ghi, ghi lần 2 ghi đè', () => {
    const adapter = createNullAdapter();
    expect(() => adapter.storage.set('m11.save', '{"version":1}')).not.toThrow();
    expect(adapter.storage.get('m11.save')).toBe('{"version":1}');
    adapter.storage.set('m11.save', '{"version":2}');
    expect(adapter.storage.get('m11.save')).toBe('{"version":2}');
  });

  it('TC-SAO-01 / PC-14 / A6: standalone KHÔNG có cổng "available" riêng — bề mặt ads đúng 2 hàm, kênh báo hết ad là kết quả lần gọi', () => {
    expect('available' in nullAdapter.ads).toBe(false);
    expect(Object.keys(nullAdapter.ads).sort()).toEqual(['showInterstitial', 'showRewarded']);
  });

  it('TC-SAO-01 / PC-13: showRewarded trả unavailable cho đủ 4 placement, settle ngay không treo promise', async () => {
    const adapter = createNullAdapter();
    const results: (AdCallResult | 'PENDING')[] = [];
    for (const place of REWARDED_PLACEMENTS) {
      results.push(await settlesImmediately(adapter.ads.showRewarded(place)));
    }
    expect(results).toEqual([
      { status: 'unavailable', place: 'undo' },
      { status: 'unavailable', place: 'hint' },
      { status: 'unavailable', place: 'continue' },
      { status: 'unavailable', place: 'ink_x2' },
    ]);
  });

  it('TC-SAO-01 / TC-AD-07: showInterstitial trả unavailable settle ngay (bỏ qua ad, luồng chạy tiếp)', async () => {
    expect(await settlesImmediately(nullAdapter.ads.showInterstitial())).toEqual({
      status: 'unavailable',
      place: 'interstitial',
    });
  });

  it('TC-SAO-01 / PC-17: onPause/onResume/onMute đăng ký handler mà không gọi handler, không ném', () => {
    const adapter = createNullAdapter();
    let fired = 0;
    expect(() => {
      adapter.lifecycle.onPause(() => {
        fired += 1;
      });
      adapter.lifecycle.onResume(() => {
        fired += 1;
      });
      adapter.lifecycle.onMute(() => {
        fired += 1;
      });
      adapter.lifecycle.onPause(() => {
        fired += 1;
      });
    }).not.toThrow();
    expect(fired).toBe(0);
  });

  it('TC-SAO-01 / TC-PSE-02: mute()/isMuted() hoạt động như cờ cục bộ, không cần nền tảng', () => {
    const adapter = createNullAdapter();
    expect(adapter.lifecycle.isMuted()).toBe(false);
    adapter.lifecycle.mute(true);
    expect(adapter.lifecycle.isMuted()).toBe(true);
    adapter.lifecycle.mute(false);
    expect(adapter.lifecycle.isMuted()).toBe(false);
  });

  it('TC-SAO-01 / PC-20: gọi lặp lại toàn bộ bề mặt adapter 2 lần, sai thứ tự ⇒ 0 exception', async () => {
    const adapter = createNullAdapter();
    const sweep = async (): Promise<void> => {
      await adapter.ads.showInterstitial();
      adapter.lifecycle.onResume(() => undefined);
      adapter.storage.set('m11.log', '[]');
      adapter.storage.get('m11.log');
      await adapter.ads.showRewarded('hint');
      adapter.lifecycle.mute(true);
      adapter.lifecycle.isMuted();
      adapter.lifecycle.onPause(() => undefined);
      adapter.lifecycle.onMute(() => undefined);
    };
    await expect(sweep()).resolves.toBeUndefined();
    await expect(sweep()).resolves.toBeUndefined();
    expect(adapter.storage.get('m11.log')).toBe('[]');
  });

  it('TC-SAO-01 / PC-20: nullAdapter singleton có đúng bề mặt PlatformAdapter và cách ly state với createNullAdapter()', () => {
    const singleton: AnyAdapter = nullAdapter;
    expect(adapterSurface(singleton)).toEqual([...ADAPTER_METHODS].sort());
    singleton.storage.set('m11.wardrobe', '{"activeSkin":"kraft"}');
    expect(createNullAdapter().storage.get('m11.wardrobe')).toBeNull();
  });
});
