/**
 * Shared API types for Juicy Merge
 */

export interface ScoreData {
  userId: string;
  score: number;
  timestamp: number;
}

export interface LeaderboardEntry {
  userId: string;
  score: number;
  rank: number;
}