// SpawnDirector — tầng A (pure TS, 0 Phaser/DOM).
// Tách cadence/refusal/lane-pick spawn ong ra khỏi scenes/Gameplay.ts, MIRROR y
// hành vi hiện tại (Gameplay.ts @ d0011c1). Rng injectable bắt buộc — cấm Math.random thô.

import { describe, it, expect, beforeEach } from 'vitest';
import { SpawnDirector } from '../SpawnDirector';
import { GameEngine } from '../GameEngine';
import { MECHANICS } from '../mechanics';
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

describe('SpawnDirector — cadence spawn (mirror Gameplay.ts update L1070-1078)', () => {
  let h: ReturnType<typeof makeHarness>;
  beforeEach(() => { h = makeHarness(); });

  it('chưa đủ interval thì không spawn, lastSpawnReset=false', () => {
    const r = h.dir.update({ dt: 0.7, elapsed: 5, engine: h.engine, world: makeWorld() });
    expect(r.spawned).toHaveLength(0);
    expect(r.lastSpawnReset).toBe(false);
    expect(r.spawnInterval).toBeCloseTo(1.35, 5); // warmup: speed=startSpeed, level 1
  });

  it('đủ interval (0.7+0.7 >= 1.35) thì spawn 1 con, lastSpawnReset=true', () => {
    h.dir.update({ dt: 0.7, elapsed: 5, engine: h.engine, world: makeWorld() });
    const r2 = h.dir.update({ dt: 0.7, elapsed: 5.7, engine: h.engine, world: makeWorld() });
    expect(r2.spawned).toHaveLength(1);
    expect(r2.lastSpawnReset).toBe(true);
  });

  it('spawn thành công reset lastSpawn → frame sau không spawn tiếp', () => {
    h.dir.update({ dt: 1.4, elapsed: 5, engine: h.engine, world: makeWorld() });
    const r2 = h.dir.update({ dt: 0.2, elapsed: 6.4, engine: h.engine, world: makeWorld() });
    expect(r2.spawned).toHaveLength(0);
  });

  it('interval co theo DifficultyResult.speed + level (công thức max(0.38, 1.35 - (speed-start)*0.0035 - (level-1)*0.10))', () => {
    h.engine.score = 44; // level 3
    // elapsed 60: ramp = 1.2*(60-30)=36, levelBonus=10*2 → speed=216
    const r = h.dir.update({ dt: 0.01, elapsed: 60, engine: h.engine, world: makeWorld() });
    const expected = Math.max(0.38, 1.35 - (216 - 160) * 0.0035 - 2 * 0.10);
    expect(r.spawnInterval).toBeCloseTo(expected, 5);
    expect(expected).toBeCloseTo(0.954, 3);
  });

  it('refusal KHÔNG reset lastSpawn (mirror: chỉ reset khi spawn thành công)', () => {
    // bé 3 = spawnCount(warmup=1)+2 → refusal density
    const r = h.dir.update({ dt: 2.0, elapsed: 5, engine: h.engine, world: makeWorld({ beeCount: 3 }) });
    expect(r.spawned).toHaveLength(0);
    expect(r.lastSpawnReset).toBe(false);
    // frame sau lastSpawn vẫn >= interval → spawn ngay với dt nhỏ
    const r2 = h.dir.update({ dt: 0.01, elapsed: 7, engine: h.engine, world: makeWorld() });
    expect(r2.spawned).toHaveLength(1);
  });
});

describe('SpawnDirector — mật độ theo DifficultyResult.spawnCount', () => {
  it('warmup: spawnCount=1 → chặn khi beeCount >= 3, cho khi beeCount=2', () => {
    const h = makeHarness();
    const blocked = h.dir.update({ dt: 2.0, elapsed: 5, engine: h.engine, world: makeWorld({ beeCount: 3 }) });
    expect(blocked.spawned).toHaveLength(0);
    const ok = h.dir.update({ dt: 2.0, elapsed: 5, engine: h.engine, world: makeWorld({ beeCount: 2 }) });
    expect(ok.spawned).toHaveLength(1);
  });

  it('elapsed 60 level 3: spawnCount=4 → cap 6', () => {
    const h = makeHarness();
    h.engine.score = 44;
    const blocked = h.dir.update({ dt: 2.0, elapsed: 60, engine: h.engine, world: makeWorld({ beeCount: 6 }) });
    expect(blocked.spawned).toHaveLength(0);
    const ok = h.dir.update({ dt: 2.0, elapsed: 60, engine: h.engine, world: makeWorld({ beeCount: 5 }) });
    expect(ok.spawned).toHaveLength(1);
  });
});

