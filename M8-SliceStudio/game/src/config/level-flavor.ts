// Slice Studio — src/config/level-flavor.ts (S2 level polish, display-only data).
// Pure TS, no Phaser, no logic — flavor text is shown in the HUD later and is
// NEVER used by scoring/geom/engine (SPEC §7: fun-gated level data stays put).
// Constraints (TEST-CASES S2-T1): EN display text, <=48 chars, <=3 words,
// single spaces, at most one em-dash hook separator ("X — Y" puzzle hint).
export const FLAVOR_MAX_CHARS = 48;
export const FLAVOR_MAX_WORDS = 3;

/** Per-level flavor text, keyed by level id (1..12). */
export const LEVEL_FLAVOR: Readonly<Record<number, string>> = {
  1: 'Steady Hand Start',
  2: 'Diagonal Confidence',
  3: 'Apple Secret — Hidden Star',
  4: 'Clockwork Circle',
  5: 'Heart Of Curve',
  6: 'Wobble Begins',
  7: 'S Shape Shift',
  8: 'Half Moon Hold',
  9: 'Double Bend Surprise',
  10: 'Forbidden Line Release',
  11: 'Forbidden Curve Combo',
  12: 'Grand Finale Star',
};
