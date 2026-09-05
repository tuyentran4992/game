// [UPG2-N1] t_79d2b77d — test KHÓA tham số input-feel + spawn cadence theo MechanicsConfig.
// Tầng A (TDD-A đỏ-trước): mọi tuning value sống 1 chỗ trong MECHANICS (ROLE-RULES fe-dev:
// boss/lead chỉnh số không đọc code). Rng injectable — test deterministic, không Math.random thô.
// Scope N1 (card + SCOPE+ round 1/2 lead):
//   (1) laneMoveMs/ease/inputBufferMs — tween đổi làn + buffer input;
//   (2) 4 hằng cadence spawn từng [MIRROR] (1.35/0.38/0.0035/0.10);
//   (3) BEES.speedyMult/normalMult + 1.18/1.0 tại SpawnDirector decisionToSpawn.
// Default GIỮ NGUYÊN giá trị đang chạy (giữ nguyên cảm giác — card cấm đổi giá trị).
import { describe, it, expect } from 'vitest';
import { MECHANICS } from '../mechanics';
import { SpawnDirector } from '../SpawnDirector';
import { GameEngine } from '../GameEngine';
import type { MechanicsConfig } from '../types';

function makeRng(seq: number[]): () => number {
  let i = 0;
  return () => {
    const v = seq[i % seq.length];
    i += 1;
    return v;
  };
}

// --- (1) khóa key input-feel trên config ---
describe('UPG2-N1 — MechanicsConfig có nhóm input-feel (lane-switch)', () => {
  it('laneMoveMs = 120 (dur.tn cũ — giữ nguyên cảm giác)', () => {
    expect(MECHANICS.laneMoveMs).toBe(120);
  });

  it('laneMoveDelayMs = 35 (delay tween bóng đổ — giữ nguyên)', () => {
    expect(MECHANICS.laneMoveDelayMs).toBe(35);
  });

  it('laneMoveEase = cubic.out (ease tween mèo — giữ nguyên)', () => {
    expect(MECHANICS.laneMoveEase).toBe('cubic.out');
  });

  it('inputBufferMs = 0 (phản hồi tức thì 0ms — comment controls Gameplay)', () => {
    expect(MECHANICS.inputBufferMs).toBe(0);
  });

  it('laneMoveSettleMs = 80 (tween dựng dậy sau cubic.out — giữ nguyên)', () => {
    expect(MECHANICS.laneMoveSettleMs).toBe(80);
  });
});

// --- (2) khóa 4 hằng cadence spawn (từng [MIRROR] T1a) ---
describe('UPG2-N1 — MechanicsConfig sở hữu 4 hằng cadence spawn', () => {
  it('spawnIntervalBase = 1.35', () => {
    expect(MECHANICS.spawnIntervalBase).toBe(1.35);
  });
  it('spawnIntervalFloor = 0.38', () => {
    expect(MECHANICS.spawnIntervalFloor).toBe(0.38);
  });
  it('spawnSpeedFactor = 0.0035', () => {
    expect(MECHANICS.spawnSpeedFactor).toBe(0.0035);
  });
  it('spawnLevelFactor = 0.10', () => {
    expect(MECHANICS.spawnLevelFactor).toBe(0.10);
  });
});

// --- (2b) SpawnDirector ĐỌC CÔNG THỨC TỪ CONFIG (không literal) — rng injectable ---
describe('UPG2-N1 — SpawnDirector tính spawnInterval từ config (deterministic)', () => {
  function harness(mechOver: Partial<MechanicsConfig>) {
    const mechanics: MechanicsConfig = { ...MECHANICS, ...mechOver };
    const engine = new GameEngine(mechanics, { rng: makeRng([0.99]) });
    engine.startNewGame();
    const dir = new SpawnDirector(mechanics, { rng: makeRng([0.99]) });
    dir.startSession(0);
    return { mechanics, engine, dir };
  }

  it('đổi spawnIntervalBase → spawnInterval đổi theo (đọc config, không literal 1.35)', () => {
    const base = harness({ spawnIntervalBase: 2.0 });
    expect(base.dir.update({ dt: 1.5, elapsed: 5, engine: base.engine, world: mkWorld() }).spawnInterval).toBeCloseTo(2.0, 5);
    expect(base.dir.update({ dt: 0.5, elapsed: 5.5, engine: base.engine, world: mkWorld() }).spawned).toHaveLength(0);
    const r = base.dir.update({ dt: 0.5, elapsed: 6, engine: base.engine, world: mkWorld() });
    expect(r.lastSpawnReset).toBe(true);
  });

  it('đổi spawnLevelFactor → mức level 4 đổi theo (mèo 3 level trên mức base)', () => {
    const eng = harness({ spawnLevelFactor: 0.5 });
    eng.engine.score = 3 * eng.mechanics.milestoneInterval; // level 4
    const r = eng.dir.update({ dt: 0.1, elapsed: 5, engine: eng.engine, world: mkWorld() });
    // warmup: speed = startSpeed → chỉ thành phần level: base - 3*0.5
    expect(r.spawnInterval).toBeCloseTo(eng.mechanics.spawnIntervalBase - 3 * 0.5, 5);
  });

  it('đổi spawnIntervalFloor → sàn đổi theo (nhánh max chạm sàn)', () => {
    const floor = harness({ spawnIntervalFloor: 0.9, spawnLevelFactor: 0.5 });
    floor.engine.score = 3 * floor.mechanics.milestoneInterval; // level 4: 2.0 - 1.5 = 0.5 < floor
    const r = floor.dir.update({ dt: 0.1, elapsed: 5, engine: floor.engine, world: mkWorld() });
    expect(r.spawnInterval).toBeCloseTo(0.9, 5);
  });
});

// --- (3) speedMult speedy đọc BEES.speedyMult qua config ---
describe('UPG2-N1 — speedMult speedy theo config ( SpawnDirector decisionToSpawn)', () => {
  it('đổi BEES.speedyMult (truyền qua MechanicsConfig) → decision.speedMult đổi theo', () => {
    const mechanics: MechanicsConfig = { ...MECHANICS, speedyMult: 1.4 };
    const engine = new GameEngine(mechanics, { rng: makeRng([0.0]) }); // 0.0 → roll speedy theo gate D-A2
    engine.startNewGame();
    engine.score = 10 * mechanics.milestoneInterval; // qua warmup 30s
    const dir = new SpawnDirector(mechanics, { rng: makeRng([0.0]) });
    dir.startSession(0);
    const r = dir.update({ dt: 5, elapsed: 40, engine, world: mkWorld() });
    expect(r.spawned.length).toBeGreaterThan(0);
    const speedy = r.spawned.find((s) => s.type === 'speedy');
    expect(speedy).toBeDefined();
    expect(speedy!.speedMult).toBe(1.4);
  });

  it('BEES.speedyMult default = 1.18 giữ nguyên cảm giác', () => {
    expect(MECHANICS.speedyMult).toBe(1.18);
    expect(MECHANICS.normalMult).toBe(1.0);
  });
});

function mkWorld() {
  return {
    swarmActive: false,
    fatBeeActive: false,
    fatOnScreen: false,
    occupiedLanes: [] as number[],
    safeLanes: [0, 1, 2],
    safeLanesFast: [0, 1, 2],
    beeCount: 0,
  };
}
