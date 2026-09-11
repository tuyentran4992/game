// DebutBeat — TẦNG A (pure TS, 0 import Phaser/DOM) — CONTRACT K0 §6.
// State "lần đầu thấy" (firstSeen) mỗi loại ong trong phiên + cửa sổ telegraph.
// UPG2-P1a (t_6035fb14): tách khỏi GameEngine (đã 481d — chống god-file) thành
// 1 class 1 trách nhiệm; engine ủy quyền qua noteDebut()/debutAt() (CONTRACT §3.3:
// method public mới của engine phải có test tầng A kèm commit).
// Cửa sổ = cfg.debutSparseSec [PLACEHOLDER] (trước đây là literal DEBUT_SPARSE_SEC 2.0).
import type { DebutType, DebutWindow, MechanicsConfig } from './types';

export class DebutBeat {
  private readonly cfg: MechanicsConfig;
  private firstSeen = new Map<DebutType, number>();

  constructor(cfg: MechanicsConfig) {
    this.cfg = cfg;
  }

  /** Ghi lần đầu xuất hiện của 1 loại (bỏ qua normal + lần ghi lặp — debut 1 lần/phiên). */
  note(type: DebutType, at: number): void {
    if (type === 'normal' || this.firstSeen.has(type)) return;
    this.firstSeen.set(type, at);
  }

  /** Cửa sổ debut đang mở tại `at` (cửa sớm nhất nếu trùng) hoặc null. */
  activeAt(at: number): DebutWindow | null {
    let best: DebutWindow | null = null;
    for (const [type, seen] of this.firstSeen) {
      const until = seen + this.cfg.debutSparseSec;
      if (at >= seen && at < until && (!best || seen < best.firstSeenAt)) {
        best = { type, firstSeenAt: seen, until };
      }
    }
    return best;
  }

  /** Đầu phiên mới: xoá toàn bộ firstSeen (mirror startNewGame). */
  clear(): void {
    this.firstSeen.clear();
  }
}
