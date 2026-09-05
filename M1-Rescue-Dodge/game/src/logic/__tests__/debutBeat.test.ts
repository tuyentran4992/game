// [UPG2-P1a] t_6035fb14 — Debut beat tầng A: firstSeen về GameEngine + cụm thưa + telegraph window.
// TDD-A red-first. Deterministic: rng injectable cả engine lẫn director (cấm Math.random thô).
// KT#74(b): debut beat KHÔNG đổi số bot — cụm thưa = DOWNGRADE cùng loại trong cửa sổ về normal,
// không phải refusal. BR-17: KHÔNG đụng ranh giới chương time-based. 0 dòng scenes/ (P1b lo vẽ).
import { describe, it, expect } from 'vitest';
import { SpawnDirector } from '../SpawnDirector';
import { GameEngine } from '../GameEngine';
import { MECHANICS } from '../../config/mechanics';
import { DEBUT_SPARSE_SEC } from '../SpawnDirector';
import type { MechanicsConfig } from '../types';

function makeRng(seq: number[]): () => number {
  let i = 0;
  return () => {
    const v = seq[i % seq.length];
    i += 1;
    return v;
  };
}

interface World {
  swarmActive: boolean;
  fatBeeActive: boolean;
  fatOnScreen: boolean;
  occupiedLanes: number[];
  safeLanes: number[];
  safeLanesFast: number[];
  beeCount: number;
}

function makeWorld(over: Partial<World> = {}): World {
  return {
    swarmActive: false, fatBeeActive: false, fatOnScreen: false,
    occupiedLanes: [], safeLanes: [0, 1, 2], safeLanesFast: [0, 1, 2], beeCount: 0,
    ...over,
  };
}

function makeHarness(dirRng: number[] = [0.99], engineRng: number[] = [0.99], mechOver: Partial<MechanicsConfig> = {}) {
  const mechanics: MechanicsConfig = { ...MECHANICS, ...mechOver };
  const engine = new GameEngine(mechanics, { rng: makeRng(engineRng) });
  engine.startNewGame();
  const dir = new SpawnDirector(mechanics, { rng: makeRng(dirRng) });
  dir.startSession(0);
  return { mechanics, engine, dir };
}

describe('P1a — config debut [PLACEHOLDER] sàn telegraph ≥1.2s', () => {
  it('MechanicsConfig có debutSparseSec + debutTelegraphMinSec, cả hai ≥1.2', () => {
    expect(MECHANICS.debutSparseSec).toBeGreaterThanOrEqual(1.2);
    expect(MECHANICS.debutTelegraphMinSec).toBeGreaterThanOrEqual(1.2);
  });

  it('window tính từ cfg (debutSparseSec=1.5 → dài đúng 1.5s), không còn literal 2.0', () => {
    const h = makeHarness([0.9], [0.01], { debutSparseSec: 1.5 });
    h.dir.update({ dt: 0.01, elapsed: 30, engine: h.engine, world: makeWorld() });
    h.dir.update({ dt: 2.0, elapsed: 35, engine: h.engine, world: makeWorld({ swarmActive: true }) });
    h.dir.update({ dt: 0.5, elapsed: 37.5, engine: h.engine, world: makeWorld() });
    const d = h.dir.debutAt(38);
    expect(d?.type).toBe('speedy');
    expect(d!.until - d!.firstSeenAt).toBeCloseTo(1.5, 5);
  });

  it('DEBUT_SPARSE_SEC (shim) đọc từ MechanicsConfig để test cũ không vỡ', () => {
    expect(DEBUT_SPARSE_SEC).toBe(MECHANICS.debutSparseSec);
  });
});

