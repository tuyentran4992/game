/**
 * M7 Skip King — FlickProvider: interface chung đường sim (CONTRACT K4×V1).
 * HumanFlickProvider (input người chơi) + ScriptedFlickProvider (demo B1/B2/B3)
 * sinh CÙNG FlickInput schema — sim một đường duy nhất qua simulateFlickDetailed.
 * ScriptedFlickProvider CHỌN cú từ sim để đạt đúng beat (B1/B2/B3 — CONTRACT §3):
 *   B1 = plop đầu ≤3s · B2 = 2 nảy chìm · B3 = PERFECT ~7 nảy.
 * Tầng A pure TS — 0 import Phaser/DOM.
 */
import type { FlickInput } from './types';
import type { MechanicsConfig } from '../config/mechanics';
import { flickFromSeed } from './perfectWindow';
import { simulateFlickDetailed } from './physicsEngine';
import type { SimDetail } from './physicsEngine';

export interface FlickProvider {
  nextFlick(): FlickInput;
  hasNext(): boolean;
}

/** Hàng đợi input người chơi — hết queue báo lỗi rõ (không trả input rác). */
export class HumanFlickProvider implements FlickProvider {
  private queue: FlickInput[];

  constructor(queue: FlickInput[]) {
    this.queue = [...queue];
  }

  nextFlick(): FlickInput {
    if (this.queue.length === 0) {
      throw new Error('HumanFlickProvider: hết input trong hàng đợi');
    }
    return this.queue.shift()!;
  }

  hasNext(): boolean {
    return this.queue.length > 0;
  }
}

export type DemoBeat = 'B1' | 'B2' | 'B3';
const BEAT_ORDER: DemoBeat[] = ['B1', 'B2', 'B3'];
/** Trần seed scan — cùng không gian sweep CONTRACT (1..1800). */
const MAX_SCAN_SEED = 1800;

interface BeatPick {
  flick: FlickInput;
  seed: number;
  detail: SimDetail;
}

function beatOk(cfg: MechanicsConfig, beat: DemoBeat, d: SimDetail): boolean {
  switch (beat) {
    case 'B1':
      return d.firstBounceTime !== null && d.firstBounceTime <= 3 && d.bounces >= 1;
    case 'B2':
      return d.bounces === 2 && d.terminal === 'splash';
    case 'B3':
      return d.judgedPerfect && d.bounces >= cfg.perfectMinBounces;
  }
}

/** Cache pick theo config (WeakMap — config là const nguồn duy nhất; scan 1 lần/config). */
const beatCache = new WeakMap<MechanicsConfig, Map<DemoBeat, BeatPick>>();

/**
 * Provider cú demo — chọn seed đầu tiên thoả beat (deterministic, cùng config → cùng cú).
 * Trả flick NGUYÊN BẢN từ seed — KHÔNG qua assist Đ2 (CONTRACT: không đụng cú demo).
 */
export class ScriptedFlickProvider implements FlickProvider {
  private picks: Map<DemoBeat, BeatPick>;
  private idx = 0;

  constructor(private cfg: MechanicsConfig) {
    let cached = beatCache.get(cfg);
    if (!cached) {
      cached = new Map<DemoBeat, BeatPick>();
      for (const beat of BEAT_ORDER) {
        cached.set(beat, this.scan(beat));
      }
      beatCache.set(cfg, cached);
    }
    this.picks = cached;
  }

  private scan(beat: DemoBeat): BeatPick {
    for (let seed = 1; seed <= MAX_SCAN_SEED; seed++) {
      const flick = flickFromSeed(seed, this.cfg);
      const detail = simulateFlickDetailed(this.cfg, flick, seed);
      if (beatOk(this.cfg, beat, detail)) return { flick, seed, detail };
    }
    throw new Error(
      `ScriptedFlickProvider: không tìm thấy seed nào thoả beat ${beat} trong 1..${MAX_SCAN_SEED}`,
    );
  }

  flickForBeat(beat: DemoBeat): FlickInput {
    return { ...this.picks.get(beat)!.flick };
  }

  seedForBeat(beat: DemoBeat): number {
    return this.picks.get(beat)!.seed;
  }

  detailForBeat(beat: DemoBeat): SimDetail {
    return this.picks.get(beat)!.detail;
  }

  /** Demo lần lượt B1→B2→B3 rồi lặp B3 (beat cuối giữ chân — CONTRACT §3). */
  nextFlick(): FlickInput {
    const beat = BEAT_ORDER[Math.min(this.idx, BEAT_ORDER.length - 1)];
    this.idx++;
    return this.flickForBeat(beat);
  }

  hasNext(): boolean {
    return true;
  }
}
