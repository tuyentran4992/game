// Integration test: pacing quảng cáo phải SỐNG QUA RELOAD (AUDIT §B2-2).
// Nạp save v2.1 từ localStorage → ctx đọc block `ads` → gate hoạt động → mọi
// thay đổi được ghi lại vào payload (không reset cooldown khi refresh).
import { describe, it, expect, vi } from 'vitest';
import { LOCAL_SAVE_KEY } from '../sdk-handler';
import { INTERSTITIAL_COOLDOWN_MS } from '../logic/ad-pacing';

const store = new Map<string, string>();
const localStorageMock = {
  getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
  setItem: (k: string, v: string) => { store.set(k, String(v)); },
  removeItem: (k: string) => { store.delete(k); },
};
vi.stubGlobal('window', { localStorage: localStorageMock } as unknown as Window);
vi.spyOn(console, 'info').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});

const LAST = 1_700_000_000_000;
store.set(LOCAL_SAVE_KEY, JSON.stringify({
  schema_version: 2.1,
  best_level: 6,
  current_level: 7,
  best_moves: 14,
  best_moves_by_level: { '6': 14 },
  flags: { tutorial_seen: true, muted: false, free_hint_used: true },
  ads: { last_interstitial_ts: LAST, levels_since_ad: 2 },
  session: null,
  last_updated_ts: LAST,
}));

const { ctx } = await import('../context');

function saved() {
  return JSON.parse(store.get(LOCAL_SAVE_KEY)!) as {
    ads: { last_interstitial_ts: number; levels_since_ad: number };
    flags: { free_hint_used: boolean };
    schema_version: number;
  };
}

describe('context — pacing ad persist qua reload (save v2.1)', () => {
  it('đọc block ads + flags.free_hint_used từ save', async () => {
    await ctx.load();
    expect(ctx.ads).toEqual({ last_interstitial_ts: LAST, levels_since_ad: 2 });
    expect(ctx.freeHintUsed).toBe(true);
  });

  it('gate dùng đúng state đã nạp: trong cooldown → chặn, hết cooldown → cho', async () => {
    await ctx.load();
    expect(ctx.canShowInterstitial(7, LAST + 10_000)).toBe(false);
    expect(ctx.canShowInterstitial(7, LAST + INTERSTITIAL_COOLDOWN_MS)).toBe(true);
    expect(ctx.canShowInterstitial(2, LAST + INTERSTITIAL_COOLDOWN_MS)).toBe(false); // level 1-2 miễn ad
  });

  it('markInterstitialShown + onLevelClear được GHI vào payload (không chỉ trong RAM)', async () => {
    await ctx.load();
    const now = LAST + 200_000;
    ctx.markInterstitialShown(now);
    await ctx.saveNow();
    expect(saved().ads).toEqual({ last_interstitial_ts: now, levels_since_ad: 0 });
    expect(saved().schema_version).toBe(2.1);

    ctx.onLevelClear(7, 15);          // clear 1 level → +1 levels_since_ad
    await ctx.saveNow();
    expect(saved().ads).toEqual({ last_interstitial_ts: now, levels_since_ad: 1 });

    // Ngay sau 1 ad: chưa đủ 2 level & chưa hết cooldown → KHÔNG quảng cáo tiếp
    expect(ctx.canShowInterstitial(8, now + 1000)).toBe(false);
  });

  it('markFreeHintUsed persist flags.free_hint_used', async () => {
    await ctx.load();
    ctx.freeHintUsed = false;
    ctx.markFreeHintUsed();
    await ctx.saveNow();
    expect(saved().flags.free_hint_used).toBe(true);
  });
});
