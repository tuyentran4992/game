// Unit test SDK adapter (P0-1): namespaced `ytgame.*`, fallback phẳng, và
// fallback localStorage khi KHÔNG có SDK. Chạy trong env node → tự stub window.
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

beforeEach(() => {
  ls = makeLocalStorage();
  vi.stubGlobal('window', { localStorage: ls } as unknown as Window);
  vi.stubGlobal('document', undefined);
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** SDK "thật": bề mặt NAMESPACED giống Playables. */
function mockNamespaced(overrides: Record<string, unknown> = {}) {
  const calls = { firstFrame: 0, ready: 0, saved: [] as string[], scores: [] as unknown[] };
  const yt: Record<string, unknown> = {
    IN_PLAYABLES_ENV: true,
    SDK_VERSION: '1.2.3',
    game: {
      firstFrameReady: () => { calls.firstFrame++; },
      gameReady: () => { calls.ready++; },
      saveData: (d: string) => { calls.saved.push(d); return Promise.resolve(); },
      loadData: () => Promise.resolve(calls.saved[calls.saved.length - 1] ?? null),
    },
    system: {
      onPause: (cb: () => void) => { yt._pause = cb; },
      onResume: (cb: () => void) => { yt._resume = cb; },
      isAudioEnabled: () => true,
      onAudioEnabledChange: (cb: (e: boolean) => void) => { yt._audio = cb; },
      getLanguage: () => 'vi',
    },
    engagement: { sendScore: (p: { value: number }) => { calls.scores.push(p); } },
    ads: {
      requestInterstitialAd: () => Promise.resolve(),
      requestRewardedAd: () => Promise.resolve(),
    },
    ...overrides,
  };
  (window as unknown as { ytgame: unknown }).ytgame = yt;
  return { yt, calls };
}

describe('SDK adapter — bề mặt NAMESPACED (Playables thật)', () => {
  it('phát hiện SDK + IN_PLAYABLES_ENV + version', () => {
    mockNamespaced();
    const s = new SdkHandler();
    expect(s.hasSdk).toBe(true);
    expect(s.inPlayables).toBe(true);
    expect(s.sdkVersion).toBe('1.2.3');
    expect(s.getLanguage()).toBe('vi');
  });

  it('firstFrameReady/gameReady gọi ĐÚNG 1 lần (idempotent)', () => {
    const { calls } = mockNamespaced();
    const s = new SdkHandler();
    s.firstFrameReady(); s.firstFrameReady();
    s.gameReady(); s.gameReady(); s.gameReady();
    expect(calls.firstFrame).toBe(1);
    expect(calls.ready).toBe(1);
    expect(s.isGameReadySent).toBe(true);
  });

  it('saveData ghi platform + mirror localStorage; loadData parse lại', async () => {
    const { calls } = mockNamespaced();
    const s = new SdkHandler();
    const ok = await s.saveData({ schema_version: 2, best_level: 4, last_updated_ts: 100 });
    expect(ok).toBe(true);
    expect(s.savedToPlatform).toBe(true);
    expect(calls.saved.length).toBe(1);
    expect(ls.getItem(LOCAL_SAVE_KEY)).toBe(calls.saved[0]);

    const back = await s.loadData() as { best_level: number };
    expect(back.best_level).toBe(4);
  });

  it('loadData LAST-WRITE-WINS theo last_updated_ts (local mới hơn thì thắng)', async () => {
    mockNamespaced({
      game: {
        firstFrameReady: () => {}, gameReady: () => {},
        saveData: () => Promise.resolve(),
        loadData: () => Promise.resolve(JSON.stringify({ best_level: 1, last_updated_ts: 10 })),
      },
    });
    ls.setItem(LOCAL_SAVE_KEY, JSON.stringify({ best_level: 9, last_updated_ts: 999 }));
    const s = new SdkHandler();
    const d = await s.loadData() as { best_level: number };
    expect(d.best_level).toBe(9);
  });

  it('loadData chọn bản platform khi platform mới hơn', async () => {
    mockNamespaced({
      game: {
        firstFrameReady: () => {}, gameReady: () => {},
        saveData: () => Promise.resolve(),
        loadData: () => Promise.resolve(JSON.stringify({ best_level: 12, last_updated_ts: 5000 })),
      },
    });
    ls.setItem(LOCAL_SAVE_KEY, JSON.stringify({ best_level: 2, last_updated_ts: 4 }));
    const s = new SdkHandler();
    const d = await s.loadData() as { best_level: number };
    expect(d.best_level).toBe(12);
  });

  it('sendScore gửi ĐÚNG shape { value }', () => {
    const { calls } = mockNamespaced();
    new SdkHandler().sendScore(27);
    expect(calls.scores).toEqual([{ value: 27 }]);
  });

  it('pause/resume/audio callback được bind qua ytgame.system', () => {
    const { yt } = mockNamespaced();
    const s = new SdkHandler();
    let paused = false, resumed = false, audio = true;
    s.onPause(() => { paused = true; });
    s.onResume(() => { resumed = true; });
    s.onAudioEnabledChange((e) => { audio = e; });
    (yt._pause as () => void)();
    (yt._resume as () => void)();
    (yt._audio as (e: boolean) => void)(false);
    expect(paused).toBe(true);
    expect(resumed).toBe(true);
    expect(audio).toBe(false);
    expect(s.usesVisibilityFallback).toBe(false);
  });

  it('rewarded resolve → true; reject → false (KHÔNG tặng thưởng)', async () => {
    mockNamespaced();
    expect(await new SdkHandler().requestRewardedAd('extra_tube')).toBe(true);

    mockNamespaced({ ads: { requestRewardedAd: () => Promise.reject(new Error('closed')) } });
    expect(await new SdkHandler().requestRewardedAd('extra_tube')).toBe(false);
  });

  it('interstitial lỗi không ném ra ngoài', async () => {
    mockNamespaced({ ads: { requestInterstitialAd: () => Promise.reject(new Error('no fill')) } });
    await expect(new SdkHandler().requestInterstitialAd()).resolves.toBeUndefined();
  });

  it('B2-5: kiểm tra ad KHẢ DỤNG trước khi mời xem (không có ads namespace → false)', () => {
    mockNamespaced();
    const ok = new SdkHandler();
    expect(ok.isRewardedAvailable()).toBe(true);
    expect(ok.isInterstitialAvailable()).toBe(true);

    mockNamespaced({ ads: {} });
    const none = new SdkHandler();
    expect(none.isRewardedAvailable()).toBe(false);
    expect(none.isInterstitialAvailable()).toBe(false);
  });

  it("B2-8: rewarded gửi ĐÚNG tag 'extra-tube' (không còn 'extra_tube')", async () => {
    const tags: unknown[] = [];
    mockNamespaced({ ads: { requestRewardedAd: (t: string) => { tags.push(t); return Promise.resolve(); } } });
    await new SdkHandler().requestRewardedAd('extra-tube');
    expect(tags).toEqual(['extra-tube']);
  });

  it('B2-3: interstitial nhận timeout tuỳ biến → luồng NEXT không bao giờ treo', async () => {
    mockNamespaced({ ads: { requestInterstitialAd: () => new Promise<void>(() => {}) } });
    const s = new SdkHandler();
    const t0 = Date.now();
    await expect(s.requestInterstitialAd(40)).resolves.toBeUndefined();
    expect(Date.now() - t0).toBeLessThan(2000);
  });

  it('B2-1: rewarded timeout → KHÔNG cấp thưởng (false) khi SDK có mặt', async () => {
    mockNamespaced({ ads: { requestRewardedAd: () => new Promise<void>(() => {}) } });
    expect(await new SdkHandler().requestRewardedAd('hint', 40)).toBe(false);
  });
});

describe('SDK adapter — bề mặt PHẲNG (legacy/mock) vẫn chạy', () => {
  it('dùng ytgame.gameReady()/saveData() phẳng khi không có namespace', async () => {
    const calls = { ready: 0, first: 0, saved: '' };
    (window as unknown as { ytgame: unknown }).ytgame = {
      firstFrameReady: () => { calls.first++; },
      gameReady: () => { calls.ready++; },
      saveData: (d: string) => { calls.saved = d; },
      loadData: () => JSON.stringify({ best_level: 3, last_updated_ts: 7 }),
      sendScore: () => {},
      isAudioEnabled: () => false,
    };
    const s = new SdkHandler();
    s.firstFrameReady(); s.gameReady();
    expect(calls.first).toBe(1);
    expect(calls.ready).toBe(1);
    expect(s.isAudioEnabled()).toBe(false);

    await s.saveData({ best_level: 3, last_updated_ts: 7 });
    expect(JSON.parse(calls.saved).best_level).toBe(3);
    const d = await s.loadData() as { best_level: number };
    expect(d.best_level).toBe(3);
  });
});

describe('SDK adapter — KHÔNG có SDK (dev/offline): localStorage fallback', () => {
  it('không crash, save/load qua localStorage, rewarded mở khoá để test', async () => {
    (window as unknown as { ytgame?: unknown }).ytgame = undefined;
    const s = new SdkHandler();
    expect(s.hasSdk).toBe(false);
    expect(s.inPlayables).toBe(false);
    expect(() => { s.firstFrameReady(); s.gameReady(); s.sendScore(5); }).not.toThrow();

    const ok = await s.saveData({ best_level: 2, last_updated_ts: 1 });
    expect(ok).toBe(true);
    expect(s.savedToPlatform).toBe(false);
    const d = await s.loadData() as { best_level: number };
    expect(d.best_level).toBe(2);
    expect(await s.requestRewardedAd('extra_tube')).toBe(true); // dev unlock
    await expect(s.requestInterstitialAd()).resolves.toBeUndefined();
    expect(s.isAudioEnabled()).toBe(true);
    expect(s.getLanguage()).toBe('en');
  });

  it('save rác (circular) → false, không ném', async () => {
    (window as unknown as { ytgame?: unknown }).ytgame = undefined;
    const s = new SdkHandler();
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(await s.saveData(circular)).toBe(false);
  });
});
