// M3 Juicy Merge — collision->merge decision layer (PURE, testable).
// The Gameplay scene turns each Matter `collisionstart` event into a batch of
// colliding fruit pairs (the event's `pairs`, each carrying two fruit ids +
// tiers). This module decides WHICH pairs actually merge within one event.
//
// Why this exists apart from MergeEngine.merge: a fruit wedged between two
// same-tier neighbors produces TWO collision pairs in a single event, but it
// must merge into only ONE neighbor (Suika rule). So we walk the pairs once and
// "claim" both ids of any accepted merge — later pairs touching a claimed id
// are skipped. Engine.merge (GC-02) still owns the score/combo mutation; this
// layer adds the per-event dedup guard + returns concrete execution plans
// (which two fruits to consume, what tier to spawn) for the scene to act on.
//
// Tier convention is 0-based (0 = cherry ... 11 = watermelon). Pure w.r.t. its
// inputs: it does not mutate `pairs`; it does mutate engine state (score/combo),
// which is the intended side effect delegated to the engine.

import type { MergeEngine } from '../logic/merge-engine';

/** A fruit in a collision pair, identified by a scene-assigned stable id. */
export interface CollidingFruit {
  readonly id: number;
  readonly tier: number;
}

/** One accepted merge: consume fruits `aId`+`bId`, spawn a fruit of `newTier`
 *  that grants `scoreGain` points (already credited to the engine by merge). */
export interface MergePlan {
  readonly aId: number;
  readonly bId: number;
  readonly newTier: number;
  readonly scoreGain: number;
}

/**
 * Resolve a batch of collision pairs into ordered merge plans. Pure over the
 * input array (it is not mutated); the only side effect is delegated score/combo
 * bookkeeping via {@link engine.merge}.
 *
 * Rules per pair (first match wins):
 *  - skip if either fruit was already claimed by an earlier pair this event;
 *  - skip if the two tiers differ (M3-02: only same-tier merges);
 *  - skip if engine.merge rejects it (e.g. two watermelons at max tier);
 *  - otherwise claim both ids and emit a plan with the resulting tier.
 */
export function resolveMergeBatch(
  pairs: ReadonlyArray<readonly [CollidingFruit, CollidingFruit]>,
  nowMs: number,
  engine: MergeEngine,
): MergePlan[] {
  const plans: MergePlan[] = [];
  const claimed = new Set<number>();
  for (const [a, b] of pairs) {
    if (claimed.has(a.id) || claimed.has(b.id)) continue;
    if (a.tier !== b.tier) continue;
    const result = engine.merge(a.tier, b.tier, nowMs);
    if (!result) continue;
    claimed.add(a.id);
    claimed.add(b.id);
    plans.push({ aId: a.id, bId: b.id, newTier: result.tier, scoreGain: result.scoreGain });
  }
  return plans;
}
