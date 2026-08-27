/**
 * SDK handler — universal multi-backend dispatcher.
 *
 * Auto-detects platform with priority:
 *   1. Reddit Devvit
 *   2. Playgama Bridge
 *   3. YouTube Playables (ytgame)
 *   4. Mock (local/standalone)
 *
 * Buffers all calls until initialize() resolves.
 * Each backend implements the full SDKBackend interface.
 */

import type { SDKBackend, PlatformType, LeaderboardData } from './index';
import { PlaygamaBackend, getBridge } from './bridge-backend';
import { DevvitBackend } from './devvit-backend';
import { YtgameBackend } from './ytgame-backend';
import { MockBackend } from './instance';

function detectPlatform(): { backend: SDKBackend; platform: PlatformType } {
  const devvit = new DevvitBackend();
  if (devvit.isAvailable) {
    return { backend: devvit, platform: 'reddit' };
  }

  const bridge = getBridge();
  if (bridge) {
    return { backend: new PlaygamaBackend(bridge), platform: 'playgama' };
  }

  if (typeof window !== 'undefined' && window.ytgame) {
    return { backend: new YtgameBackend(), platform: 'ytgame' };
  }

  return { backend: new MockBackend(), platform: 'local' };
}

export class SDKHandler {
  private backend: SDKBackend;
  readonly platform: PlatformType;
  private _initialized = false;

  constructor() {
    const detected = detectPlatform();
    this.backend = detected.backend;
    this.platform = detected.platform;
    console.log(`[SDK] Platform detected: ${this.platform}`);
  }

  async initialize(): Promise<void> {
    if (this._initialized) return;
    await this.backend.initialize();
    this._initialized = true;
  }

  async showInterstitial(): Promise<void> {
    try {
      await this.backend.showInterstitial();
    } catch (e) {
      console.warn('[SDK] Interstitial error:', e);
    }
  }

  async requestInterstitialAd(): Promise<void> {
    return this.showInterstitial();
  }

  async showRewarded(placement?: string): Promise<boolean> {
    try {
      return await this.backend.showRewarded(placement);
    } catch (e) {
      console.warn('[SDK] Rewarded error:', e);
      return true;
    }
  }

  async requestRewardedAd(placement?: string): Promise<boolean> {
    return this.showRewarded(placement);
  }

  isRewardedAvailable(): boolean {
    return this.backend.isRewardedAvailable();
  }

  isAudioEnabled(): boolean {
    return this.backend.isAudioEnabled();
  }

  async saveData(data: unknown): Promise<boolean> {
    try {
      return await this.backend.saveData(data);
    } catch (e) {
      console.warn('[SDK] Save error:', e);
      return false;
    }
  }

  async loadData(): Promise<unknown | null> {
    try {
      return await this.backend.loadData();
    } catch (e) {
      console.warn('[SDK] Load error:', e);
      return null;
    }
  }

  sendScore(score: number, leaderboardName?: string): void {
    try {
      void this.backend.sendScore(score, leaderboardName);
    } catch (e) {
      console.warn('[SDK] SendScore error:', e);
    }
  }

  async setScore(score: number, leaderboardName?: string): Promise<boolean> {
    try {
      return await this.backend.setScore(score, leaderboardName);
    } catch (e) {
      console.warn('[SDK] SetScore error:', e);
      return false;
    }
  }

  async getLeaderboardEntries(leaderboardName?: string, quantityTop?: number, userScore?: number): Promise<LeaderboardData> {
    try {
      return await this.backend.getLeaderboardEntries(leaderboardName, quantityTop, userScore);
    } catch (e) {
      console.warn('[SDK] GetLeaderboard error:', e);
      return { entries: [], userEntry: { name: 'You', score: userScore ?? 0, rank: 1, isUser: true } };
    }
  }

  async showNativeLeaderboard(leaderboardName?: string): Promise<boolean> {
    try {
      return await this.backend.showNativeLeaderboard(leaderboardName);
    } catch (e) {
      console.warn('[SDK] ShowNativeLeaderboard error:', e);
      return false;
    }
  }

  async showLeaderboard(leaderboardName?: string): Promise<boolean> {
    return this.showNativeLeaderboard(leaderboardName);
  }

  gameReady(): void {
    this.backend.gameReady();
  }

  onPause(cb: () => void): void {
    this.backend.onPause(cb);
  }

  onResume(cb: () => void): void {
    this.backend.onResume(cb);
  }

  onAudioChange(cb: (enabled: boolean) => void): void {
    this.backend.onAudioChange(cb);
  }

  onAudioEnabledChange(cb: (enabled: boolean) => void): void {
    this.onAudioChange(cb);
  }
}

export const sdk = new SDKHandler();
export { SDKHandler as SdkHandler };