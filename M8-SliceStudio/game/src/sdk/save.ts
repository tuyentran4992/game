// Slice Studio — src/sdk/save.ts (S4, TDD-A tier A glue + pure reducer)
// Persistence glue over @game/sdk (DATA-MODEL.md §2). Key 'slice-studio-save-v1'.
// Invariants:
//   1. unlockedLevel only increases.
//   2. stars[id] / bestPct[id] keep the max — a worse replay never overwrites.
//   3. Atomic writes: the whole object is serialized in ONE saveData call
//      (a killed process can never leave a half-written schema).
//   4. Save failure never blocks play — the in-memory save keeps progressing,
//      we simply retry on the next cut / lifecycle event.
// This file is Tier A: pure TS, no Phaser, DOM access only through optional
// global listeners (installLifecycleSavers) so node tests stay clean.
import { sdk } from '@game/sdk';
import type { SDKBackend } from '@game/sdk';

export const SAVE_KEY = 'slice-studio-save-v1';
const LEVEL_COUNT = 12; // full run = all 12 levels ghosted in one streak

/** Save schema v1 — DATA-MODEL.md §2. Shape change = version bump. */
export interface SliceStudioSave {
  v: 1;
  /** 1..12 — highest level the player can jump straight into. */
  unlockedLevel: number;
  /** levelId -> best stars 0..3 (max only). */
  stars: Record<number, number>;
  /** levelId -> best accuracy 0..100 (max only). */
  bestPct: Record<number, number>;
  /** longest GHOST streak ever achieved. */
  bestStreak: number;
  /** full 12/12 GHOST run ever completed (permanent title). */
  fullRunGhost: boolean;
  /** audio state, read at boot. */
  muted: boolean;
}

/** Minimal level shape the reducer needs (structural — levels satisfy it). */
export interface SaveLevelLike {
  id: number;
}

/** One committed cut, translated from the engine's AttemptResult. */
export interface CutInput {
  level: SaveLevelLike;
  stars: number;
  pct: number;
  /** engine ghost streak AFTER this cut (already +1 on a ghost). */
  ghostStreak: number;
}

export function defaultSave(): SliceStudioSave {
  return { v: 1, unlockedLevel: 1, stars: {}, bestPct: {}, bestStreak: 0, fullRunGhost: false, muted: false };
}

const clampInt = (n: unknown, min: number, max: number): number => {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return min;
  return Math.min(max, Math.max(min, v));
};

/** Accepts anything storage returns (null / old / partial) → valid v1 save. */
export function migrateSave(raw: unknown): SliceStudioSave {
  const base = defaultSave();
  if (raw === null || raw === undefined || typeof raw !== 'object') return base;
  const o = raw as Record<string, unknown>;
  const stars: Record<number, number> = {};
  const bestPct: Record<number, number> = {};
  const readStars = (o.stars && typeof o.stars === 'object' ? o.stars : {}) as Record<string, unknown>;
  const readPct = (o.bestPct && typeof o.bestPct === 'object' ? o.bestPct : {}) as Record<string, unknown>;
  for (const k of Object.keys(readStars)) {
    const id = Number(k);
    if (Number.isFinite(id)) stars[id] = clampInt(readStars[k], 0, 3);
  }
  for (const k of Object.keys(readPct)) {
    const id = Number(k);
    if (Number.isFinite(id)) bestPct[id] = clampInt(readPct[k], 0, 100);
  }
  return {
    v: 1,
    unlockedLevel: clampInt(o.unlockedLevel ?? 1, 1, LEVEL_COUNT),
    stars,
    bestPct,
    bestStreak: clampInt(o.bestStreak ?? 0, 0, LEVEL_COUNT),
    fullRunGhost: o.fullRunGhost === true,
    muted: o.muted === true,
  };
}

/**
 * Pure reducer: one committed cut → next save state.
 * Max-only + unlockedLevel-only-increases live here (S4-T1/T2/T3).
 */
