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

  onAudioEnabledChange(cb: (enabled: boolean) => void): void {
    this.onAudioChange(cb);
  }

  async showInterstitial(): Promise<void> {
    if (!this.ytgame) return;
    try {
      await this.ytgame.ads?.requestInterstitialAd?.();
    } catch (e) {
      console.warn('[Ytgame] Interstitial error:', e);
    }
  }

  async requestInterstitialAd(): Promise<void> {
    return this.showInterstitial();
  }

  async showRewarded(placement = 'rewarded'): Promise<boolean> {
    if (!this.ytgame) return true; // mock fallback
    try {
      return (await this.ytgame.ads?.requestRewardedAd?.(placement)) ?? true;
    } catch (e) {
      console.warn('[Ytgame] Rewarded error:', e);
      return false;
    }
  }

  async requestRewardedAd(placement = 'rewarded'): Promise<boolean> {
    return this.showRewarded(placement);
  }

  isRewardedAvailable(): boolean {
    return !!this.ytgame;
  }

  async saveData(data: unknown): Promise<boolean> {
    const jsonStr = JSON.stringify(data);
    // Always save to localStorage as cache
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(LOCAL_KEY, jsonStr);
      }
    } catch { /* ignore */ }

    // Sync to ytgame if available
    if (this.ytgame && typeof this.ytgame.saveData === 'function') {
      try {
        await this.ytgame.saveData(jsonStr);
        return true;
      } catch (e) {
        console.warn('[Ytgame] saveData failed, using local cache', e);
        return false;
      }
    }
    return true;
  }

  async loadData(): Promise<unknown | null> {
    // Try ytgame first
    if (this.ytgame && typeof this.ytgame.loadData === 'function') {
      try {
        const raw = await this.ytgame.loadData();
        if (raw) {
          const parsed = JSON.parse(raw);
          // Cache to localStorage
          try {
            if (typeof window !== 'undefined' && window.localStorage) {
              localStorage.setItem(LOCAL_KEY, raw);
            }
          } catch { /* ignore */ }
          return parsed;
        }
      } catch (e) {
        console.warn('[Ytgame] loadData failed, trying local cache', e);
      }
    }

    // Fallback to localStorage
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = localStorage.getItem(LOCAL_KEY);
        if (raw) return JSON.parse(raw);
      }
    } catch { /* ignore */ }
    return null;
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
    userScore = 0
  ): Promise<LeaderboardData> {
    return {
      entries: [],
      userEntry: { name: '⭐ You', score: userScore, rank: 1, isUser: true },
    };
  }

  async showNativeLeaderboard(_leaderboardName?: string): Promise<boolean> {
    return false;
  }

  async showLeaderboard(_leaderboardName?: string): Promise<boolean> {
    return false;
  }
}