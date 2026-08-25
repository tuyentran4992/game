// ============================================================================
// YouTube Playables SDK adapter (P0-1) — M2-08 / M2-09 / M2-11
//
// The platform SDK (loaded by index.html from youtube.com/game_api/v1) exposes a
// NAMESPACED global:
//   ytgame.game.firstFrameReady() / gameReady() / saveData(str) / loadData()
//   ytgame.system.onPause(cb) / onResume(cb) / isAudioEnabled() /
//                 onAudioEnabledChange(cb) / getLanguage()
//   ytgame.engagement.sendScore({ value })
//   ytgame.ads.requestInterstitialAd() / requestRewardedAd()
//
// This adapter samples that surface DEFENSIVELY (every call re-reads
// window.ytgame and probes for the function) so the game never crashes when:
//   * the SDK script is missing/blocked (local dev, offline zip QA),
//   * the SDK is an older FLAT build (ytgame.gameReady(), ytgame.saveData()…),
//   * only part of the namespace exists (e.g. no `engagement`).
// Storage always mirrors to localStorage so a plain browser reload resumes too
// (P0-2), and loadData() applies LAST-WRITE-WINS via `last_updated_ts`.
// ============================================================================

import { REWARDED_TIMEOUT_MS } from './logic/ad-pacing';

type VoidCb = () => void;
type AudioCb = (enabled: boolean) => void;

/** Namespaced (current) + flat (legacy/mock) shape — everything optional. */
interface YtGameLike {
  IN_PLAYABLES_ENV?: boolean;
  SDK_VERSION?: string;
  game?: {
    firstFrameReady?: () => void;
    gameReady?: () => void;
    saveData?: (data: string) => Promise<void> | void;
    loadData?: () => Promise<string | null> | string | null;
  };
  system?: {
    onPause?: (cb: VoidCb) => void;
    onResume?: (cb: VoidCb) => void;
    isAudioEnabled?: () => boolean;
    onAudioEnabledChange?: (cb: AudioCb) => void;
    getLanguage?: () => string;
  };
  engagement?: {
    sendScore?: (payload: { value: number }) => Promise<void> | void;
  };
  ads?: {
    requestInterstitialAd?: () => Promise<void> | void;
    requestRewardedAd?: (rewardId?: string) => Promise<unknown> | unknown;
  };
  // ---- legacy FLAT fallbacks (older builds / local mocks) ----
  firstFrameReady?: () => void;
  gameReady?: () => void;
  saveData?: (data: string) => Promise<void> | void;
  loadData?: () => Promise<string | null> | string | null;
  sendScore?: (score: number) => void;
  onPause?: (cb: VoidCb) => void;
  onResume?: (cb: VoidCb) => void;
  isAudioEnabled?: () => boolean;
  onAudioEnabledChange?: (cb: AudioCb) => void;
}

declare global {
  interface Window { ytgame?: YtGameLike }
}

/** localStorage mirror key (M2-08 fallback; also used by E2E reset). */
export const LOCAL_SAVE_KEY = 'neon_sort_save';
/** Platform hard limit is 3 MiB — our payload is ~200-400 B, guard anyway. */
const MAX_SAVE_BYTES = 3 * 1024 * 1024;
/** Never let an ad promise hang the UI forever (interstitial: luồng level). */
const AD_TIMEOUT_MS = 6000;

function isFn(v: unknown): v is (...args: never[]) => unknown {
  return typeof v === 'function';
}

function tsOf(v: unknown): number {
  if (v && typeof v === 'object') {
    const t = (v as { last_updated_ts?: unknown }).last_updated_ts;
    if (typeof t === 'number' && isFinite(t)) return t;
  }
  return 0;
}

function withTimeout<T>(p: Promise<T>, ms: number, onTimeout: T): Promise<T> {
  return new Promise<T>((resolve) => {
    let done = false;
    const timer = setTimeout(() => { if (!done) { done = true; resolve(onTimeout); } }, ms);
    p.then((v) => { if (!done) { done = true; clearTimeout(timer); resolve(v); } })
     .catch(() => { if (!done) { done = true; clearTimeout(timer); resolve(onTimeout); } });
  });
}

