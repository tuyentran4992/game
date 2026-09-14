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
import { holeRadius, MAX_HOLES, type PoolRole } from '../holeView';

/** Màu của bộ lỗ: `ring = null` là không viền (ô đáp án thu nhỏ). */
export type HoleStyle = { readonly fill: number; readonly ring: number | null };

export class HolePool {
  private readonly items: Phaser.GameObjects.Arc[] = [];

  private readonly scene: Phaser.Scene;

  private readonly host: Phaser.GameObjects.Container;

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
   */
  place(points: readonly Point[], side: number, ox: number, oy: number, role: PoolRole, style: HoleStyle): void {
    this.grow(points.length);
    const r = holeRadius(role, points.length, side);
    this.items.forEach((hole, i) => {
      const p = points[i];
      if (!p) {
        hole.setVisible(false);
        return;
      }
      hole.setVisible(true).setRadius(r).setScale(1);
      hole.setPosition(ox + toNumber(p.x) * side, oy + toNumber(p.y) * side);
      hole.setFillStyle(style.fill, 1);
      if (style.ring === null) hole.setStrokeStyle(0, 0);
      else hole.setStrokeStyle(Math.max(1, r * 0.18), style.ring);
    });
  }

  hide(): void {
    this.items.forEach((hole) => hole.setVisible(false));
  }
}
