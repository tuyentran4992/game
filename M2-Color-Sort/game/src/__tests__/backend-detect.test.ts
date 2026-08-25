// Unit test multi-backend (M2 Phase 5): phát hiện active SDK + dispatch
// save/load/ads/ready/pause theo ĐÚNG backend:
//   ytgame (có mặt) → playgama (bridge, khi không có ytgame) → local.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SdkHandler, LOCAL_SAVE_KEY } from '../sdk-handler';

function makeLocalStorage() {
  const store = new Map<string, string>();
  return {
    store,
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => { store.set(k, String(v)); },
    removeItem: (k: string) => { store.delete(k); },
  };
}

let ls: ReturnType<typeof makeLocalStorage>;
let listeners: Record<string, (v: unknown) => void>;

function makeBridge(overrides: Record<string, unknown> = {}) {
  listeners = {};
  const bridge = {
    initialize: () => Promise.resolve(),
    EVENT_NAME: {
      PAUSE_STATE_CHANGED: 'pause_state_changed',
      AUDIO_STATE_CHANGED: 'audio_state_changed',
      INTERSTITIAL_STATE_CHANGED: 'interstitial_state_changed',
      REWARDED_STATE_CHANGED: 'rewarded_state_changed',
    },
    platform: { language: 'vi', isAudioEnabled: true, isPaused: false, sendMessage: vi.fn() },
    storage: {
      get: vi.fn(async (keys: string[]) => keys.map(() => null)),
      set: vi.fn(async () => {}),
      delete: vi.fn(async () => {}),
    },
    advertisement: {
      isInterstitialSupported: true,
      isRewardedSupported: true,
      showInterstitial: vi.fn(),
      showRewarded: vi.fn(() => { setTimeout(() => { listeners['rewarded_state_changed']?.('rewarded'); }, 0); }),
      on: vi.fn((e: string, cb: (v: unknown) => void) => { listeners[e] = cb; }),
    },
    ...overrides,
  };
  (window as unknown as { bridge?: unknown }).bridge = bridge;
  return bridge as unknown as Record<string, any>;
}

function mockNamespacedYt() {
  const calls = { saved: [] as string[], ready: 0, first: 0, scores: [] as unknown[] };
  const yt: Record<string, unknown> = {
    IN_PLAYABLES_ENV: true,
    SDK_VERSION: '1.2.3',
    game: {
      firstFrameReady: () => { calls.first++; },
      gameReady: () => { calls.ready++; },
      saveData: (d: string) => { calls.saved.push(d); return Promise.resolve(); },
      loadData: () => Promise.resolve(calls.saved[calls.saved.length - 1] ?? null),
    },
    system: {
      onPause: () => {}, onResume: () => {}, isAudioEnabled: () => true,
      onAudioEnabledChange: () => {}, getLanguage: () => 'vi',
    },
    engagement: { sendScore: (p: { value: number }) => { calls.scores.push(p); } },
    ads: { requestInterstitialAd: () => Promise.resolve(), requestRewardedAd: () => Promise.resolve() },
  };
  (window as unknown as { ytgame?: unknown }).ytgame = yt;
  return { yt, calls };
}

