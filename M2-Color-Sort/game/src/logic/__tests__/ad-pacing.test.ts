// Unit test AD ECONOMY (AUDIT-COMMERCIAL §B2): cổng interstitial, luật gợi ý
// 1-lần/level + suất miễn phí onboarding, cap ống thưởng, và raceTimeout.
import { describe, it, expect, vi } from 'vitest';
import {
  AD_FLOW_TIMEOUT_MS,
  AD_WATCHDOG_MS,
  INTERSTITIAL_COOLDOWN_MS,
  INTERSTITIAL_MIN_LEVEL,
  INTERSTITIAL_MIN_LEVELS,
  REWARDED_TIMEOUT_MS,
  afterInterstitial,
  afterLevelCleared,
  canBuyExtraTube,
  emptyAdPacing,
  hintGrant,
  normalizeAdPacing,
  raceTimeout,
  shouldShowInterstitial,
} from '../ad-pacing';

const HINT_CFG = { oncePerLevel: true, costAd: true };

describe('interstitial pacing gate (M2-07 / B2-2)', () => {
  it('hằng số đúng spec: level ≥3, ≥2 level giữa 2 ad, cooldown 75 s, hạn chót 4 s', () => {
    expect(INTERSTITIAL_MIN_LEVEL).toBe(3);
    expect(INTERSTITIAL_MIN_LEVELS).toBe(2);
    expect(INTERSTITIAL_COOLDOWN_MS).toBe(75_000);
    expect(AD_FLOW_TIMEOUT_MS).toBe(4000);
    expect(REWARDED_TIMEOUT_MS).toBeGreaterThan(AD_FLOW_TIMEOUT_MS);
    // watchdog no-fill phải NGẮN hơn nhiều so với hạn chờ 1 ad thật đang chạy
    expect(AD_WATCHDOG_MS).toBeGreaterThanOrEqual(AD_FLOW_TIMEOUT_MS);
    expect(AD_WATCHDOG_MS).toBeLessThan(REWARDED_TIMEOUT_MS);
  });

  it('KHÔNG bao giờ quảng cáo ở level 1 và 2 (dù đã đủ level/cooldown)', () => {
    const st = { last_interstitial_ts: 0, levels_since_ad: 9 };
    expect(shouldShowInterstitial(st, 1, 10_000_000)).toBe(false);
    expect(shouldShowInterstitial(st, 2, 10_000_000)).toBe(false);
    expect(shouldShowInterstitial(st, 3, 10_000_000)).toBe(true);
  });

  it('cần ≥2 level kể từ quảng cáo gần nhất', () => {
    const now = 10_000_000;
    expect(shouldShowInterstitial({ last_interstitial_ts: 0, levels_since_ad: 0 }, 5, now)).toBe(false);
    expect(shouldShowInterstitial({ last_interstitial_ts: 0, levels_since_ad: 1 }, 5, now)).toBe(false);
    expect(shouldShowInterstitial({ last_interstitial_ts: 0, levels_since_ad: 2 }, 5, now)).toBe(true);
  });

  it('cooldown 75 s: 74,9 s → chặn; 75 s → cho', () => {
    const last = 1_000_000;
    const st = { last_interstitial_ts: last, levels_since_ad: 3 };
    expect(shouldShowInterstitial(st, 7, last + 74_900)).toBe(false);
    expect(shouldShowInterstitial(st, 7, last + INTERSTITIAL_COOLDOWN_MS)).toBe(true);
  });

  it('clock skew (ts ở tương lai) KHÔNG khoá quảng cáo vĩnh viễn', () => {
    const st = { last_interstitial_ts: 9_999_999_999, levels_since_ad: 4 };
    expect(shouldShowInterstitial(st, 6, 1_000_000)).toBe(true);
  });

  it('chuỗi thực tế: clear liên tục nhanh → ~1 ad mỗi 2-3 level, không phải mỗi level', () => {
    let st = emptyAdPacing();
    let t = 0;
    const shown: number[] = [];
    // 12 level, mỗi level 40 s (nhanh như level đầu)
    for (let level = 1; level <= 12; level++) {
      st = afterLevelCleared(st);
      t += 40_000;
      if (shouldShowInterstitial(st, level, t)) {
        shown.push(level);
        st = afterInterstitial(st, t);
      }
    }
    // Cũ: 11 quảng cáo (mọi level ≥2). Mới: ≤5, không có level 1-2, cách nhau ≥2 level.
    expect(shown.length).toBeLessThanOrEqual(5);
    expect(shown).not.toContain(1);
    expect(shown).not.toContain(2);
    for (let i = 1; i < shown.length; i++) {
      expect(shown[i] - shown[i - 1]).toBeGreaterThanOrEqual(2);
    }
  });

  it('afterInterstitial reset bộ đếm + đóng cooldown; afterLevelCleared chỉ +1', () => {
    const st = afterInterstitial({ last_interstitial_ts: 0, levels_since_ad: 5 }, 123);
    expect(st).toEqual({ last_interstitial_ts: 123, levels_since_ad: 0 });
    expect(afterLevelCleared(st)).toEqual({ last_interstitial_ts: 123, levels_since_ad: 1 });
  });

  it('normalizeAdPacing chống rác (undefined / âm / NaN / string)', () => {
    expect(normalizeAdPacing(undefined)).toEqual({ last_interstitial_ts: 0, levels_since_ad: 0 });
    expect(normalizeAdPacing({ last_interstitial_ts: -1, levels_since_ad: -3 }))
      .toEqual({ last_interstitial_ts: 0, levels_since_ad: 0 });
    expect(normalizeAdPacing({ last_interstitial_ts: NaN, levels_since_ad: 2.5 }))
      .toEqual({ last_interstitial_ts: 0, levels_since_ad: 0 });
    expect(normalizeAdPacing({ last_interstitial_ts: 99, levels_since_ad: 2 }))
      .toEqual({ last_interstitial_ts: 99, levels_since_ad: 2 });
  });
});

