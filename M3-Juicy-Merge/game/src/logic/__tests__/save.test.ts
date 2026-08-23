// GC-14 — Best-score save/load (M3-08).
// The engine stays pure: it never imports the SDK. Persistence goes through an
// injectable SaveAdapter, so tests inject a mock storage.
//
// Contract (TEST-CASES.md GC-14 + plan Bước 7):
//   • game over with score > best → saveData called with { best_score, schema_version },
//     best updated, sendScore called exactly ONCE.
//   • load throws → best defaults to 0, never crashes.
//   • score <= best → no save, no sendScore (no spurious writes).
import { describe, it, expect, vi } from 'vitest';
import { ScoreStore, SAVE_SCHEMA_VERSION } from '../save';
import type { SaveAdapter } from '../save';

/** Build an injectable mock adapter with vi spies. */
const makeAdapter = (loaded: unknown): SaveAdapter & {
  saveData: ReturnType<typeof vi.fn>;
  loadData: ReturnType<typeof vi.fn>;
  sendScore: ReturnType<typeof vi.fn>;
} => ({
  loadData: vi.fn().mockResolvedValue(loaded),
  saveData: vi.fn().mockResolvedValue(true),
  sendScore: vi.fn(),
});

describe('GC-14: best-score save/load (M3-08)', () => {
  it('load reads best_score from the adapter payload', async () => {
    const adapter = makeAdapter({ best_score: 42, schema_version: 1 });
    const store = new ScoreStore(adapter);
    await store.load();
    expect(store.bestScore).toBe(42);
  });

  it('load throw → default 0, never crashes (M3-08)', async () => {
    const adapter = makeAdapter(null);
    adapter.loadData.mockRejectedValueOnce(new Error('storage exploded'));
    const store = new ScoreStore(adapter);
    await expect(store.load()).resolves.toBeUndefined();
    expect(store.bestScore).toBe(0);
  });

  it('load missing/null payload → default 0', async () => {
    const adapter = makeAdapter(null);
    const store = new ScoreStore(adapter);
    await store.load();
    expect(store.bestScore).toBe(0);
  });

  it('game over with score > best → save called with {best_score, schema_version}, best updated, sendScore once', async () => {
    const adapter = makeAdapter({ best_score: 10, schema_version: 1 });
    const store = new ScoreStore(adapter);
    await store.load();
    expect(store.bestScore).toBe(10);

    const updated = await store.onGameOver(50);
    expect(updated).toBe(50);
    expect(store.bestScore).toBe(50);
    // saveData called exactly once with the right payload
    expect(adapter.saveData).toHaveBeenCalledTimes(1);
    expect(adapter.saveData).toHaveBeenCalledWith({
      best_score: 50,
      schema_version: SAVE_SCHEMA_VERSION,
    });
    // sendScore called exactly once with the new best
    expect(adapter.sendScore).toHaveBeenCalledTimes(1);
    expect(adapter.sendScore).toHaveBeenCalledWith(50);
  });

  it('score not beating best → no save, no sendScore (no spurious writes)', async () => {
    const adapter = makeAdapter({ best_score: 100, schema_version: 1 });
    const store = new ScoreStore(adapter);
    await store.load();
    await store.onGameOver(30);
    expect(store.bestScore).toBe(100); // unchanged
    expect(adapter.saveData).not.toHaveBeenCalled();
    expect(adapter.sendScore).not.toHaveBeenCalled();
  });

  it('score equal to best → no save, no sendScore (strictly-greater rule)', async () => {
    const adapter = makeAdapter({ best_score: 50, schema_version: 1 });
    const store = new ScoreStore(adapter);
    await store.load();
    await store.onGameOver(50);
    expect(store.bestScore).toBe(50);
    expect(adapter.saveData).not.toHaveBeenCalled();
    expect(adapter.sendScore).not.toHaveBeenCalled();
  });

  it('onGameOver after a fresh load (best=0) beats best → save + sendScore once', async () => {
    const adapter = makeAdapter(null);
    const store = new ScoreStore(adapter);
    await store.load();
    await store.onGameOver(7);
    expect(store.bestScore).toBe(7);
    expect(adapter.saveData).toHaveBeenCalledTimes(1);
    expect(adapter.sendScore).toHaveBeenCalledTimes(1);
    expect(adapter.sendScore).toHaveBeenCalledWith(7);
  });

  it('second consecutive beat updates best again and sendScore fires again (per game-over)', async () => {
    const adapter = makeAdapter({ best_score: 5, schema_version: 1 });
    const store = new ScoreStore(adapter);
    await store.load();
    await store.onGameOver(10);
    await store.onGameOver(20);
    expect(store.bestScore).toBe(20);
    expect(adapter.saveData).toHaveBeenCalledTimes(2);
    expect(adapter.sendScore).toHaveBeenCalledTimes(2);
  });

  it('saveData rejecting → keep session best, sendScore still fires once, no throw (M3-08)', async () => {
    const adapter = makeAdapter({ best_score: 5, schema_version: 1 });
    adapter.saveData.mockRejectedValueOnce(new Error('disk full'));
    const store = new ScoreStore(adapter);
    await store.load();
    await expect(store.onGameOver(15)).resolves.toBe(15);
    expect(store.bestScore).toBe(15); // session best kept even if persist failed
    expect(adapter.saveData).toHaveBeenCalledTimes(1);
    expect(adapter.sendScore).toHaveBeenCalledTimes(1); // still reports this session
    expect(adapter.sendScore).toHaveBeenCalledWith(15);
  });

  it('reset() forces a reload: best re-read from storage on next load()', async () => {
    const adapter = makeAdapter({ best_score: 42, schema_version: 1 });
    const store = new ScoreStore(adapter);
    await store.load();
    expect(store.bestScore).toBe(42);
    store.reset();
    expect(store.bestScore).toBe(0); // reset clears in-memory best
    // storage now reports a different best
    adapter.loadData.mockResolvedValueOnce({ best_score: 99, schema_version: 1 });
    await store.load();
    expect(store.bestScore).toBe(99); // reloaded from storage
  });
});
