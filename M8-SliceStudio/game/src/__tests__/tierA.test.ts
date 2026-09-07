// Slice Studio — Tier A sanity tests (prototype: fast verification, no red-first ceremony — PB-2a)
import { describe, expect, it } from 'vitest';
import { extendPathToBounds, lowPass, nearestPoint, pathLength, resampleUniform } from '../geom/path';
import { projectOnPath, scoreTrace, startsNear } from '../geom/slice';
import { LEVELS, LEVEL_COUNT, validateLevels } from '../level/levels';
import { awardStars, nextStreak, totalStars } from '../core/scoring';
import { MAGNET_RADIUS, TraceEngine } from '../core/engine';

const line = (x1: number, y1: number, x2: number, y2: number, n = 64) =>
  Array.from({ length: n }, (_, i) => ({ x: x1 + ((x2 - x1) * i) / (n - 1), y: y1 + ((y2 - y1) * i) / (n - 1) }));

describe('geom/path', () => {
  it('resamples uniformly and keeps endpoints', () => {
    const pts = line(0, 0, 300, 0, 31);
    const r = resampleUniform(pts, 10);
    expect(r.length).toBe(10);
    expect(r[0].x).toBeCloseTo(0);
    expect(r[9].x).toBeCloseTo(300);
    for (let i = 1; i < r.length; i++) expect(r[i].x - r[i - 1].x).toBeCloseTo(300 / 9, 1);
  });

  it('lowPass smooths jitter', () => {
    const pts = line(0, 0, 200, 0, 21).map((p, i) => ({ ...p, y: i % 2 ? 10 : -10 }));
    const s = lowPass(pts, 5);
    expect(Math.abs(s[10].y)).toBeLessThanOrEqual(2);
  });

  it('nearestPoint finds distance', () => {
    const np = nearestPoint(line(0, 0, 100, 0, 101), { x: 50, y: 7 });
    expect(np.dist).toBeCloseTo(7);
    expect(np.point.x).toBeCloseTo(50);
  });

  it('extendPathToBounds leaves the canvas', () => {
    const ext = extendPathToBounds([{ x: 100, y: 470 }, { x: 620, y: 470 }], 720, 1280);
    expect(ext[0].x).toBeLessThan(0);
    expect(ext[ext.length - 1].x).toBeGreaterThan(720);
  });
});

describe('geom/slice.scoreTrace', () => {
  const path = line(140, 470, 580, 470);

  it('perfect trace scores high', () => {
    const s = scoreTrace(path, path);
    expect(s.pct).toBeGreaterThanOrEqual(90);
    expect(s.coverage).toBeGreaterThan(0.9);
    expect(s.releasedEarly).toBe(false);
  });

  it('wobbly trace scores lower than perfect', () => {
    const wobbly = path.map((p, i) => ({ x: p.x, y: p.y + (i % 2 ? 18 : -18) }));
    const s = scoreTrace(wobbly, path);
    expect(s.pct).toBeLessThan(scoreTrace(path, path).pct);
    expect(s.pct).toBeGreaterThan(40);
  });

  it('half trace = early release', () => {
    const s = scoreTrace(path.slice(0, 30), path);
    expect(s.releasedEarly).toBe(true);
  });

  it('no-go touch is reported', () => {
    const ref = resampleUniform(path, 96);
    const withNoGo = [...path.slice(0, 40), { x: ref[45].x, y: ref[45].y }, ...path.slice(50)];
    const s = scoreTrace(withNoGo, path, { noGo: { from: 44, to: 48 } });
    expect(s.noGoHitAt).not.toBeNull();
  });

  it('short garbage trace never crashes', () => {
    expect(scoreTrace([{ x: 0, y: 0 }], path).pct).toBe(0);
    expect(scoreTrace([], path).pct).toBe(0);
  });

  it('startsNear + projectOnPath (magnet)', () => {
    expect(startsNear([{ x: 150, y: 480 }], path, 90)).toBe(true);
    expect(startsNear([{ x: 150, y: 700 }], path, 90)).toBe(false);
    const proj = projectOnPath([{ x: 150, y: 486 }], path, MAGNET_RADIUS);
    expect(proj.snapped[0].y).toBeCloseTo(470, 0);
  });
});