describe('rewarded hint policy (B2-4/B2-5 — hint_once_per_level)', () => {
  it('gợi ý ĐẦU TIÊN trong đời = miễn phí, KHÔNG cần ad', () => {
    const g = hintGrant({ hintUsedThisLevel: false, freeHintUsed: false }, HINT_CFG);
    expect(g).toEqual({ allowed: true, requiresAd: false, reason: 'free-grant' });
  });

  it('sau suất miễn phí: cho phép nhưng PHẢI xem rewarded', () => {
    const g = hintGrant({ hintUsedThisLevel: false, freeHintUsed: true }, HINT_CFG);
    expect(g).toEqual({ allowed: true, requiresAd: true, reason: 'rewarded' });
  });

  it('đã dùng gợi ý ở level này → CHẶN (đúng 1/level, hết ad-spam)', () => {
    const g = hintGrant({ hintUsedThisLevel: true, freeHintUsed: true }, HINT_CFG);
    expect(g.allowed).toBe(false);
    expect(g.requiresAd).toBe(false);
    expect(g.reason).toBe('used-this-level');
  });

  it('oncePerLevel=false (config tắt) → luôn cho phép, vẫn cần ad', () => {
    const g = hintGrant({ hintUsedThisLevel: true, freeHintUsed: true }, { oncePerLevel: false, costAd: true });
    expect(g).toEqual({ allowed: true, requiresAd: true, reason: 'rewarded' });
  });

  it('costAd=false → cho phép mà không cần ad', () => {
    const g = hintGrant({ hintUsedThisLevel: false, freeHintUsed: true }, { oncePerLevel: true, costAd: false });
    expect(g.requiresAd).toBe(false);
  });
});

describe('extra tube cap (B2-6, max_extra)', () => {
  it('còn suất khi chưa mua, hết suất khi đã mua đủ max_extra', () => {
    expect(canBuyExtraTube(0, 1)).toBe(true);
    expect(canBuyExtraTube(1, 1)).toBe(false);
    expect(canBuyExtraTube(2, 1)).toBe(false);
    expect(canBuyExtraTube(1, 2)).toBe(true);
  });
});

describe('raceTimeout — không luồng ad nào treo UI (B2-3)', () => {
  it('promise không bao giờ settle → trả fallback đúng hạn', async () => {
    vi.useFakeTimers();
    const never = new Promise<boolean>(() => {});
    const p = raceTimeout(never, AD_FLOW_TIMEOUT_MS, false);
    vi.advanceTimersByTime(AD_FLOW_TIMEOUT_MS + 1);
    await expect(p).resolves.toBe(false);
    vi.useRealTimers();
  });

  it('promise reject → fallback, KHÔNG ném ra ngoài (không cấp thưởng)', async () => {
    await expect(raceTimeout(Promise.reject(new Error('no fill')), 50, false)).resolves.toBe(false);
  });

  it('promise resolve trước hạn → giữ nguyên kết quả', async () => {
    await expect(raceTimeout(Promise.resolve(true), 1000, false)).resolves.toBe(true);
  });
});