export class SdkHandler {
  /** true nếu ĐANG chạy trong Playables (SDK thật) — dùng để không "tặng" reward. */
  readonly hasSdk: boolean;
  readonly inPlayables: boolean;
  readonly sdkVersion: string;
  /** true khi lần save gần nhất đã ghi được xuống platform (không chỉ localStorage). */
  savedToPlatform = false;

  private firstFrameSent = false;
  private gameReadySent = false;
  private visibilityBound = false;

  constructor() {
    const yt = this.yt();
    // Sample the exposed surface ONCE for logging/diagnostics; every call below
    // still re-probes, so a late-loading SDK still works.
    this.hasSdk = !!yt;
    this.inPlayables = !!yt?.IN_PLAYABLES_ENV;
    this.sdkVersion = typeof yt?.SDK_VERSION === 'string' ? yt.SDK_VERSION : '';
    if (yt) {
      const ns = [
        yt.game ? 'game' : null,
        yt.system ? 'system' : null,
        yt.engagement ? 'engagement' : null,
        yt.ads ? 'ads' : null,
      ].filter(Boolean).join(',');
      console.info(`[sdk] ytgame detected (v${this.sdkVersion || '?'}) namespaces: ${ns || 'flat-only'}`);
    } else {
      console.info('[sdk] ytgame absent → flat/localStorage fallback (local dev)');
    }
  }

  /** Re-read the global every time: the SDK script may resolve after this module. */
  private yt(): YtGameLike | null {
    if (typeof window === 'undefined') return null;
    return window.ytgame ?? null;
  }

  // ------------------------------------------------------------ lifecycle ---
  /** P0-5: khung hình ĐẦU TIÊN đã render (platform tắt loader của nó). */
  firstFrameReady(): void {
    if (this.firstFrameSent) return;
    this.firstFrameSent = true;
    const yt = this.yt();
    try {
      if (isFn(yt?.game?.firstFrameReady)) yt!.game!.firstFrameReady!();
      else if (isFn(yt?.firstFrameReady)) yt!.firstFrameReady!();
    } catch (e) {
      console.warn('[sdk] firstFrameReady failed', e);
    }
  }

  /** P0-5: CHỈ gọi khi asset đã load xong VÀ màn Start nhận được input. */
  gameReady(): void {
    if (this.gameReadySent) return;
    this.gameReadySent = true;
    const yt = this.yt();
    try {
      if (isFn(yt?.game?.gameReady)) yt!.game!.gameReady!();
      else if (isFn(yt?.gameReady)) yt!.gameReady!();
    } catch (e) {
      console.warn('[sdk] gameReady failed', e);
    }
  }

  get isGameReadySent(): boolean { return this.gameReadySent; }

  // ------------------------------------------------- pause / mute passthru ---
  onPause(cb: VoidCb): void {
    const yt = this.yt();
    try {
      if (isFn(yt?.system?.onPause)) { yt!.system!.onPause!(cb); return; }
      if (isFn(yt?.onPause)) { yt!.onPause!(cb); return; }
    } catch (e) {
      console.warn('[sdk] onPause bind failed', e);
    }
    this.bindVisibility(cb, null);
  }

  onResume(cb: VoidCb): void {
    const yt = this.yt();
    try {
      if (isFn(yt?.system?.onResume)) { yt!.system!.onResume!(cb); return; }
      if (isFn(yt?.onResume)) { yt!.onResume!(cb); return; }
    } catch (e) {
      console.warn('[sdk] onResume bind failed', e);
    }
    this.bindVisibility(null, cb);
  }

  /** Fallback ngoài Playables: dùng document visibility để vẫn tôn trọng pause. */
  private bindVisibility(onHide: VoidCb | null, onShow: VoidCb | null): void {
    if (typeof document === 'undefined') return;
    const handler = () => {
      if (document.visibilityState === 'hidden') onHide?.();
      else onShow?.();
    };
    document.addEventListener('visibilitychange', handler);
    this.visibilityBound = true;
  }

