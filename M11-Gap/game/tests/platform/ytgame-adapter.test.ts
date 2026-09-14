// ytgame adapter — bridge GIẢ tiêm vào (tham số hoặc globalThis.ytgame).
// Bridge này nói chuyện KHÁC Playgama (data.loadData/dataSave callback, ad.showRewarded,
// onAudioEnabledChange, mute) — adapter phải map về ĐÚNG hợp đồng PlatformAdapter như nhau
// (TC-SAO-03: 1 interface, 3 adapter). Phủ storage/rewarded 3 trạng thái/lifecycle order/PC-20.
//
// HỢP ĐỒNG CHỐT Ở TEST NÀY: src/platform/ytgameAdapter.ts export
//   export function createYtgameAdapter(bridge?: YtgameBridge): PlatformAdapter // tên chốt ở test này
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createYtgameAdapter } from '../../src/platform/ytgameAdapter';
import {
  PLATFORM_STORAGE_KEYS,
  REWARDED_PLACEMENTS,
  clearPlatformGlobal,
  fakeYtgameBridge,
  installPlatformGlobal,
  settlesImmediately,
  type AnyAdapter,
  type YtgameFake,
} from './helpers/fakes';

let bridge: YtgameFake;
let adapter: AnyAdapter;

beforeEach(() => {
  clearPlatformGlobal('ytgame');
  bridge = fakeYtgameBridge();
  adapter = createYtgameAdapter(bridge);
});

afterEach(() => {
  clearPlatformGlobal('ytgame');
});

describe('ytgameAdapter — storage', () => {
  it('PC-16 / TC-SAV-01: 4 khoá DATA-MODEL đi nguyên văn qua data.dataSave, đọc lại qua data.loadData', () => {
    const values: Record<string, string> = {
      'm11.save': '{"version":1,"progress":{"n":4}}',
      'm11.save.good': '{"version":1,"progress":{"n":3}}',
      'm11.wardrobe': '{"activeSkin":"kraft"}',
      'm11.log': '["level_complete"]',
    };
    for (const key of PLATFORM_STORAGE_KEYS) {
      adapter.storage.set(key, values[key]);
    }
    expect(bridge.callsWith('data.dataSave').map((args) => args[0])).toEqual([...PLATFORM_STORAGE_KEYS]);
    expect(bridge.callsWith('data.dataSave').map((args) => args[1])).toEqual([...Object.values(values)]);
    for (const key of PLATFORM_STORAGE_KEYS) {
      expect(adapter.storage.get(key)).toBe(values[key]);
    }
    expect(bridge.callsWith('data.loadData').map((args) => args[0])).toEqual([...PLATFORM_STORAGE_KEYS]);
    expect(adapter.storage.get('m11.absent')).toBeNull();
  });

  it('TC-SAV-07 / TC-NET-04: nền tảng từ chối ghi (cb false) VÀ bridge ném — cả hai đường adapter.set đều nuốt lỗi', () => {
    const rejected = createYtgameAdapter(fakeYtgameBridge({ saveOk: false }));
    expect(() => rejected.storage.set('m11.save', '{"version":1}')).not.toThrow();
    expect(rejected.storage.get('m11.save')).toBeNull();

    bridge.throwOnWrite.add('m11.log');
    expect(() => adapter.storage.set('m11.log', '[]')).not.toThrow();
    expect(() => adapter.storage.set('m11.wardrobe', '{}')).not.toThrow();
    expect(bridge.callsWith('data.dataSave').map((args) => args[0])).toEqual(['m11.log', 'm11.wardrobe']);
    expect(adapter.storage.get('m11.wardrobe')).toBe('{}');
  });
});

describe('ytgameAdapter — ads (PC-13, nhóm F)', () => {
  it('PC-13: rewarded 3 trạng thái của bridge map đúng 3 trạng thái adapter (reward/error/close)', async () => {
    const granted = createYtgameAdapter(fakeYtgameBridge({ rewardedEvent: 'reward' }));
    const failed = createYtgameAdapter(fakeYtgameBridge({ rewardedEvent: 'error' }));
    const dismissed = createYtgameAdapter(fakeYtgameBridge({ rewardedEvent: 'close' }));
    expect(await granted.ads.showRewarded('undo')).toEqual({ status: 'granted', place: 'undo' });
    expect(await failed.ads.showRewarded('undo')).toEqual({ status: 'failed', place: 'undo' });
    expect(await dismissed.ads.showRewarded('undo')).toEqual({ status: 'dismissed', place: 'undo' });
  });

  it('nhóm F: 4 placement rewarded đúng 4 lời gọi bridge theo thứ tự, interstitial đi đường riêng', async () => {
    for (const place of REWARDED_PLACEMENTS) {
      await adapter.ads.showRewarded(place);
    }
    const inter = await adapter.ads.showInterstitial();
    expect(inter).toEqual({ status: 'granted', place: 'interstitial' });
    expect(bridge.callsWith('ad.')).toEqual([
      ['undo'],
      ['hint'],
      ['continue'],
      ['ink_x2'],
      [],
    ]);
    expect(bridge.methodsWith('ad.')).toEqual([
      'ad.showRewarded',
      'ad.showRewarded',
      'ad.showRewarded',
      'ad.showRewarded',
      'ad.showInterstitial',
    ]);
  });
});

