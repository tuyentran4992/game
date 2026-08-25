// ============================================================================
// AD ECONOMY — pure pacing/policy logic (AUDIT-COMMERCIAL §B2, M2-07).
//
// KHÔNG import Phaser / SDK / DOM → unit-testable 100 %.
//
//  * INTERSTITIAL GATE (B2-2): chỉ chạy khi
//        level >= 3  &&  levels_since_ad >= 2  &&  now - last_ts >= 75 s
//    → ~1 quảng cáo mỗi 2-3 level, tối thiểu 75 s giữa 2 lần (thay vì mỗi level).
//  * HINT POLICY (B2-4/B2-5): `hint_once_per_level` được THỰC THI ở đây;
//    lần gợi ý ĐẦU TIÊN trong đời = onboarding grant MIỄN PHÍ (không ad).
//  * EXTRA TUBE (B2-6): 1 helper duy nhất cho cả toolbar + logic mua.
//  * raceTimeout(): mọi luồng ad phải có hạn chót → không bao giờ treo UI.
// ============================================================================

export interface AdPacingState {
  /** epoch ms của interstitial gần nhất (0 = chưa bao giờ) */
  last_interstitial_ts: number;
  /** số level đã clear kể từ interstitial gần nhất */
  levels_since_ad: number;
}

/** Không quảng cáo xen kẽ trước level này (onboarding sạch — M2-07). */
export const INTERSTITIAL_MIN_LEVEL = 3;
/** Cần ít nhất N level kể từ interstitial trước. */
export const INTERSTITIAL_MIN_LEVELS = 2;
/** Cooldown tối thiểu giữa 2 interstitial. */
export const INTERSTITIAL_COOLDOWN_MS = 75_000;
/** Hạn chót cho luồng LEVEL (interstitial): không bao giờ chặn > ~4 s. */
export const AD_FLOW_TIMEOUT_MS = 4000;
/** Rewarded do người chơi CHỦ ĐỘNG chọn xem → ad thật dài, chờ lâu hơn được. */
export const REWARDED_TIMEOUT_MS = 45_000;
/**
 * Watchdog "ad có mở thật không": nếu sau ngần này platform VẪN chưa pause game
 * (ytgame.system.onPause luôn bắn khi ad hiện) thì coi như no-fill → thoát + toast,
 * KHÔNG bắt người chơi nhìn spinner 45 s.
 */
export const AD_WATCHDOG_MS = 6000;

export function emptyAdPacing(): AdPacingState {
  return { last_interstitial_ts: 0, levels_since_ad: 0 };
}

/** Đọc block `ads` từ save (v2 cũ không có → mặc định an toàn). */
export function normalizeAdPacing(raw: unknown): AdPacingState {
  const s = (raw && typeof raw === 'object' ? raw : {}) as Partial<AdPacingState>;
  const ts = typeof s.last_interstitial_ts === 'number' && isFinite(s.last_interstitial_ts)
    ? Math.max(0, s.last_interstitial_ts) : 0;
  const n = Number.isInteger(s.levels_since_ad) ? Math.max(0, s.levels_since_ad as number) : 0;
  return { last_interstitial_ts: ts, levels_since_ad: n };
}

/**
 * Cổng interstitial (B2-2). `now` truyền vào để test được (không đọc Date.now()).
 * Nếu `last_interstitial_ts` ở TƯƠNG LAI (đồng hồ máy bị đẩy lùi) thì coi như 0
 * → người chơi không bị "khoá" quảng cáo vĩnh viễn vì clock skew.
 */
export function shouldShowInterstitial(state: AdPacingState, level: number, now: number): boolean {
  if (!Number.isFinite(level) || level < INTERSTITIAL_MIN_LEVEL) return false;
  if (state.levels_since_ad < INTERSTITIAL_MIN_LEVELS) return false;
  const last = state.last_interstitial_ts > now ? 0 : state.last_interstitial_ts;
  return now - last >= INTERSTITIAL_COOLDOWN_MS;
}

/** Đã HIỂN THỊ (hoặc đã cố hiển thị) interstitial → reset bộ đếm + đóng cooldown. */
export function afterInterstitial(_state: AdPacingState, now: number): AdPacingState {
  return { last_interstitial_ts: now, levels_since_ad: 0 };
}

/** Clear 1 level → tăng bộ đếm level kể từ quảng cáo gần nhất. */
export function afterLevelCleared(state: AdPacingState): AdPacingState {
  return { last_interstitial_ts: state.last_interstitial_ts, levels_since_ad: state.levels_since_ad + 1 };
}

// ------------------------------------------------------------------- hint ---
export interface HintState {
  /** đã dùng gợi ý ở level ĐANG chơi? (persist trong session block) */
  hintUsedThisLevel: boolean;
  /** đã tiêu suất gợi ý miễn phí onboarding? (persist trong flags) */
  freeHintUsed: boolean;
}

export type HintGrantReason = 'free-grant' | 'rewarded' | 'used-this-level';

export interface HintGrant {
  allowed: boolean;
  /** true = phải xem rewarded ad trước khi cấp gợi ý */
  requiresAd: boolean;
  reason: HintGrantReason;
}

/**
 * `hint_once_per_level` (config trước đây là DEAD CODE — B2-4):
 *   1. Chưa từng dùng gợi ý → MIỄN PHÍ 1 lần (dạy cơ chế, không ad).
 *   2. Đã dùng gợi ý ở level này → CHẶN (đúng 1 gợi ý/level).
 *   3. Còn lại → cho phép, cần rewarded ad (nếu config costAd).
 */
export function hintGrant(
  s: HintState,
  opts: { oncePerLevel: boolean; costAd: boolean },
): HintGrant {
  if (!s.freeHintUsed) return { allowed: true, requiresAd: false, reason: 'free-grant' };
  if (opts.oncePerLevel && s.hintUsedThisLevel) {
    return { allowed: false, requiresAd: false, reason: 'used-this-level' };
  }
  return { allowed: true, requiresAd: opts.costAd, reason: 'rewarded' };
}

// -------------------------------------------------------------- extra tube ---
/** Còn suất ống thưởng? (B2-6: toolbar dùng để bật/tắt nút, logic dùng để chặn) */
export function canBuyExtraTube(extraTubeUsed: number, maxExtra: number): boolean {
  return extraTubeUsed < maxExtra;
}

// ----------------------------------------------------------------- timeout ---
/**
 * Promise.race([p, timeout(ms)]) — trả `fallback` khi hết hạn HOẶC khi p reject.
 * Dùng cho MỌI luồng ad để nút NEXT / nút toolbar không bao giờ "chết".
 */
export function raceTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    let done = false;
    const finish = (v: T) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve(v);
    };
    const timer = setTimeout(() => finish(fallback), ms);
    p.then(finish).catch(() => finish(fallback));
  });
}
