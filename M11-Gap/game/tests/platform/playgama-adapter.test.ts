// Playgama adapter — bridge GIẢ tiêm vào (tham số hoặc globalThis.Playgama).
// Phủ: storage map đúng 4 khoá DATA-MODEL §1.2 · rewarded 3 trạng thái (thành/thất bại/từ chối)
// · recorder THỨ TỰ lời gọi (nhóm F) · lifecycle pause/resume/mute (nhóm I, PC-17)
// · bridge VẪN absence ⇒ không crash (PC-20) · adapter đọc global LAZY lúc gọi (pack §8).
//
// HỢP ĐỒNG CHỐT Ở TEST NÀY: src/platform/playgamaAdapter.ts export
//   export function createPlaygamaAdapter(bridge?: PlaygamaBridge): PlatformAdapter // tên chốt ở test này
//   tham số tiêm thẳng CÓ ƯU TIÊN hơn global; không có cả hai ⇒ hành vi như null adapter.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createPlaygamaAdapter } from '../../src/platform/playgamaAdapter';
import {
  PLATFORM_STORAGE_KEYS,
  REWARDED_PLACEMENTS,
  clearPlatformGlobal,
  fakePlaygamaBridge,
  installPlatformGlobal,
  settlesImmediately,
  type AnyAdapter,
  type PlaygamaFake,
} from './helpers/fakes';

let bridge: PlaygamaFake;
let adapter: AnyAdapter;

beforeEach(() => {
  clearPlatformGlobal('Playgama');
  bridge = fakePlaygamaBridge();
  adapter = createPlaygamaAdapter(bridge);
});

afterEach(() => {
  clearPlatformGlobal('Playgama');
});

describe('playgamaAdapter — storage', () => {
  it('PC-16 / TC-SAV-01: set/get map NGUYÊN VĂN 4 khoá DATA-MODEL (bridge thấy đúng khoá, đúng value, đúng thứ tự)', () => {
    const values: Record<string, string> = {
      'm11.save': '{"version":1,"progress":{"n":3}}',
      'm11.save.good': '{"version":1,"progress":{"n":2}}',
      'm11.wardrobe': '{"activeSkin":"kraft"}',
      'm11.log': '["session_start"]',
    };
    for (const key of PLATFORM_STORAGE_KEYS) {
      adapter.storage.set(key, values[key]);
    }
    expect(bridge.methodsWith('storage.setItem')).toEqual([
      'storage.setItem',
      'storage.setItem',
      'storage.setItem',
      'storage.setItem',
    ]);
    expect(bridge.callsWith('storage.setItem').map((args) => args[0])).toEqual([...PLATFORM_STORAGE_KEYS]);
    expect(bridge.callsWith('storage.setItem').map((args) => args[1])).toEqual([...Object.values(values)]);
    for (const key of PLATFORM_STORAGE_KEYS) {
      expect(adapter.storage.get(key)).toBe(values[key]);
    }
    expect(adapter.storage.get('m11.unknown')).toBeNull();
    expect(bridge.callsWith('storage.getItem').slice(-1)).toEqual([['m11.unknown']]);
  });

  it('TC-SAV-07 / TC-NET-04: bridge NÉM khi ghi (quota/ẩn danh) ⇒ adapter.set nuốt lỗi, lượt ghi sau vẫn tới bridge', () => {
    bridge.throwOnWrite.add('m11.save');
    expect(() => adapter.storage.set('m11.save', '{"version":1}')).not.toThrow();
    expect(() => adapter.storage.set('m11.log', '[]')).not.toThrow();
    expect(bridge.callsWith('storage.setItem')).toHaveLength(2);
    expect(adapter.storage.get('m11.log')).toBe('[]');
    expect(adapter.storage.get('m11.save')).toBeNull();
  });
});

describe('playgamaAdapter — ads (PC-13, nhóm F)', () => {
  it('TC-SAO-03: có bridge ⇒ rewarded placement undo đi ĐÚNG 1 lời gọi bridge (granted, không hỏi cổng available)', async () => {
    expect(await adapter.ads.showRewarded('undo')).toEqual({ status: 'granted', place: 'undo' });
    expect(bridge.callsWith('ads.showRewardedVideo')).toEqual([['undo']]);
  });

  it('TC-AD-07 / PC-14: bridge báo failed ⇒ status failed (ẩn nút ad, luồng không bị chặn)', async () => {
    const failing = createPlaygamaAdapter(fakePlaygamaBridge({ rewardedEvent: 'failed' }));
    expect(await failing.ads.showRewarded('hint')).toEqual({ status: 'failed', place: 'hint' });
  });

  it('PC-13: bridge báo user_closed (người chơi tắt trước khi xong) ⇒ status dismissed, không phải granted', async () => {
    const closed = createPlaygamaAdapter(fakePlaygamaBridge({ rewardedEvent: 'user_closed' }));
    expect(await closed.ads.showRewarded('continue')).toEqual({ status: 'dismissed', place: 'continue' });
  });

  it('nhóm F: 4 placement rewarded đi qua bridge ĐÚNG THỨ TỰ tự gọi, không tự thêm lời gọi nào khác', async () => {
    for (const place of REWARDED_PLACEMENTS) {
      await adapter.ads.showRewarded(place);
    }
    expect(bridge.callsWith('ads.showRewardedVideo')).toEqual([['undo'], ['hint'], ['continue'], ['ink_x2']]);
    expect(bridge.methodsWith('ads.')).toEqual([
      'ads.showRewardedVideo',
      'ads.showRewardedVideo',
      'ads.showRewardedVideo',
      'ads.showRewardedVideo',
    ]);
  });

  it('PC-14: interstitial dùng đường showInterstitial riêng, không lẫn vào rewarded', async () => {
    expect(await adapter.ads.showInterstitial()).toEqual({ status: 'granted', place: 'interstitial' });
    expect(bridge.methodsWith('ads.')).toEqual(['ads.showInterstitial']);
  });
});

