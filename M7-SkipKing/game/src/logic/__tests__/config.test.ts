import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { MECHANICS } from '../../config/mechanics';
import type { MechanicsConfig } from '../../config/mechanics';
import type { EngineEvent, Stone, FlickInput, RunResult } from '../types';
import { mulberry32 } from '../rng';

/** Anchor vật lý mulberry32 chuẩn (Tommy Ettinger) — tính bằng python trước khi neo. */
describe('M7 T1 — MechanicsConfig skeleton (khóa cấu trúc, số chốt theo CONTRACT §2)', () => {
  it('mọi field tồn tại đúng tên CONTRACT', () => {
    const cfg: MechanicsConfig = MECHANICS; // type-level: skeleton phải khớp interface
    expect(cfg.fixedDt).toBeDefined();
    expect(cfg.fieldZMax).toBeDefined();
    expect(cfg.stoneRadius).toBeDefined();
    expect(cfg.gravityY).toBeDefined();
    expect(cfg.canvas).toBeDefined();
    expect(cfg.canvas.width).toBeDefined();
    expect(cfg.canvas.height).toBeDefined();
    expect(cfg.touchTargetPx).toBeDefined();
    expect(cfg.comboBanner).toBeDefined();
    expect(cfg.comboBanner.line1).toBeDefined();
    expect(cfg.comboBanner.line2).toBeDefined();
    expect(cfg.slowmoTimescale).toBeDefined();
    expect(cfg.perfectWindow).toBeDefined();
    expect(cfg.perfectWindow.angleMinDeg).toBeDefined();
    expect(cfg.perfectWindow.angleMaxDeg).toBeDefined();
    expect(cfg.perfectWindow.powerMin).toBeDefined();
    expect(cfg.perfectWindow.powerMax).toBeDefined();
    expect(cfg.firstThrowAssist).toBeDefined();
    expect(cfg.firstThrowAssist.powerFloor).toBeDefined();
    expect(cfg.firstThrowAssist.angleBandDeg).toBeDefined();
  });

  it('số dev-lead chốt: FIXED_DT=1/120, FIELD_Z_MAX=40, STONE_R=0.12, GRAVITY_Y=9.81', () => {
    expect(MECHANICS.fixedDt).toBe(1 / 120);
    expect(MECHANICS.fieldZMax).toBe(40);
    expect(MECHANICS.stoneRadius).toBe(0.12);
    expect(MECHANICS.gravityY).toBe(9.81);
  });

  it('canvas 720×1280, TOUCH_TARGET=44px, SLOWMO=0.4×, COMBO_BANNER 2 dòng EN', () => {
    expect(MECHANICS.canvas.width).toBe(720);
    expect(MECHANICS.canvas.height).toBe(1280);
    expect(MECHANICS.touchTargetPx).toBe(44);
    expect(MECHANICS.slowmoTimescale).toBe(0.4);
    expect(MECHANICS.comboBanner.line1).toBe('PERFECT FLICK!');
    expect(MECHANICS.comboBanner.line2).toBe('×2');
  });

  it('T2 đã khoá số sweep: 6 field perfectWindow + firstThrowAssist SẠCH marker [PLACEHOLDER]', () => {
    const src = readFileSync(new URL('../../config/mechanics.ts', import.meta.url), 'utf8');
    const constSrc = src.slice(src.indexOf('export const MECHANICS'));
    const lines = constSrc.split('\n');
    // T2 đã khoá số (sweep 1800 seed 1..1800 + sim 100 seed assist): 6 field phải SẠCH marker
    for (const f of ['angleMinDeg', 'angleMaxDeg', 'powerMin', 'powerMax', 'powerFloor', 'angleBandDeg']) {
      const line = lines.find((l) => new RegExp(`\\b${f}\\s*:`).test(l));
      expect(line, `field ${f} phải tồn tại`).toBeDefined();
      expect(line!, `field ${f} phải sạch [PLACEHOLDER] sau khi T2 khoá số`).not.toContain('[PLACEHOLDER]');
    }
    // Field đã chốt: dòng khai báo số chốt phải sạch marker
    for (const line of lines) {
      if (/\b(fixedDt|fieldZMax|stoneRadius|gravityY|width|height|touchTargetPx|slowmoTimescale|line1|line2)\s*:/.test(line)) {
        expect(line).not.toContain('[PLACEHOLDER]');
      }
    }
  });
});

describe('M7 T1 — types.ts (Tầng A, pure TS, 0 import Phaser/DOM)', () => {
  it('Stone{x,z,y,vx,vy,vz} — gán object khớp shape (compile + runtime smoke)', () => {
    const s: Stone = { x: 1, z: 2, y: 0.5, vx: 0.1, vy: -1, vz: 3 };
    expect(Object.keys(s).sort()).toEqual(['vx', 'vy', 'vz', 'x', 'y', 'z']);
    expect(s.x).toBe(1);
    expect(s.vz).toBe(3);
  });

  it('FlickInput{dirX,dirZ,power} — shape compile', () => {
    const f: FlickInput = { dirX: 0, dirZ: -1, power: 0.7 };
    expect(f.power).toBe(0.7);
  });

  it('RunResult có score/bounces/best — shape compile', () => {
    const r: RunResult = { score: 12, bounces: 7, best: 15 };
    expect(r.score).toBe(12);
    expect(r.bounces).toBe(7);
    expect(r.best).toBe(15);
  });

  it('EngineEvent discriminated union 4 event bounce/splash/perfect/perfectRunEnd — narrow theo type', () => {
    const events: EngineEvent[] = [
      { type: 'bounce', stoneX: 1, stoneZ: 2, impact: 0.5 },
      { type: 'splash', stoneX: 1, stoneZ: 40 },
      { type: 'perfect', streak: 1 },
      { type: 'perfectRunEnd', bounces: 9 },
    ];
    for (const e of events) {
      switch (e.type) {
        case 'bounce':
          expect(e.impact).toBe(0.5);
          break;
        case 'splash':
          expect(e.stoneZ).toBe(40);
          break;
        case 'perfect':
          expect(e.streak).toBe(1);
          break;
        case 'perfectRunEnd':
          expect(e.bounces).toBe(9);
          break;
      }
    }
  });
});

describe('M7 T1 — rng.ts mulberry32 (injectable, deterministic, importable không DOM)', () => {
  it('cùng seed → chuỗi số giống nhau y hệt (deterministic — nền sim seeded T2)', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const sa = [a(), a(), a(), a(), a()];
    const sb = [b(), b(), b(), b(), b()];
    expect(sa).toEqual(sb);
  });

  it('khác seed → chuỗi khác nhau (không nuốt seed)', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect([a(), a()]).not.toEqual([b(), b()]);
  });

  it('output luôn trong [0,1) — 2000 lượt quanh seed khác nhau', () => {
    for (let seed = 0; seed < 10; seed++) {
      const r = mulberry32(seed);
      for (let i = 0; i < 200; i++) {
        const v = r();
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(1);
      }
    }
  });

  it('anchor giá trị known-seed: mulberry32(1) lượt đầu = 0.6270739405881613, mulberry32(42) = 0.6011037519201636', () => {
    // Giá trị neo tính độc lập bằng python3 từ công thức mulberry32 chuẩn (Tommy Ettinger) — chống đổi thuật toán ngầm
    expect(mulberry32(1)()).toBeCloseTo(0.6270739405881613, 12);
    expect(mulberry32(42)()).toBeCloseTo(0.6011037519201636, 12);
  });
});
