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

import type { SDKBackend, PlatformType } from './index';
import { PlaygamaBackend } from './bridge-backend';
import { DevvitBackend } from './devvit-backend';
import { YtgameBackend } from './ytgame-backend';
import { MockBackend } from './instance';

function detectPlatform(): { backend: SDKBackend; platform: PlatformType } {
  const devvit = new DevvitBackend();
  if (devvit.isAvailable) {
    return { backend: devvit, platform: 'reddit' };
  }

  if (typeof window !== 'undefined' && (window.bridge || window.playgamaBridge)) {
    return { backend: new PlaygamaBackend(), platform: 'playgama' };
  }

  if (typeof window !== 'undefined' && window.ytgame) {
    return { backend: new YtgameBackend(), platform: 'ytgame' };
  }

  return { backend: new MockBackend(), platform: 'local' };
}

class SDKHandler {
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

  async showRewarded(): Promise<boolean> {
    try {
      return await this.backend.showRewarded();
    } catch (e) {
      console.warn('[SDK] Rewarded error:', e);
      return true;
    }
  }

  isRewardedAvailable(): boolean {
    return this.backend.isRewardedAvailable();
  }

  isAudioEnabled(): boolean {
    return this.backend.isAudioEnabled();
  }

  async saveData(data: Record<string, unknown>): Promise<void> {
    try {
      await this.backend.saveData(data);
    } catch (e) {
      console.warn('[SDK] Save error:', e);
    }
  }

  async loadData(): Promise<Record<string, unknown>> {
    try {
      return await this.backend.loadData();
    } catch (e) {
      console.warn('[SDK] Load error:', e);
      return {};
    }
  }

  async sendScore(score: number): Promise<void> {
    try {
      await this.backend.sendScore(score);
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

  async getLeaderboardEntries(leaderboardName?: string, quantityTop?: number, userScore?: number) {
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
}

export const sdk = new SDKHandler();