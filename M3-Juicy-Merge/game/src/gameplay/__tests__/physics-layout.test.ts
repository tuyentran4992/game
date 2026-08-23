// Test for the pure bucket layout (mobile-first 720×1280 portrait).
import { describe, it, expect } from 'vitest';
import { computeBucketLayout } from '../physics-layout';
import { CONFIG } from '../../logic/config';

describe('computeBucketLayout (mobile-first 720×1280)', () => {
  const L = computeBucketLayout(720, 1280);

  it('centers the 640px bucket with equal side margins', () => {
    expect(L.bucketWidth).toBe(CONFIG.bucketWidth);
    expect(L.bucketX0).toBe(40);
    expect(L.bucketX1).toBe(680);
    expect(L.bucketX1 - L.bucketX0).toBe(CONFIG.bucketWidth);
  });

  it('occupies 70% of the height, flush to the bottom', () => {
    expect(L.bucketHeight).toBe(Math.round(1280 * CONFIG.bucketHeightRatio));
    expect(L.bucketBottomY).toBe(1280);
    expect(L.bucketTopY).toBe(1280 - L.bucketHeight);
  });

  it('spawns at the bucket mouth (dropStartRatio = 0)', () => {
    expect(L.spawnY).toBe(L.bucketTopY);
  });

  it('places the danger line ~20% into the bucket, below the spawn', () => {
    expect(L.dangerY).toBe(L.bucketTopY + Math.round(L.bucketHeight * CONFIG.dangerLineRatio));
    expect(L.dangerY).toBeGreaterThan(L.spawnY);
  });
});