export function applyCut(prev: SliceStudioSave, cut: CutInput): SliceStudioSave {
  const id = cut.level.id;
  const prevStars = prev.stars[id] ?? 0;
  const prevPct = prev.bestPct[id] ?? 0;
  const next: SliceStudioSave = {
    ...prev,
    v: 1,
    unlockedLevel: prev.unlockedLevel, // bumped below only on real progress
    stars: { ...prev.stars, [id]: Math.max(prevStars, clampInt(cut.stars, 0, 3)) },
    bestPct: { ...prev.bestPct, [id]: Math.max(prevPct, cut.pct) },
    bestStreak: Math.max(prev.bestStreak, clampInt(cut.ghostStreak, 0, LEVEL_COUNT)),
  };
  if (cut.stars > 0) {
    // Progress marker (TEST-CASES S4-T2): reaching level N with stars → N stays
    // the highest level reached; never decreases on a worse replay (invariant 1).
    next.unlockedLevel = Math.max(prev.unlockedLevel, clampInt(id, 1, LEVEL_COUNT));
  }
  if (cut.ghostStreak >= LEVEL_COUNT && id === LEVEL_COUNT && cut.stars > 0) {
    next.fullRunGhost = true; // permanent title — never unset once earned
  }
  return next;
}

/**
 * SaveStore — the only writer of the save object. Owns the in-memory copy,
 * persists the WHOLE object in a single saveData call per save event.
 */
export class SaveStore {
  private save: SliceStudioSave = defaultSave();
  private inflight: Promise<boolean> | null = null;
  private pendingNewer = false;
  private dirty = false;
  private installed = false;
  private removeListeners: () => void = () => {};

  constructor(private readonly backend: Pick<typeof sdk, 'saveData' | 'loadData'>, private readonly key = SAVE_KEY) {}

  get current(): SliceStudioSave {
    return this.save;
  }

  get storageKey(): string {
    return this.key;
  }

  /** Swap in a loaded/migrated save (used by boot and by tests). */
  setLoaded(s: SliceStudioSave): void {
    this.save = migrateSave(s);
  }

  /** Boot: load + migrate. Empty/corrupt storage → defaults, never throws. */
  async restore(): Promise<void> {
    try {
      const raw = await this.backend.loadData();
      this.save = migrateSave(raw);
    } catch {
      this.save = defaultSave();
    }
  }

  /** Reducer step — mutates memory only. Persist via flush(). */
  recordCut(cut: CutInput): void {
    this.save = applyCut(this.save, cut);
  }

  /** Update the muted flag (audio state is part of the schema). */
  setMuted(muted: boolean): void {
    if (this.save.muted === muted) return;
    this.save = { ...this.save, muted };
    void this.flush();
  }

  /**
   * Atomic flush: exactly one saveData call carrying the entire object.
   * Coalesced flushes (an overlapping save event) return the pending promise —
   * one write carries the LATEST state, and a failed write stays dirty for
   * retry at the next save event — the game keeps playing (invariant 4).
   */
  async flush(): Promise<boolean> {
    if (this.inflight) {
      this.pendingNewer = true; // a newer state exists than the write in flight
      return this.inflight;
    }
    // one write = one serialized object carrying the latest state
    this.pendingNewer = false;
    const run = (async () => {
      let ok = false;
      try {
        ok = await this.backend.saveData(this.save);
      } catch {
        ok = false;
      }
      this.inflight = null;
      if (!ok) this.dirty = true; // failed → retry at the NEXT save event (no tight loop)
      return ok;
    })();
    this.inflight = run;
    void run.then(() => {
      // trailing flush: a save event landed while this write was in flight —
      // the newest cut must not stay unwritten (save-after-every-cut invariant).
      if (this.pendingNewer) {
        this.pendingNewer = false;
        void this.flush();
      }
    });
    return run;
  }

  /**
   * Playgama C-9 / C-24: device rotation & tab hide must not lose progress.
   * Registers visibilitychange + orientationchange (+pagehide) — each event
   * triggers exactly one flush.
   */
  installLifecycleSavers(): void {
    if (this.installed || typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
    this.installed = true;
    const onHide = () => void this.flush();
    window.addEventListener('visibilitychange', onHide);
    window.addEventListener('orientationchange', onHide);
    window.addEventListener('pagehide', onHide);
    this.removeListeners = () => {
      window.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('orientationchange', onHide);
      window.removeEventListener('pagehide', onHide);
      this.installed = false;
    };
  }
}

/** Narrow the level object of a scene down to what the reducer may read. */
export function cutInputFromResult(level: SaveLevelLike, result: { stars: number; pct: number }, ghostStreak: number): CutInput {
  return { level: { id: level.id }, stars: result.stars, pct: result.pct, ghostStreak };
}

/**
 * Game-wide save store (singleton). Wired in main.ts / TraceScene;
 * tests construct their own SaveStore over a fake backend instead.
 */
export const gameSave = new SaveStore(sdk);
