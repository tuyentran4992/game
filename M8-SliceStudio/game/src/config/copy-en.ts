// Slice Studio — src/config/copy-en.ts (S5, display-only copy map).
// Pure TS data, 0 import — in-game text is 100% ASCII English, <=3 words
// (PB-5 platform rule + DESIGN-SPEC §5). Word-count/ASCII is locked by
// src/__tests__/s5-copy-en.test.ts (S5-T1).
//
// Two groups:
//  - in-use: rendered by ui/hud.ts or scenes/EndScene.ts today.
//  - reserved: standardized wording for judge labels that currently live as
//    literals inside scenes/TraceScene.ts (outside the S5 file boundary).
//    Reserved = no render call-site yet; wire-up when TraceScene boundary opens.

export const COPY_LIMITS = {
  /** max words per copy string (DESIGN-SPEC §5: <=3 từ). */
  maxWords: 3,
} as const;

export const COPY_EN = {
  // ---- HUD (ui/hud.ts) ----
  /** Level counter prefix — rendered as `LEVEL {n}/12`, always visible (axis 4). */
  level: 'LEVEL',
  /** Star threshold caption — rendered as `{stars} at {t3}%`. */
  starsAt: 'at',
  /** GHOST streak chip — rendered as `GHOST x{n}`. */
  ghostChip: 'GHOST x',
  /** Debug skip button (standalone builds only). */
  skip: 'SKIP >>',

  // ---- End scene (scenes/EndScene.ts) ----
  /** Popup title. */
  endTitle: 'ALL CLEAR',
  /** Max-streak caption — rendered as `BEST STREAK {n}`. */
  bestStreak: 'BEST STREAK',
  /** Primary CTA (restart the whole run). */
  playAgain: 'PLAY AGAIN',
  /** Secondary CTA (retry the last level). */
  replayLevel: 'REPLAY LEVEL',
  /** Close button glyph (compliance: every popup has a visible close). */
  close: 'X',
  /** Footer brand line. */
  foot: 'SLICE STUDIO',

  // ---- Reserved: judge labels (render call-sites live in TraceScene — S4/S6) ----
  niceCut: 'NICE CUT',
  ghostCut: 'GHOST CUT!',
  greatCut: 'GREAT CUT',
  goodCut: 'GOOD CUT',
  chunkLost: 'CHUNK LOST',
  keepGoing: 'KEEP GOING',
  /** Retry/hint affordance label. */
  next: 'NEXT',
  /** Early-lift hint (short form). */
  tryAgain: 'TRY AGAIN',
} as const;
