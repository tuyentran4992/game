// Slice Studio — src/config/theme-config.ts (S1 art pipeline, Tier A-safe pure data)
// NO Phaser import (TEST-CASES S1-T1). Palette hex NHẬN NGUYÊN GIÁ TRỊ THEMES
// hiện có trong level/levels.ts (freeze) — không tự sáng tạo; tuning sau playtest
// chỉnh ở ĐÂY (DESIGN-SPEC §6 lever), scene không hardcode màu mới.

import type { Vec } from '../geom/path';
import type { Theme } from '../level/levels';

/** Per-chapter palette — bit-giống THEMES levels.ts (anchor: test S1-T1 deep-equal). */
export const CHAPTER_THEMES: Readonly<Record<1 | 2 | 3 | 4, Theme>> = {
  1: { bg: 0x0f172a, silhouette: 0x1e3a5f, silhouetteEdge: 0x38bdf8, path: 0x7dd3fc, core: 0x0ea5e9, coreEdge: 0xe0f2fe, noGo: 0xff2d3d, accent: 0x38bdf8 },
  2: { bg: 0x1f1033, silhouette: 0x4c1d95, silhouetteEdge: 0xc084fc, path: 0xf0abfc, core: 0xf59e0b, coreEdge: 0xfef3c7, noGo: 0xff2d3d, accent: 0xc084fc },
  3: { bg: 0x0d2818, silhouette: 0x14532d, silhouetteEdge: 0x4ade80, path: 0xbbf7d0, core: 0xfacc15, coreEdge: 0xfef9c3, noGo: 0xff2d3d, accent: 0x4ade80 },
  4: { bg: 0x22090c, silhouette: 0x7f1d1d, silhouetteEdge: 0xfb923c, path: 0xfed7aa, core: 0x38bdf8, coreEdge: 0xe0f2fe, noGo: 0xff2d3d, accent: 0xfb923c },
};

/** Texture keys per chapter — atlas files live in game/public/ (vite → dist root). */
export const ATLAS_KEYS: Readonly<Record<1 | 2 | 3 | 4, string>> = {
  1: 'atlas-m1',
  2: 'atlas-m2',
  3: 'atlas-m3',
  4: 'atlas-m4',
};

export interface MaskJitter {
  /** deterministic seed per chapter (gen script bakes THE SAME mask into alpha). */
  seed: number;
  /** outward jitter bound in px — DESIGN-SPEC §2 "mép gồ ghề ±12px render-only". */
  ampPx: number;
  /** jitter = clamp((u*inwardBias − 1) * ampPx, ≤0), u∈[0,1] → j ∈ [−ampPx, 0] — mask never
   *  bulges outside the hit-shape ellipse (kill-condition S1-T2 anchor stays one-sided). */
  inwardBias: number;
  /** mask polygon resolution. */
  steps: number;
}

/** Mask params MUST stay in sync with scripts/gen_slice_sprites.py (drift-guard: S1-T2). */
export const ART = {
  mask: { ampPx: 12, inwardBias: 1.7, steps: 64 } as const,
  seeds: { 1: 1101, 2: 2202, 3: 3303, 4: 4404 } as Readonly<Record<1 | 2 | 3 | 4, number>>,
  /** drop-shadow ellipse under the interior sprite (DESIGN-SPEC §2 shadow layer). */
  shadow: { alpha: 0.28, offsetY: 14, scale: 1.04, color: 0x000000 } as const,
  /** seam particles along the cut (DESIGN-SPEC §2 "hạt dọc vết cắt"). */
  seam: { count: 9, speedMin: 40, speedMax: 110, lifespanMin: 420, lifespanMax: 780, size: 5, spreadDeg: 34 } as const,
} as const;

export interface EllipseShape {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

/** Deterministic RNG (mulberry32) — mask must bake identically in TS tests + python gen. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Interior-art mask polygon: ellipse points with deterministic inward-biased
 * jitter (render-only detail inside the hit-shape ellipse — never outside it,
 * so hit-shape geometry is untouched; kill-condition anchor = test S1-T2 ≤5%).
 */
export function interiorMaskPts(s: EllipseShape, chapter: 1 | 2 | 3 | 4): Vec[] {
  const { ampPx, inwardBias, steps } = ART.mask;
  const rng = mulberry32(ART.seeds[chapter]);
  const pts: Vec[] = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const u = rng();
    const j = Math.min((u * inwardBias - 1) * ampPx, 0); // ∈ [-ampPx, 0] — inward only
    pts.push({ x: s.cx + (s.rx + j) * Math.cos(a), y: s.cy + (s.ry + j) * Math.sin(a) });
  }
  return pts;
}

/** Shoelace polygon area (pure — used by the mask-vs-ellipse anchor test). */
export function polygonArea(pts: readonly Vec[]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % pts.length];
    a += p.x * q.y - q.x * p.y;
  }
  return Math.abs(a) / 2;
}

/** Manifest the python gen script emits next to the atlases (game/public/). */
export interface AtlasManifest {
  model: string;
  bakedAt: string;
  mask: { ampPx: number; inwardBias: number; steps: number };
  chapters: Record<string, { file: string; seed: number; size: [number, number]; bytes: number }>;
}