describe('P1a — firstSeen về GameEngine (noteDebut/debutAt)', () => {
  it('spawn speedy đầu tiên → engine.debutAt trả window {type, firstSeenAt, until}', () => {
    const h = makeHarness([0.9], [0.01]);
    h.dir.update({ dt: 0.01, elapsed: 30, engine: h.engine, world: makeWorld() });
    h.dir.update({ dt: 2.0, elapsed: 35, engine: h.engine, world: makeWorld({ swarmActive: true }) });
    h.dir.update({ dt: 0.5, elapsed: 37.5, engine: h.engine, world: makeWorld() });
    const d = h.engine.debutAt(38);
    expect(d?.type).toBe('speedy');
    expect(d?.firstSeenAt).toBe(37.5);
    expect(d?.until).toBeCloseTo(37.5 + MECHANICS.debutSparseSec, 5);
  });

  it('normal không tạo debut; ván mới (startNewGame) xoá firstSeen', () => {
    const h = makeHarness([0.9], [0.01]);
    h.dir.update({ dt: 0.01, elapsed: 30, engine: h.engine, world: makeWorld() });
    h.dir.update({ dt: 2.0, elapsed: 35, engine: h.engine, world: makeWorld({ swarmActive: true }) });
    h.dir.update({ dt: 0.5, elapsed: 37.5, engine: h.engine, world: makeWorld() });
    h.engine.startNewGame();
    expect(h.engine.debutAt(38)).toBeNull();
  });

  it('cửa sổ trùng: activeAt = lần thấy SỚM NHẤT (speedy 37.5 thắng zigzag 38.5)', () => {
    const h = makeHarness([0.9], [0.01, 0.31]);
    h.engine.score = 9 * 22; // level 10 — zigzag khả dụng
    h.dir.update({ dt: 0.01, elapsed: 30, engine: h.engine, world: makeWorld() });
    h.dir.update({ dt: 2.0, elapsed: 35, engine: h.engine, world: makeWorld({ swarmActive: true }) });
    h.dir.update({ dt: 0.5, elapsed: 37.5, engine: h.engine, world: makeWorld() }); // speedy debut 37.5
    h.dir.resetSpawnTimer();
    h.dir.update({ dt: 1.0, elapsed: 38.5, engine: h.engine, world: makeWorld() }); // zigzag debut 38.5
    expect(h.engine.debutAt(38.6)?.type).toBe('speedy');
    expect(h.engine.debutAt(41)).toBeNull();
  });

  it('warmup: chỉ normal → không debut nào', () => {
    const h = makeHarness([0.9], [0.01]);
    for (let t = 0; t < 28; t += 1.4) {
      h.dir.update({ dt: 1.4, elapsed: t, engine: h.engine, world: makeWorld() });
    }
    expect(h.engine.debutAt(20)).toBeNull();
  });
});

