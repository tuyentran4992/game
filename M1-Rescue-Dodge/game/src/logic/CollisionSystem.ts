// CollisionSystem — TẦNG A pure-TS (0 Phaser, 0 DOM): giao địa lý lane, hitbox overlap,
// near-miss detect, swarm-hit. Tách từ vùng logic va chạm của scenes/Gameplay.ts
// theo CONTRACT §6 (card t_6f2afa4f, branch card/t_6f2afa4f).
// Mọi threshold là param có DEFAULT_TUNING GIỮ NGUYÊN giá trị cũ trong scene
// (không đổi cảm giác gameplay — rủi ro ghi trong card). Scene gọi engine qua
// public interface CONTRACT §2 (registerNearMiss/destroyBeeInFever/tryUseShield...);
// class này CHỈ quyết định "chạm hay không" — mutation điểm/fever/shield vẫn thuộc GameEngine.

import type { MechanicsConfig, BeeType } from './types';

/** Thực thể di chuyển (ong/swarm) ở dạng dữ liệu thuần — scene map từ Bee Phaser sang. */
export interface CollisionEntity {
  id: number;
  type: BeeType;
  lane: number;
  secondaryLane?: number;
  x: number;
  y: number;
  speedMult?: number;
  dodged?: boolean;
  swerved?: boolean;
  isSwarm?: boolean;
}

/** Hitbox mèo: tâm + kích thước + làn hiện tại. */
export interface CatBox {
  x: number;
  y: number;
  w: number;
  h: number;
  lane: number;
}

/** Vật phẩm ở dạng điểm (scene tự vẽ container). */
export interface ItemPoint {
  x: number;
  y: number;
}

export interface RoadMetrics {
  roadWidth: number;
  leftEdge: number;
  laneWidth: number;
}

export interface CollisionTuning {
  nearMissWindowY: number;   // cửa sổ |dy| tính near-miss (scene cũ: 70)
  nearMissAheadY: number;    // ong phải còn phía trên mèo y < catY + N (scene cũ: 30)
  pickupWindow: number;      // cửa sổ ăn vật phẩm mỗi trục (scene cũ: 52)
  hitYFactor: number;        // hitY = |dy| < catH * factor (scene cũ: 0.52)
  hitXFactor: number;        // hitX = |dx| < catW * factor (scene cũ: 0.45)
  fatInsetFactor: number;    // fat: mép an toàn thụt vào catW * factor (scene cũ: 0.18)
  dodgeYFactor: number;      // né xong khi ong y > catY + catH * factor (scene cũ: 0.4)
  roadWidthFactor: number;   // road chiếm width * factor (scene cũ: 0.72)
}

export const DEFAULT_TUNING: CollisionTuning = {
  nearMissWindowY: 70,
  nearMissAheadY: 30,
  pickupWindow: 52,
  hitYFactor: 0.52,
  hitXFactor: 0.45,
  fatInsetFactor: 0.18,
  dodgeYFactor: 0.4,
  roadWidthFactor: 0.72,
};

/** Kết quả xử lý 1 ong chạm mèo — scene map sang mutation engine (fever/shield/game_over). */
export type BeeHitOutcome = 'pass' | 'fever_kill' | 'shield_consume' | 'game_over';

export interface BeeHitFlags {
  feverActive: boolean;
  shieldActive: boolean;
}

/** Địa lý đường thẳng: khớp getStraightRoadMetrics của scene (road = factor% width). */
export function roadMetrics(
  width: number,
  laneCount: number,
  roadWidthFactor: number = DEFAULT_TUNING.roadWidthFactor,
): RoadMetrics {
  const roadWidth = width * roadWidthFactor;
  const laneWidth = roadWidth / laneCount;
  const leftEdge = width / 2 - roadWidth / 2;
  return { roadWidth, leftEdge, laneWidth };
}

export class CollisionSystem {
  private cfg: MechanicsConfig;
  private t: CollisionTuning;

  constructor(cfg: MechanicsConfig, tuning: Partial<CollisionTuning> = {}) {
    this.cfg = cfg;
    this.t = { ...DEFAULT_TUNING, ...tuning };
  }

