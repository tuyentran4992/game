// World constants — single source of numbers (DATA-MODEL §1). Pure TS, no Phaser.
export const WORLD_W = 480;
export const WORLD_H = 854; // viewport height
export const SEA_TOP = 96; // waterline (px)
// Seabed = 1200 METERS (SPEC §2 "Dưới sâu 1200m"). DATA-MODEL "SEA_BOTTOM=1200 (px≈mét)"
// reads as meters; in px it is depthMToPx(1200) = 1296, matching the 480x1300 world.
export const SEA_BOTTOM_M = 1200;
export const SEA_BOTTOM = SEA_TOP + SEA_BOTTOM_M; // 1296 px
export const SURFACE_Y = SEA_TOP + 8; // catch completes when hook.y <= SURFACE_Y + 2

export const DESCEND_BASE = 140; // px/s at the surface
export const DESCEND_RAMP = 10; // +10 px/s per 100px of depth (slow ramp early dive)
export const DESCEND_MAX = 260;

export const REEL_BASE = 90; // px/s empty-handed
export const LINE_LIMIT = 100; // tension units -> break at >=100
export const TENSION_COOL = 0.35; // /s while HOLD

export const AIR_MAX = 45; // seconds per dive
export const AIR_RATE = {
  dive: 1.0,
  reel: 1.0,
  hold: 0.5,
  hooked: (weight: number): number => 1.0 + 0.05 * (weight / 10),
} as const;

export const START_MONEY = 600;
export const FUEL_COST = 150;
export const HEARTS = 3;
// Stage C goal legibility: the HUD money bar tracks savings toward the whale hunt —
// a display GOAL the player can see filling up (the whale spawn gate itself lives in
// systems/whale.ts and is intentionally untouched).
export const GOAL_MONEY = 2000;

export const DIVE_COOLDOWN = 0.3; // s
export const TAP_BUFFER = 0.25; // s
export const ATTACH_LOCK = 0.3; // s, fish weight >= 40

// Design-spec §2: world 480x1300; §4 bands in meters
export const BANDS = [
  { id: 'reef', topM: 0, botM: 250 },
  { id: 'vents', topM: 250, botM: 600 },
  { id: 'wreck', topM: 600, botM: 950 },
  { id: 'trench', topM: 950, botM: 1200 },
] as const;

export const depthPxToM = (px: number): number => Math.max(0, px - SEA_TOP);
export const depthMToPx = (m: number): number => m + SEA_TOP;

// Descend speed ramps +10 px/s per 100px of depth, capped (DATA-MODEL §1).
export const descendSpeed = (depthPx: number): number =>
  Math.min(DESCEND_MAX, DESCEND_BASE + (DESCEND_RAMP * depthPx) / 100);

// Reel speed slows with carried weight (DATA-MODEL §1).
export const reelSpeed = (weight: number): number => REEL_BASE / (1 + weight / 60);
