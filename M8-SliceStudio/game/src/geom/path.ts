// Slice Studio — geom/path.ts (Tier A, pure TS, no Phaser)
// Path utilities: resampling (uniform arc-length), nearest-point, no-go hit,
// path extension for the half-mask split (contract: no clipper/greiner-hormann).

export interface Vec {
  x: number;
  y: number;
}

/** Euclidean length of a polyline. */
export function pathLength(pts: readonly Vec[]): number {
  let len = 0;
  for (let i = 1; i < pts.length; i++) {
    len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  }
  return len;
}

/**
 * Resample a polyline to N points at (approximately) uniform arc-length.
 * Always keeps the exact first and last point. Input with <2 points returns copies.
 */
export function resampleUniform(pts: readonly Vec[], n: number): Vec[] {
  if (pts.length < 2 || n < 2) return pts.map((p) => ({ ...p }));
  const segLens: number[] = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    segLens.push(d);
    total += d;
  }
  if (total === 0) return [pts[0], { ...pts[pts.length - 1] }].slice(0, n);
  const out: Vec[] = [];
  const step = total / (n - 1);
  let seg = 0;
  let acc = 0; // distance accumulated inside current segment
  let cur = { ...pts[0] };
  out.push({ ...cur });
  for (let k = 1; k < n - 1; k++) {
    const target = k * step;
    while (seg < segLens.length && acc + segLens[seg] < target) {
      acc += segLens[seg];
      seg++;
    }
    if (seg >= segLens.length) {
      out.push({ ...pts[pts.length - 1] });
      continue;
    }
    const t = segLens[seg] === 0 ? 0 : (target - acc) / segLens[seg];
    const a = pts[seg];
    const b = pts[seg + 1];
    out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }
  out.push({ ...pts[pts.length - 1] });
  return out;
}

/**
 * Low-pass filter (moving average, window w, edges clamped) to smooth raw
 * pointer jitter before scoring. Window <3 returns copies.
 */
export function lowPass(pts: readonly Vec[], w: number): Vec[] {
  const n = pts.length;
  if (n < 3 || w < 3) return pts.map((p) => ({ ...p }));
  // Adaptive window: smoothing a SPARSE polyline destroys its geometry (ends
  // get dragged inward by half a window). Real pointer traces are dense
  // (>=2px min-distance), so cap the window at n/4 and skip when too sparse.
  let win = Math.min(w, Math.floor(n / 4));
  if (win < 3) return pts.map((p) => ({ ...p }));
  if (win % 2 === 0) win -= 1;
  const half = (win - 1) / 2;
  const out: Vec[] = [];
  for (let i = 0; i < n; i++) {
    if (i === 0 || i === n - 1) {
      out.push({ ...pts[i] }); // pin exact endpoints — keep the stroke extent
      continue;
    }
    let sx = 0;
    let sy = 0;
    let c = 0;
    for (let j = Math.max(0, i - half); j <= Math.min(n - 1, i + half); j++) {
      sx += pts[j].x;
      sy += pts[j].y;
      c++;
    }
    out.push({ x: sx / c, y: sy / c });
  }
  return out;
}

/** Nearest point on the polyline (returns point on path + distance + index of segment start). */
export function nearestPoint(
  pts: readonly Vec[],
  p: Vec,
): { point: Vec; dist: number; seg: number } {
  let best = { point: { ...pts[0] }, dist: Infinity, seg: 0 };
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const l2 = dx * dx + dy * dy;
    let t = l2 === 0 ? 0 : ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2;
    t = Math.max(0, Math.min(1, t));
    const qx = a.x + dx * t;
    const qy = a.y + dy * t;
    const d = Math.hypot(p.x - qx, p.y - qy);
    if (d < best.dist) best = { point: { x: qx, y: qy }, dist: d, seg: i - 1 };
  }
  return best;
}

/**
 * noGoHit: does any sampled trace point fall INSIDE a no-go segment
 * (with margin px)? no-go defined by index range on the reference path.
 * Direction-aware: the leading edge (path[from]) is the boundary LINE —
 * points not yet past it (<=2px along the zone direction) do not count,
 * so stopping exactly at the red edge is safe.
 */
export function noGoHit(
  trace: readonly Vec[],
  path: readonly Vec[],
  noGo: { from: number; to: number } | null,
  margin: number,
): Vec | null {
  if (!noGo || path.length < 2) return null;
  const lo = Math.max(0, Math.min(path.length - 1, noGo.from));
  const hi = Math.max(0, Math.min(path.length - 1, noGo.to));
  if (hi <= lo) return null;
  const start = path[lo];
  const nxt = path[Math.min(path.length - 1, lo + 1)];
  const dx = nxt.x - start.x;
  const dy = nxt.y - start.y;
  const len = Math.hypot(dx, dy) || 1;
  // Zone length along the path (edges are grace zones on BOTH sides:
  // stopping before the entry edge or resuming past the exit edge are legal).
  const zoneLen = pathLength(path.slice(lo, hi + 1));
  for (const t of trace) {
    const along = ((t.x - start.x) * dx + (t.y - start.y) * dy) / len; // px past the entry edge
    if (along <= 2) continue; // not yet past the entry edge
    if (along >= zoneLen - 2) continue; // already past the exit edge
    for (let i = lo + 1; i <= hi; i++) {
      if (Math.hypot(t.x - path[i].x, t.y - path[i].y) <= margin) return { ...t };
    }
  }
  return null;
}

/**
 * Extend a path at BOTH ends along its end tangents until it leaves the
 * canvas rect. Used to build the pre-baked half-mask cut line (split covers
 * the whole shape even though the visible path stops at the silhouette edge).
 */
export function extendPathToBounds(
  pts: readonly Vec[],
  w: number,
  h: number,
  pad = 40,
): Vec[] {
  if (pts.length < 2) return pts.map((p) => ({ ...p }));
  const tailDir = norm2(sub(pts[0], pts[1])); // shoot backward, away from the path
  const headDir = norm2(sub(pts[pts.length - 1], pts[pts.length - 2])); // continue past the end
  const start = rayExit(pts[0], tailDir, w, h, pad);
  const end = rayExit(pts[pts.length - 1], headDir, w, h, pad);
  return [start, ...pts.map((p) => ({ ...p })), end];
}

function sub(a: Vec, b: Vec): Vec {
  return { x: a.x - b.x, y: a.y - b.y };
}

function norm2(v: Vec): Vec {
  const l = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / l, y: v.y / l };
}

/** Point where a ray from p along d exits rect [-pad..w+pad, -pad..h+pad]. */
function rayExit(p: Vec, d: Vec, w: number, h: number, pad: number): Vec {
  const minX = -pad;
  const maxX = w + pad;
  const minY = -pad;
  const maxY = h + pad;
  let tMin = Infinity;
  if (d.x > 1e-9) tMin = Math.min(tMin, (maxX - p.x) / d.x);
  if (d.x < -1e-9) tMin = Math.min(tMin, (minX - p.x) / d.x);
  if (d.y > 1e-9) tMin = Math.min(tMin, (maxY - p.y) / d.y);
  if (d.y < -1e-9) tMin = Math.min(tMin, (minY - p.y) / d.y);
  if (!isFinite(tMin)) tMin = 0;
  return { x: p.x + d.x * tMin, y: p.y + d.y * tMin };
}
