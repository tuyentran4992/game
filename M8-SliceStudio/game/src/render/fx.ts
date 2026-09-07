// Slice Studio — render/fx.ts (Tier B, thin Phaser helpers)
// Split geometry: pre-baked halves computed from the known path (contract:
// no clipper / greiner-hormann — we only intersect a sampled curve with the
// silhouette ellipse and walk the ellipse arc between the two crossings).

import * as Phaser from 'phaser';
import { resampleUniform, type Vec } from '../geom/path';
import type { LevelShape } from '../level/levels';

export interface Halves {
  a: Vec[];
  b: Vec[];
  /** unit normal of the cut (entry->exit), for the separation push. */
  normal: Vec;
  entry: Vec;
  exit: Vec;
}

const insideEllipse = (p: Vec, s: LevelShape): boolean =>
  ((p.x - s.cx) / s.rx) ** 2 + ((p.y - s.cy) / s.ry) ** 2 <= 1;

/** Ellipse point at parameter angle t. */
function ell(s: LevelShape, t: number): Vec {
  return { x: s.cx + s.rx * Math.cos(t), y: s.cy + s.ry * Math.sin(t) };
}

/**
 * Split the silhouette into two polygons along the (resampled) path.
 * Half A = path(entry..exit) + ellipse arc(exit->entry, direction +),
 * Half B = same path chunk + arc in the other direction.
 */
export function bakeHalves(levelPath: readonly Vec[], shape: LevelShape): Halves | null {
  const path = resampleUniform(levelPath, 64);
  let ei = -1;
  let xi = -1;
  for (let i = 0; i < path.length; i++) {
    if (insideEllipse(path[i], shape)) {
      if (ei < 0) ei = i;
      xi = i;
    }
  }
  if (ei < 0 || xi <= ei) return null;
  const entry = path[ei];
  const exit = path[xi];
  const tEntry = Math.atan2((entry.y - shape.cy) / shape.ry, (entry.x - shape.cx) / shape.rx);
  const tExit = Math.atan2((exit.y - shape.cy) / shape.ry, (exit.x - shape.cx) / shape.rx);

  const arcPts = (from: number, to: number, dir: 1 | -1): Vec[] => {
    const pts: Vec[] = [];
    let span = (to - from) * dir;
    while (span < 0) span += Math.PI * 2;
    while (span > Math.PI * 2) span -= Math.PI * 2;
    const n = Math.max(14, Math.round((span / (Math.PI * 2)) * 64));
    for (let i = 0; i <= n; i++) pts.push(ell(shape, from + dir * span * (i / n)));
    return pts;
  };

  const pathChunk = path.slice(ei, xi + 1);
  const a: Vec[] = [...pathChunk, ...arcPts(tExit, tEntry, 1)];
  const b: Vec[] = [...pathChunk, ...arcPts(tExit, tEntry, -1)];

  const dx = exit.x - entry.x;
  const dy = exit.y - entry.y;
  const len = Math.hypot(dx, dy) || 1;
  const normal = { x: -dy / len, y: dx / len };
  return { a, b, normal, entry, exit };
}

/** Fill a polygon into a Graphics. */
export function fillPoly(g: Phaser.GameObjects.Graphics, pts: readonly Vec[], color: number, alpha = 1): void {
  g.fillStyle(color, alpha);
  g.fillPoints(
    pts.map((p) => new Phaser.Math.Vector2(p.x, p.y)),
    true,
  );
  g.lineStyle(3, color, alpha);
  g.strokePoints(
    pts.map((p) => new Phaser.Math.Vector2(p.x, p.y)),
    true,
  );
}

/** 5-point star polygon points (for core reveal + star icons). */
export function starPoints(cx: number, cy: number, r: number): Phaser.Math.Vector2[] {
  const pts: Phaser.Math.Vector2[] = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(new Phaser.Math.Vector2(cx + rad * Math.cos(a), cy + rad * Math.sin(a)));
  }
  return pts;
}

/** Cut-line flash: white bar along the cut, fades out. */
export function flashAlongCut(
  scene: Phaser.Scene,
  entry: Vec,
  exit: Vec,
  color = 0xffffff,
): void {
  const mx = (entry.x + exit.x) / 2;
  const my = (entry.y + exit.y) / 2;
  const len = Math.hypot(exit.x - entry.x, exit.y - entry.y) + 220;
  const angle = Math.atan2(exit.y - entry.y, exit.x - entry.x);
  const bar = scene.add.rectangle(mx, my, len, 18, color, 0.95);
  bar.setRotation(angle);
  bar.setBlendMode(Phaser.BlendModes.ADD);
  scene.tweens.add({ targets: bar, alpha: 0, scaleX: 1.15, duration: 260, ease: 'Cubic.out', onComplete: () => bar.destroy() });
}

/** Small white square texture for particle bursts. */
export function ensureSparkTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists('spark')) return;
  const g = scene.add.graphics();
  g.fillStyle(0xffffff, 1);
  g.fillRect(0, 0, 7, 7);
  g.generateTexture('spark', 7, 7);
  g.destroy();
}

/** Burst of sparks at (x,y) — used for reveal + GHOST CUT. */
export function sparkBurst(scene: Phaser.Scene, x: number, y: number, tint: number, count = 26): void {
  ensureSparkTexture(scene);
  const p = scene.add.particles(x, y, 'spark', {
    speed: { min: 90, max: 340 },
    angle: { min: 0, max: 360 },
    lifespan: { min: 320, max: 720 },
    scale: { start: 1.4, end: 0 },
    quantity: count,
    tint,
    blendMode: Phaser.BlendModes.ADD,
    emitting: false,
  });
  p.setDepth(60);
  p.explode(count);
  scene.time.delayedCall(900, () => p.destroy());
}
