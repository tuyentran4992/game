// Slice Studio — S1-T2: mask art vs hit-shape ellipse (TEST-CASES §S1-T2, kill-condition parent)
// Test ĐỌC config/render pts — không sửa engine. Lệch diện tích ≤5%.
// Nguồn diện tích mask bake: atlas-manifest.json do scripts/gen_slice_sprites.py ghi
// (script bake mask bằng CÙNG mulberry32 — drift-guard anchor ở test rng).
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ART, interiorMaskPts, polygonArea, type EllipseShape } from '../config/theme-config';
import { LEVELS } from '../level/levels';

const ellipseArea = (s: EllipseShape) => Math.PI * s.rx * s.ry;

/** Manifest mask area (script geometry space) → game-space area (tỉ lệ tuyến tính). */
function maskAreaFromManifest(chapter: number): { areaPx: number; canvas: number } {
  const path = 'public/atlas-manifest.json';
  expect(existsSync(path)).toBe(true);
  const m = JSON.parse(readFileSync(path, 'utf8')) as {
    mask: { ampPx: number; inwardBias: number; steps: number };
    chapters: Record<string, { seed: number; size: [number, number] }>;
  };
  expect(m.mask).toEqual({ ...ART.mask });
  const c = m.chapters[String(chapter)];
  expect(c).toBeDefined();
  // rebuild mask polygon in manifest canvas space (same cfg, same seed → same shape)
  const n = c.size[0];
  const r0 = n / 2 - 24; // SAFE_MARGIN script = 24
  let area = 0;
  const rngPts: Array<[number, number]> = [];
  // local mulberry32 (same canonical impl — anchored by the rng drift-guard test)
  let a = c.seed >>> 0;
  const rnd = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = 0; i < ART.mask.steps; i++) {
    const ang = (i / ART.mask.steps) * Math.PI * 2;
    const j = Math.min((rnd() * ART.mask.inwardBias - 1) * ART.mask.ampPx, 0);
    rngPts.push([n / 2 + (r0 + j) * Math.cos(ang), n / 2 + (r0 + j) * Math.sin(ang)]);
  }
  for (let i = 0; i < rngPts.length; i++) {
    const p = rngPts[i];
    const q = rngPts[(i + 1) % rngPts.length];
    area += p[0] * q[1] - q[0] * p[1];
  }
  area = Math.abs(area) / 2;
  return { areaPx: area, canvas: n };
}

describe('S1-T2 mask art vs hit-shape ellipse ≤5%', () => {
  it('mọi level: diện tích mask bake lệch ellipse ≤5%', () => {
    for (const l of LEVELS) {
      const base = ellipseArea(l.shape);
      // (a) config-space mask (TS side — what render would clip to)
      const cfgArea = polygonArea(interiorMaskPts(l.shape, l.milestone));
      const driftCfg = Math.abs(cfgArea - base) / base;
      expect(driftCfg).toBeLessThanOrEqual(0.05);
      // (b) manifest-space mask (baked art side — python gen), scaled per-axis to level geometry
      const { areaPx, canvas } = maskAreaFromManifest(l.milestone);
      const r0 = canvas / 2 - 24; // SAFE_MARGIN script = 24
      const sx = l.shape.rx / r0;
      const sy = l.shape.ry / r0;
      const driftArt = Math.abs(areaPx * sx * sy - base) / base;
      expect(driftArt).toBeLessThanOrEqual(0.05);
    }
  });

  it('mask không bao giờ phình ngoài hit-shape ellipse (inward-only jitter)', () => {
    const EPS = 1e-9; // float-space tolerance — intended geometry is exactly on/inside (j ≤ 0)
    for (const l of LEVELS) {
      for (const p of interiorMaskPts(l.shape, l.milestone)) {
        const q = ((p.x - l.shape.cx) / l.shape.rx) ** 2 + ((p.y - l.shape.cy) / l.shape.ry) ** 2;
        expect(q).toBeLessThanOrEqual(1 + EPS);
      }
    }
  });
});
