/**
 * M7 Skip King — runLifecycle: score/bounces/best (CONTRACT mục 1).
 * best qua storage wrap (inject storage — localStorage thật hoặc memory fallback),
 * stage 'demo' KHÔNG ghi best/storage (demo không bẩn best người chơi).
 * Tầng A pure TS — 0 import Phaser/DOM.
 */
import type { RunResult } from './types';

export interface KvStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Storage nhớ-mái (fallback khi không có localStorage — test + SSR). */
export function memoryStorage(): KvStorage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => (m.has(k) ? m.get(k)! : null),
    setItem: (k, v) => {
      m.set(k, v);
    },
  };
}

/** Key best mặc định (contract runLifecycle). */
export const BEST_KEY_DEFAULT = 'sk_best';

export interface RunLifecycleOpts {
  /** 'local' = người chơi thật (ghi best) · 'demo' = script demo (không ghi). */
  stage?: 'local' | 'demo';
  /** Key storage custom (mặc định sk_best). */
  key?: string;
}

function parseIntOrNull(v: string | null): number | null {
  if (v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Vòng đời điểm số qua các run trong 1 phiên + best bền qua storage. */
export class RunLifecycle {
  private st: KvStorage;
  private key: string;
  private stage: 'local' | 'demo';
  private scoreVal = 0;
  private bounceVal = 0;
  private bestVal: number;

  constructor(storage: KvStorage, opts: RunLifecycleOpts = {}) {
    this.st = storage;
    this.key = opts.key ?? BEST_KEY_DEFAULT;
    this.stage = opts.stage ?? 'local';
    this.bestVal = parseIntOrNull(this.st.getItem(this.key)) ?? 0;
  }

  /** Ghi nhận 1 run (score đã gồm ×2 của cú PERFECT từ engine — lifecycle chỉ cộng dồn). */
  applyRun(r: RunResult): void {
    this.scoreVal += r.score;
    this.bounceVal += r.bounces;
    if (this.stage !== 'demo' && r.score > this.bestVal) {
      this.bestVal = r.score;
      this.st.setItem(this.key, String(this.bestVal));
    }
  }

  /** Reset điểm phiên (giữ best). */
  resetSession(): void {
    this.scoreVal = 0;
    this.bounceVal = 0;
  }

  get score(): number {
    return this.scoreVal;
  }

  get bounces(): number {
    return this.bounceVal;
  }

  get best(): number {
    return this.bestVal;
  }
}
