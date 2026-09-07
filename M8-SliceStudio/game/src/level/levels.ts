// Slice Studio — level/levels.ts (Tier A, pure TS, no Phaser)
// 12 levels / 4 milestones. Each milestone changes HOW you score or HOW you
// pick the cut (PB-3b variation table), and the theme color shifts.
//
//   M1  L1-2   straight lines       (learn the verb — plain accuracy)
//   M2  L3-5   hidden core reveal   (3-star threshold +5 — precision rewarded)
//   M3  L6-9   curves               (wobble penalty — steady hand scoring)
//   M4  L10-12 forbidden segments   (no-go zone — release-and-continue decision)

import type { Vec } from '../geom/path';

export interface Theme {
  bg: number;
  silhouette: number;
  silhouetteEdge: number;
  path: number;
  core: number;
  coreEdge: number;
  noGo: number;
  accent: number;
}

export interface LevelShape {
  /** silhouette ellipse (what gets split). */
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

export interface CoreShape {
  /** 'none' = no reveal, 'star' | 'circle' | 'heart' = revealed inner art. */
  kind: 'none' | 'star' | 'circle' | 'heart';
  color: number;
}

export interface SliceLevel {
  id: number;
  name: string;
  milestone: 1 | 2 | 3 | 4;
  /** reference path across the silhouette (2+ points, canvas 720x1280). */
  path: Vec[];
  shape: LevelShape;
  core: CoreShape;
  /** forbidden segment as [startIndex, endIndex] into the resampled path, if any. */
  noGo: [number, number] | null;
  /** pct thresholds for 1/2/3 stars. */
  thresholds: [number, number, number];
  /** M3 scoring twist: wobble penalty multiplier (steady-hand matters). */
  wobbleWeight?: number;
  theme: Theme;
}

const THEMES: Record<1 | 2 | 3 | 4, Theme> = {
  1: { bg: 0x0f172a, silhouette: 0x1e3a5f, silhouetteEdge: 0x38bdf8, path: 0x7dd3fc, core: 0x0ea5e9, coreEdge: 0xe0f2fe, noGo: 0xff2d3d, accent: 0x38bdf8 },
  2: { bg: 0x1f1033, silhouette: 0x4c1d95, silhouetteEdge: 0xc084fc, path: 0xf0abfc, core: 0xf59e0b, coreEdge: 0xfef3c7, noGo: 0xff2d3d, accent: 0xc084fc },
  3: { bg: 0x0d2818, silhouette: 0x14532d, silhouetteEdge: 0x4ade80, path: 0xbbf7d0, core: 0xfacc15, coreEdge: 0xfef9c3, noGo: 0xff2d3d, accent: 0x4ade80 },
  4: { bg: 0x22090c, silhouette: 0x7f1d1d, silhouetteEdge: 0xfb923c, path: 0xfed7aa, core: 0x38bdf8, coreEdge: 0xe0f2fe, noGo: 0xff2d3d, accent: 0xfb923c },
};

// ---------- path helpers (pure) ----------

function line(x1: number, y1: number, x2: number, y2: number, n = 8): Vec[] {
  const pts: Vec[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    pts.push({ x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t });
  }
  return pts;
}

/** Quadratic bezier sample. */
function bezier(p0: Vec, p1: Vec, p2: Vec, n = 24): Vec[] {
  const pts: Vec[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const u = 1 - t;
    pts.push({
      x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
      y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
    });
  }
  return pts;
}

/** Cubic bezier sample (S-curves). */
function bezier3(p0: Vec, p1: Vec, p2: Vec, p3: Vec, n = 28): Vec[] {
  const pts: Vec[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const u = 1 - t;
    pts.push({
      x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
      y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
    });
  }
  return pts;
}

/** Arc around (cx,cy) from angle a0 to a1 (radians), radius r. */
function arc(cx: number, cy: number, r: number, a0: number, a1: number, n = 26): Vec[] {
  const pts: Vec[] = [];
  for (let i = 0; i < n; i++) {
    const a = a0 + (a1 - a0) * (i / (n - 1));
    pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return pts;
}

const C = 720; // canvas width
// paths live in the top 2/3 of the screen (y ~ 260..820)

const STAR3_REVEAL: [number, number, number] = [55, 75, 95]; // M2: precision rewarded (+5 on 3*)
const PLAIN: [number, number, number] = [55, 75, 90];

function lv(
  id: number,
  name: string,
  milestone: 1 | 2 | 3 | 4,
  path: Vec[],
  shape: LevelShape,
  core: CoreShape,
  noGo: [number, number] | null,
  wobbleWeight?: number,
): SliceLevel {
  return { id, name, milestone, path, shape, core, noGo, thresholds: milestone === 2 ? STAR3_REVEAL : PLAIN, wobbleWeight, theme: THEMES[milestone] };
}

// ---------- the 12 levels ----------

// M1 — straight lines, learn the verb
const L1 = lv(1, 'First Slice', 1, line(140, 470, 580, 470), { cx: 360, cy: 470, rx: 250, ry: 150 }, { kind: 'none', color: 0 }, null);
const L2 = lv(2, 'Diagonal Drop', 1, line(150, 340, 570, 620), { cx: 360, cy: 480, rx: 235, ry: 170 }, { kind: 'none', color: 0 }, null);

// M2 — hidden core reveal (cut along the faint path, split reveals what is inside)
const L3 = lv(3, 'Apple Secret', 2, arc(360, 500, 150, Math.PI * 0.85, Math.PI * 0.15), { cx: 360, cy: 500, rx: 200, ry: 190 }, { kind: 'star', color: 0xf59e0b }, null);
const L4 = lv(4, 'Clockwork', 2, arc(360, 480, 120, Math.PI * 1.15, Math.PI * 1.95), { cx: 360, cy: 480, rx: 190, ry: 190 }, { kind: 'circle', color: 0x38bdf8 }, null);
const L5 = lv(5, 'Ball Game', 2, bezier({ x: 160, y: 560 }, { x: 360, y: 300 }, { x: 560, y: 560 }), { cx: 360, cy: 500, rx: 215, ry: 165 }, { kind: 'heart', color: 0xef4444 }, null);

// M3 — curves, steady-hand scoring (wobble penalty in core/scoring)
const L6 = lv(6, 'First Curve', 3, bezier({ x: 150, y: 420 }, { x: 360, y: 640 }, { x: 570, y: 400 }), { cx: 360, cy: 500, rx: 235, ry: 170 }, { kind: 'none', color: 0 }, null, 1.5);
const L7 = lv(7, 'S-Curve', 3, bezier3({ x: 140, y: 560 }, { x: 300, y: 300 }, { x: 420, y: 640 }, { x: 580, y: 380 }), { cx: 360, cy: 490, rx: 240, ry: 185 }, { kind: 'none', color: 0 }, null, 1.75);
const L8 = lv(8, 'Half Moon', 3, arc(360, 520, 180, Math.PI * 1.05, Math.PI * 1.95, 30), { cx: 360, cy: 500, rx: 215, ry: 175 }, { kind: 'none', color: 0 }, null, 2);
const L9 = lv(9, 'Double Bend', 3, bezier3({ x: 150, y: 380 }, { x: 360, y: 620 }, { x: 200, y: 500 }, { x: 570, y: 430 }), { cx: 360, cy: 490, rx: 240, ry: 180 }, { kind: 'none', color: 0 }, null, 2);

// M4 — forbidden segments: touching red = miss a chunk; release before, resume after
// no-go indices are ranges into the 96-point resampled path (mid-path zones)
const L10 = lv(10, 'Forbidden Line', 4, line(130, 480, 590, 480, 16), { cx: 360, cy: 480, rx: 255, ry: 155 }, { kind: 'none', color: 0 }, [40, 48]);
const L11 = lv(11, 'Forbidden Curve', 4, bezier3({ x: 140, y: 520 }, { x: 280, y: 320 }, { x: 440, y: 640 }, { x: 580, y: 420 }), { cx: 360, cy: 490, rx: 240, ry: 185 }, { kind: 'none', color: 0 }, [44, 54]);
const L12 = lv(12, 'Grand Finale', 4, bezier3({ x: 140, y: 460 }, { x: 300, y: 640 }, { x: 440, y: 300 }, { x: 580, y: 500 }), { cx: 360, cy: 490, rx: 240, ry: 190 }, { kind: 'star', color: 0xfacc15 }, [46, 56]);

export const LEVELS: readonly SliceLevel[] = [L1, L2, L3, L4, L5, L6, L7, L8, L9, L10, L11, L12];

/** Total level count (contract: 12). */
export const LEVEL_COUNT = LEVELS.length;

/** Validation: id sequence, path size, no-go range, thresholds ordered, non-degenerate shapes. */
export function validateLevels(levels: readonly SliceLevel[] = LEVELS): string[] {
  const errs: string[] = [];
  levels.forEach((l, i) => {
    if (l.id !== i + 1) errs.push(`level ${i}: id ${l.id} out of sequence`);
    if (l.path.length < 2) errs.push(`level ${l.id}: path needs >=2 points`);
    if (l.shape.rx <= 0 || l.shape.ry <= 0) errs.push(`level ${l.id}: degenerate silhouette`);
    if (!(l.thresholds[0] < l.thresholds[1] && l.thresholds[1] < l.thresholds[2])) {
      errs.push(`level ${l.id}: thresholds not ascending`);
    }
    if (l.noGo) {
      const [a, b] = l.noGo;
      if (a < 0 || b <= a) errs.push(`level ${l.id}: bad no-go range [${a},${b}]`);
      if (a <= 1 || b >= 94) errs.push(`level ${l.id}: no-go must not cover start/end of path`);
    }
    if (l.milestone === 2 && l.core.kind === 'none') errs.push(`level ${l.id}: reveal milestone needs a core`);
  });
  return errs;
}
