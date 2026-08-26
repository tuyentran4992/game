/**
 * Playgama Bridge backend.
 *
 * Wraps window.playgamaBridge (loaded via CDN).
 * Buffers all calls until initialize() resolves (bridge throws if used before init).
 */
import type { SDKBackend } from './index';

// Playgama bridge event names
const EVENT = {
  PAUSE_STATE_CHANGED: 'PAUSE_STATE_CHANGED',
  AUDIO_STATE_CHANGED: 'AUDIO_STATE_CHANGED',
  INTERSTITIAL_STATE_CHANGED: 'INTERSTITIAL_STATE_CHANGED',
  REWARDED_STATE_CHANGED: 'REWARDED_STATE_CHANGED',
};

// Global bridge type (injected by CDN script)
declare global {
  interface Window {
    playgamaBridge?: {
      initialize: () => Promise<void>;
      isAudioEnabled: () => boolean;
      advertisement: {
        showInterstitial: () => void;
        showRewarded: () => void;
        on: (event: string, cb: (data?: unknown) => void) => void;
      };
      storage: {
        set: (data: Record<string, unknown>) => Promise<void>;
        get: () => Promise<Record<string, unknown>>;
      };
      gameplay: {
        sendScore: (score: number) => Promise<void>;
        setReady: () => void;
      };
      onPause: (cb: () => void) => void;
      onResume: (cb: () => void) => void;
      onAudioChange: (cb: (enabled: boolean) => void) => void;
    };
    bridge?: typeof window.playgamaBridge;
  }
}

export class PlaygamaBackend implements SDKBackend {
  private _initialized = false;
  private _initPromise: Promise<void> | null = null;
  private _audioEnabled = true;
  private _pendingRewardedResolve: ((value: boolean) => void) | null = null;
  private pauseCallbacks: (() => void)[] = [];
  private resumeCallbacks: (() => void)[] = [];
  private audioCallbacks: ((enabled: boolean) => void)[] = [];

  private get bridge() {
    return window.bridge || window.playgamaBridge;
  }

  async initialize(): Promise<void> {
    if (this._initialized) return;
    if (this._initPromise) return this._initPromise;

    this._initPromise = this._doInitialize();
    return this._initPromise;
  }

  private async _doInitialize(): Promise<void> {
    const b = this.bridge;
    if (!b) {
      console.warn('[Playgama] Bridge not found, falling back to mock behaviour');
      this._initialized = true;
      return;
    }

    try {
      await b.initialize();
    } catch (e) {
      console.warn('[Playgama] Bridge init error:', e);
    }

    // Wire events
    if (b.advertisement) {
      b.advertisement.on(EVENT.PAUSE_STATE_CHANGED, () => {
        this.pauseCallbacks.forEach(cb => cb());
      });
      b.advertisement.on(EVENT.AUDIO_STATE_CHANGED, (data?: unknown) => {
        const enabled = (data as { isAudioEnabled?: boolean })?.isAudioEnabled ?? true;
        this._audioEnabled = enabled;
        this.audioCallbacks.forEach(cb => cb(enabled));
      });
      b.advertisement.on(EVENT.REWARDED_STATE_CHANGED, (data?: unknown) => {
        const state = (data as { state?: string })?.state;
        if (state === 'rewarded' && this._pendingRewardedResolve) {
          this._pendingRewardedResolve(true);
          this._pendingRewardedResolve = null;
        }
      });
      b.advertisement.on(EVENT.INTERSTITIAL_STATE_CHANGED, () => {
        // Interstitial lifecycle handled by platform
      });
    }

    // Lifecycle events
    if (b.onPause) b.onPause(() => this.pauseCallbacks.forEach(cb => cb()));
    if (b.onResume) b.onResume(() => this.resumeCallbacks.forEach(cb => cb()));
    if (b.onAudioChange) b.onAudioChange((enabled) => {
      this._audioEnabled = enabled;
      this.audioCallbacks.forEach(cb => cb(enabled));
    });

    this._initialized = true;
    console.log('[Playgama] Bridge initialized');
  }

  async showInterstitial(): Promise<void> {
    await this.initialize();
    const b = this.bridge;
    if (b?.advertisement) {
      b.advertisement.showInterstitial();
    }
  }

  async showRewarded(): Promise<boolean> {
    await this.initialize();
    const b = this.bridge;
    if (!b?.advertisement) return true; // mock fallback

    return new Promise<boolean>((resolve) => {
      this._pendingRewardedResolve = resolve;
      b.advertisement.showRewarded();
      // Safety timeout: if no callback in 10s, grant reward anyway
      setTimeout(() => {
        if (this._pendingRewardedResolve) {
          this._pendingRewardedResolve(true);
          this._pendingRewardedResolve = null;
        }
      }, 10000);
    });
  }

  isAudioEnabled(): boolean {
    if (!this._initialized) return true;
    const b = this.bridge;
    if (b?.isAudioEnabled) return b.isAudioEnabled();
    return this._audioEnabled;
  }

  async saveData(data: Record<string, unknown>): Promise<void> {
    await this.initialize();
    const b = this.bridge;
    if (b?.storage) {
      await b.storage.set(data);
    } else {
      // Fallback to localStorage
      try {
        const existing = JSON.parse(localStorage.getItem('game_save') || '{}');
        localStorage.setItem('game_save', JSON.stringify({ ...existing, ...data }));
      } catch { /* ignore */ }
    }
  }

  async loadData(): Promise<Record<string, unknown>> {
    await this.initialize();
    const b = this.bridge;
    if (b?.storage) {
      return await b.storage.get();
    }
    try {
      return JSON.parse(localStorage.getItem('game_save') || '{}');
    } catch {
      return {};
    }
  }

  async sendScore(score: number): Promise<void> {
    await this.initialize();
    const b = this.bridge;
    if (b?.gameplay) {
      await b.gameplay.sendScore(score);
    }
  }

  gameReady(): void {
    const b = this.bridge;
    if (b?.gameplay) {
      b.gameplay.setReady();
    }
  }

  onPause(cb: () => void): void {
    this.pauseCallbacks.push(cb);
  }

  onResume(cb: () => void): void {
    this.resumeCallbacks.push(cb);
  }

  onAudioChange(cb: (enabled: boolean) => void): void {
    this.audioCallbacks.push(cb);
  }
}