describe('P1a — cụm thưa: DOWNGRADE cùng loại trong cửa sổ (KHÔNG refusal — KT#74(b))', () => {
  it('speedy debut 37.5 → spawn speedy thứ 2 trong cửa sổ bị HẠ về normal, vẫn đúng 1 con/frame', () => {
    const h = makeHarness([0.9], [0.01, 0.01]);
    h.dir.update({ dt: 0.01, elapsed: 30, engine: h.engine, world: makeWorld() });
    h.dir.update({ dt: 2.0, elapsed: 35, engine: h.engine, world: makeWorld({ swarmActive: true }) });
    const first = h.dir.update({ dt: 0.5, elapsed: 37.5, engine: h.engine, world: makeWorld() });
    expect(first.spawned[0]?.type).toBe('speedy');
    h.dir.resetSpawnTimer();
    const second = h.dir.update({ dt: 1.0, elapsed: 38.5, engine: h.engine, world: makeWorld() });
    expect(second.spawned).toHaveLength(1); // vẫn spawn — không refusal
    expect(second.spawned[0]?.type).toBe('normal'); // hạ loại
    expect(second.spawned[0]?.speedMult).toBe(MECHANICS.normalMult);
  });

  it('hết cửa sổ (39.6 > 37.5+2.0) → speedy trở lại bình thường', () => {
    const h = makeHarness([0.9], [0.01]);
    h.dir.update({ dt: 0.01, elapsed: 30, engine: h.engine, world: makeWorld() });
    h.dir.update({ dt: 2.0, elapsed: 35, engine: h.engine, world: makeWorld({ swarmActive: true }) });
    h.dir.update({ dt: 0.5, elapsed: 37.5, engine: h.engine, world: makeWorld() });
    h.dir.resetSpawnTimer();
    const r = h.dir.update({ dt: 2.5, elapsed: 40.5, engine: h.engine, world: makeWorld() });
    expect(h.engine.debutAt(40.5)).toBeNull();
    expect(r.spawned[0]?.type).toBe('speedy');
  });

  it('debut speedy không chặn loại KHÁC: zigzag spawn trong cửa sổ speedy giữ nguyên zigzag', () => {
    const h = makeHarness([0.9], [0.01, 0.31]);
    h.engine.score = 9 * 22; // level 10
    h.dir.update({ dt: 0.01, elapsed: 30, engine: h.engine, world: makeWorld() });
    h.dir.update({ dt: 2.0, elapsed: 35, engine: h.engine, world: makeWorld({ swarmActive: true }) });
    h.dir.update({ dt: 0.5, elapsed: 37.5, engine: h.engine, world: makeWorld() }); // speedy debut
    h.dir.resetSpawnTimer();
    const r = h.dir.update({ dt: 1.0, elapsed: 38.5, engine: h.engine, world: makeWorld() });
    expect(r.spawned[0]?.type).toBe('zigzag'); // loại khác không bị hạ
  });

  it('refusal vẫn giữ nguyên: lastSpawn KHÔNG reset khi bị chặn (mirror NGUYÊN TẮC VÀNG)', () => {
    const h = makeHarness([0.9], [0.01]);
    h.dir.update({ dt: 0.01, elapsed: 30, engine: h.engine, world: makeWorld() });
    h.dir.update({ dt: 2.0, elapsed: 35, engine: h.engine, world: makeWorld({ swarmActive: true }) });
    h.dir.update({ dt: 0.5, elapsed: 37.5, engine: h.engine, world: makeWorld() });
    const r = h.dir.update({ dt: 1.0, elapsed: 38.5, engine: h.engine, world: makeWorld({ occupiedLanes: [0, 1] }) });
    expect(r.spawned).toHaveLength(0);
    expect(r.lastSpawnReset).toBe(false);
  });
});

describe('P1a — swarm debut: swarmTriggered đầu phiên xuất typed window (non-breaking)', () => {
  it('swarm đầu (elapsed 30) → result.swarmDebut {type: swarm, firstSeenAt: 30} + engine ghi nhận', () => {
    const h = makeHarness([0.99], [0.99]);
    h.dir.update({ dt: 2.0, elapsed: 5, engine: h.engine, world: makeWorld() }); // normal, không debut
    const r = h.dir.update({ dt: 0.01, elapsed: 30, engine: h.engine, world: makeWorld() });
    expect(r.swarmTriggered).toBe(true);
    expect(r.swarmDebut).not.toBeNull();
    expect(r.swarmDebut?.type).toBe('swarm');
    expect(r.swarmDebut?.firstSeenAt).toBe(30);
    expect(r.swarmDebut?.until).toBeCloseTo(30 + MECHANICS.debutSparseSec, 5);
    expect(h.engine.debutAt(31)?.type).toBe('swarm');
    // tầng B đọc window qua director (contract P1b — SpawnDirectorResult là mặt hàng chính)
    expect(h.dir.debutAt(31)?.type).toBe('swarm');
  });

  it('swarm lần 2 (elapsed 52) → swarmTriggered true nhưng swarmDebut null (debut chỉ 1 lần/phiên)', () => {
    const h = makeHarness([0.99], [0.99]);
    h.dir.update({ dt: 0.01, elapsed: 30, engine: h.engine, world: makeWorld() });
    const r2 = h.dir.update({ dt: 0.01, elapsed: 52, engine: h.engine, world: makeWorld() });
    expect(r2.swarmTriggered).toBe(true);
    expect(r2.swarmDebut).toBeNull();
    expect(h.engine.debutAt(52)).toBeNull();
  });
});
