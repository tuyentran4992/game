// Pattern: Adapter (chỉ dịch TỪ VỰNG)
// TRÁCH NHIỆM: quy đổi bridge `ytgame` (data.loadData/dataSave callback · ad.showRewarded ·
//   onAudioEnabledChange · mute) về SdkSources trung hoà. Bridge này nói KHÁC Playgama — hai bảng
//   từ vựng riêng là lý do tồn tại của file (TC-SAO-03: 1 interface, 3 adapter).
// NỢ B5: cùng nguyên tắc playgamaAdapter — chỉ dùng object chủ nhà tiêm vào, 0 API bịa thêm.

import { globalObject, hostAdapter, ignoreResult, outcomeFor, type HostShape } from './sdkAdapter';
import type { AdOutcome, PlatformAdapter } from './types';

export type YtgameAdEvent = 'reward' | 'error' | 'close';
export type YtgameInterstitialEvent = 'shown' | 'error';

export interface YtgameBridge {
  readonly data: {
    loadData(key: string, cb: (value: string | null) => void): void;
    dataSave(key: string, value: string, cb: (ok: boolean) => void): void;
  };
  readonly ad: {
    showRewarded(place: string, cb: (event: YtgameAdEvent) => void): void;
    showInterstitial(cb: (event: YtgameInterstitialEvent) => void): void;
  };
  readonly onPause: (cb: () => void) => void;
  readonly onResume: (cb: () => void) => void;
  readonly onAudioEnabledChange: (cb: (enabled: boolean) => void) => void;
  readonly mute: (on: boolean) => void;
}

const REWARDED_OUTCOME: Record<YtgameAdEvent, AdOutcome> = {
  reward: 'granted',
  error: 'failed',
  close: 'dismissed',
};
const INTERSTITIAL_OUTCOME: Record<YtgameInterstitialEvent, AdOutcome> = {
  shown: 'granted',
  error: 'failed',
};
const YTGAME_GLOBAL = 'ytgame';

/**
 * HÌNH CỦA YTGAME (F4): cùng KHUNG với Playgama — `hostAdapter` ở sdkAdapter.ts chạy phần
 * dùng chung, file này chỉ khai bảng KHOÁ + cách dịch. Lifecycle của host này nằm ngay trên
 * root của bridge nên `pick` trả chính bridge và bảng gộp 4 hàm. Kết quả dataSave không có
 * cửa chờ: hợp đồng storage.get/set là ĐỒNG BỘ (fakes.ts chốt) ⇒ bỏ qua cờ trả về.
 */
const BRIDGE_SHAPE: HostShape<YtgameBridge> = {
  storage: {
    methods: ['loadData', 'dataSave'],
    pick: (b) => b.data,
    make: (b) => ({
      read: (key) => {
        let value: string | null = null;
        b.data.loadData(key, (got) => {
          value = got;
        });
        return value;
      },
      write: (key, value) => b.data.dataSave(key, value, ignoreResult),
    }),
  },
  ads: {
    methods: ['showRewarded', 'showInterstitial'],
    pick: (b) => b.ad,
    make: (b) => ({
      rewarded: (place, done) => {
        b.ad.showRewarded(place, (event) => done(outcomeFor(REWARDED_OUTCOME, event)));
      },
      interstitial: (done) => {
        b.ad.showInterstitial((event) => done(outcomeFor(INTERSTITIAL_OUTCOME, event)));
      },
    }),
  },
  lifecycle: {
    methods: ['onPause', 'onResume', 'onAudioEnabledChange', 'mute'],
    pick: (b) => b,
    make: (b) => ({
      onPause: (handler) => b.onPause(handler),
      onResume: (handler) => b.onResume(handler),
      // Bridge ytgame đổi chiều lời gọi tiếng: hợp đồng nói "bật tiếng", nền tảng nói "mute".
      onAudioEnabled: (handler) => b.onAudioEnabledChange(handler),
      setAudioEnabled: (on) => b.mute(!on),
    }),
  },
};

/** Adapter ytgame — bridge vắng hoặc thiếu một hàm của phần nào thì phần đó về Null Object. */
export function createYtgameAdapter(bridge?: YtgameBridge): PlatformAdapter {
  const atHand = (): YtgameBridge | null => bridge ?? globalObject<YtgameBridge>(YTGAME_GLOBAL);
  return hostAdapter(atHand, BRIDGE_SHAPE);
}
