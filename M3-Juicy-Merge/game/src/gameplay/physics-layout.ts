// M3 Juicy Merge — bucket/physics layout (PURE, testable).
// Computes the world geometry of the playfield from the camera size + config so
// Gameplay (render + Matter wiring) and the layout it implies stay decoupled from
// the magic numbers. Pure: no Phaser/scene dependency, fully unit-testable.
//
// Mobile-first portrait world (720×1280): the bucket fills most of the vertical
// space, centered horizontally, with the drop mouth near the top third.

import { CONFIG, type MechanicsConfig } from '../logic/config';

export interface BucketLayout {
  /** Left inner edge X of the bucket playfield. */
  readonly bucketX0: number;
  /** Right inner edge X of the bucket playfield. */
  readonly bucketX1: number;
  /** Inner width of the bucket (CONFIG.bucketWidth). */
  readonly bucketWidth: number;
  /** Top (mouth) Y of the bucket. */
  readonly bucketTopY: number;
  /** Bottom (floor) Y of the bucket. */
  readonly bucketBottomY: number;
  /** Inner height of the bucket. */
  readonly bucketHeight: number;
  /** Y where the ghost hovers / a dropped fruit spawns (bucket mouth). */
  readonly spawnY: number;
  /** Danger-line Y (M3-03) — ~20% into the bucket from the mouth (used in step 11). */
  readonly dangerY: number;
  /** Visual + physics thickness of the bucket walls/floor. */
  readonly wallThickness: number;
}

/**
 * Compute the bucket layout for a world of {@link width} × {@link height}.
 * The bucket sits flush with the bottom of the screen and occupies
 * `bucketHeightRatio` of the height (default 0.70), centered on X.
 */
export function computeBucketLayout(
  width: number,
  height: number,
  cfg: MechanicsConfig = CONFIG,
): BucketLayout {
  const bucketWidth = Math.min(cfg.bucketWidth, width);
  const bucketHeight = Math.round(height * cfg.bucketHeightRatio);
  const bucketX0 = Math.round((width - bucketWidth) / 2);
  const bucketX1 = bucketX0 + bucketWidth;
  const bucketBottomY = height;
  const bucketTopY = bucketBottomY - bucketHeight;
  const spawnY = bucketTopY + Math.round(bucketHeight * cfg.dropStartRatio);
  const dangerY = bucketTopY + Math.round(bucketHeight * cfg.dangerLineRatio);
  return {
    bucketX0, bucketX1, bucketWidth, bucketTopY, bucketBottomY,
    bucketHeight, spawnY, dangerY, wallThickness: 24,
  };
}
