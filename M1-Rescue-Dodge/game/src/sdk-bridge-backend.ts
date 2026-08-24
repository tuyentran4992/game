// Playgama Bridge v2 backend cho SdkHandler (multi-backend).
// Đóng gói window.bridge với cùng interface SdkHandler, để scenes gọi không đổi.
// Playgama: rewarded là event-driven (rewarded_state_changed) — KHÁC ytgame trả
// Promise<boolean>. Backend này bọc event thành Promise để 2 contract tương đồng.
//
// QUAN TRỌNG (bug real gặp 2026-08-24): bridge THROW ("Before using the SDK you
// must initialize it") nếu gọi API trước khi bridge.initialize() resolve. Vì main.ts
// gọi sdk.isAudioEnabled/onPause/onAudioEnabledChange/gameReady NGAY khi boot (không
// await init) → backend PHẢI buffer mọi subscribe cho tới khi ready, getter trả
// default an toàn, gameReady/storage/ads no-op hoặc defer. KHÔNG được truy cập
// bridge.platform/advertisement trước ready.
//
// Nguồn: wiki.playgama.com Bridge SDK v2 + grep CDN playgama-bridge.js (2026-08-24)
// Global: window.bridge = window.playgamaBridge. EVENT_NAME.* =
//   PAUSE_STATE_CHANGED / AUDIO_STATE_CHANGED / INTERSTITIAL_STATE_CHANGED /
//   REWARDED_STATE_CHANGED (payload thường là boolean hoặc state string).

export interface PlaygamaBridgeLike {
  initialize(): Promise<void>;
  EVENT_NAME: Record<string, string>;
  platform: {
    language: string;
    isAudioEnabled: boolean;
    isPaused: boolean;
    sendMessage(name: string, params?: Record<string, unknown>): void;
  };
  storage: {
    get(keys: string[]): Promise<(unknown | null)[]>;
    set(keys: string[], values: unknown[]): Promise<void>;
    delete(keys: string[]): Promise<void>;
  };
  advertisement: {
    isInterstitialSupported: boolean;
    isRewardedSupported: boolean;
    showInterstitial(placement?: string): void;
    showRewarded(placement?: string): void;
    on(event: string, cb: (state: unknown) => void): void;
  };
}

declare global {
  interface Window {
    bridge?: PlaygamaBridgeLike;
    playgamaBridge?: PlaygamaBridgeLike;
  }
}

export function getBridge(): PlaygamaBridgeLike | null {
  if (typeof window === 'undefined') return null;
  return window.bridge ?? window.playgamaBridge ?? null;
}

export const LOCAL_KEY = 'save';

export class PlaygamaBackend {
  private bridge: PlaygamaBridgeLike;
  private ready = false;
  private initPromise: Promise<void>;
  private audioOn = true;
  private paused = false;

  // Hàng đợi gọi dồn tới khi ready (main.ts gọi tức thì lúc boot).
  private pendingOnPause: Array<() => void> = [];
  private pendingOnResume: Array<() => void> = [];
  private pendingAudio: Array<(enabled: boolean) => void> = [];

  constructor(bridge: PlaygamaBridgeLike) {
    this.bridge = bridge;
    this.initPromise = this._init();
  }

  private async _init(): Promise<void> {
    try {
      await Promise.resolve(this.bridge.initialize());
    } catch (e) {
      console.warn('playgama bridge.initialize failed (mock/unsupported?)', e);
    }
    // Đọc trạng thái âm thanh BẮT BUỘC sau khi init (trước đó bridge throw).
    try {
      this.audioOn = this.bridge.platform.isAudioEnabled !== false;
    } catch { /* giữ default */ }
    this.ready = true;
    // Flush các callback đã đăng ký trước khi ready.
    this.pendingOnPause.forEach((cb) => this._subscribe(PAUSE, cb, true));
    this.pendingOnResume.forEach((cb) => this._subscribe(PAUSE, cb, false));
    this.pendingAudio.forEach((cb) => this._subscribeAudio(cb));
    this.pendingOnPause = [];
    this.pendingOnResume = [];
    this.pendingAudio = [];
  }

  /** Chờ cho backend sẵn sàng (game KHÔNG bắt buộc await, nhưng để dùng an toàn). */
  readyPromise(): Promise<void> { return this.initPromise; }

  gameReady(): void {
    if (!this.ready) {
      // main.ts gọi lúc boot trước khi init → fire ngay sau khi ready (frame đầu).
      this.initPromise.then(() => this._fireGameReady()).catch(() => {});
      return;
    }
    this._fireGameReady();
  }

