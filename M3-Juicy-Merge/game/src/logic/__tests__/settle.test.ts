// Settle detection (M3-03) — the Suika trap. Game over fires only when the world
// is AT REST and a fruit sits above the danger line. These cover the rule
// edge cases: empty world, one fruit still moving, grace not elapsed, etc.
import { describe, it, expect } from 'vitest';
import { isWorldSettled } from '../settle';

describe('isWorldSettled (M3-03 settle gate)', () => {
  it('empty world is never settled (no false game over with nothing in play)', () => {
    expect(isWorldSettled([], 1000, 0, 500)).toBe(false);
  });

  it('all at rest + grace elapsed → settled', () => {
    expect(isWorldSettled([true, true], 2000, 1000, 500)).toBe(true);
  });

  it('any fruit still moving → not settled (no game over while falling)', () => {
    expect(isWorldSettled([true, false], 2000, 1000, 500)).toBe(false);
  });

  it('all at rest but grace NOT elapsed → not settled (rejects bounce apex)', () => {
    // last motion was 300ms ago, grace is 500ms — still too soon.
    expect(isWorldSettled([true, true], 1300, 1000, 500)).toBe(false);
  });

  it('grace boundary: elapsed == grace → settled (>= is inclusive)', () => {
    expect(isWorldSettled([true], 1500, 1000, 500)).toBe(true);
  });

  it('a single resting fruit past grace → settled', () => {
    expect(isWorldSettled([true], 5000, 1000, 500)).toBe(true);
  });
});
