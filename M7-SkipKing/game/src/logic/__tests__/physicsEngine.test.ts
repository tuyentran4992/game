import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { MECHANICS } from '../../config/mechanics';
import { PhysicsEngine, simulateFlick, simulateFlickDetailed } from '../physicsEngine';
import { flickFromSeed } from '../perfectWindow';
import { judgePerfect } from '../mechanics';
import { mulberry32 } from '../rng';

describe('G2-1 determinism — rng inject 100%', () => {
  it('cùng seed + cùng input + cùng config → RunResult VÀ events giống hệt (deep equal)', () => {
    const input = flickFromSeed(123);
    const a = simulateFlickDetailed(MECHANICS, input, 123);
    const b = simulateFlickDetailed(MECHANICS, input, 123);
    expect(a.result).toEqual(b.result);
    expect(a.events).toEqual(b.events);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('rng inject: 2 engine độc lập cùng mulberry32(7) → cùng dòng events + trạng thái cuối', () => {
    const input = flickFromSeed(42);
    const run = () => {
      const e = new PhysicsEngine(MECHANICS, mulberry32(7));
      e.throwFlick(input);
      const evs = [...e.drainEvents()];
      while (!e.finished) evs.push(...e.step(MECHANICS.fixedDt));
      return JSON.stringify({ evs, stone: e.stone, bounces: e.bounces });
    };
    expect(run()).toBe(run());
  });

  it('seed khác → sim khác (rng thực sự tham gia qua flickFromSeed) — 60 seed ≥2 kết quả distinct', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 60; seed++) {
      seen.add(JSON.stringify(simulateFlickDetailed(MECHANICS, flickFromSeed(seed), seed).result));
    }
    expect(seen.size).toBeGreaterThanOrEqual(2);
  });

  it('guard nguồn: src/logic/** + config/mechanics.ts — 0 Math.random, 0 Date, 0 import phaser', () => {
    const walk = (dir: string): string[] =>
      readdirSync(dir).flatMap((f) => {
        const p = join(dir, f);
        return statSync(p).isDirectory() ? walk(p) : f.endsWith('.ts') ? [p] : [];
      });
    const logicDir = new URL('../', import.meta.url).pathname;
    const files = [
      ...walk(logicDir).filter((f) => !f.includes('__tests__')),
      new URL('../../config/mechanics.ts', import.meta.url).pathname,
    ];
    // Bỏ comment trước khi quét (comment giải thích chớp mắt chuỗi cấm không phải code thật).
    const bad = /Math\.random|Date\.now|new Date\b|['"]phaser['"]/;
    const violations = files
      .map((f) => {
        const code = readFileSync(f, 'utf8')
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/\/\/.*$/gm, '');
        return bad.test(code) ? f.replace(logicDir, 'src/logic/') : null;
      })
      .filter((x): x is string => x !== null);
    expect(violations).toEqual([]);
  });
});

describe('G2-4 physics biên', () => {
  it('power 0 → chìm ngay: 0 bounce, terminal splash, score 0, có event splash', () => {
    const d = simulateFlickDetailed(MECHANICS, { dirX: 0, dirZ: -1, power: 0 }, 9);
    expect(d.bounces).toBe(0);
    expect(d.terminal).toBe('splash');
    expect(d.result.score).toBe(0);
    expect(d.events.some((e) => e.type === 'splash')).toBe(true);
  });

  it('power max (1.0) thẳng → bay ra horizon (không timeout), z không vượt fieldZMax', () => {
    const d = simulateFlickDetailed(MECHANICS, { dirX: 0, dirZ: -1, power: 1 }, 5);
    expect(d.terminal).toBe('horizon');
    expect(d.bounces).toBeGreaterThanOrEqual(3);
    expect(d.maxZ).toBeLessThanOrEqual(MECHANICS.fieldZMax + 1e-9);
  });

  it('angle 90° (dirX=1, dirZ=0) → kết thúc được (terminal splash), z gần như không tiến', () => {
    const d = simulateFlickDetailed(MECHANICS, { dirX: 1, dirZ: 0, power: 0.8 }, 7);
    expect(d.terminal).toBe('splash');
    expect(d.maxZ).toBeLessThan(5);
  });

  it('z ngoài field: loadStone z=41 → step đầu kết thúc run, không sinh bounce mới', () => {
    const e = new PhysicsEngine(MECHANICS, mulberry32(3));
    e.loadStone({ x: 0, y: 0.5, z: MECHANICS.fieldZMax + 1, vx: 0, vy: 0, vz: 5 });
    const evs = e.step(MECHANICS.fixedDt);
    expect(e.finished).toBe(true);
    expect(evs.filter((ev) => ev.type === 'bounce')).toHaveLength(0);
  });

  it('power ngoài [0,1] bị kẹp: power -0.5 ≡ power 0, power 5 ≡ power 1', () => {
    expect(simulateFlick(MECHANICS, { dirX: 0, dirZ: -1, power: -0.5 }, 9)).toEqual(
      simulateFlick(MECHANICS, { dirX: 0, dirZ: -1, power: 0 }, 9),
    );
    expect(simulateFlick(MECHANICS, { dirX: 0, dirZ: -1, power: 5 }, 5)).toEqual(
      simulateFlick(MECHANICS, { dirX: 0, dirZ: -1, power: 1 }, 5),
    );
  });
});
