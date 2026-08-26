/**
 * API routes for Juicy Merge
 * - Save/load scores via Redis
 * - Leaderboard
 */
import { Hono } from 'hono';
import { getRedis, getReddit } from '@devvit/web/server';

const api = new Hono();

// Save score
api.post('/score', async (c) => {
  const { score, userId } = await c.req.json();
  const redis = getRedis();
  const key = `score:${userId}`;
  const prev = await redis.get(key);
  if (!prev || parseInt(prev) < score) {
    await redis.set(key, score.toString());
  }
  return c.json({ saved: true });
});

// Get score
api.get('/score/:userId', async (c) => {
  const redis = getRedis();
  const score = await redis.get(`score:${c.req.param('userId')}`);
  return c.json({ score: score ? parseInt(score) : 0 });
});

// Leaderboard (top 10)
api.get('/leaderboard', async (c) => {
  const redis = getRedis();
  const keys = await redis.keys('score:*');
  const scores: { userId: string; score: number }[] = [];
  for (const key of keys) {
    const userId = key.replace('score:', '');
    const val = await redis.get(key);
    scores.push({ userId, score: val ? parseInt(val) : 0 });
  }
  scores.sort((a, b) => b.score - a.score);
  return c.json(scores.slice(0, 10));
});

export { api };