// Pattern: Component (view) — BỘ LỖ CỦA TỜ GIẤY
// TRÁCH NHIỆM: giữ hộ số điểm + vai trò đã vẽ của tờ giấy và bôi tiến trình hiện (0..1) của TỪNG
//   lỗ xuống Arc của HolePool. Tách khỏi SheetView vì SheetView có một việc là vẽ cả tờ giấy theo
//   MotionFrame; chăm bộ lỗ (trần vẽ, bán kính, vai trò, rect QA của lỗ) là việc thứ hai (gate G1).
// RÀNG BUỘC: không tự sinh điểm (điểm là sự thật của LevelSpec), không tự quyết trần (holeView),
//   KHÔNG có đường tắt "ẩn lỗ" — độ lớn của lỗ chỉ đi qua `apply(frame.holes)`.

import Phaser from 'phaser';
import { toNumber } from '../../logic/rational';
import type { Point } from '../../logic/types';
import { closestPair, holeBudget, holeRadius } from '../holeView';
import type { Box } from '../layout';
import { parseHex, type PaperTheme } from '../theme/paperTheme';
import { HolePool } from './HolePool';

/** Vai trò bộ lỗ đang vẽ — màu khác nhau để mắt phân biệt bản đúng / bản mình chọn. */
export type HoleRole = 'answer' | 'picked';


export class SheetHoles {
  private readonly pool: HolePool;

  /** Bộ điểm đang vẽ — relayout (resize/đổi chương) phải vẽ lại ĐÚNG bộ lỗ đó. */
  private points: readonly Point[] = [];

  private role: HoleRole = 'answer';

  private side = 0;

  private theme: PaperTheme;

  constructor(scene: Phaser.Scene, host: Phaser.GameObjects.Container, theme: PaperTheme) {
    this.pool = new HolePool(scene, host);
    this.theme = theme;
  }

  /** Số lỗ ĐANG vẽ trên tờ (QA/test đọc — 0 khi chưa đục). */
  count(): number {
    return this.points.length;
  }

  /**
   * Dời bộ lỗ sang một bộ điểm MỚI, cắt về trần vẽ của một bề mặt (phần vượt do scene BÁO về QA)
   * và trả về đúng bộ điểm đã được vẽ — tiến trình của lỗ KHÔNG nằm ở đây.
   */
  place(points: readonly Point[], role: HoleRole, side: number, theme: PaperTheme): readonly Point[] {
    this.theme = theme;
    this.role = role;
    this.side = side;
    const kept = points.slice(0, holeBudget(points.length).shown);
    this.points = kept;
    this.rehang();
    return kept;
  }

  /** Ẩn hết (đổi đề): không còn lỗ nào của đề cũ trên màn. */
  hide(): void {
    this.points = [];
    this.pool.hide();
  }

  /** Bôi tiến trình hiện xuống từng Arc — chỗ DUY NHẤT quyết định lỗ to hay nhỏ. */
  apply(progress: readonly number[]): void {
    progress.forEach((v, i) => {
      this.pool.at(i)?.setScale(v, v);
    });
  }

  /** Số lỗ ĐANG thấy (tiến trình > 0) — cửa đếm cho QA, tính từ CHÍNH tiến trình đang vẽ. */
  shown(progress: readonly number[]): number {
    return progress.filter((v) => v > 0).length;
  }

  /** Rect thật của lỗ đầu tiên (QA cần vùng nhìn thấy của cái lỗ — PC-U-04). */
  box(box: Box): Box {
    const units = this.units();
    const p = units[0];
    const r = this.radius();
    const cx = box.x + (p ? p.x : 0.5) * this.side;
    const cy = box.y + (p ? p.y : 0.5) * this.side;
    return { x: cx - r, y: cy - r, w: r * 2, h: r * 2 };
  }

  private units(): readonly { x: number; y: number }[] {
    return this.points.map((p) => ({ x: toNumber(p.x), y: toNumber(p.y) }));
  }

  /** Bán kính của bộ điểm hiện tại — đo trên CHÍNH bộ điểm đang vẽ (holeView Việc 3). */
  private radius(): number {
    const units = this.units();
    return holeRadius('sheet', units.length, this.side, closestPair(units, this.side));
  }

  /** Cùng bộ điểm, cùng vai trò — chỉ vị trí + bán kính đổi theo `side`. */
  private rehang(): void {
    const theme = this.theme;
    const fill = parseHex(this.role === 'picked' ? theme.shade : theme.ink);
    this.pool.place(this.points, this.side, 0, 0, 'sheet', { fill, ring: parseHex(theme.ink) });
  }
}