  /**
   * Near-miss khi chuyển làn (né sát sạt): ong chiếm làn CŨ của mèo,
   * chưa bị né xong, còn ở phía trên mèo trong cửa sổ |dy|.
   * Khớp nguyên điều kiện cũ Gameplay.ts moveLane().
   */
  checkNearMiss(bees: CollisionEntity[], cat: CatBox, prevLane: number): boolean {
    return bees.some(
      (b) =>
        (b.lane === prevLane || b.secondaryLane === prevLane) &&
        !b.dodged &&
        Math.abs(b.y - cat.y) < this.t.nearMissWindowY &&
        b.y < cat.y + this.t.nearMissAheadY,
    );
  }

  /** Ăn vật phẩm: cửa sổ |dx|, |dy| < window mỗi trục (strict <, như scene cũ). */
  checkItemPickup(item: ItemPoint, cat: CatBox): boolean {
    return (
      Math.abs(item.y - cat.y) < this.t.pickupWindow &&
      Math.abs(item.x - cat.x) < this.t.pickupWindow
    );
  }

  /** Làn an toàn của ong béo: 0+1 chắn trái+giữa (an toàn phải=2); còn lại an toàn trái=0. */
  getFatSafeLane(b: CollisionEntity): number {
    return b.lane === 0 && b.secondaryLane === 1 ? 2 : 0;
  }

  private hitY(b: CollisionEntity, cat: CatBox): boolean {
    return Math.abs(b.y - cat.y) < cat.h * this.t.hitYFactor;
  }

  /** hitX ong thường: |dx| < factor * catW (biểu thức cũ rút gọn — (lane||dx) && dx ≡ dx). */
  private hitNormalX(b: CollisionEntity, cat: CatBox): boolean {
    return Math.abs(b.x - cat.x) < cat.w * this.t.hitXFactor;
  }

  /** hitX ong béo: vùng nguy hiểm = 2 làn bị chắn, mép thụt vào catW * factor. */
  private hitFatX(b: CollisionEntity, cat: CatBox, rm: RoadMetrics): boolean {
    const safeLane = this.getFatSafeLane(b);
    const inset = cat.w * this.t.fatInsetFactor;
    if (safeLane === 2) {
      // An toàn làn Phải: nguy hiểm = Trái + Giữa, biên phải = leftEdge + 2*laneWidth
      const rightBoundary = rm.leftEdge + 2 * rm.laneWidth;
      return cat.x < rightBoundary - inset;
    }
    // An toàn làn Trái: nguy hiểm = Giữa + Phải, biên trái = leftEdge + laneWidth
    const leftBoundary = rm.leftEdge + rm.laneWidth;
    return cat.x > leftBoundary + inset;
  }

  /**
   * Phân giải 1 ong chạm mèo theo ĐÚNG thứ tự ưu tiên cũ của scene:
   * không chạm -> pass; fever -> fever_kill; shield -> shield_consume; còn lại -> game_over.
   * `width` = chiều rộng màn thật (scene: scale.width) — chỉ cần cho ong béo (địa lý làn).
   * Purity: caller (scene) tự gọi engine.destroyBeeInFever()/tryUseShield()/registerHit()
   * theo outcome — class này không mutate state.
   */
  resolveBeeHit(b: CollisionEntity, cat: CatBox, flags: BeeHitFlags, width: number): BeeHitOutcome {
    const isFat = b.type === 'fat';
    if (!this.hitY(b, cat)) return 'pass';
    const hitX = isFat
      ? this.hitFatX(b, cat, roadMetrics(width, this.cfg.laneCount, this.t.roadWidthFactor))
      : this.hitNormalX(b, cat);
    if (!hitX) return 'pass';
    if (flags.feverActive) return 'fever_kill';
    if (flags.shieldActive) return 'shield_consume';
    return 'game_over';
  }

  /** Ong đã bay qua mèo đủ xa để tính 1 lần né (y > catY + catH * factor). */
  hasPassedCat(b: CollisionEntity, cat: CatBox): boolean {
    return b.y > cat.y + cat.h * this.t.dodgeYFactor;
  }

  /**
   * Đủ điều kiện cộng 1 lần né: ong đã qua mèo VÀ mèo không đứng trong vùng ong chắn
   * (thường: khác làn; béo: mèo đang ở làn an toàn).
   */
  canRegisterDodge(b: CollisionEntity, cat: CatBox): boolean {
    if (!this.hasPassedCat(b, cat)) return false;
    if (b.type === 'fat') {
      return cat.lane === this.getFatSafeLane(b);
    }
    return b.lane !== cat.lane;
  }
}
