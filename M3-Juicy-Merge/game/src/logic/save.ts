// M3 Juicy Merge — Best-score save/load (M3-08).
// Persists the best score through an injectable SaveAdapter so the engine stays
// pure (it never imports the SDK — the adapter is injected at the context edge).
//
// Payload shape (DATA-MODEL §1.3): { best_score, schema_version }.
// On load failure → default 0, never crash.

/** Edge-side persistence + score reporting. The SDK is one implementation; tests
 *  inject a mock. Keeping this an interface means the logic module has no SDK import. */
export interface SaveAdapter {
  loadData(): Promise<unknown | null>;
  saveData(data: unknown): Promise<boolean>;
  sendScore(score: number): void;
}

/** Persisted save payload (M3-08). Bumping schema_version enables migration later. */
export interface SavePayload {
  best_score: number;
  schema_version: number;
}

/** Current save schema version. */
export const SAVE_SCHEMA_VERSION = 1;

/**
 * Best-score store backed by an injectable {@link SaveAdapter}.
 *
 * - `load()` reads the stored best_score; any error → default 0 (no crash, M3-08).
 * - `onGameOver(score)` applies the strictly-greater rule: if `score` beats the
 *   best, it persists the new best and reports it via `sendScore` (M3-08). This is
 *   the single place a save/score-report happens, so it fires exactly once per beat.
 */
export class ScoreStore {
  bestScore = 0;
  private loaded = false;

  constructor(private readonly adapter: SaveAdapter) {}

  /** Load best score from storage. Idempotent. Never throws (M3-08). */
  async load(): Promise<void> {
    if (this.loaded) return;
    try {
      const data = await this.adapter.loadData() as Partial<SavePayload> | null;
      this.bestScore = data && typeof data.best_score === 'number' ? data.best_score : 0;
    } catch (e) {
      // Corrupt storage / adapter error → start fresh at 0, never crash (M3-08).
      console.warn('loadData failed, starting fresh', e);
      this.bestScore = 0;
    }
    this.loaded = true;
  }

  /** Mark store as needing a reload (e.g. before a fresh load after a retry). */
  reset(): void {
    this.bestScore = 0;
    this.loaded = false;
  }

  /** Called on game over. If score strictly beats best → persist + sendScore once.
   *  Returns the (possibly updated) best score. Never throws — a save failure just
   *  keeps the in-memory best so the player still sees their record this session. */
  async onGameOver(score: number): Promise<number> {
    if (score > this.bestScore) {
      this.bestScore = score;
      const payload: SavePayload = {
        best_score: this.bestScore,
        schema_version: SAVE_SCHEMA_VERSION,
      };
      try {
        await this.adapter.saveData(payload);
      } catch (e) {
        console.warn('saveData failed, keeping session best', e);
      }
      try {
        this.adapter.sendScore(this.bestScore);
      } catch (e) {
        console.warn('sendScore failed', e);
      }
    }
    return this.bestScore;
  }
}
