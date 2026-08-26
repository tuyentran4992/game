/**
 * API routes for Juicy Merge
 * - Save/load scores via Redis
 * - Leaderboard using Redis Sorted Set
 */
import { Hono } from "hono";
import { redis } from "@devvit/web/server";
import type {
  ScoreSubmitRequest,
  ScoreSubmitResponse,
  ScoreGetResponse,
  LeaderboardEntry,
} from "../../shared/api";

const api = new Hono();

// Save score and player progress
api.post("/score", async (c) => {
  try {
    const body: ScoreSubmitRequest = await c.req.json();
    const { score, userId, username, payload } = body;
    if (!userId) {
      return c.json({ error: "userId is required" }, 400);
    }

    const scoreKey = `score:${userId}`;
    const prev = await redis.get(scoreKey);
    const prevScore = prev ? parseInt(prev, 10) : 0;
    const bestScore = Math.max(score, prevScore);

    if (score >= prevScore) {
      await redis.set(scoreKey, bestScore.toString());
      await redis.zAdd("leaderboard", { member: userId, score: bestScore });
    }

    if (username) {
      await redis.set(`user_name:${userId}`, username);
    }

    if (payload) {
      await redis.set(`user_progress:${userId}`, JSON.stringify(payload));
    }

    const response: ScoreSubmitResponse = { saved: true, bestScore };
    return c.json(response);
  } catch (err) {
    console.error("Error in POST /api/score:", err);
    return c.json({ error: "Failed to save score" }, 500);
  }
});

// Get user score and saved progress
api.get("/score/:userId", async (c) => {
  try {
    const userId = c.req.param("userId");
    const scoreStr = await redis.get(`score:${userId}`);
    const progressStr = await redis.get(`user_progress:${userId}`);

    let payload = null;
    if (progressStr) {
      try {
        payload = JSON.parse(progressStr);
      } catch {
        payload = null;
      }
    }

    const response: ScoreGetResponse = {
      userId,
      score: scoreStr ? parseInt(scoreStr, 10) : 0,
      payload,
    };
    return c.json(response);
  } catch (err) {
    console.error("Error in GET /api/score:", err);
    return c.json({ error: "Failed to get score" }, 500);
  }
});

// Leaderboard (Top 10 from Sorted Set)
api.get("/leaderboard", async (c) => {
  try {
    const topMembers = await redis.zRange("leaderboard", 0, 9, {
      reverse: true,
      by: "rank",
    });

    const entries: LeaderboardEntry[] = [];
    let rank = 1;

    for (const item of topMembers) {
      const memberId = typeof item === "string" ? item : item.member;
      const memberScore =
        typeof item === "object" && "score" in item ? item.score : null;

      let score = memberScore;
      if (score === null || score === undefined) {
        const scoreVal = await redis.get(`score:${memberId}`);
        score = scoreVal ? parseInt(scoreVal, 10) : 0;
      }

      const storedName = await redis.get(`user_name:${memberId}`);
      const username = storedName || `Player_${memberId.slice(0, 6)}`;

      entries.push({
        userId: memberId,
        username,
        score,
        rank: rank++,
      });
    }

    return c.json(entries);
  } catch (err) {
    console.error("Error in GET /api/leaderboard:", err);
    return c.json([], 200);
  }
});

export { api };
