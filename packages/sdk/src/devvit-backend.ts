/**
 * DevvitBackend — Reddit Devvit Platform Adapter
 *
 * Connects client to Hono backend for Redis persistence and Sorted Set Leaderboards.
 * Detects Devvit environment via window.devvit, __devvit, or hostname.
 */
import type { LeaderboardData, LeaderboardEntry } from './types';

export class DevvitBackend {
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

  async showRewarded(): Promise<boolean> {
    // Reddit Devvit: free continue without ads
    return true;
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

  gameReady(): void {
    // Devvit doesn't need gameReady signal
  }

  async loadData(): Promise<Record<string, unknown>> {
    try {
      const res = await fetch('/api/score');
      if (!res.ok) return {};
      const data = await res.json() as Record<string, unknown>;
      const payload = data.payload as Record<string, unknown> | undefined;
      if (payload) {
        // Try localStorage fallback for save data beyond score
        try {
          const local = JSON.parse(localStorage.getItem('game_save') || '{}');
          return { ...local, ...payload, bestScore: (data.score as number) ?? local.bestScore ?? 0 };
        } catch { return payload; }
      }
      return {};
    } catch (e) {
      console.warn('[Devvit] Failed to load data:', e);
      try {
        return JSON.parse(localStorage.getItem('game_save') || '{}');
      } catch { return {}; }
    }
  }

  async saveData(data: Record<string, unknown>): Promise<void> {
    // Also save to localStorage as fallback
    try {
      const existing = JSON.parse(localStorage.getItem('game_save') || '{}');
      localStorage.setItem('game_save', JSON.stringify({ ...existing, ...data }));
    } catch { /* ignore */ }

    try {
      const score = typeof data.bestScore === 'number' ? data.bestScore : 0;
      await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score, payload: data }),
      });
    } catch (e) {
      console.warn('[Devvit] Failed to save data:', e);
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
        const list = (await res.json()) as LeaderboardEntry[];
        return {
          entries: list.map((item) => ({
            name: item.name,
            score: item.score,
            rank: item.rank,
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
}