describe('playgamaAdapter — lifecycle (PC-17)', () => {
  it('TC-PSE-01/03/04: bridge phát pause/resume/audio ⇒ handler đã đăng ký chạy ĐÚNG THỨ TỰ, onMute nhận giá trị đã map', () => {
    const log: string[] = [];
    adapter.lifecycle.onPause(() => log.push('pause#1'));
    adapter.lifecycle.onResume(() => log.push('resume#1'));
    adapter.lifecycle.onMute((muted) => log.push('mute:' + String(muted)));
    adapter.lifecycle.onPause(() => log.push('pause#2'));
    expect(bridge.methodsWith('lifecycle.')).toEqual([
      'lifecycle.onPause',
      'lifecycle.onResume',
      'lifecycle.onAudioEnabledChange',
      'lifecycle.onPause',
    ]);
    expect(log).toEqual([]);
    bridge.emit('pause');
    bridge.emit('audio_enabled', false);
    bridge.emit('resume');
    bridge.emit('pause');
    expect(log).toEqual(['pause#1', 'pause#2', 'mute:true', 'resume#1', 'pause#1', 'pause#2']);
  });

  it('TC-PSE-02: mute trong game AND với mute nền tảng — game bỏ mute không gỡ được lệnh mute của nền tảng', () => {
    expect(adapter.lifecycle.isMuted()).toBe(false);
    adapter.lifecycle.mute(true);
    expect(bridge.callsWith('lifecycle.setAudioEnabled')).toEqual([['false']]);
    expect(adapter.lifecycle.isMuted()).toBe(true);
    adapter.lifecycle.mute(false);
    expect(adapter.lifecycle.isMuted()).toBe(false);
    bridge.emit('audio_enabled', false);
    expect(adapter.lifecycle.isMuted()).toBe(true);
    adapter.lifecycle.mute(false);
    expect(adapter.lifecycle.isMuted()).toBe(true);
    bridge.emit('audio_enabled', true);
    expect(adapter.lifecycle.isMuted()).toBe(false);
  });
});

describe('playgamaAdapter — nền tảng vắng / đọc global LAZY (pack §8, PC-20)', () => {
  it('TC-SAO-01 / TC-ERR-04: bridge VẪN absence ⇒ adapter không crash, ad unavailable settle ngay', async () => {
    const bare = createPlaygamaAdapter();
    expect(bare.storage.get('m11.save')).toBeNull();
    expect(() => bare.storage.set('m11.save', '{}')).not.toThrow();
    expect(await settlesImmediately(bare.ads.showRewarded('undo'))).toEqual({
      status: 'unavailable',
      place: 'undo',
    });
    expect(await settlesImmediately(bare.ads.showInterstitial())).toEqual({
      status: 'unavailable',
      place: 'interstitial',
    });
    expect(() => bare.lifecycle.onPause(() => undefined)).not.toThrow();
    expect(bare.lifecycle.isMuted()).toBe(false);
  });

  it('pack §8: adapter đọc globalPlaygama LAZY lúc gọi; bridge tiêm thẳng thắng global', async () => {
    clearPlatformGlobal('Playgama');
    const lazy = createPlaygamaAdapter();
    // lạnh: chưa có bridge trên global ⇒ cửa ad trả unavailable NGAY trong kết quả (A6 — không có cổng hỏi trước)
    expect(await settlesImmediately(lazy.ads.showRewarded('undo'))).toEqual({
      status: 'unavailable',
      place: 'undo',
    });
    const host = fakePlaygamaBridge();
    installPlatformGlobal('Playgama', host);
    // adapter phải đọc global LÚC GỌI: cùng object lazy ⇒ granted, và host nhận đúng 1 lời gọi
    expect(await lazy.ads.showRewarded('ink_x2')).toEqual({ status: 'granted', place: 'ink_x2' });
    expect(host.callsWith('ads.showRewardedVideo')).toEqual([['ink_x2']]);

    const injected = fakePlaygamaBridge({ rewardedEvent: 'user_closed' });
    const preferred = createPlaygamaAdapter(injected);
    expect(await preferred.ads.showRewarded('undo')).toEqual({ status: 'dismissed', place: 'undo' });
    expect(injected.callsWith('ads.showRewardedVideo')).toEqual([['undo']]);
  });
});
