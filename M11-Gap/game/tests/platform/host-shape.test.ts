// PC-20 / muc C9(a) — bridge PARTIAL (host dung nua nua object, hoac global bi object la chiem
// cho): adapter PHAI coi phan thieu la "nen tang vang" va roi ve Null Object, KHONG duoc nem
// TypeError tran. Test chot bang cach goi DUNG nhung cua ma phan dich tu vung hay bo sot.
// Rang buoc: 0 mang (PC-15), 0 window/document (vitest node), bridge chi la object thuong.
import { afterEach, describe, expect, it } from 'vitest';
import { createPlaygamaAdapter, type PlaygamaBridge } from '../../src/platform/playgamaAdapter';
import { createYtgameAdapter, type YtgameBridge } from '../../src/platform/ytgameAdapter';
import {
  clearPlatformGlobal,
  installPlatformGlobal,
  settlesImmediately,
  type AnyAdapter,
} from './helpers/fakes';

const SAVE_FIXTURE = JSON.stringify({ version: 1 });

/** Runtime hostile: dua object KHONG du shape vao tham so da kiem (type la a lie). */
function hostilePlaygama(shape: unknown): AnyAdapter {
  return createPlaygamaAdapter(shape as PlaygamaBridge) as AnyAdapter;
}
function hostileYtgame(shape: unknown): AnyAdapter {
  return createYtgameAdapter(shape as YtgameBridge) as AnyAdapter;
}

/** Moi cua adapter deu phai chay duoc ma khong nem — dung chung cho ca hai nen tang. */
function everyDoor(adapter: AnyAdapter): void {
  adapter.storage.get('m11.save');
  adapter.storage.set('m11.save', SAVE_FIXTURE);
  // 2 cửa ad là hàm duy nhất của mặt tiền ads (A6: không có cổng "available" để hỏi) — gọi
  // không chờ cũng không được ném ngay trong lượt.
  void adapter.ads.showRewarded('undo');
  void adapter.ads.showInterstitial();
  adapter.lifecycle.onPause(() => undefined);
  adapter.lifecycle.onResume(() => undefined);
  adapter.lifecycle.onMute(() => undefined);
  adapter.lifecycle.mute(true);
  adapter.lifecycle.mute(false);
}

afterEach(() => {
  clearPlatformGlobal('Playgama');
  clearPlatformGlobal('ytgame');
});

describe('bridge partial — playgama (PC-20)', () => {
  it('lifecycle thieu onPause/onResume/onAudioEnabledChange ⇒ coi nhu nen tang vang, 0 TypeError', () => {
    const setOnly = hostilePlaygama({ lifecycle: { setAudioEnabled: () => undefined } });
    expect(() => everyDoor(setOnly)).not.toThrow();
    expect(setOnly.lifecycle.isMuted()).toBe(false);
  });

  it('lifecycle chi co onAudioEnabledChange ⇒ mute()/isMuted() khong goi ham vang mat', () => {
    const audioOnly = hostilePlaygama({ lifecycle: { onAudioEnabledChange: () => undefined } });
    expect(() => everyDoor(audioOnly)).not.toThrow();
  });

  it('ads thieu showInterstitial ⇒ ca hai duong ad ve unavailable, khong crash, khong failed', async () => {
    const reply = (_place: string, cb: (event: string) => void): void => cb('rewarded');
    const halfAds = hostilePlaygama({ ads: { showRewardedVideo: reply } });
    expect(await settlesImmediately(halfAds.ads.showRewarded('undo'))).toEqual({
      status: 'unavailable',
      place: 'undo',
    });
    expect(await settlesImmediately(halfAds.ads.showInterstitial())).toEqual({
      status: 'unavailable',
      place: 'interstitial',
    });
  });

  it('storage chi co getItem ⇒ bo qua KV nua ve cua host, ghi xuong ban sao trong phien', () => {
    let hostReads = 0;
    const readOnly = hostilePlaygama({
      storage: {
        getItem: () => {
          hostReads += 1;
          return 'from-host';
        },
      },
    });
    expect(() => everyDoor(readOnly)).not.toThrow();
    expect(hostReads).toBe(0);
    readOnly.storage.set('m11.save', SAVE_FIXTURE);
    expect(readOnly.storage.get('m11.save')).toBe(SAVE_FIXTURE);
    expect(hostReads).toBe(0);
  });

  it('bridge rong dung qua GLOBAL ⇒ ca 3 phan deu lanh', async () => {
    installPlatformGlobal('Playgama', {});
    const cold = createPlaygamaAdapter() as AnyAdapter;
    expect(() => everyDoor(cold)).not.toThrow();
    // lanh nghia la khong ad ⇒ venue duy nhat de do la ket qua lan goi (A6)
    expect(await settlesImmediately(cold.ads.showRewarded('undo'))).toEqual({
      status: 'unavailable',
      place: 'undo',
    });
  });

  it('host ban ten su kien la (ke ca khoa prototype) ⇒ outcome van la AdOutcome hop le', async () => {
    const rewarded = (_place: string, cb: (event: string) => void): void => cb('toString');
    const interstitial = (cb: (event: string) => void): void => cb('__proto__');
    installPlatformGlobal('Playgama', { ads: { showRewardedVideo: rewarded, showInterstitial: interstitial } });
    const liar = createPlaygamaAdapter() as AnyAdapter;
    expect(await settlesImmediately(liar.ads.showRewarded('undo'))).toEqual({ status: 'failed', place: 'undo' });
    expect(await settlesImmediately(liar.ads.showInterstitial())).toEqual({
      status: 'failed',
      place: 'interstitial',
    });
  });
});

