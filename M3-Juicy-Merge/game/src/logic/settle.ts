// M3 Juicy Merge — Settle detection (M3-03, the Suika trap).
//
// Game over must fire only when the world has COME TO REST — not while a fruit is
// still falling across the danger line (the classic Suika false-positive). The
// scene reads each fruit body's at-rest flag from Matter (sleeping or speed below
// a small epsilon) and the timestamp of the last observed motion, then this pure
// gate decides whether enough calm time (grace ~500ms) has elapsed.
//
// Pure: no Matter, no sdk, no side effect — fully unit-testable. The scene owns
// the body introspection + clock; this owns the decision rule.
//
// Rule:
//  - an empty world is never "settled" (no game over with nothing in play);
//  - every fruit must be at rest;
//  - AND at least `graceMs` must have passed since the last motion.
//
// The grace period is the critical guard: it covers the lag between Matter marking
// a body sleeping and the pile truly being stable, and it rejects a fruit that is
// momentarily at the apex of a bounce right above the line.

/**
 * Pure settle gate.
 *
 * @param atRestPerFruit one boolean per fruit in play (true = that body is at rest).
 * @param nowMs          current scene time (ms).
 * @param lastMotionMs   last time any fruit was observed moving (ms).
 * @param graceMs        calm time required after the last motion before "settled".
 * @returns true iff the world is at rest AND the grace period has elapsed.
 */
export function isWorldSettled(
  atRestPerFruit: readonly boolean[],
  nowMs: number,
  lastMotionMs: number,
  graceMs: number,
): boolean {
  if (atRestPerFruit.length === 0) return false;
  if (!atRestPerFruit.every((r) => r)) return false;
  return nowMs - lastMotionMs >= graceMs;
}
