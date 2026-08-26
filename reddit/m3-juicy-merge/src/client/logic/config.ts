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
  /** Spawn pool for the next-fruit queue (M3-04). Weighted, drop-count-scaled so
   *  low tiers dominate early and higher tiers unlock as the player drops more. */
  readonly dropSpawnPool: readonly DropSpawnBand[];
  /** Optional RNG seed for a deterministic session (M3-04); undefined = random. */
  readonly seed?: number;
}

/** One weighted tier entry in a {@link DropSpawnBand}. */
export interface DropTierWeight {
  /** 0-based tier that can spawn when this band is active. */
  readonly tier: number;
  /** Relative probability weight (higher = more frequent). */
  readonly weight: number;
}

/** A band of the spawn pool that is active once `minDrops` fruits have been dropped.
 *  The band with the largest `minDrops <= currentDrops` is the active one. */
export interface DropSpawnBand {
  /** Drop count (inclusive) at which this band becomes active. */
  readonly minDrops: number;
  /** Weighted tiers available to spawn while this band is active. */
  readonly weights: readonly DropTierWeight[];
}

export const CONFIG: MechanicsConfig = {
  chain: [
    "cherry",
    "strawberry",
    "grape",
    "dekopon",
    "pomegranate",
    "orange",
    "apple",
    "pear",
    "peach",
    "pineapple",
    "melon",
    "watermelon",
    "dragonfruit",
    "durian",
    "galaxy_watermelon",
  ],
  scorePerTier: [1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 66, 100, 150, 250, 500],
  chainLength: 15,
  maxTier: 14,
  bucketWidth: 640,
  bucketHeightRatio: 0.7,
  dangerLineRatio: 0.2,
  dropCooldownMs: 250,
  dropStartRatio: -0.12,
  comboWindowMs: 2000,
  physics: {
    gravityY: 1.2,
    restitution: 0.15,
    friction: 0.05,
    sleepThreshold: 60,
  },
  // Drop spawn pool (M3-04, DATA-MODEL §1.3/§5). Bands scale by fruits dropped
  // so low tiers dominate early (bậc 1–4 = tiers 0..3) and higher tiers unlock
  // as the run progresses. Weights favor smaller fruit. Never spawns above tier
  // 5 (orange) — Suika-style: the player builds big fruit only via merging.
  dropSpawnPool: [
    {
      minDrops: 0,
      weights: [
        { tier: 0, weight: 5 },
        { tier: 1, weight: 3 },
        { tier: 2, weight: 2 },
        { tier: 3, weight: 1 },
      ],
    },
    {
      minDrops: 10,
      weights: [
        { tier: 0, weight: 4 },
        { tier: 1, weight: 3 },
        { tier: 2, weight: 2 },
        { tier: 3, weight: 2 },
        { tier: 4, weight: 1 },
      ],
    },
    {
      minDrops: 25,
      weights: [
        { tier: 0, weight: 3 },
        { tier: 1, weight: 3 },
        { tier: 2, weight: 2 },
        { tier: 3, weight: 2 },
        { tier: 4, weight: 2 },
        { tier: 5, weight: 1 },
      ],
    },
  ],
} as const;
