// M3 Juicy Merge — Runtime config (source of truth).
// Mirrors `games/juicy-merge.yaml` §mechanics (DATA-MODEL §1.3 / SPEC §4).
// Pure data module — no side effects, fully testable.
// Tier convention is 0-based: 0 = cherry ... 11 = watermelon (max).

export interface PhysicsConfig {
  /** Downward gravity (px/s^2) applied to fruit bodies via Matter.js. */
  readonly gravityY: number;
  /** Bounciness on contact (0 = no bounce, 1 = full). */
  readonly restitution: number;
  /** Surface friction (low so fruit settle but can roll). */
  readonly friction: number;
  /** Matter.js sleep threshold — a body below this is "settled" (game-over check). */
  readonly sleepThreshold: number;
}

export interface MechanicsConfig {
  /** 12 fruit sprite keys by tier 0..11 (cherry → watermelon). */
  readonly chain: readonly string[];
  /** Points awarded when a fruit of tier i is created (SPEC §4.4). */
  readonly scorePerTier: readonly number[];
  /** Number of tiers (chain length). */
  readonly chainLength: number;
  /** Highest tier index — watermelon; no merge past this (M3-02). */
  readonly maxTier: number;
  /** Bucket width in world px (DATA-MODEL §1.3). */
  readonly bucketWidth: number;
  /** Bucket height as a ratio of camera height. */
  readonly bucketHeightRatio: number;
  /** Danger line position measured from the bucket top (M3-03). */
  readonly dangerLineRatio: number;
  /** Minimum gap between drops, anti-spam (M3-01). */
  readonly dropCooldownMs: number;
  /** Drop spawn Y as a ratio from the bucket top (0 = top). */
  readonly dropStartRatio: number;
  /** Combo window for consecutive merges (M3 §4.3). */
  readonly comboWindowMs: number;
  /** Matter.js physics init (tuned via prototype). */
  readonly physics: PhysicsConfig;
  /** Optional RNG seed for a deterministic session (M3-04); undefined = random. */
  readonly seed?: number;
}

export const CONFIG: MechanicsConfig = {
  chain: [
    'cherry', 'strawberry', 'grape', 'dekopon', 'pomegranate', 'orange',
    'apple', 'pear', 'peach', 'pineapple', 'melon', 'watermelon',
  ],
  scorePerTier: [1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 66, 100],
  chainLength: 12,
  maxTier: 11,
  bucketWidth: 640,
  bucketHeightRatio: 0.70,
  dangerLineRatio: 0.20,
  dropCooldownMs: 250,
  dropStartRatio: 0.0,
  comboWindowMs: 2000,
  physics: {
    gravityY: 1400,
    restitution: 0.3,
    friction: 0.005,
    sleepThreshold: 60,
  },
} as const;
