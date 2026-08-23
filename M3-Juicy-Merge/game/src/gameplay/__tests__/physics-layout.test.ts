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

  it('occupies ratio of the height with bottom margin', () => {
    expect(L.bucketBottomY).toBe(1200);
    expect(L.bucketHeight).toBe(Math.round(1200 * CONFIG.bucketHeightRatio));
    expect(L.bucketTopY).toBe(1200 - L.bucketHeight);
  });

  it('spawns above the bucket mouth based on dropStartRatio', () => {
    expect(L.spawnY).toBe(L.bucketTopY + Math.round(L.bucketHeight * CONFIG.dropStartRatio));
  });

  it('places the danger line ~20% into the bucket, below the spawn', () => {
    expect(L.dangerY).toBe(L.bucketTopY + Math.round(L.bucketHeight * CONFIG.dangerLineRatio));
    expect(L.dangerY).toBeGreaterThan(L.spawnY);
  });
});