describe('SpawnDirector — warmup + loại ong qua engine.rollBeeType (D-A2)', () => {
  it('warmup (<30s): mọi spawn là normal dù engine rng sẵn sàng ra speedy', () => {
    const h = makeHarness([0.9], [0.01]); // engine rng 0.01 sẽ ra speedy sau warmup
    for (let t = 0; t < 25; t += 1.4) {
      const r = h.dir.update({ dt: 1.4, elapsed: t, engine: h.engine, world: makeWorld() });
      for (const s of r.spawned) expect(s.type).toBe('normal');
    }
  });

  it('hết warmup: engine rng 0.01 → speedy (speedMult 1.18)', () => {
    const h = makeHarness([0.9], [0.01]);
    // Mirror runtime: swarm đầu bắn tại ~30s (startSession +8, interval 22) → swarmActive khoá spawn 4.5s.
    h.dir.update({ dt: 0.01, elapsed: 30, engine: h.engine, world: makeWorld() });
    h.dir.update({ dt: 2.0, elapsed: 35, engine: h.engine, world: makeWorld({ swarmActive: true }) });
    const r = h.dir.update({ dt: 0.5, elapsed: 37.5, engine: h.engine, world: makeWorld() });
    expect(r.swarmTriggered).toBe(false);
    expect(r.spawned[0]?.type).toBe('speedy');
    expect(r.spawned[0]?.speedMult).toBe(1.18);
  });

  it('level >= 10: rng 0.31 → zigzag (speedMult 1.0); rng 0.55 → normal', () => {
    const h1 = makeHarness([0.9], [0.31]);
    h1.engine.score = 9 * 22; // level 10
    h1.dir.update({ dt: 0.01, elapsed: 30, engine: h1.engine, world: makeWorld() });
    h1.dir.update({ dt: 2.0, elapsed: 35, engine: h1.engine, world: makeWorld({ swarmActive: true }) });
    const r1 = h1.dir.update({ dt: 0.5, elapsed: 37.5, engine: h1.engine, world: makeWorld() });
    expect(r1.spawned[0]?.type).toBe('zigzag');
    expect(r1.spawned[0]?.speedMult).toBe(1.0);

    const h2 = makeHarness([0.9], [0.55]);
    h2.engine.score = 9 * 22;
    h2.dir.update({ dt: 0.01, elapsed: 30, engine: h2.engine, world: makeWorld() });
    h2.dir.update({ dt: 2.0, elapsed: 35, engine: h2.engine, world: makeWorld({ swarmActive: true }) });
    const r2 = h2.dir.update({ dt: 0.5, elapsed: 37.5, engine: h2.engine, world: makeWorld() });
    expect(r2.spawned[0]?.type).toBe('normal');
  });
});