  get usesVisibilityFallback(): boolean { return this.visibilityBound; }

  isAudioEnabled(): boolean {
    const yt = this.yt();
    try {
      if (isFn(yt?.system?.isAudioEnabled)) return yt!.system!.isAudioEnabled!() !== false;
      if (isFn(yt?.isAudioEnabled)) return yt!.isAudioEnabled!() !== false;
    } catch (e) {
      console.warn('[sdk] isAudioEnabled failed', e);
    }
    return true;
  }

  onAudioEnabledChange(cb: AudioCb): void {
    const yt = this.yt();
    try {
      if (isFn(yt?.system?.onAudioEnabledChange)) { yt!.system!.onAudioEnabledChange!(cb); return; }
      if (isFn(yt?.onAudioEnabledChange)) { yt!.onAudioEnabledChange!(cb); return; }
    } catch (e) {
      console.warn('[sdk] onAudioEnabledChange bind failed', e);
    }
  }

  getLanguage(): string {
    const yt = this.yt();
    try {
      if (isFn(yt?.system?.getLanguage)) return yt!.system!.getLanguage!() || 'en';
    } catch { /* ignore */ }
    return 'en';
  }

  // ------------------------------------------------------------- storage ----
  /**
   * Ghi save (M2-08). LUÔN mirror xuống localStorage (P0-2 fallback) rồi mới
   * gửi platform. Trả về TRUE chỉ khi thực sự ghi được ≥ 1 nơi (sửa false-positive).
   */
  async saveData(data: unknown): Promise<boolean> {
    let json: string;
    try {
      json = JSON.stringify(data);
    } catch (e) {
      console.warn('[sdk] saveData: payload not serialisable', e);
      return false;
    }
    if (json.length > MAX_SAVE_BYTES) {
      console.warn('[sdk] saveData: payload too large, skipped');
      return false;
    }

    const localOk = this.writeLocal(json);

    this.savedToPlatform = false;
    const yt = this.yt();
    const fn = isFn(yt?.game?.saveData) ? yt!.game!.saveData!.bind(yt!.game)
      : isFn(yt?.saveData) ? yt!.saveData!.bind(yt) : null;
    if (fn) {
      try {
        await Promise.resolve(fn(json));
        this.savedToPlatform = true;
      } catch (e) {
        console.warn('[sdk] ytgame saveData failed (localStorage keeps the state)', e);
      }
    }
    return this.savedToPlatform || localOk;
  }

  /**
   * Đọc save. Lấy CẢ platform + localStorage rồi chọn bản MỚI HƠN theo
   * `last_updated_ts` (last-write-wins) → reload ngoài SDK vẫn resume đúng.
   */
  async loadData(): Promise<unknown | null> {
    // ĐỌC LOCAL TRƯỚC: readRemote() không được ghi đè mirror, nếu không bản
    // local mới hơn (vừa chơi offline) sẽ bị xoá trước khi kịp so sánh ts.
    const local = this.readLocal();
    const remote = await this.readRemote();
    if (remote && local) {
      const useLocal = tsOf(local) > tsOf(remote);
      if (useLocal) {
        console.info('[sdk] localStorage save is newer → using it');
        return local;
      }
      this.writeLocal(JSON.stringify(remote)); // platform mới hơn → làm nóng mirror
      return remote;
    }
    if (remote) this.writeLocal(JSON.stringify(remote));
    return remote ?? local;
  }

  private async readRemote(): Promise<unknown | null> {
    const yt = this.yt();
    const fn = isFn(yt?.game?.loadData) ? yt!.game!.loadData!.bind(yt!.game)
      : isFn(yt?.loadData) ? yt!.loadData!.bind(yt) : null;
    if (!fn) return null;
    try {
      const raw = await Promise.resolve(fn());
      if (!raw || typeof raw !== 'string') return null;
      return JSON.parse(raw) as unknown; // mirror do loadData() quyết định (last-write-wins)
    } catch (e) {
      console.warn('[sdk] ytgame loadData failed, trying localStorage', e);
      return null;
    }
  }

