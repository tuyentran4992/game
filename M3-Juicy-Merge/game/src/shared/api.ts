/**
 * Shared API and Data Model definitions for Juicy Merge (Reddit Devvit)
 */

export interface SavePayload {
  best_score: number;
  unlocked_tiers?: number[];
  daily_completed_date?: string;
  daily_best_score?: number;
  daily_streak_count?: number;
  schema_version?: number;
}

export interface ScoreSubmitRequest {
  score: number;
  userId: string;
  username?: string;
  payload?: SavePayload;
}

export interface ScoreSubmitResponse {
  saved: boolean;
  bestScore: number;
}

export interface ScoreGetResponse {
  userId: string;
  score: number;
  payload?: SavePayload | null;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  score: number;
  rank: number;
}
