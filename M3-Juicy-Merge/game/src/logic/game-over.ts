// M3 Juicy Merge — Game-over check thuần (M3-03, §4.2)
// Pure function: no Matter, no sdk, no side effect. The Gameplay scene (Bước 11)
// derives `settled` from Matter bodies (all sleeping / speed < threshold + grace
// ~500ms) and passes it in here. Game over ⟺ settled AND ≥1 fruit whose center
// is above the danger line (y < dangerY; screen y grows downward, so "above" =
// smaller y). A fruit exactly on the line is NOT above.
//
// Tier convention is 0-based (0 = cherry ... 11 = watermelon).

/** Minimal fruit shape the check needs. Scene fruit objects satisfy this structurally. */
export interface FruitPos {
  /** Center y in world/physics coordinates. */
  y: number;
  /** 0-based chain tier (unused by the check but part of the real fruit shape). */
  tier?: number;
}

/**
 * Pure gate: true iff the world has settled AND at least one fruit's center is
 * above the danger line (`y < dangerY`). Scene owns settle detection (Bước 11).
 *
 * @param fruits   fruits currently in the bucket.
 * @param dangerY  y-coordinate of the danger line (fruits with y < dangerY are above it).
 * @param settled  whether all bodies have come to rest (scene-derived).
 */
export function checkGameOver(fruits: readonly FruitPos[], dangerY: number, settled: boolean): boolean {
  if (!settled) return false;
  return fruits.some((f) => f.y < dangerY);
}
