// Slice Studio — geom/slice.ts (Tier A, pure TS, no Phaser)
// scoreTrace: compares a raw pointer trace against the reference path.
// Pipeline (risk #1 of dev-lead): low-pass -> uniform resample -> metrics.

import { lowPass, nearestPoint, noGoHit, pathLength, resampleUniform, type Vec } from './path';

export interface TraceScore {
  /** 0..100 — accuracy = % of the reference path covered within tolerance. */
  pct: number;
  /** fraction of resampled reference points matched by the trace (0..1). */
  coverage: number;
  /** mean abs deviation of trace points near the path, in px (0 = perfect). */
  meanDev: number;
  /** wobble = std-dev of deviation, in px (stability metric for curves). */
  wobble: number;
  /** first trace point that touched a no-go segment, if any. */
  noGoHitAt: Vec | null;
  /** true when the player released before reaching the end zone. */
  releasedEarly: boolean;
}

export interface ScoreOptions {
  /** px tolerance for a reference point to count as covered. */
  tolerance?: number;
  /** resample resolution of the reference path. */
  samples?: number;
  /** low-pass window for the raw trace (must be >=3 to engage). */
  smoothWindow?: number;
  /** no-go segment (index range on reference path) + margin px. */
  noGo?: { from: number; to: number } | null;
  noGoMargin?: number;
  /** px distance from path end that counts as "reached the end". */
  endZone?: number;
  /** wobble penalty multiplier (0 = off; M3 curves push it up). */
  wobbleWeight?: number;
  /**
   * Multi-stroke trace (M4): score each stroke separately — smoothing and
   * resampling must never interpolate ACROSS the lift gap, or fake points
   * appear inside the forbidden zone. Defaults to [raw].
   */
  strokes?: readonly (readonly Vec[])[];
  /** Reference indices (of the resampled path) excluded from coverage stats —
   * used when a forbidden zone was cleanly skipped (you are not supposed to
   * trace it, so it must not drag the score down). */
  excludeIdx?: { from: number; to: number } | null;
}

const DEFAULTS = {
  tolerance: 26,
  samples: 96,
  smoothWindow: 5,
  noGoMargin: 18,
  endZone: 56,
};

/**
 * Score a trace (raw pointer samples) against a reference path.
 * Pure function: no state, no DOM, no Phaser.
 */
export function scoreTrace(raw: readonly Vec[], path: readonly Vec[], opts: ScoreOptions = {}): TraceScore {
  const o = { ...DEFAULTS, ...opts };
  if (raw.length < 2 || path.length < 2) {
    return {
      pct: 0,
      coverage: 0,
      meanDev: 0,
      wobble: 0,
      noGoHitAt: null,
      releasedEarly: true,
    };
  }

  // Risk #1 mitigation: smooth first, then uniform arc-length resample.
  // Multi-stroke: smooth/resample each stroke on its own (no cross-gap lerp).
  const strokes = o.strokes && o.strokes.length > 0 ? o.strokes : [raw];
  const perStroke = Math.max(16, Math.floor(128 / strokes.length));
  const trace = strokes.flatMap((s) =>
    s.length >= 2 ? resampleUniform(lowPass(s, o.smoothWindow), perStroke) : s.map((p) => ({ ...p })),
  );
  const ref = resampleUniform(path, o.samples);

  // 1) Coverage: % of reference points with a trace point within tolerance.
  //    Cleanly skipped forbidden zones are excluded from the denominator.
  const ex = o.excludeIdx ?? null;
  const excluded = (i: number): boolean =>
    !!ex && i >= Math.max(0, ex.from) && i <= Math.min(ref.length - 1, ex.to);
  let counted = 0;
  let hit = 0;
  const devs: number[] = [];
  ref.forEach((rp, i) => {
    let bestD = Infinity;
    for (const tp of trace) {
      const d = Math.hypot(tp.x - rp.x, tp.y - rp.y);
      if (d < bestD) bestD = d;
    }
    if (excluded(i)) return;
    counted++;
    devs.push(bestD);
    if (bestD <= o.tolerance) hit++;
  });
  const coverage = counted > 0 ? hit / counted : 0;

  // 2) Mean deviation of the trace points that are near the path (<= 2x tol).
  const near = devs.filter((d) => d <= o.tolerance * 2);
  const meanDev = near.length
    ? near.reduce((s, d) => s + d, 0) / near.length
    : o.tolerance * 2;

  // 3) Wobble: std-dev of deviations around the mean (stability).
  const wobble = near.length > 1
    ? Math.sqrt(near.reduce((s, d) => s + (d - meanDev) * (d - meanDev), 0) / near.length)
    : 0;

  // 4) No-go violation (per stroke — grace at both zone edges).
  const noGoHitAt = noGoHit(trace, ref, o.noGo ?? null, o.noGoMargin);

  // 5) Early release: last trace point far from path end.
  const end = ref[ref.length - 1];
  const releasedEarly = Math.hypot(trace[trace.length - 1].x - end.x, trace[trace.length - 1].y - end.y) > o.endZone;

  // 6) Accuracy %: coverage dominates; deviation + wobble pull it down.
  const devFactor = Math.max(0, 1 - meanDev / (o.tolerance * 2));
  const wobblePenalty = Math.min(0.25, (wobble / 400) * (o.wobbleWeight ?? 1));
  const pct = Math.round(coverage * (60 + 40 * devFactor) * (1 - wobblePenalty));

  return { pct, coverage, meanDev, wobble, noGoHitAt, releasedEarly };
}

/**
 * Did the trace start near the start point (within radius r)? Used by the
 * magnet/onboarding gate — a stroke that begins far away never scores.
 */
export function startsNear(raw: readonly Vec[], path: readonly Vec[], r: number): boolean {
  if (raw.length === 0 || path.length === 0) return false;
  return Math.hypot(raw[0].x - path[0].x, raw[0].y - path[0].y) <= r;
}

/**
 * Project a raw stroke onto the path: returns the snapped trace and progress
 * (0..1) along the path. Used by the magnet (pull stray touches back).
 */
export function projectOnPath(
  raw: readonly Vec[],
  path: readonly Vec[],
  maxSnap: number,
): { snapped: Vec[]; progress: number } {
  const snapped = raw.map((p) => {
    const np = nearestPoint(path, p);
    return np.dist <= maxSnap ? np.point : p;
  });
  const end = path[path.length - 1];
  const last = snapped[snapped.length - 1];
  const total = pathLength(path) || 1;
  const progress = Math.max(0, Math.min(1, 1 - Math.hypot(last.x - end.x, last.y - end.y) / total));
  return { snapped, progress };
}