describe('SpawnDirector — refusal theo thứ tự mirror spawnBee', () => {
  it('fatBeeActive hoặc có ong fat trên màn → không spawn', () => {
    const h = makeHarness();
    const r1 = h.dir.update({ dt: 2.0, elapsed: 5, engine: h.engine, world: makeWorld({ fatBeeActive: true }) });
    expect(r1.spawned).toHaveLength(0);
    const r2 = h.dir.update({ dt: 2.0, elapsed: 5, engine: h.engine, world: makeWorld({ fatOnScreen: true }) });
    expect(r2.spawned).toHaveLength(0);
  });

  it('occupied >= 2 làn (top 200px) → không spawn', () => {
    const h = makeHarness();
    const r = h.dir.update({ dt: 2.0, elapsed: 5, engine: h.engine, world: makeWorld({ occupiedLanes: [0, 1] }) });
    expect(r.spawned).toHaveLength(0);
  });

  it('hết làn free hoặc không còn làn an toàn (NGUYÊN TẮC VÀNG) → không spawn', () => {
    const h = makeHarness();
    const r1 = h.dir.update({ dt: 2.0, elapsed: 5, engine: h.engine, world: makeWorld({ occupiedLanes: [0, 1, 2] }) });
    expect(r1.spawned).toHaveLength(0);
    // Scene chấm hết làn an toàn (validLanes rỗng sau willBlockAllLanes) → NGUYÊN TẮC VÀNG: hủy spawn
    const r2 = h.dir.update({ dt: 2.0, elapsed: 5, engine: h.engine, world: makeWorld({ occupiedLanes: [0], safeLanes: [] }) });
    expect(r2.spawned).toHaveLength(0);
  });

  it('swarmActive đang chạy → không spawn thường; swarm vừa tắt → spawn ngay (lastSpawn tích luỹ)', () => {
    const h = makeHarness();
    const r = h.dir.update({ dt: 2.0, elapsed: 5, engine: h.engine, world: makeWorld({ swarmActive: true }) });
    expect(r.spawned).toHaveLength(0);
    const r2 = h.dir.update({ dt: 0.01, elapsed: 7, engine: h.engine, world: makeWorld() });
    expect(r2.spawned).toHaveLength(1);
  });
});

describe('SpawnDirector — lane pick qua rng injectable', () => {
  it('rng 0.9 → floor(0.9*3)=2; rng 0.2 → lane 0', () => {
    const h1 = makeHarness([0.9]);
    const r1 = h1.dir.update({ dt: 2.0, elapsed: 5, engine: h1.engine, world: makeWorld() });
    expect(r1.spawned[0]?.lane).toBe(2);

    const h2 = makeHarness([0.2]);
    const r2 = h2.dir.update({ dt: 2.0, elapsed: 5, engine: h2.engine, world: makeWorld() });
    expect(r2.spawned[0]?.lane).toBe(0);
  });

  it('lane pick tôn trọng safeLanes (geography scene chấm)', () => {
    const h = makeHarness([0.9]); // floor(0.9*2)=1 trong dãy valid
    const r = h.dir.update({ dt: 2.0, elapsed: 5, engine: h.engine, world: makeWorld({ safeLanes: [1, 2] }) });
    expect(r.spawned[0]?.lane).toBe(2);
  });
});

describe('SpawnDirector — cadence swarm 22s theo config (mirror L441/L1064)', () => {
  it('startSession(0): swarm đầu tại elapsed 30 (8s delay + 22s interval)', () => {
    const h = makeHarness();
    expect(h.dir.update({ dt: 0.01, elapsed: 29, engine: h.engine, world: makeWorld() }).swarmTriggered).toBe(false);
    expect(h.dir.update({ dt: 0.01, elapsed: 29.9, engine: h.engine, world: makeWorld() }).swarmTriggered).toBe(false);
    expect(h.dir.update({ dt: 0.01, elapsed: 30, engine: h.engine, world: makeWorld() }).swarmTriggered).toBe(true);
    // lastSwarmTime = 30 → lần sau tại 52
    expect(h.dir.update({ dt: 0.01, elapsed: 51.9, engine: h.engine, world: makeWorld() }).swarmTriggered).toBe(false);
    expect(h.dir.update({ dt: 0.01, elapsed: 52, engine: h.engine, world: makeWorld() }).swarmTriggered).toBe(true);
  });

  it('interval lấy từ MechanicsConfig (swarmIntervalSec=5 → trigger tại 13)', () => {
    const h = makeHarness([0.99], [0.99], { swarmIntervalSec: 5 });
    expect(h.dir.update({ dt: 0.01, elapsed: 12.9, engine: h.engine, world: makeWorld() }).swarmTriggered).toBe(false);
    expect(h.dir.update({ dt: 0.01, elapsed: 13, engine: h.engine, world: makeWorld() }).swarmTriggered).toBe(true);
  });

  it('không trigger khi swarmActive hoặc fatBeeActive (mirror gate L1064)', () => {
    const h = makeHarness();
    expect(h.dir.update({ dt: 0.01, elapsed: 30, engine: h.engine, world: makeWorld({ swarmActive: true }) }).swarmTriggered).toBe(false);
    expect(h.dir.update({ dt: 0.01, elapsed: 30, engine: h.engine, world: makeWorld({ fatBeeActive: true }) }).swarmTriggered).toBe(false);
  });

  it('frame trigger swarm → chặn luôn spawn thường (mirror: swarmActive=true đồng bộ)', () => {
    const h = makeHarness();
    const r = h.dir.update({ dt: 2.0, elapsed: 31, engine: h.engine, world: makeWorld() });
    expect(r.swarmTriggered).toBe(true);
    expect(r.spawned).toHaveLength(0);
    expect(r.lastSpawnReset).toBe(false);
  });

  it('không gọi startSession → swarm theo default lastSwarmTime=0 (tại 22s)', () => {
    const mechanics: MechanicsConfig = { ...MECHANICS };
    const engine = new GameEngine(mechanics, { rng: makeRng([0.99]) });
    engine.startNewGame();
    const dir = new SpawnDirector(mechanics, { rng: makeRng([0.99]) });
    expect(dir.update({ dt: 0.01, elapsed: 21.9, engine, world: makeWorld() }).swarmTriggered).toBe(false);
    expect(dir.update({ dt: 0.01, elapsed: 22, engine, world: makeWorld() }).swarmTriggered).toBe(true);
  });
});