beforeEach(() => {
  ls = makeLocalStorage();
  vi.stubGlobal('window', { localStorage: ls } as unknown as Window);
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('Backend detection — thứ tự ytgame → playgama → local', () => {
  it('CÓ ytgame = backend ytgame (kể cả khi bridge cũng có) — YouTube không regress', () => {
    mockNamespacedYt();
    makeBridge();
    const s = new SdkHandler();
    expect(s.backend).toBe('ytgame');
    expect(s.useBridge).toBe(false);
    expect(s.hasSdk).toBe(true);
    expect(s.getLanguage()).toBe('vi');       // từ ytgame.system.getLanguage
  });

  it('KHÔNG ytgame nhưng CÓ bridge = backend playgama', async () => {
    makeBridge();
    const s = new SdkHandler();
    await s.ready();                              // chờ bridge.initialize() buffer xong
    expect(s.backend).toBe('playgama');
    expect(s.useBridge).toBe(true);
    expect(s.hasSdk).toBe(true);
    expect(s.inPlayables).toBe(false);
    expect(s.getLanguage()).toBe('vi');       // từ bridge.platform.language
  });

  it('KHÔNG SDK nào = backend local (dev/offline), không crash', () => {
    const s = new SdkHandler();
    expect(s.backend).toBe('local');
    expect(s.useBridge).toBe(false);
    expect(s.hasSdk).toBe(false);
    expect(s.getLanguage()).toBe('en');
    expect(() => { s.firstFrameReady(); s.gameReady(); s.sendScore(1); }).not.toThrow();
  });
});

describe('Save dispatch — theo backend đang chạy', () => {
  it('backend ytgame → ghi ytgame.game.saveData + mirror localStorage', async () => {
    const { calls } = mockNamespacedYt();
    const s = new SdkHandler();
    expect(s.backend).toBe('ytgame');
    const ok = await s.saveData({ best_level: 5, last_updated_ts: 10 });
    expect(ok).toBe(true);
    expect(s.savedToPlatform).toBe(true);
    expect(calls.saved.length).toBe(1);
    expect(ls.getItem(LOCAL_SAVE_KEY)).toBe(calls.saved[0]);
    const back = await s.loadData() as { best_level: number };
    expect(back.best_level).toBe(5);
  });

  it('backend playgama → ghi bridge.storage.set (cloud) + mirror localStorage', async () => {
    const bridge = makeBridge();
    const s = new SdkHandler();
    await s.ready();
    expect(s.backend).toBe('playgama');
    const ok = await s.saveData({ best_level: 9, last_updated_ts: 99 });
    expect(ok).toBe(true);
    expect(s.savedToPlatform).toBe(true);
    expect(bridge.storage.set).toHaveBeenCalledTimes(1);
    expect((bridge.storage.set as any).mock.calls[0][0]).toEqual(['neon_sort_save']);
    expect(ls.getItem(LOCAL_SAVE_KEY)).toContain('best_level');
  });

  it('backend playgama → load từ bridge.storage.get; không có → fallback localStorage', async () => {
    ls.setItem(LOCAL_SAVE_KEY, JSON.stringify({ best_level: 3, last_updated_ts: 7 }));
    const bridge = makeBridge();
    bridge.storage.get = vi.fn(async () => [null]) as any;
    const s = new SdkHandler();
    await s.ready();
    const d = await s.loadData() as { best_level: number };
    expect(d.best_level).toBe(3);              // fallback local
    // bridge trả data -> dùng bridge
    bridge.storage.get = vi.fn(async () => [JSON.stringify({ best_level: 22, last_updated_ts: 8 })]) as any;
    const d2 = await s.loadData() as { best_level: number };
    expect(d2.best_level).toBe(22);            // cloud mới hơn
  });

  it('backend local → save/load qua localStorage', async () => {
    const s = new SdkHandler();
    expect(s.backend).toBe('local');
    const ok = await s.saveData({ best_level: 2, last_updated_ts: 1 });
    expect(ok).toBe(true);
    expect(s.savedToPlatform).toBe(false);
    const d = await s.loadData() as { best_level: number };
    expect(d.best_level).toBe(2);
    expect(await s.requestRewardedAd('extra_tube')).toBe(true); // dev unlock
  });
});

describe('Backend dispatch — ready/ads/pause theo backend', () => {
  it('playgama gameReady → bridge.platform.sendMessage(game_ready)', async () => {
    const bridge = makeBridge();
    const s = new SdkHandler();
    await s.ready();
    expect(s.backend).toBe('playgama');
    s.gameReady();
    await new Promise((r) => setTimeout(r, 10));   // flush bridge init microtask
    expect(bridge.platform.sendMessage).toHaveBeenCalledWith('game_ready');
  });

  it('playgama rewarded: grant khi state === rewarded; close/immediate → false', async () => {
    const bridge = makeBridge();
    bridge.advertisement.showRewarded = vi.fn(() => {
      setTimeout(() => { listeners['rewarded_state_changed']?.('rewarded'); }, 0);
    }) as any;
    const s = new SdkHandler();
    await s.ready();
    const p1 = s.requestRewardedAd('hint');
    await new Promise((r) => setTimeout(r, 20));
    await expect(p1).resolves.toBe(true);      // grant vì state === 'rewarded'
  });

  it('playgama interstitial → showInterstitial + không block', async () => {
    const bridge = makeBridge();
    bridge.advertisement.on = vi.fn((e: string, cb: (v: unknown) => void) => { listeners[e] = cb; }) as any;
    const s = new SdkHandler();
    await s.ready();
    const p = s.requestInterstitialAd();
    await new Promise((r) => setTimeout(r, 10));
    expect(bridge.advertisement.showInterstitial).toHaveBeenCalled();
    listeners['interstitial_state_changed']?.('closed');   // đóng → resolve
    await expect(p).resolves.toBeUndefined();
  });

  it('playgama pause/audio callback buffer tới khi ready rồi fire', async () => {
    const bridge = makeBridge();
    const s = new SdkHandler();
    let paused = false, audio = true;
    s.onPause(() => { paused = true; });
    s.onAudioEnabledChange((e) => { audio = e; });
    await new Promise((r) => setTimeout(r, 10));   // ready
    listeners['pause_state_changed']?.(true);
    listeners['audio_state_changed']?.(false);
    expect(paused).toBe(true);
    expect(audio).toBe(false);
  });
});