  private _fireGameReady(): void {
    try { this.bridge.platform.sendMessage('game_ready'); } catch { /* no-op */ }
  }

  onPause(cb: () => void): void {
    if (!this.ready) { this.pendingOnPause.push(cb); return; }
    this._subscribe(PAUSE, cb, true);
  }

  onResume(cb: () => void): void {
    if (!this.ready) { this.pendingOnResume.push(cb); return; }
    this._subscribe(PAUSE, cb, false);
  }

  private _subscribe(event: string, cb: () => void, wantTrue: boolean): void {
    try {
      this.bridge.advertisement.on(event, (v: unknown) => {
        if (v === wantTrue) { if (wantTrue) this.paused = true; else this.paused = false; cb(); }
      });
    } catch { /* no-op */ }
  }

  isAudioEnabled(): boolean {
    return this.audioOn;
  }

  onAudioEnabledChange(cb: (enabled: boolean) => void): void {
    if (!this.ready) { this.pendingAudio.push(cb); return; }
    this._subscribeAudio(cb);
  }

  private _subscribeAudio(cb: (enabled: boolean) => void): void {
    try {
      this.bridge.advertisement.on(this.bridge.EVENT_NAME.AUDIO_STATE_CHANGED, (v: unknown) => {
        this.audioOn = v !== false;
        cb(this.audioOn);
      });
    } catch { /* no-op */ }
  }

  async saveData(data: unknown): Promise<boolean> {
    if (!this.ready) {
      // Chưa init → không lưu được qua bridge, báo false (SdkHandler tự fallback local).
      return false;
    }
    try {
      const jsonStr = JSON.stringify(data);
      await this.bridge.storage.set([LOCAL_KEY], [jsonStr]);
      return true;
    } catch (e) {
      console.warn('bridge.storage.set failed', e);
      return false;
    }
  }

  async loadData(): Promise<unknown | null> {
    if (!this.ready) return null;
    try {
      const res = await this.bridge.storage.get([LOCAL_KEY]);
      let raw: unknown = null;
      if (Array.isArray(res)) {
        raw = res[0];
      } else if (res && typeof res === 'object' && LOCAL_KEY in res) {
        raw = (res as Record<string, unknown>)[LOCAL_KEY];
      } else {
        raw = res;
      }
      if (raw == null) return null;
      if (typeof raw === 'object') return raw;
      if (typeof raw === 'string') {
        try {
          return JSON.parse(raw);
        } catch {
          return null;
        }
      }
      return null;
    } catch (e) {
      console.warn('bridge.storage.get failed', e);
      return null;
    }
  }

  sendScore(_score: number): void {
    // Playgama không có sendScore trực tiếp — dùng storage/leaderboard nếu cần.
  }

  async requestInterstitialAd(): Promise<void> {
    if (!this.ready) return;
    if (!this.bridge.advertisement?.isInterstitialSupported) return;
    return new Promise<void>((resolve) => {
      let settled = false;
      const done = () => { if (!settled) { settled = true; resolve(); } };
      const sub = (state: unknown) => { if (state === 'closed' || state === 'failed') done(); };
      try {
        this.bridge.advertisement.on(this.bridge.EVENT_NAME.INTERSTITIAL_STATE_CHANGED, sub);
        this.bridge.advertisement.showInterstitial();
      } catch { done(); }
      setTimeout(done, 15000);
    });
  }

  async requestRewardedAd(placement?: string): Promise<boolean> {
    if (!this.ready) return true; // Fallback cho dev/mock
    if (!this.bridge.advertisement?.isRewardedSupported) {
      // Khi nền tảng không hỗ trợ rewarded ad hoặc đang dev mock, tự động cấp thưởng
      return true;
    }
    // Grant reward khi state === 'rewarded'. Nếu close/failed → false.
    return new Promise<boolean>((resolve) => {
      let settled = false;
      const settle = (val: boolean) => { if (!settled) { settled = true; resolve(val); } };
      const sub = (state: unknown) => {
        if (state === 'rewarded') settle(true);
        else if (state === 'closed' || state === 'failed') settle(false);
      };
      try {
        this.bridge.advertisement.on(this.bridge.EVENT_NAME.REWARDED_STATE_CHANGED, sub);
        this.bridge.advertisement.showRewarded(placement);
      } catch {
        settle(true);
      }
      setTimeout(() => settle(true), 10000); // 10s fallback
    });
  }
}

const PAUSE = 'pause_state_changed';