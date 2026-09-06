/**
 * M7 Skip King — PhysicsEngine 2.5D (Tầng A pure TS — CONTRACT mục 1).
 * Mô hình 2.5D {x,z,y}: đá bay trên mặt phẳng nước (x,z) tới FIELD_Z_MAX (horizon),
 * y = độ cao; skip khi chạm nước (y<=0) nếu tốc độ chạm + nhiễu rng ≥ ngưỡng và góc
 * lệch trong giới hạn (đọc MechanicsConfig qua mechanics.ts — 0 magic number).
 * Deterministic: rng inject 100% (0 Math.random / 0 Date / 0 import Phaser).
 */
import type { EngineEvent, FlickInput, Stone } from './types';
import type { MechanicsConfig } from '../config/mechanics';
import { throwVector, judgePerfect } from './mechanics';
import { mulberry32 } from './rng';
import type { Rng } from './rng';

/** Loại kết thúc run — public cho detailed sim (flickProvider/demo chọn beat). */
export type TerminalReason = 'splash' | 'horizon' | 'timeout';

export interface SimResult {
  /** điểm run (cú PERFECT ×2 — CONTRACT §2; set qua markPerfect khi judge trúng window). */
  score: number;
  bounces: number;
  best: number;
}

export interface SimDetail {
  result: SimResult;
  events: EngineEvent[];
  /** Thời điểm nảy đầu tiên (s) — beat B1 "plop đầu ≤3s". null nếu không nảy. */
  firstBounceTime: number | null;
  /** z của lần nảy sâu nhất (m) — chẩn đoán độ bay. */
  lastBounceZ: number | null;
  /** z xa nhất đạt được (m). */
  maxZ: number;
  /** Cú thả có rơi vào window PERFECT (theo PerfectWindow của config) không. */
  judgedPerfect: boolean;
  /** Số nảy trong run (cú PERFECT hợp lệ chốt theo số này). */
  bounces: number;
  terminal: TerminalReason;
}

/** Trần an toàn chống loop — 30s sim (120Hz × 3600 step). */
const TIME_LIMIT_S = 30;

interface BounceInfo {
  t: number;
  z: number;
}

export class PhysicsEngine {
  readonly config: MechanicsConfig;
  private rng: Rng;
  private stoneState: Stone | null = null;
  private evQueue: EngineEvent[] = [];
  private bounceLogData: BounceInfo[] = [];
  private maxZVal = 0;
  private perfectFlag = false;
  private done = false;
  private reason: TerminalReason = 'timeout';
  private elapsed = 0;
  private launchSpeedVal = 0;

  constructor(config: MechanicsConfig, rng: Rng) {
    this.config = config;
    this.rng = rng;
  }

  /** Nạp viên đá mới (z có thể ngoài field — step đầu sẽ kết thúc run đúng luật biên). */
  loadStone(stone: Stone): void {
    this.stoneState = { ...stone };
    this.evQueue = [];
    this.bounceLogData = [];
    this.maxZVal = stone.z;
    this.perfectFlag = false;
    this.done = false;
    this.reason = 'timeout';
    this.elapsed = 0;
    this.launchSpeedVal = Math.hypot(stone.vx, stone.vz);
  }

  get stone(): Stone | null {
    return this.stoneState ? { ...this.stoneState } : null;
  }

  get finished(): boolean {
    return this.done;
  }

  get bounces(): number {
    return this.bounceLogData.length;
  }

  get maxZ(): number {
    return this.maxZVal;
  }

  /** Ném theo FlickInput (schema chung Human/Scripted provider — CONTRACT K4×V1). */
  throwFlick(input: FlickInput): void {
    const { stone, speed } = throwVector(this.config, input);
    this.loadStone(stone);
    this.launchSpeedVal = speed;
  }

  /** Các event phát sinh từ lần gọi step gần nhất (scene/render/audio đọc qua đây). */
  drainEvents(): EngineEvent[] {
    const out = this.evQueue;
    this.evQueue = [];
    return out;
  }

