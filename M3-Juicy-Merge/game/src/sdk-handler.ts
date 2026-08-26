// Universal SdkHandler — Multi-Backend Dispatch:
// 1. Reddit Devvit (window.devvit / Redis Hono API)
// 2. Playgama Bridge v2 (window.bridge / window.playgamaBridge)
// 3. YouTube Playables (window.ytgame)
// 4. LocalStorage (Standalone Web / Local Dev)

import { getBridge, PlaygamaBackend, type PlaygamaBridgeLike } from './sdk-bridge-backend';
import { DevvitBackend } from './sdk-devvit-backend';

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

const LOCAL_STORAGE_KEY = 'juicy_merge_save_v1';

export type PlatformType = 'reddit' | 'playgama' | 'ytgame' | 'local';

export class SdkHandler {
  readonly platform: PlatformType;
  private ytgame: YtGame | null = null;
  private bridge: PlaygamaBridgeLike | null = null;
  private pb: PlaygamaBackend | null = null;
  private devvit: DevvitBackend | null = null;
  useBridge = false;

  constructor() {
    this.devvit = new DevvitBackend();
    this.bridge = getBridge();
    this.ytgame = typeof window !== 'undefined' ? (window.ytgame ?? null) : null;

    if (this.devvit.isAvailable) {
      this.platform = 'reddit';
    } else if (this.bridge) {
      this.platform = 'playgama';
      this.useBridge = true;
      this.pb = new PlaygamaBackend(this.bridge);
    } else if (this.ytgame) {
      this.platform = 'ytgame';
    } else {
      this.platform = 'local';
    }
  }

  gameReady(): void {
    if (this.pb) {
      this.pb.gameReady();
      return;
    }
    this.ytgame?.gameReady?.();
  }

  onPause(cb: () => void): void {
    if (this.pb) {
      this.pb.onPause(cb);
      return;
    }
    this.ytgame?.onPause?.(cb);
  }

  onResume(cb: () => void): void {
    if (this.pb) {
      this.pb.onResume(cb);
      return;
    }
    this.ytgame?.onResume?.(cb);
  }

  isAudioEnabled(): boolean {
    if (this.pb) return this.pb.isAudioEnabled();
    return this.ytgame?.isAudioEnabled?.() ?? true;
  }

  onAudioEnabledChange(cb: (enabled: boolean) => void): void {
    if (this.pb) {
      this.pb.onAudioEnabledChange(cb);
      return;
    }
    this.ytgame?.onAudioEnabledChange?.(cb);
  }

  async saveData(data: unknown): Promise<boolean> {
    const jsonStr = JSON.stringify(data);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(LOCAL_STORAGE_KEY, jsonStr);
      }
    } catch (e) {
      console.warn('localStorage save failed', e);
    }

    if (this.devvit?.isAvailable) return this.devvit.saveData(data);
    if (this.pb) return this.pb.saveData(data);

    if (this.ytgame && typeof this.ytgame.saveData === 'function') {
      try {
        await this.ytgame.saveData(jsonStr);
        return true;
      } catch (e) {
        console.warn('ytgame.saveData failed, using local storage cache', e);
        return false;
      }
    }
    return true;
  }

  async loadData(): Promise<unknown | null> {
    if (this.devvit?.isAvailable) {
      const devvitData = await this.devvit.loadData();
      if (devvitData != null) return devvitData;
    }

    if (this.pb) {
      const d = await this.pb.loadData();
      if (d != null) return d;
      return this._readLocalCache();
    }

    if (this.ytgame && typeof this.ytgame.loadData === 'function') {
      try {
        const raw = await this.ytgame.loadData();
        if (raw) {
          const parsed = JSON.parse(raw);
          try {
            if (typeof window !== 'undefined' && window.localStorage) {
              window.localStorage.setItem(LOCAL_STORAGE_KEY, raw);
            }
          } catch {
            // ignore localStorage write errors
          }
          return parsed;
        }
      } catch (e) {
        console.warn('ytgame.loadData failed, trying local storage', e);
      }
    }

    return this._readLocalCache();
  }

  private _readLocalCache(): unknown | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const localRaw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
        if (localRaw) return JSON.parse(localRaw);
      }
    } catch (e) {
      console.warn('localStorage load failed', e);
    }
    return null;
  }

  sendScore(score: number, leaderboardName = 'best_score'): void {
    if (this.devvit?.isAvailable) {
      this.devvit.sendScore(score);
      return;
    }
    if (this.pb) {
      this.pb.sendScore(score, leaderboardName);
      return;
    }
    this.ytgame?.sendScore?.(score);
  }

  async setScore(score: number, leaderboardName = 'best_score'): Promise<boolean> {
    if (this.devvit?.isAvailable) {
      await this.devvit.sendScore(score);
      return true;
    }
    if (this.pb) return this.pb.setScore(score, leaderboardName);
    this.ytgame?.sendScore?.(score);
    return true;
  }

  async getLeaderboardEntries(leaderboardName = 'best_score', quantityTop = 10, userScore = 0) {
    if (this.devvit?.isAvailable) {
      return this.devvit.getLeaderboardEntries(quantityTop, userScore);
    }
    if (this.pb) return this.pb.getLeaderboardEntries(leaderboardName, quantityTop, userScore);
    return {
      entries: [
        { name: '🍉 WatermelonKing', score: 3850, rank: 1 },
        { name: '🐉 DragonMaster', score: 3120, rank: 2 },
        { name: '🍍 PineQueen', score: 2680, rank: 3 },
        { name: '🍇 GrapeNinja', score: 2150, rank: 4 },
        { name: '🍓 BerryPop', score: 1820, rank: 5 },
      ],
      userEntry: { name: '⭐ You (Me)', score: userScore, rank: 6, isUser: true },
    };
  }

  async showLeaderboard(leaderboardName = 'best_score'): Promise<boolean> {
    if (this.pb) return this.pb.showNativeLeaderboard(leaderboardName);
    return false;
  }

  async requestInterstitialAd(): Promise<void> {
    if (this.pb) {
      await this.pb.requestInterstitialAd();
      return;
    }
    await this.ytgame?.ads?.requestInterstitialAd?.();
  }

  async requestRewardedAd(rewardId: string): Promise<boolean> {
    if (this.devvit?.isAvailable) {
      // Reddit Devvit: free continue without 3rd party ads
      return true;
    }
    if (this.pb) return this.pb.requestRewardedAd(rewardId);
    if (!this.ytgame) {
      // Fallback local dev: luôn cấp thưởng để test gameplay mượt mà
      return true;
    }
    try {
      return (await this.ytgame.ads?.requestRewardedAd?.(rewardId)) ?? true;
    } catch {
      return false;
    }
  }

  isRewardedAvailable(): boolean {
    if (this.devvit?.isAvailable) return false;
    if (this.pb) return true;
    return !!this.ytgame;
  }
}