describe('SpawnDirector — double spawn level>=5 (mirror L1556-1576)', () => {
  it('level 5, occupied rỗng, rng 0.1 < 0.25 → doubleSpawn lane=remaining[0]', () => {
    const h = makeHarness([0.1, 0.1]); // rng1: lane floor(0.1*3)=0; rng2: 0.1 < 0.25
    h.engine.score = 4 * 22; // level 5
    // burn swarm đầu (bắn tại 30s) + đợi hết 4.5s swarmActive
    h.dir.update({ dt: 0.01, elapsed: 30, engine: h.engine, world: makeWorld() });
    h.dir.update({ dt: 2.0, elapsed: 35, engine: h.engine, world: makeWorld({ swarmActive: true }) });
    const r = h.dir.update({ dt: 0.5, elapsed: 37.5, engine: h.engine, world: makeWorld() });
    expect(r.spawned[0]?.lane).toBe(0);
    expect(r.doubleSpawn).toEqual({ lane: 1 });
  });

  it('rng 0.9 >= 0.25 → không double', () => {
    const h = makeHarness([0.9, 0.9]);
    h.engine.score = 4 * 22;
    h.dir.update({ dt: 0.01, elapsed: 30, engine: h.engine, world: makeWorld() });
    h.dir.update({ dt: 2.0, elapsed: 35, engine: h.engine, world: makeWorld({ swarmActive: true }) });
    const r = h.dir.update({ dt: 0.5, elapsed: 37.5, engine: h.engine, world: makeWorld() });
    expect(r.doubleSpawn).toBeNull();
  });

  it('level 4 → không double dù rng thấp', () => {
    const h = makeHarness([0.1, 0.1]);
    h.engine.score = 3 * 22; // level 4
    h.dir.update({ dt: 0.01, elapsed: 30, engine: h.engine, world: makeWorld() });
    h.dir.update({ dt: 2.0, elapsed: 35, engine: h.engine, world: makeWorld({ swarmActive: true }) });
    const r = h.dir.update({ dt: 0.5, elapsed: 37.5, engine: h.engine, world: makeWorld() });
    expect(r.doubleSpawn).toBeNull();
  });

  it('rollSecondBeeType: zigzag → normal, speedy → speedy, fat → null (mirror guard L1570)', () => {
    const h = makeHarness([], [0.31]); // level>=10: 0.31 → zigzag
    h.engine.score = 9 * 22;
    expect(h.dir.rollSecondBeeType(35.3, h.engine)).toBe('normal');

    const h2 = makeHarness([], [0.01]);
    h2.engine.score = 9 * 22;
    expect(h2.dir.rollSecondBeeType(35.3, h2.engine)).toBe('speedy');
  });
});

