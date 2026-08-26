/**
 * @game/sdk — Shared types for multi-backend SDK
 */

export interface LeaderboardEntry {
  id?: string | number;
  name: string;
  score: number;
  rank: number;
  avatar?: string;
  isUser?: boolean;
}

export interface LeaderboardData {
  entries: LeaderboardEntry[];
  userEntry?: LeaderboardEntry | null;
}

export type PlatformType = 'reddit' | 'playgama' | 'ytgame' | 'local';