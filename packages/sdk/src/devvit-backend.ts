/**
 * DevvitBackend — Reddit Devvit Platform Adapter
 *
 * Connects client to Hono backend for Redis persistence and Sorted Set Leaderboards.
 * Detects Devvit environment via window.devvit, __devvit, or hostname.
 */
import type { SDKBackend } from './index';
import type { LeaderboardData } from './types';

export class DevvitBackend implements SDKBackend {
  readonly isAvailable: boolean;

  constructor() {
    this.isAvailable =
      typeof window !== 'undefined' &&
      ((window as unknown as { devvit?: unknown }).devvit != null ||
        (window as unknown as { __devvit?: unknown }).__devvit != null ||
        window.location.hostname.includes('devvit.net') ||
        window.location.search.includes('playtest'));
  }

  async initialize(): Promise<void> {
    // Devvit doesn't need explicit initialization
  }

  async showInterstitial(): Promise<void> {
    // Reddit Devvit: no interstitial ads
  }

  async requestInterstitialAd(): Promise<void> {
    return this.showInterstitial();
  }

  async showRewarded(_rewardId?: string): Promise<boolean> {
    // Reddit Devvit: free continue without ads
    return true;
  }

  async requestRewardedAd(rewardId?: string): Promise<boolean> {
    return this.showRewarded(rewardId);
  }

  isRewardedAvailable(): boolean {
    return false; // No ads on Devvit
  }

  isAudioEnabled(): boolean {
    return true;
  }

  onPause(_cb: () => void): void {
    // Devvit lifecycle handled by platform
  }

  onResume(_cb: () => void): void {
    // Devvit lifecycle handled by platform
  }

  onAudioChange(_cb: (enabled: boolean) => void): void {
    // Devvit audio handled by platform
  }

  onAudioEnabledChange(cb: (enabled: boolean) => void): void {
    this.onAudioChange(cb);
  }

  gameReady(): void {
    // Devvit doesn't need gameReady signal
  }

  async loadData(): Promise<Record<string, unknown> | null> {
    try {
      const res = await fetch('/api/score');
      if (!res.ok) {
        return this._readLocalStorage();
      }
      const data = await res.json() as Record<string, unknown>;
      const payload = data.payload as Record<string, unknown> | undefined;
      if (payload != null) {
        return payload;
      }
      if (data.score != null) {
        return { bestScore: data.score };
      }
      return this._readLocalStorage();
    } catch (e) {
      console.warn('[Devvit] Failed to load data:', e);
      return this._readLocalStorage();
    }
  }

  async saveData(data: unknown): Promise<boolean> {
    const payload = (data ?? {}) as Record<string, unknown>;
    // Also save to localStorage as fallback
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('game_save', JSON.stringify(payload));
      }
    } catch { /* ignore */ }

    try {
      const score = typeof payload.best_score === 'number'
        ? payload.best_score
        : typeof payload.bestScore === 'number'
        ? payload.bestScore
        : typeof payload.score === 'number'
        ? payload.score
        : 0;

      const res = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score, payload }),
      });
      return res.ok;
    } catch (e) {
      console.warn('[Devvit] Failed to save data:', e);
      return false;
    }
  }

  async sendScore(score: number): Promise<void> {
    try {
      await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score }),
      });
    } catch (e) {
      console.warn('[Devvit] Failed to send score:', e);
    }
  }

  async setScore(score: number, _leaderboardName?: string): Promise<boolean> {
    await this.sendScore(score);
    return true;
  }

  async getLeaderboardEntries(
    _leaderboardName?: string,
    quantityTop = 10,
    userScore = 0
  ): Promise<LeaderboardData> {
    try {
      const res = await fetch(`/api/leaderboard?limit=${quantityTop}`);
      if (res.ok) {
        const list = (await res.json()) as Array<Record<string, unknown>>;
        return {
          entries: list.map((item, idx) => ({
            id: (item.userId as string | number) ?? (item.id as string | number) ?? idx + 1,
            name: String(item.username || item.name || `Player #${idx + 1}`),
            score: Number(item.score ?? 0),
            rank: Number(item.rank ?? idx + 1),
            isUser: false,
          })),
          userEntry: { name: '⭐ You', score: userScore, rank: 1, isUser: true },
        };
      }
    } catch (e) {
      console.warn('[Devvit] Failed to fetch leaderboard:', e);
    }
    return {
      entries: [
        { name: '🍉 WatermelonKing', score: 3850, rank: 1 },
        { name: '🐉 DragonMaster', score: 3120, rank: 2 },
        { name: '🍍 PineQueen', score: 2680, rank: 3 },
      ],
      userEntry: { name: '⭐ You', score: userScore, rank: 4, isUser: true },
    };
  }

  async showNativeLeaderboard(_leaderboardName?: string): Promise<boolean> {
    return false; // Devvit uses custom leaderboard UI
  }

  async showLeaderboard(_leaderboardName?: string): Promise<boolean> {
    return false;
  }

  private _readLocalStorage(): Record<string, unknown> | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = localStorage.getItem('game_save');
        return raw ? JSON.parse(raw) : null;
      }
    } catch { /* ignore */ }
    return null;
  }
}