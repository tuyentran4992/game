/**
 * @game/sdk — Multi-backend SDK wrapper
 *
 * Universal SDK for all game platforms:
 *   Priority: Reddit Devvit → Playgama Bridge → ytgame (YouTube/Mediacube) → Mock (local)
 *
 * Usage:
 * ```ts
 * import { sdk } from '@game/sdk';
 * await sdk.initialize();
 * sdk.showInterstitial();
 * const rewarded = await sdk.showRewarded();
 * sdk.saveData({ score: 100 });
 * const lb = await sdk.getLeaderboardEntries();
 * ```
 */

import type { LeaderboardData, PlatformType } from './types';

export interface SDKBackend {
  /** Initialize the SDK. Must be called before any other methods. */
  initialize(): Promise<void>;
  /** Show interstitial ad */
  showInterstitial(): Promise<void>;
  /** Show rewarded ad. Returns true if reward was granted. */
  showRewarded(): Promise<boolean>;
  /** Check if rewarded ads are available on this platform */
  isRewardedAvailable(): boolean;
  /** Check if audio is enabled */
  isAudioEnabled(): boolean;
  /** Save persistent data */
  saveData(data: Record<string, unknown>): Promise<void>;
  /** Load persistent data */
  loadData(): Promise<Record<string, unknown>>;
  /** Send score to leaderboard (fire-and-forget) */
  sendScore(score: number): Promise<void>;
  /** Set score on leaderboard with return value */
  setScore(score: number, leaderboardName?: string): Promise<boolean>;
  /** Get leaderboard entries */
  getLeaderboardEntries(leaderboardName?: string, quantityTop?: number, userScore?: number): Promise<LeaderboardData>;
  /** Show native leaderboard popup */
  showNativeLeaderboard(leaderboardName?: string): Promise<boolean>;
  /** Notify platform that game is ready */
  gameReady(): void;
  /** Register pause callback */
  onPause(cb: () => void): void;
  /** Register resume callback */
  onResume(cb: () => void): void;
  /** Register audio change callback */
  onAudioChange(cb: (enabled: boolean) => void): void;
}

export { PlaygamaBackend } from './bridge-backend';
export { DevvitBackend } from './devvit-backend';
export { YtgameBackend } from './ytgame-backend';
export { MockBackend } from './instance';
export { sdk } from './handler';
export type { PlatformType } from './types';
export type { LeaderboardEntry, LeaderboardData } from './types';