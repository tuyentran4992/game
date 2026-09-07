// Slice Studio — core/engine.ts (Tier A, pure TS, no Phaser)
// Session state machine for one level attempt.
//   idle -> drawing -> (release at no-go edge) -> mid -> drawing ... -> scored
// Multi-stroke exists ONLY around forbidden segments (M4): stop before the red
// zone, lift, resume after it — the "release-and-continue" decision.
// Magnet (onboarding), early release, no-go veto, streak — decided here;
// Tier B scenes only translate events into render/audio.

import { scoreTrace, startsNear, type TraceScore } from '../geom/slice';
import { nearestPoint, noGoHit, resampleUniform, type Vec } from '../geom/path';
import { awardStars, nextStreak, type Award } from './scoring';
import type { SliceLevel } from '../level/levels';

export type Phase = 'idle' | 'drawing' | 'mid' | 'scored';

export interface EngineSnapshot {
  phase: Phase;
  traceCount: number;
  /** progress 0..1 along the path (for HUD meter). */
  progress: number;
}

export interface AttemptResult {
  score: TraceScore;
  award: Award;
  /** magnet pulled the start (first touch of the attempt was off-path). */
  magnetUsed: boolean;
}

export const MAGNET_RADIUS = 48;
export const START_RADIUS = 90;
/** px from the no-go start where a release counts as "stopped before red". */
export const NOGO_STOP_ZONE = 80;

export class TraceEngine {
  private phase: Phase = 'idle';
  private strokes: Vec[][] = [];
  private magnetUsed = false;
  private streak = 0;

  /** Reset for a new level (streak survives levels until a non-ghost cut). */
  resetLevel(): void {
    this.phase = 'idle';
    this.strokes = [];
    this.magnetUsed = false;
  }

  get currentPhase(): Phase {
    return this.phase;
  }

  get ghostStreak(): number {
    return this.streak;
  }

  get tracePoints(): readonly Vec[] {
    return this.strokes.flat();
  }

  snapshot(path: readonly Vec[]): EngineSnapshot {
    const total = path.length ? Math.hypot(path[path.length - 1].x - path[0].x, path[path.length - 1].y - path[0].y) || 1 : 1;
    const flat = this.strokes.flat();
    const last = flat[flat.length - 1];
    const progress = last && path.length ? Math.max(0, Math.min(1, 1 - Math.hypot(last.x - path[path.length - 1].x, last.y - path[path.length - 1].y) / total)) : 0;
    return { phase: this.phase, traceCount: flat.length, progress };
  }

  /**
   * Begin a stroke. Fresh attempt: start must be near the path start
   * (magnet pulls it in). Continuation (phase 'mid'): anywhere near the path.
   * Returns false when the touch is ignored (far away / already drawing —
   * this also blocks accidental multi-touch strokes).
   */
  begin(p: Vec, path: readonly Vec[]): boolean {
    if (this.phase === 'drawing') return false;
    if (this.phase === 'idle') {
      if (!startsNear([p], path, START_RADIUS)) return false;
      const d = Math.hypot(p.x - path[0].x, p.y - path[0].y);
      this.magnetUsed = d > 2;
      this.strokes = [[{ x: path[0].x, y: path[0].y }]];
      this.phase = 'drawing';
      return true;
    }
    if (this.phase === 'mid') {
      const near = nearestPoint(path, p);
      if (near.dist > MAGNET_RADIUS * 1.6) return false;
      this.strokes.push([{ x: near.point.x, y: near.point.y }]);
      this.phase = 'drawing';
      return true;
    }
    return false;
  }

  /** Move while drawing. Points appended raw; scoring smooths later. */
  move(p: Vec): void {
    if (this.phase !== 'drawing' || this.strokes.length === 0) return;
    const cur = this.strokes[this.strokes.length - 1];
    const last = cur[cur.length - 1];
    if (Math.hypot(p.x - last.x, p.y - last.y) >= 2) cur.push({ x: p.x, y: p.y });
  }

  /**
   * Release. Two outcomes:
   *  - Stopped right before a forbidden segment -> phase 'mid', returns null
   *    (attempt not committed; player must resume after the red zone).
   *  - Otherwise -> phase 'scored' with the result. Early release NEVER fails
   *    (onboarding rule) — it only caps stars.
   */
  release(level: SliceLevel): AttemptResult | null {
    if (this.phase !== 'drawing') return null;

    const flat = this.strokes.flat();
    const noGoStop = this.stoppedBeforeNoGo(level);
    if (noGoStop) {
      this.phase = 'mid';
      return null;
    }

    this.phase = 'scored';
    if (flat.length < 6) {
      return {
        score: { pct: 0, coverage: 0, meanDev: 0, wobble: 0, noGoHitAt: null, releasedEarly: true },
        award: { stars: 0, ghost: false, label: 'keep-going' },
        magnetUsed: this.magnetUsed,
      };
    }
    // Cleanly skipped zone? Exclude it from coverage (you weren't supposed
    // to trace it). Dirty skip (hit) keeps it in — the miss costs stars.
    const ref = resampleUniform(level.path, 96);
    const hitZone = level.noGo ? noGoHit(flat, ref, { from: level.noGo[0], to: level.noGo[1] }, 18) : null;
    const cleanSkip = !!level.noGo && !hitZone && this.strokes.length > 1;
    const score = scoreTrace(this.strokes[0], level.path, {
      noGo: level.noGo ? { from: level.noGo[0], to: level.noGo[1] } : null,
      wobbleWeight: level.wobbleWeight,
      strokes: this.strokes,
      excludeIdx: cleanSkip && level.noGo ? { from: level.noGo[0], to: level.noGo[1] } : null,
    });
    const zoneHit = score.noGoHitAt !== null;
    const award = awardStars(score.pct, level, { releasedEarly: score.releasedEarly, noGoHit: zoneHit });
    this.streak = nextStreak(this.streak, award.ghost);
    return { score, award, magnetUsed: this.magnetUsed };
  }

  private stoppedBeforeNoGo(level: SliceLevel): boolean {
    if (!level.noGo) return false;
    const ref = resampleUniform(level.path, 96);
    const stop = ref[Math.max(0, Math.min(95, level.noGo[0]))];
    const flat = this.strokes.flat();
    const last = flat[flat.length - 1];
    if (!last || !stop) return false;
    const d = Math.hypot(last.x - stop.x, last.y - stop.y);
    if (d > NOGO_STOP_ZONE) return false; // lifted long before the zone: plain early release
    // Drove INTO the red zone? Then this is not a "hold" — score it (chunk lost).
    if (noGoHit(flat, ref, { from: level.noGo[0], to: level.noGo[1] }, 18)) return false;
    return true; // held at/before the edge: wait for the resume stroke
  }

  /** Allow another attempt on the same level (retry). */
  retry(): void {
    this.phase = 'idle';
    this.strokes = [];
    this.magnetUsed = false;
  }
}
