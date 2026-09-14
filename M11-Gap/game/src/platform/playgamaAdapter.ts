// Pattern: Adapter (chỉ dịch TỪ VỰNG)
// TRÁCH NHIỆM: quy đổi bridge Playgama (storage.getItem/setItem · ads.showRewardedVideo ·
//   lifecycle.onAudioEnabledChange) về SdkSources trung hoà; hành vi dùng chung ở sdkAdapter.ts.
// HỢP ĐỒNG: tham số tiêm thẳng CÓ ƯU TIÊN hơn global; không có cả hai ⇒ xử lý như null adapter
//   (tests/platform/playgama-adapter.test.ts). Bridge CHỈ có một phần của shape ⇒ phần đó cũng bị
//   coi là vắng, không gọi hàm thiếu (BẢNG *_METHODS — tests/platform/host-shape.test.ts).
// NỢ B5: PlaygamaBridge dưới đây là TỐI GIẢN do test chốt — cầu thật của máy chủ Playgama chưa
//   có trong repo ⇒ adapter không bịa API thừa, không dựng URL, không tự tạo request (PC-15).

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

export type PlaygamaAdEvent = 'rewarded' | 'failed' | 'user_closed';
export type PlaygamaInterstitialEvent = 'shown' | 'failed';

/** Mặt phẳng bridge tối thiểu mà chủ nhà tiêm vào (hoặc dựng sẵn trên global). */
export interface PlaygamaBridge {
  readonly storage: {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
  };
  readonly ads: {
    showRewardedVideo(place: string, cb: (event: PlaygamaAdEvent) => void): void;
    showInterstitial(cb: (event: PlaygamaInterstitialEvent) => void): void;
  };
  readonly lifecycle: {
    onPause(cb: () => void): void;
    onResume(cb: () => void): void;
    onAudioEnabledChange(cb: (enabled: boolean) => void): void;
    setAudioEnabled(on: boolean): void;
  };
}

/** Bảng từ vựng rewarded — Playgama và ytgame KHÁC nhau nên mỗi adapter giữ bảng riêng. */
const REWARDED_OUTCOME: Record<PlaygamaAdEvent, AdOutcome> = {
  rewarded: 'granted',
  failed: 'failed',
  user_closed: 'dismissed',
};
const INTERSTITIAL_OUTCOME: Record<PlaygamaInterstitialEvent, AdOutcome> = {
  shown: 'granted',
  failed: 'failed',
};
/**
 * Bảng KHOÁ: hàm nào phần dịch từ vựng này SẼ GỌI. Thiếu bất kỳ hàm nào ⇒ cả phần đó coi như
 * nền tảng vắng (rơi về Null Object). Gate một hàm rồi gọi hàm khác chính là lỗi C9(a).
 */
const STORAGE_METHODS: readonly string[] = ['getItem', 'setItem'];
const ADS_METHODS: readonly string[] = ['showRewardedVideo', 'showInterstitial'];
const LIFECYCLE_METHODS: readonly string[] = [
  'onPause',
  'onResume',
  'onAudioEnabledChange',
  'setAudioEnabled',
];
/** Tên global do chủ nhà dựng (đọc LAZY — pack B2 §8). */
const PLAYGAMA_GLOBAL = 'Playgama';

function storageSource(bridge: PlaygamaBridge | null): SdkStorageSource | null {
  if (bridge === null || !hasMethods(bridge.storage, STORAGE_METHODS)) {
    return null;
  }
  const b = bridge;
  return {
    read: (key) => b.storage.getItem(key),
    write: (key, value) => b.storage.setItem(key, value),
  };
}

function adsSource(bridge: PlaygamaBridge | null): SdkAdsSource | null {
  if (bridge === null || !hasMethods(bridge.ads, ADS_METHODS)) return null;
  const b = bridge;
  return {
    rewarded: (place: RewardedPlacement, done) => {
      b.ads.showRewardedVideo(place, (event) => done(outcomeFor(REWARDED_OUTCOME, event)));
    },
    interstitial: (done) => {
      b.ads.showInterstitial((event) => done(outcomeFor(INTERSTITIAL_OUTCOME, event)));
    },
  };
}

function lifecycleSource(bridge: PlaygamaBridge | null): SdkLifecycleSource | null {
  if (bridge === null || !hasMethods(bridge.lifecycle, LIFECYCLE_METHODS)) return null;
  const b = bridge;
  return {
    onPause: (handler) => b.lifecycle.onPause(handler),
    onResume: (handler) => b.lifecycle.onResume(handler),
    onAudioEnabled: (handler) => b.lifecycle.onAudioEnabledChange(handler),
    setAudioEnabled: (on) => b.lifecycle.setAudioEnabled(on),
  };
}

/** Adapter Playgama — bridge vắng mặt thì từng lời gọi rơi về Null Object (PC-20). */
export function createPlaygamaAdapter(bridge?: PlaygamaBridge): PlatformAdapter {
  const atHand = (): PlaygamaBridge | null =>
    bridge ?? globalObject<PlaygamaBridge>(PLAYGAMA_GLOBAL);
  const sources: SdkSources = {
    storage: () => storageSource(atHand()),
    ads: () => adsSource(atHand()),
    lifecycle: () => lifecycleSource(atHand()),
  };
  return createSdkAdapter(sources, createNullAdapter());
}
