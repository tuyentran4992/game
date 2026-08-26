/**
 * YtgameBackend — YouTube Playables / Mediacube Platform Adapter
 *
 * Implements the ytgame (window.ytgame) interface for YouTube Playables
 * and Mediacube distribution.
 */
import type { SDKBackend } from './index';
import type { LeaderboardData } from './types';

interface YtGame {
  gameReady(): void;
  onPause(cb: () => void): void;
  onResume(cb: () => void): void;
  isAudioEnabled(): boolean;
  onAudioEnabledChange(cb: (enabled: boolean) => void): void;
  saveData(data: string): Promise<void>;
  loadData(): Promise<string | null>;
  sendScore(score: number): void;
  ads: {
    requestInterstitialAd(): Promise<void>;
    requestRewardedAd(rewardId: string): Promise<boolean>;
  };
}

declare global {
  interface Window {
    ytgame?: YtGame;
  }
}

const LOCAL_KEY = 'game_save';

export class YtgameBackend implements SDKBackend {
  private ytgame: YtGame | null = null;
  private _audioEnabled = true;
  private pauseCallbacks: (() => void)[] = [];
  private resumeCallbacks: (() => void)[] = [];
  private audioCallbacks: ((enabled: boolean) => void)[] = [];

  async initialize(): Promise<void> {
    this.ytgame = typeof window !== 'undefined' ? (window.ytgame ?? null) : null;

    if (!this.ytgame) {
      console.log('[Ytgame] No ytgame SDK found, running in mock mode');
      return;
    }

    // Wire lifecycle events
    try {
      this.ytgame.onPause(() => this.pauseCallbacks.forEach(cb => cb()));
    } catch { /* no-op */ }
    try {
      this.ytgame.onResume(() => this.resumeCallbacks.forEach(cb => cb()));
    } catch { /* no-op */ }
    try {
      this._audioEnabled = this.ytgame.isAudioEnabled();
      this.ytgame.onAudioEnabledChange((enabled) => {
        this._audioEnabled = enabled;
        this.audioCallbacks.forEach(cb => cb(enabled));
      });
    } catch { /* no-op */ }

    console.log('[Ytgame] SDK initialized');
  }

  gameReady(): void {
    this.ytgame?.gameReady?.();
  }

  onPause(cb: () => void): void {
    this.pauseCallbacks.push(cb);
  }

  onResume(cb: () => void): void {
    this.resumeCallbacks.push(cb);
  }

  isAudioEnabled(): boolean {
    if (this.ytgame) {
      try { return this.ytgame.isAudioEnabled(); } catch { /* fall through */ }
    }
    return this._audioEnabled;
  }

  onAudioChange(cb: (enabled: boolean) => void): void {
    this.audioCallbacks.push(cb);
  }

  async showInterstitial(): Promise<void> {
    if (!this.ytgame) return;
    try {
      await this.ytgame.ads.requestInterstitialAd();
    } catch (e) {
      console.warn('[Ytgame] Interstitial error:', e);
    }
  }

  async showRewarded(): Promise<boolean> {
    if (!this.ytgame) return true; // mock fallback
    try {
      return await this.ytgame.ads.requestRewardedAd('continue');
    } catch (e) {
      console.warn('[Ytgame] Rewarded error:', e);
      return true;
    }
  }

  isRewardedAvailable(): boolean {
    return !!this.ytgame;
  }

  async saveData(data: Record<string, unknown>): Promise<void> {
    // Always save to localStorage as cache
    try {
      const existing = JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}');
      localStorage.setItem(LOCAL_KEY, JSON.stringify({ ...existing, ...data }));
    } catch { /* ignore */ }

    // Sync to ytgame if available
    if (this.ytgame && typeof this.ytgame.saveData === 'function') {
      try {
        await this.ytgame.saveData(JSON.stringify(data));
      } catch (e) {
        console.warn('[Ytgame] saveData failed, using local cache', e);
      }
    }
  }

  async loadData(): Promise<Record<string, unknown>> {
    // Try ytgame first
    if (this.ytgame && typeof this.ytgame.loadData === 'function') {
      try {
        const raw = await this.ytgame.loadData();
        if (raw) {
          const parsed = JSON.parse(raw) as Record<string, unknown>;
          // Cache to localStorage
          try {
            localStorage.setItem(LOCAL_KEY, raw);
          } catch { /* ignore */ }
          return parsed;
        }
      } catch (e) {
        console.warn('[Ytgame] loadData failed, trying local cache', e);
      }
    }

    // Fallback to localStorage
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (raw) return JSON.parse(raw) as Record<string, unknown>;
    } catch { /* ignore */ }
    return {};
  }

  async sendScore(score: number): Promise<void> {
    this.ytgame?.sendScore?.(score);
  }

  async setScore(score: number, _leaderboardName?: string): Promise<boolean> {
    this.ytgame?.sendScore?.(score);
    return true;
  }

  async getLeaderboardEntries(
    _leaderboardName?: string,
    _quantityTop?: number,
    userScore?: number
  ): Promise<LeaderboardData> {
    // ytgame doesn't support leaderboard queries
    return {
      entries: [],
      userEntry: { name: '⭐ You', score: userScore ?? 0, rank: 1, isUser: true },
    };
  }

  async showNativeLeaderboard(_leaderboardName?: string): Promise<boolean> {
    return false;
  }
}