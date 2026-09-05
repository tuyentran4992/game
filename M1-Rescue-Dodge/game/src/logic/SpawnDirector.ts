// SpawnDirector — TẦNG A (pure TS, 0 import Phaser/DOM) — CONTRACT K0 §6.
// Quyết định KHI NÀO + LOẠI GÌ + LÀN NÀO spawn ong, tách khỏi scenes/Gameplay.ts.
// MIRROR y hành vi hiện tại (Gameplay.ts @ d0011c1 — regression 0):
//   - cadence L1070-1078: lastSpawn tích luỹ cả khi swarm/fatbee; refusal KHÔNG reset.
//   - refusals spawnBee L1503-1554: fat bee chặn, occupied>=2, hết làn an toàn (NGUYÊN TẮC VÀNG).
//   - swarm L1064-1066 + reset phiên L441 (lastSwarmTime = elapsed + 8 → swarm đầu ~30s).
//   - double spawn L1556-1576 (level>=5, occupied rỗng, 25%).
// Loại ong + mật độ KHÔNG tự quyết — đọc qua public interface CONTRACT §2:
//   engine.rollBeeType() (D-A2: warmup normal-only) + engine.difficulty(): DifficultyResult.
// Scene (tầng B) giữ địa lý thật: occupied/safe lane, willBlockAllLanes, pool, tween.
//
// [MIRROR→CONFIG] UPG2-N1 (t_79d2b77d): 4 hằng cadence 1.35/0.38/0.0035/0.10 và
// speedMult 1.18/1.0 đã về MechanicsConfig (spawnIntervalBase/Floor/SpeedFactor/
// LevelFactor + speedyMult/normalMult) — SpawnDirector đọc cfg, không giữ literal.

import type { GameEngine } from './GameEngine';
import type { BeeType, MechanicsConfig } from './types';

/** Cửa sổ "quãng thưa" sau lần ra mắt đầu tiên của 1 loại ong (hook P1a debut-beat). [PLACEHOLDER] */
export const DEBUT_SPARSE_SEC = 2.0;

/** Snapshot thế giới do scene cung cấp mỗi frame — pure data, không tham chiếu Phaser. */
export interface SpawnWorldSnapshot {
  swarmActive: boolean;
  fatBeeActive: boolean;
  /** Có ong 'fat' trên màn (mirror: bees.some(b => b.type === 'fat')). */
  fatOnScreen: boolean;
  /** Kết quả getOccupiedLanesAtTop(200) của scene. */
  occupiedLanes: number[];
  /** Làn qua willBlockAllLanes (NGUYÊN TẮC VÀNG — giữ đường sống). Rỗng = hủy spawn. */
  safeLanes: number[];
  /** Làn qua willBlockAllLanes chấm speedMult 1.18 cho ứng viên speedy (mirror OLD spawnBee
   * L1522-1523: roll type XONG mới lọc validLanes theo 1.18). Rỗng = hủy spawn speedy. */
  safeLanesFast: number[];
  /** bees.length sau pruneBees(). */
  beeCount: number;
}

export interface SpawnDecision {
  type: BeeType;
  lane: number;
  speedMult: number;
}

export interface SpawnDirectorResult {
  /** Interval frame này — công thức cadence đọc từ MechanicsConfig (UPG2-N1):
   *  max(spawnIntervalFloor, spawnIntervalBase - (speed-startSpeed)*spawnSpeedFactor - (level-1)*spawnLevelFactor). */
  spawnInterval: number;
  spawned: SpawnDecision[];
  /** Con thứ 2 (delay 280ms do scene xử lý): mirror remainingLanes[0]. */
  doubleSpawn: { lane: number } | null;
  /** true chỉ khi spawn thành công (mirror: refusal giữ threshold → frame sau thử lại). */
  lastSpawnReset: boolean;
  /** Scene phải bật swarmActive + hiển thị cảnh báo ngay frame này. */
  swarmTriggered: boolean;
}

export interface SpawnDirectorOptions {
  /** D-A2: rng injectable — cấm Math.random thô trong logic mới. */
  rng?: () => number;
}

export class SpawnDirector {
  private cfg: MechanicsConfig;
  private readonly rngFn: () => number;
  private lastSpawn = 0;
  private lastSwarmTime = 0;
  private firstSeen = new Map<BeeType, number>();

  constructor(cfg: MechanicsConfig, opts: SpawnDirectorOptions = {}) {
    this.cfg = cfg;
    this.rngFn = opts.rng ?? Math.random;
  }

  /** Đầu phiên (mirror L439-441): swarm đầu tại elapsed + 8 + swarmIntervalSec (~30s). */
  startSession(elapsed: number): void {
    this.lastSpawn = 0;
    this.lastSwarmTime = elapsed + 8;
    this.firstSeen.clear();
  }

  /** Mirror L1941: fat bee breather bung lastSpawn về 0. */
  resetSpawnTimer(): void {
    this.lastSpawn = 0;
  }