  private readLocal(): unknown | null {
    try {
      const raw = window?.localStorage?.getItem(LOCAL_SAVE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as unknown;
    } catch (e) {
      console.warn('[sdk] localStorage read failed', e);
      return null;
    }
  }

  private writeLocal(json: string): boolean {
    try {
      window?.localStorage?.setItem(LOCAL_SAVE_KEY, json);
      return true;
    } catch (e) {
      console.warn('[sdk] localStorage write failed', e);
      return false;
    }
  }

  // ----------------------------------------------------------- engagement ---
  /** M2-08: platform nhận OBJECT `{ value }` trên namespace engagement. */
  sendScore(score: number): void {
    const yt = this.yt();
    try {
      if (isFn(yt?.engagement?.sendScore)) {
        const r = yt!.engagement!.sendScore!({ value: score });
        if (r && typeof (r as Promise<void>).catch === 'function') {
          (r as Promise<void>).catch((e) => console.warn('[sdk] sendScore rejected', e));
        }
        return;
      }
      if (isFn(yt?.sendScore)) { yt!.sendScore!(score); return; }
    } catch (e) {
      console.warn('[sdk] sendScore failed', e);
    }
  }

  // ------------------------------------------------------------------ ads ---
  /**
   * B2-5: CÓ API rewarded để gọi không? (kiểm tra TRƯỚC khi mở sheet xác nhận →
   * không bao giờ mời người chơi xem quảng cáo không tồn tại).
   * Ngoài Playables (dev/offline) → true để luồng UI vẫn test được.
   */
  isRewardedAvailable(): boolean {
    const yt = this.yt();
    if (!yt) return !this.inPlayables;
    return isFn(yt.ads?.requestRewardedAd);
  }

  /** B2: có API interstitial? (không có → bỏ qua im lặng, không chặn NEXT). */
  isInterstitialAvailable(): boolean {
    const yt = this.yt();
    if (!yt) return false;   // dev: KHÔNG giả lập interstitial (không có gì để hiện)
    return isFn(yt.ads?.requestInterstitialAd);
  }

  async requestInterstitialAd(timeoutMs = AD_TIMEOUT_MS): Promise<void> {
    const yt = this.yt();
    const fn = isFn(yt?.ads?.requestInterstitialAd) ? yt!.ads!.requestInterstitialAd!.bind(yt!.ads) : null;
    if (!fn) return;
    try {
      await withTimeout(Promise.resolve(fn()).then(() => undefined), timeoutMs, undefined);
    } catch (e) {
      console.warn('[sdk] interstitial failed', e);
    }
  }

  /**
   * Rewarded: resolve = đã xem xong → cấp thưởng. reject/timeout = KHÔNG thưởng.
   * `timeoutMs` mặc định DÀI (người chơi chủ động xem hết 1 clip ~30 s) — nếu cắt
   * 4-6 s thì ad xem xong vẫn không được thưởng = mất doanh thu + mất niềm tin.
   */
  async requestRewardedAd(rewardId: string, timeoutMs = REWARDED_TIMEOUT_MS): Promise<boolean> {
    const yt = this.yt();
    const fn = isFn(yt?.ads?.requestRewardedAd) ? yt!.ads!.requestRewardedAd!.bind(yt!.ads) : null;
    if (!fn) {
      // Không có SDK (dev local / QA offline): cấp thưởng để test được gameplay.
      // Trong Playables thật luôn có ytgame.ads → không bao giờ "free reward".
      return !this.inPlayables;
    }
    try {
      return await withTimeout(
        Promise.resolve(fn(rewardId)).then(() => true),
        timeoutMs,
        false,
      );
    } catch (e) {
      console.warn('[sdk] rewarded failed', e);
      return false;
    }
  }
}