describe('SpawnDirector — resetSpawnTimer (mirror L1941 fat bee breather)', () => {
  it('reset xong thì cadence phải tích lại từ 0', () => {
    const h = makeHarness();
    h.dir.update({ dt: 1.0, elapsed: 5, engine: h.engine, world: makeWorld() }); // lastSpawn=1.0
    h.dir.resetSpawnTimer();
    const r = h.dir.update({ dt: 0.2, elapsed: 5.2, engine: h.engine, world: makeWorld() });
    expect(r.spawned).toHaveLength(0); // không reset thì 1.2 >= 1.35? chưa — dùng 1.4 cho chắc
  });

  it('không reset → lastSpawn tích luỹ vượt interval', () => {
    const h = makeHarness();
    h.dir.update({ dt: 1.0, elapsed: 5, engine: h.engine, world: makeWorld() });
    h.dir.resetSpawnTimer();
    h.dir.update({ dt: 1.0, elapsed: 5.2, engine: h.engine, world: makeWorld() });
    const r = h.dir.update({ dt: 0.5, elapsed: 6.2, engine: h.engine, world: makeWorld() });
    expect(r.spawned).toHaveLength(1); // 1.5 >= 1.35
  });
});

describe('SpawnDirector — hook debut-beat (P1a sẽ dùng)', () => {
  it('lần đầu thấy speedy sau warmup → debut active trong DEBUT_SPARSE_SEC', () => {
    const h = makeHarness([0.9], [0.01]);
    h.dir.update({ dt: 0.01, elapsed: 30, engine: h.engine, world: makeWorld() });
    h.dir.update({ dt: 2.0, elapsed: 35, engine: h.engine, world: makeWorld({ swarmActive: true }) });
    const r = h.dir.update({ dt: 0.5, elapsed: 37.5, engine: h.engine, world: makeWorld() });
    expect(r.spawned[0]?.type).toBe('speedy');
    const d = h.dir.debutAt(38);
    expect(d?.type).toBe('speedy');
    expect(d?.firstSeenAt).toBe(37.5);
    expect(d?.until).toBe(37.5 + 2.0);
  });

  it('hết cửa sổ → null; normal không tạo debut', () => {
    const h = makeHarness([0.9], [0.01]);
    h.dir.update({ dt: 0.01, elapsed: 30, engine: h.engine, world: makeWorld() });
    h.dir.update({ dt: 2.0, elapsed: 35, engine: h.engine, world: makeWorld({ swarmActive: true }) });
    h.dir.update({ dt: 0.5, elapsed: 37.5, engine: h.engine, world: makeWorld() });
    expect(h.dir.debutAt(39.6)).toBeNull();

    const h2 = makeHarness([0.9], [0.99]); // rng 0.99 → normal
    h2.dir.update({ dt: 0.01, elapsed: 30, engine: h2.engine, world: makeWorld() });
    h2.dir.update({ dt: 2.0, elapsed: 35, engine: h2.engine, world: makeWorld({ swarmActive: true }) });
    h2.dir.update({ dt: 0.5, elapsed: 37.5, engine: h2.engine, world: makeWorld() });
    expect(h2.dir.debutAt(38)).toBeNull();
  });

  it('firstSeen không đè khi cùng type lặp lại trong cửa sổ', () => {
    const h = makeHarness([0.9], [0.01, 0.01]);
    h.dir.update({ dt: 0.01, elapsed: 30, engine: h.engine, world: makeWorld() });
    h.dir.update({ dt: 2.0, elapsed: 35, engine: h.engine, world: makeWorld({ swarmActive: true }) });
    h.dir.update({ dt: 0.5, elapsed: 37.5, engine: h.engine, world: makeWorld() });
    h.dir.resetSpawnTimer();
    h.dir.update({ dt: 1.0, elapsed: 38.5, engine: h.engine, world: makeWorld() });
    expect(h.dir.debutAt(38.6)?.firstSeenAt).toBe(37.5);
  });
});
