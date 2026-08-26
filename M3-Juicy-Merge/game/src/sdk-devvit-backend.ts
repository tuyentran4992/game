/**
 * DevvitBackend — Reddit Devvit Platform Adapter
 *
 * Connects client to Hono backend for Redis persistence and Sorted Set Leaderboards.
 */
import type { LeaderboardEntry, ScoreGetResponse } from './shared/api';

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

  async loadData(): Promise<unknown | null> {
    try {
      const res = await fetch('/api/score');
      if (!res.ok) return null;
      const data = (await res.json()) as ScoreGetResponse;
      return data.payload ?? (data.score != null ? { bestScore: data.score } : null);
    } catch (e) {
      console.warn('[DevvitBackend] Failed to load data:', e);
      return null;
    }
  }

  async saveData(data: unknown): Promise<boolean> {
    try {
      const payload = (data ?? {}) as Record<string, unknown>;
      const score = typeof payload.bestScore === 'number' ? payload.bestScore : 0;
      const res = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score, payload }),
      });
      return res.ok;
    } catch (e) {
      console.warn('[DevvitBackend] Failed to save data:', e);
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
      console.warn('[DevvitBackend] Failed to send score:', e);
    }
  }

  async getLeaderboardEntries(quantityTop = 10, userScore = 0) {
    try {
      const res = await fetch(`/api/leaderboard?limit=${quantityTop}`);
      if (res.ok) {
        const list = (await res.json()) as LeaderboardEntry[];
        return {
          entries: list.map((item) => ({
            name: item.username,
            score: item.score,
            rank: item.rank,
            isUser: false,
          })),
          userEntry: { name: '⭐ You', score: userScore, rank: 1, isUser: true },
        };
      }
    } catch (e) {
      console.warn('[DevvitBackend] Failed to fetch leaderboard:', e);
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
}