  /** Bước sim 1 fixedDt (s) — trả events phát sinh trong bước. */
  step(dt: number): EngineEvent[] {
    if (this.done || !this.stoneState) return [];
    this.elapsed += dt;
    const s = this.stoneState;
    const cfg = this.config;

    // Tích phân Euler bán ẩn (gravity trước, vị trí sau — ổn định cho trò rơi).
    s.vy -= cfg.gravityY * dt;
    s.x += s.vx * dt;
    s.z += s.vz * dt;
    s.y += s.vy * dt;

    if (s.z > this.maxZVal) this.maxZVal = s.z;

    // Biên sân: chạm horizon → run kết thúc tại đường biên (đá bay tới FIELD_Z_MAX — CONTRACT §2).
    if (s.z >= cfg.fieldZMax) {
      s.z = cfg.fieldZMax;
      this.maxZVal = Math.min(this.maxZVal, cfg.fieldZMax);
      this.finish('horizon');
      return this.drainEvents();
    }

    // Chạm nước: y về 0.
    if (s.y <= 0) {
      const speed = Math.hypot(s.vx, s.vz);
      const angleDeg = Math.atan2(s.vx, s.vz) * (180 / Math.PI);
      if (willSkip(cfg, speed, angleDeg, this.rng)) {
        this.bounceLogData.push({ t: this.elapsed, z: s.z });
        this.evQueue.push({
          type: 'bounce',
          stoneX: s.x,
          stoneZ: s.z,
          impact: speed / Math.max(1e-9, this.launchSpeedVal),
        });
        // Nảy: giữ thành phần ngang, vy hop = max(vy dội × restitution, lift từ tốc ngang),
        // giảm tốc theo ma sát (lift thủy động lực — cú nhanh hop cao, skip thật).
        s.y = 0;
        s.vy = Math.max(Math.abs(s.vy) * cfg.skip.restitutionY, speed * cfg.skip.liftFactor);
        s.vx *= cfg.skip.frictionXY;
        s.vz *= cfg.skip.frictionXY;
        // Cú nảy quá yếu để nhấc đá lên lần nữa → chìm luôn (không lơ lửng vô hạn).
        if (s.vy < cfg.skip.minRestitutionVy) {
          this.evQueue.push({ type: 'splash', stoneX: s.x, stoneZ: s.z });
          this.finish('splash');
        }
        return this.drainEvents();
      }
      this.evQueue.push({ type: 'splash', stoneX: s.x, stoneZ: s.z });
      this.finish('splash');
      return this.drainEvents();
    }

    if (this.elapsed >= TIME_LIMIT_S) {
      this.finish('timeout');
    }
    return this.drainEvents();
  }

  private finish(reason: TerminalReason): void {
    this.done = true;
    this.reason = reason;
  }

  /** RunResult theo schema types.ts (score = cú PERFECT ×2 — CONTRACT §2). */
  toResult(): SimResult {
    const bounces = this.bounces;
    const score = this.perfectFlag ? bounces * 2 : bounces;
    return { score, bounces, best: score };
  }

  get terminalReason(): TerminalReason {
    return this.reason;
  }

  get judgedPerfect(): boolean {
    return this.perfectFlag;
  }

  markPerfect(): void {
    this.perfectFlag = true;
  }

  get bounceLog(): BounceInfo[] {
    return this.bounceLogData.map((b) => ({ ...b }));
  }
}

/**
 * Quyết định skip khi chạm nước — đọc MechanicsConfig.
 * Điều kiện: tốc độ chạm (+nhiễu rng ±speedJitter) ≥ minSkipSpeed VÀ góc lệch ngang ≤ maxAngleDeg.
 * Nhiễu chỉ đảo quanh ngưỡng — cùng seed luôn cùng quyết định (deterministic).
 */
function willSkip(cfg: MechanicsConfig, speed: number, angleDeg: number, rng: Rng): boolean {
  const jitter = (rng() - 0.5) * 2 * cfg.skip.speedJitter;
  if (speed + jitter < cfg.skip.minSkipSpeed) return false;
  return Math.abs(angleDeg) <= cfg.skip.maxAngleDeg;
}

/**
 * Sim rút gọn — API chung test + demo (CONTRACT §2): simulateFlick(config, input, seed) → RunResult.
 * Deterministic: cùng (config, input, seed) → cùng RunResult.
 */
export function simulateFlick(cfg: MechanicsConfig, input: FlickInput, seed: number): SimResult {
  return simulateFlickDetailed(cfg, input, seed).result;
}

/**
 * Sim đầy đủ — trả cả events + timeline nảy (chọn beat B1/B2/B3, assist đo, sweep tính P).
 * seed là nguồn duy nhất của rng nhiễu skip; input là nguồn quỹ đạo.
 */
export function simulateFlickDetailed(
  cfg: MechanicsConfig,
  input: FlickInput,
  seed: number,
): SimDetail {
  // Judge PERFECT theo vector thả (window = số sweep khoá trong config — nguồn duy nhất).
  const judged = judgePerfect(input, cfg);
  const engine = new PhysicsEngine(cfg, mulberry32(seed));
  engine.throwFlick(input);
  if (judged) engine.markPerfect();
  const events: EngineEvent[] = [];
  while (!engine.finished) {
    events.push(...engine.step(cfg.fixedDt));
  }
  events.push(...engine.drainEvents());
  const log = engine.bounceLog;
  return {
    result: engine.toResult(),
    events,
    firstBounceTime: log.length > 0 ? log[0].t : null,
    lastBounceZ: log.length > 0 ? log[log.length - 1].z : null,
    maxZ: engine.maxZ,
    judgedPerfect: judged,
    bounces: engine.bounces,
    terminal: engine.terminalReason,
  };
}