describe('ytgameAdapter — lifecycle (PC-17)', () => {
  it('TC-PSE-01/03/04: bridge phát pause/resume/audio ⇒ handler chạy đúng thứ tự đăng ký, onMute nhận giá trị đã đảo', () => {
    const log: string[] = [];
    adapter.lifecycle.onResume(() => log.push('resume'));
    adapter.lifecycle.onPause(() => log.push('pause#1'));
    adapter.lifecycle.onMute((muted) => log.push('mute:' + String(muted)));
    adapter.lifecycle.onPause(() => log.push('pause#2'));
    expect(bridge.methodsWith('on')).toEqual(['onResume', 'onPause', 'onAudioEnabledChange', 'onPause']);
    bridge.emit('resume');
    bridge.emit('pause');
    bridge.emit('audio_enabled', true);
    bridge.emit('pause');
    bridge.emit('audio_enabled', false);
    expect(log).toEqual(['resume', 'pause#1', 'pause#2', 'mute:false', 'pause#1', 'pause#2', 'mute:true']);
  });

  it('TC-PSE-02: mute trong game AND mute nền tảng — cả hai nguồn đều cắt tiếng, bỏ một nguồn chưa đủ', () => {
    adapter.lifecycle.mute(true);
    expect(bridge.callsWith('mute')).toEqual([['true']]);
    expect(adapter.lifecycle.isMuted()).toBe(true);
    bridge.emit('audio_enabled', false);
    expect(adapter.lifecycle.isMuted()).toBe(true);
    adapter.lifecycle.mute(false);
    expect(bridge.callsWith('mute')).toEqual([['true'], ['false']]);
    expect(adapter.lifecycle.isMuted()).toBe(true);
    bridge.emit('audio_enabled', true);
    expect(adapter.lifecycle.isMuted()).toBe(false);
  });
});

describe('ytgameAdapter — nền tảng vắng / global LAZY (pack §8, PC-20)', () => {
  it('TC-SAO-01 / TC-ERR-04: bridge VẪN absence ⇒ không crash, ad unavailable settle ngay', async () => {
    const bare = createYtgameAdapter();
    expect(bare.storage.get('m11.save')).toBeNull();
    expect(() => bare.storage.set('m11.save', '{}')).not.toThrow();
    expect(await settlesImmediately(bare.ads.showRewarded('continue'))).toEqual({
      status: 'unavailable',
      place: 'continue',
    });
    expect(bare.lifecycle.isMuted()).toBe(false);
    expect(() => bare.lifecycle.onResume(() => undefined)).not.toThrow();
  });

  it('pack §8: adapter đọc globalThis.ytgame LAZY lúc gọi, tham số tiêm thẳng thắng global', async () => {
    clearPlatformGlobal('ytgame');
    const lazy = createYtgameAdapter();
    // lạnh: global chưa có ytgame ⇒ unavailable NGAY trong kết quả (A6 — không cổng hỏi trước), host 0 lời gọi
    expect(await settlesImmediately(lazy.ads.showRewarded('undo'))).toEqual({
      status: 'unavailable',
      place: 'undo',
    });
    const host = fakeYtgameBridge();
    installPlatformGlobal('ytgame', host);
    // adapter đọc globalThis LÚC GỌI: cùng object lazy ⇒ granted, host nhận đúng 1 lời gọi
    expect(await lazy.ads.showRewarded('hint')).toEqual({ status: 'granted', place: 'hint' });
    expect(host.callsWith('ad.showRewarded')).toEqual([['hint']]);

    const injected = fakeYtgameBridge({ rewardedEvent: 'error' });
    installPlatformGlobal('ytgame', fakeYtgameBridge());
    const preferred = createYtgameAdapter(injected);
    expect(await preferred.ads.showRewarded('undo')).toEqual({ status: 'failed', place: 'undo' });
  });
});