  update(input: { dt: number; elapsed: number; engine: GameEngine; world: SpawnWorldSnapshot }): SpawnDirectorResult {
    const { dt, elapsed, engine, world } = input;
    const level = engine.getLevel();
    const diff = engine.difficulty(elapsed, level);
    const spawnInterval = Math.max(
      this.cfg.spawnIntervalFloor,
      this.cfg.spawnIntervalBase
        - (diff.speed - this.cfg.startSpeed) * this.cfg.spawnSpeedFactor
        - (level - 1) * this.cfg.spawnLevelFactor,
    );

    const result: SpawnDirectorResult = {
      spawnInterval,
      spawned: [],
      doubleSpawn: null,
      lastSpawnReset: false,
      swarmTriggered: false,
    };

    // Cadence tick CHẠY LUÔN (mirror L1072) — kể cả khi swarm/fatbee đang khoá spawn.
    this.lastSpawn += dt;

    // Swarm cadence (mirror L1064-1066): gate !swarmActive && !fatBeeActive, interval theo config.
    if (!world.swarmActive && !world.fatBeeActive && elapsed - this.lastSwarmTime >= this.cfg.swarmIntervalSec) {
      this.lastSwarmTime = elapsed;
      result.swarmTriggered = true;
    }
    const swarmActiveNow = world.swarmActive || result.swarmTriggered;

    // Gate spawn thường (mirror L1073: !swarm && !fatbee && lastSpawn>=interval && cap).
    if (swarmActiveNow || world.fatBeeActive || this.lastSpawn < spawnInterval) {
      return result;
    }
    if (world.beeCount >= diff.spawnCount + 2) {
      return result; // refusal mật độ — KHÔNG reset lastSpawn
    }

    const decided = this.decideSpawn(elapsed, engine, level, world);
    if (!decided) return result;

    result.spawned.push(decisionToSpawn({ ...decided, mult: this.cfg }));
    this.lastSpawn = 0;
    result.lastSpawnReset = true;

    // Double spawn (mirror L1556-1561): level>=5, occupied rỗng, còn >=2 làn valid sau trừ, 25%.
    const remaining = decided.validLanes.filter((l) => l !== decided.lane);
    if (level >= 5 && decided.occupiedSize === 0 && remaining.length >= 2 && this.rngFn() < 0.25) {
      result.doubleSpawn = { lane: remaining[0] };
    }

    // Hook debut-beat (P1a): ghi lần đầu xuất hiện của loại ong mới (bỏ normal).
    if (decided.type !== 'normal' && !this.firstSeen.has(decided.type)) {
      this.firstSeen.set(decided.type, elapsed);
    }

    return result;
  }

  /** Cửa sổ debut đang mở tại elapsed (cửa sớm nhất nếu trùng) — P1a dùng để telegraph + thưa. */
  debutAt(elapsed: number): { type: BeeType; firstSeenAt: number; until: number } | null {
    let best: { type: BeeType; firstSeenAt: number; until: number } | null = null;
    for (const [type, seen] of this.firstSeen) {
      const until = seen + DEBUT_SPARSE_SEC;
      if (elapsed >= seen && elapsed < until && (!best || seen < best.firstSeenAt)) {
        best = { type, firstSeenAt: seen, until };
      }
    }
    return best;
  }

  /**
   * Con thứ 2 của double spawn (mirror L1570-1573): scene gọi TRỄ 280ms.
   * Guard 'fat' giữ nguyên dù rollBeeType không trả fat (mirror defensive code).
   */
  rollSecondBeeType(elapsedSec: number, engine: GameEngine, level = engine.getLevel()): BeeType | null {
    const t = engine.rollBeeType(elapsedSec, level);
    if (t === 'fat') return null;
    return t === 'zigzag' ? 'normal' : t;
  }

  private decideSpawn(
    elapsed: number,
    engine: GameEngine,
    level: number,
    world: SpawnWorldSnapshot,
  ): { type: BeeType; lane: number; occupiedSize: number; validLanes: number[]; mult: MechanicsConfig } | null {
    // (1) mirror L1507: fat bee đang diễn ra → không spawn gì thêm.
    if (world.fatBeeActive || world.fatOnScreen) return null;
    // (2) mirror L1511: >=2 làn bị chiếm đầu màn → từ chối.
    const occupiedSize = world.occupiedLanes.length;
    if (occupiedSize >= 2) return null;
    // (3) mirror L1516: loại ong do engine quyết (warmup normal-only, D-A2).
    const type = engine.rollBeeType(elapsed, level);
    // (4) mirror L1520-1523: roll type XONG mới chấm làn THEO speedMult của type —
    // speedy 1.18 (safeLanesFast), còn lại 1.0 (safeLanes). Geography do scene chấm,
    // director chỉ pick bằng rng. NGUYÊN TẮC VÀNG L1531: list rỗng → hủy spawn giữ đường sống
    // (refusal KHÔNG reset lastSpawn — mirror OLD return false).
    const validLanes = type === 'speedy' ? world.safeLanesFast : world.safeLanes;
    if (validLanes.length === 0) return null; // NGUYÊN TẮC VÀNG L1531: hủy spawn giữ đường sống
    const lane = validLanes[Math.floor(this.rngFn() * validLanes.length)];
    return { type, lane, occupiedSize, validLanes, mult: this.cfg };
  }
}

function decisionToSpawn(d: { type: BeeType; lane: number; mult: MechanicsConfig }): SpawnDecision {
  // mirror L1546: speedy bay nhanh theo BEES.speedyMult (UPG2-N1: đọc MechanicsConfig),
  // còn lại normalMult. Default giữ nguyên 1.18/1.0 — không đổi cảm giác.
  return { type: d.type, lane: d.lane, speedMult: d.type === 'speedy' ? d.mult.speedyMult : d.mult.normalMult };
}