describe('level/levels', () => {
  it('has 12 valid levels across 4 milestones', () => {
    expect(LEVEL_COUNT).toBe(12);
    expect(validateLevels()).toEqual([]);
    expect(LEVELS.map((l) => l.milestone)).toEqual([1, 1, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4]);
  });

  it('paths stay in the top 2/3 of the canvas', () => {
    for (const l of LEVELS) for (const p of l.path) expect(p.y).toBeLessThan(860);
  });
});

describe('core/scoring', () => {
  const lv = LEVELS[0];
  it('thresholds map to stars', () => {
    expect(awardStars(95, lv, { releasedEarly: false, noGoHit: false }).stars).toBe(3);
    expect(awardStars(76, lv, { releasedEarly: false, noGoHit: false }).stars).toBe(2);
    expect(awardStars(56, lv, { releasedEarly: false, noGoHit: false }).stars).toBe(1);
    expect(awardStars(30, lv, { releasedEarly: false, noGoHit: false }).stars).toBe(0);
  });
  it('early release caps at 1 star, never fails', () => {
    const a = awardStars(99, lv, { releasedEarly: true, noGoHit: false });
    expect(a.stars).toBe(1);
    expect(a.label).toBe('keep-going');
  });
  it('no-go hit = 0 stars (chunk lost)', () => {
    expect(awardStars(99, lv, { releasedEarly: false, noGoHit: true }).stars).toBe(0);
  });
  it('GHOST CUT streak breaks on non-ghost', () => {
    expect(nextStreak(0, true)).toBe(1);
    expect(nextStreak(2, false)).toBe(0);
    expect(totalStars([{ stars: 3 }, { stars: 2 }])).toBe(5);
  });
});

describe('core/engine', () => {
  const level = LEVELS[0];
  it('ignores touches far from start, accepts near (magnet zone)', () => {
    const e = new TraceEngine();
    expect(e.begin({ x: 100, y: 1100 }, level.path)).toBe(false);
    expect(e.begin({ x: 150, y: 520 }, level.path)).toBe(true);
    expect(e.currentPhase).toBe('drawing');
  });
  it('full trace -> 3 stars; early release -> capped', () => {
    const e = new TraceEngine();
    e.begin(level.path[0], level.path);
    for (const p of level.path) e.move(p);
    const r = e.release(level)!;
    expect(r.award.stars).toBe(3);
    expect(r.score.releasedEarly).toBe(false);

    const e2 = new TraceEngine();
    e2.begin(level.path[0], level.path);
    for (const p of level.path.slice(0, 4)) e2.move(p);
    const r2 = e2.release(level)!;
    expect(r2.score.releasedEarly).toBe(true);
    expect(r2.award.stars).toBeLessThanOrEqual(1);
  });
  it('retry resets to idle', () => {
    const e = new TraceEngine();
    e.begin(level.path[0], level.path);
    e.retry();
    expect(e.currentPhase).toBe('idle');
  });
  it('M4 multi-stroke: stop before red -> mid -> resume -> scored', () => {
    const l10 = LEVELS[9];
    const ref = resampleUniform(l10.path, 96);
    const stopPt = ref[l10.noGo![0]];
    const resumePt = ref[l10.noGo![1] + 2];
    const e = new TraceEngine();
    expect(e.begin(l10.path[0], l10.path)).toBe(true);
    for (const p of resampleUniform([l10.path[0], stopPt], 24)) e.move(p);
    expect(e.release(l10)).toBeNull(); // held before the red zone, not scored yet
    expect(e.currentPhase).toBe('mid');
    expect(e.begin(resumePt, l10.path)).toBe(true); // resume after the red zone
    for (const p of resampleUniform([resumePt, l10.path[l10.path.length - 1]], 24)) e.move(p);
    const r = e.release(l10)!;
    expect(r.score.noGoHitAt).toBeNull(); // never touched the forbidden segment
    expect(r.score.releasedEarly).toBe(false);
  });
  it('touching the forbidden segment = chunk lost', () => {
    const l10 = LEVELS[9];
    const ref = resampleUniform(l10.path, 96);
    const e = new TraceEngine();
    e.begin(l10.path[0], l10.path);
    for (const p of ref) e.move(p); // straight through the red zone
    const r = e.release(l10)!;
    expect(r.score.noGoHitAt).not.toBeNull();
    expect(r.award.stars).toBe(0);
    expect(r.award.label).toBe('chunk-lost');
  });
  it('pathLength + demo baseline smoke', () => {
    expect(pathLength(line(0, 0, 0, 100, 2))).toBeCloseTo(100);
  });
});
