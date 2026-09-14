// Pattern: Adapter (chỉ dịch TỪ VỰNG)
// TRÁCH NHIỆM: quy đổi bridge `ytgame` (data.loadData/dataSave callback · ad.showRewarded ·
//   onAudioEnabledChange · mute) về SdkSources trung hoà. Bridge này nói KHÁC Playgama — hai bảng
//   từ vựng riêng là lý do tồn tại của file (TC-SAO-03: 1 interface, 3 adapter).
// NỢ B5: cùng nguyên tắc playgamaAdapter — chỉ dùng object chủ nhà tiêm vào, 0 API bịa thêm.

import { createNullAdapter } from './nullAdapter';
import {
  createSdkAdapter,
  globalObject,
  hasMethods,
  outcomeFor,
  type SdkAdsSource,
  type SdkLifecycleSource,
  type SdkSources,
  type SdkStorageSource,
} from './sdkAdapter';
import type { AdOutcome, PlatformAdapter, RewardedPlacement } from './types';

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
 * Bảng KHOÁ — giống playgamaAdapter: gate ĐỦ mọi hàm sẽ gọi, thiếu một là coi như nền tảng vắng
 * (PC-20 / mục C9(a)). Lifecycle của ytgame nằm ngay trên root của bridge nên bảng gộp 4 hàm.
 */
const DATA_METHODS: readonly string[] = ['loadData', 'dataSave'];
const AD_METHODS: readonly string[] = ['showRewarded', 'showInterstitial'];
const LIFECYCLE_METHODS: readonly string[] = ['onPause', 'onResume', 'onAudioEnabledChange', 'mute'];

/** Kết quả dataSave không có cửa chờ: hợp đồng storage.get/set là ĐỒNG BỘ (fakes.ts chốt). */
const IGNORE_WRITE_RESULT = (): void => undefined;

function storageSource(bridge: YtgameBridge | null): SdkStorageSource | null {
  if (bridge === null || !hasMethods(bridge.data, DATA_METHODS)) {
    return null;
  }
  const b = bridge;
  return {
    read: (key) => {
      let value: string | null = null;
      b.data.loadData(key, (got) => {
        value = got;
      });
      return value;
    },
    write: (key, value) => {
      b.data.dataSave(key, value, IGNORE_WRITE_RESULT);
    },
  };
}

function adsSource(bridge: YtgameBridge | null): SdkAdsSource | null {
  if (bridge === null || !hasMethods(bridge.ad, AD_METHODS)) return null;
  const b = bridge;
  return {
    rewarded: (place: RewardedPlacement, done) => {
      b.ad.showRewarded(place, (event) => done(outcomeFor(REWARDED_OUTCOME, event)));
    },
    interstitial: (done) => {
      b.ad.showInterstitial((event) => done(outcomeFor(INTERSTITIAL_OUTCOME, event)));
    },
  };
}

/** Bridge ytgame đổi chiều lời gọi tiếng: hợp đồng nói "bật tiếng", nền tảng nói "mute". */
function lifecycleSource(bridge: YtgameBridge | null): SdkLifecycleSource | null {
  if (bridge === null || !hasMethods(bridge, LIFECYCLE_METHODS)) return null;
  const b = bridge;
  return {
    onPause: (handler) => b.onPause(handler),
    onResume: (handler) => b.onResume(handler),
    onAudioEnabled: (handler) => b.onAudioEnabledChange(handler),
    setAudioEnabled: (on) => b.mute(!on),
  };
}

export function createYtgameAdapter(bridge?: YtgameBridge): PlatformAdapter {
  const atHand = (): YtgameBridge | null => bridge ?? globalObject<YtgameBridge>(YTGAME_GLOBAL);
  const sources: SdkSources = {
    storage: () => storageSource(atHand()),
    ads: () => adsSource(atHand()),
    lifecycle: () => lifecycleSource(atHand()),
  };
  return createSdkAdapter(sources, createNullAdapter());
}