describe('bridge partial — ytgame (PC-20)', () => {
  it('bridge chi co mute ⇒ lifecycle khong goi onPause/onResume/onAudioEnabledChange vang mat', () => {
    const muteOnly = hostileYtgame({ mute: () => undefined });
    expect(() => everyDoor(muteOnly)).not.toThrow();
    expect(muteOnly.lifecycle.isMuted()).toBe(false);
  });

  it('bridge chi co onPause ⇒ toan bo phan lifecycle coi nhu vang', () => {
    const pauseOnly = hostileYtgame({ onPause: () => undefined });
    expect(() => everyDoor(pauseOnly)).not.toThrow();
  });

  it('data thieu dataSave ⇒ storage ve ban sao phien; ad thieu showInterstitial ⇒ unavailable', async () => {
    let hostReads = 0;
    const load = (_key: string, cb: (value: string | null) => void): void => {
      hostReads += 1;
      cb('from-host');
    };
    const showRewarded = (_place: string, cb: (event: string) => void): void => cb('reward');
    const half = hostileYtgame({ data: { loadData: load }, ad: { showRewarded } });
    expect(() => everyDoor(half)).not.toThrow();
    expect(hostReads).toBe(0);
    expect(await settlesImmediately(half.ads.showRewarded('undo'))).toEqual({
      status: 'unavailable',
      place: 'undo',
    });
    expect(await settlesImmediately(half.ads.showInterstitial())).toEqual({
      status: 'unavailable',
      place: 'interstitial',
    });
  });

  it('host ban ten su kien la ⇒ khong ro ham cua Object.prototype len tang goi', async () => {
    const rewarded = (_place: string, cb: (event: string) => void): void => cb('constructor');
    const interstitial = (cb: (event: string) => void): void => cb('valueOf');
    installPlatformGlobal('ytgame', { ad: { showRewarded: rewarded, showInterstitial: interstitial } });
    const liar = createYtgameAdapter() as AnyAdapter;
    // 'failed' (chứ KHÔNG phải 'unavailable') chứng minh cửa ad CÓ thật và đã được gọi
    expect(await settlesImmediately(liar.ads.showRewarded('hint'))).toEqual({ status: 'failed', place: 'hint' });
    expect(await settlesImmediately(liar.ads.showInterstitial())).toEqual({
      status: 'failed',
      place: 'interstitial',
    });
  });
});
