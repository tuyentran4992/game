// Slice Studio — render/fx.ts (Tier B, thin Phaser helpers)
// Split geometry: pre-baked halves computed from the known path (contract:
// no clipper / greiner-hormann — we only intersect a sampled curve with the
// silhouette ellipse and walk the ellipse arc between the two crossings).

import * as Phaser from 'phaser';
import { resampleUniform, type Vec } from '../geom/path';
import type { LevelShape } from '../level/levels';
import { ATLAS_KEYS, ART } from '../config/theme-config';

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

// ---------- S1 art pipeline (interior sprite + shadow — added, old signatures untouched) ----------

export interface FillPolyArtOpts {
  /** chapter 1..4 → atlas key (theme-config). Omit = legacy flat fill (proto behavior). */
  chapter?: 1 | 2 | 3 | 4;
  /** ellipse the polygon represents — used for the interior sprite placement. */
  shape?: LevelShape;
}

/**
 * S1: legacy flat silhouette fill + INTERIOR ART layer inside the ellipse hit-shape.
 * The chapter atlas sprite already carries the rough-edge mask baked into its alpha
 * (scripts/gen_slice_sprites.py — same deterministic pts as theme-config), so no
 * runtime geometry mask is needed: sprite sits ABOVE the flat fill; the flat fill
 * stays dimmed to read as the thin color ring between art edge and outline.
 * Callers that pass no opts get exactly the proto behavior (TDD-B: no signature change).
 */
export function fillPolyWithArt(
  scene: Phaser.Scene,
  levelRoot: Phaser.GameObjects.Container,
  g: Phaser.GameObjects.Graphics,
  pts: readonly Vec[],
  color: number,
  alpha = 1,
  opts: FillPolyArtOpts = {},
): void {
  fillPoly(g, pts, color, alpha);
  const { chapter, shape } = opts;
  if (!chapter || !shape) return;
  const key = ATLAS_KEYS[chapter];
  if (!scene.textures.exists(key)) return; // asset missing → flat Graphics only (safe fallback)
  const src = scene.textures.get(key).getSourceImage() as { width?: number } | null;
  if (!src || !src.width) return;

  // sprite canvas ellipse (r0 = n/2 - 24) maps onto the level ellipse; the baked mask
  // polygon inscribes it, so the art edge stays inside the hit-shape edge (S1-T2 anchor)
  const r0 = src.width / 2 - 24;
  const scale = 1 / (r0 / (src.width / 2)); // ≈1.049 — canvas ellipse → level ellipse
  const sprite = scene.add
    .image(shape.cx, shape.cy, key)
    .setDisplaySize(shape.rx * 2 * scale, shape.ry * 2 * scale);
  levelRoot.addAt(sprite, 1); // right above the flat-fill graphics (index 0)
  g.setAlpha(0.55); // flat fill dims — reads as ring + split-flash base
}

/** Drop-shadow ellipse under the interior art (DESIGN-SPEC §2 shadow layer). */
export function addSilhouetteShadow(
  scene: Phaser.Scene,
  levelRoot: Phaser.GameObjects.Container,
  shape: LevelShape,
  chapter: 1 | 2 | 3 | 4,
): Phaser.GameObjects.Ellipse | null {
  if (!scene.textures.exists(ATLAS_KEYS[chapter])) return null; // art-mode only
  const sh = scene.add.ellipse(
    shape.cx,
    shape.cy + ART.shadow.offsetY,
    shape.rx * 2 * ART.shadow.scale,
    shape.ry * 2 * ART.shadow.scale,
    ART.shadow.color,
    ART.shadow.alpha,
  );
  sh.setDepth(4); // under the silhouette fill (levelRoot children: g=0 …)
  levelRoot.addAt(sh, 0);
  return sh;
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

/** Seam particles along the cut entry→exit (DESIGN-SPEC §2 seam-speck direction). */
export function seamBurst(scene: Phaser.Scene, entry: Vec, exit: Vec, tint: number, opts?: { count?: number }): void {
  ensureSparkTexture(scene);
  const cfg = ART.seam;
  const count = opts?.count ?? cfg.count;
  const mx = (entry.x + exit.x) / 2;
  const my = (entry.y + exit.y) / 2;
  const angle = Math.atan2(exit.y - entry.y, exit.x - entry.x);
  const spread = (cfg.spreadDeg * Math.PI) / 180;
  const p = scene.add.particles(mx, my, 'spark', {
    speed: { min: cfg.speedMin, max: cfg.speedMax },
    angle: {
      min: ((angle - spread / 2) * 180) / Math.PI,
      max: ((angle + spread / 2) * 180) / Math.PI,
    },
    lifespan: { min: cfg.lifespanMin, max: cfg.lifespanMax },
    scale: { start: 1.1, end: 0 },
    quantity: count,
    tint,
    blendMode: Phaser.BlendModes.ADD,
    emitting: false,
  });
  p.setDepth(55);
  p.explode(count);
  scene.time.delayedCall(cfg.lifespanMax + 120, () => p.destroy());
}

/**
 * S1 atlas preload — boot scene whose preload() pulls the 4 chapter atlases through
 * `this.load.image`, so the verify_game.sh asset-manifest gate (bar 4) sees every
 * atlas key ↔ file, and so scenes can register this before TraceScene (S4 owns the
 * wiring). 0 runtime image loads outside these atlases (DESIGN-SPEC §1.3).
 */
export class AtlasBootScene extends Phaser.Scene {
  constructor() {
    super('AtlasBoot');
  }

  preload(): void {
    this.load.image('atlas-m1', 'atlas-m1.png');
    this.load.image('atlas-m2', 'atlas-m2.png');
    this.load.image('atlas-m3', 'atlas-m3.png');
    this.load.image('atlas-m4', 'atlas-m4.png');
  }

  create(): void {
    // hand off to the game flow already registered in the config (TraceScene default)
    this.scene.start('TraceScene');
  }
}
