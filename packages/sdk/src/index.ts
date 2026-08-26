/**
 * @game/sdk — Multi-backend SDK wrapper
 *
 * Priority: Playgama Bridge → ytgame (Mediacube/YouTube) → Mock (local)
 *
 * Usage:
 * ```ts
 * import { sdk } from '@game/sdk';
 * await sdk.initialize();
 * sdk.showInterstitial();
 * const rewarded = await sdk.showRewarded();
 * sdk.saveData({ score: 100 });
 * ```
 */

export interface SDKBackend {
  /** Initialize the SDK. Must be called before any other methods. */
  initialize(): Promise<void>;
  /** Show interstitial ad */
  showInterstitial(): Promise<void>;
  /** Show rewarded ad. Returns true if reward was granted. */
  showRewarded(): Promise<boolean>;
  /** Check if audio is enabled */
  isAudioEnabled(): boolean;
  /** Save persistent data */
  saveData(data: Record<string, unknown>): Promise<void>;
  /** Load persistent data */
  loadData(): Promise<Record<string, unknown>>;
  /** Send score to leaderboard */
  sendScore(score: number): Promise<void>;
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
export { sdk } from './handler';