// Pattern: Object Pool (view)
// TRÁCH NHIỆM: bộ lỗ (Arc) của MỘT vùng vẽ — cấp phát theo số lỗ THẬT của đề và đặt chỗ
//   theo toạ độ đã chuẩn hoá 0..1. Tờ giấy và 4 ô đáp án dùng chung pool này nên "trần vẽ
//   bao nhiêu lỗ" chỉ có MỘT chỗ để sửa (review F1 + F4: hai component từng tự vòng-for
//   cấp phát 8 Arc, tức hai bản sao của cùng một luật và cùng một lỗi cắt số).
// RÀNG BUỘC: không tự phán quyết dữ liệu — điểm đưa vào là sự thật của LevelSpec; pool chỉ
//   không được để mất điểm nào trong trần dẫn xuất MAX_HOLES (holeView.ts).

import type { Point } from '../../logic/types';
import Phaser from 'phaser';
import { toNumber } from '../../logic/rational';
import { closestPair, holeRadius, MAX_HOLES, type PoolRole } from '../holeView';

/** Màu của bộ lỗ: `ring = null` là không viền (ô đáp án thu nhỏ). */
export type HoleStyle = { readonly fill: number; readonly ring: number | null };

export class HolePool {
  private readonly items: Phaser.GameObjects.Arc[] = [];

  private readonly scene: Phaser.Scene;

  private readonly host: Phaser.GameObjects.Container;

  /** Nhịp mờ đang dở của CHÍNH pool này — `place`/`hide` phải cắt được nó. */
  private fadeTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene, host: Phaser.GameObjects.Container) {
    this.scene = scene;
    this.host = host;
  }

  /** Số lỗ đang có trong pool (QA/test đọc để chắc không cắt số). */
  size(): number {
    return this.items.length;
  }

  at(index: number): Phaser.GameObjects.Arc | undefined {
    return this.items[index];
  }

  /** Cấp thêm cho đủ `want` lỗ — vượt trần dẫn xuất mới là cắt, ở đây không bao giờ. */
  grow(want: number): void {
    const target = Math.min(Math.max(0, want), MAX_HOLES);
    for (let i = this.items.length; i < target; i += 1) {
      const hole = this.scene.add.circle(0, 0, 1, 0, 1); // bán kính thật do place() đặt
      hole.setVisible(false);
      this.items.push(hole);
      this.host.add(hole);
    }
  }

  /**
   * Đặt bộ lỗ vào `points` (0..1) trong ô cạnh `side`, gốc ở (ox, oy) tại hệ toạ độ của host.
   * Lỗ thừa của lần vẽ trước bị ẨN, không xoá — pool tái sử dụng giữa 4 ô và mỗi lần resize.
   * Bán kính do MỘT cửa duy nhất (`holeView.holeRadius`) và được đo trên CHÍNH bộ điểm đang vẽ:
   * mật độ (bao nhiêu lỗ) không phát hiện nổi hai lỗ gần trùng nhau — Việc 3 vòng layout 2.
   */
  place(points: readonly Point[], side: number, ox: number, oy: number, role: PoolRole, style: HoleStyle): void {
    this.stopFade();
    this.grow(points.length);
    const units = points.map((p) => ({ x: toNumber(p.x), y: toNumber(p.y) }));
    const r = holeRadius(role, units.length, side, closestPair(units, side));
    this.items.forEach((hole, i) => {
      const u = units[i];
      if (!u) {
        hole.setVisible(false);
        return;
      }
      hole.setVisible(true).setRadius(r).setScale(1);
      hole.setPosition(ox + u.x * side, oy + u.y * side);
      hole.setFillStyle(style.fill, 1);
      if (style.ring === null) hole.setStrokeStyle(0, 0);
      else hole.setStrokeStyle(Math.max(1, r * 0.18), style.ring);
    });
  }

  hide(): void {
    this.stopFade();
    this.items.forEach((hole) => hole.setVisible(false));
  }

  /** Số lỗ ĐANG nhìn thấy (scale > 0) — cửa đếm cho hoạt cảnh pop và cho QA. */
  shown(): number {
    return this.items.filter((hole) => hole.visible && hole.scaleX > 0).length;
  }

  /**
   * Cho cả bộ lỗ teo về 0 trong `ms` rồi ẩn hẳn — vết đục thuộc về lúc giấy CÒN gập, nên
   * khi tờ giấy mở bung nó đi theo giấy chứ không nằm trơ trên tờ phẳng. `place()` giết nhịp
   * này nên một bộ lỗ không bao giờ bị hai hoạt cảnh giành nhau.
   */
  fade(ms: number): void {
    this.stopFade();
    const live = this.items.filter((hole) => hole.visible);
    if (live.length === 0) return;
    this.fadeTween = this.scene.tweens.add({
      targets: live,
      scaleX: 0,
      scaleY: 0,
      duration: ms,
      ease: 'Cubic.Out',
      onComplete: () => {
        this.fadeTween = null;
        live.forEach((hole) => {
          if (hole.scaleX === 0) hole.setVisible(false); // lỗ đã được đặt lại thì không đụng
        });
      },
    });
  }

  /** Huỷ nhịp mờ đang dở (hoạt cảnh mới nạp đề phải thấy bộ lỗ thật, không thấy cái đang biến mất). */
  private stopFade(): void {
    if (this.fadeTween !== null) this.fadeTween.stop();
    this.fadeTween = null;
  }
}
