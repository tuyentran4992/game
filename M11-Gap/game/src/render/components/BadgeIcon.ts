// Pattern: Component (huy hiệu tròn)
// TRÁCH NHIỆM: vẽ MỘT huy hiệu theo dòng dữ liệu mà albumModel/logic đưa: đã đạt thì nhân mực
//   + chấm cấp, chưa đạt thì silhouette xám (PC-12: mục chưa mở VẪN nằm trên lưới, không bị
//   ẩn đi). Component không tự cấp huy hiệu (awardBadge là việc của economy), không đọc save.
// RÀNG BUỘC: không setInteractive, không chuỗi hiển thị, đường kính do scene đưa qua Box.

import Phaser from 'phaser';
import type { BadgeRow } from '../viewmodel/albumModel';
import { RATIOS, type Box } from '../layout';
import { parseHex, type PaperTheme } from '../theme/paperTheme';
import { PRIMARY } from '../theme/progressTheme';

/** Đường kính vầng + bán kính nét viền trong một ô vuông (DỮ LIỆU ở layout.RATIOS). */
const FIT = RATIOS.badge.disc;

const RING = RATIOS.badge.ring;

export class BadgeIcon extends Phaser.GameObjects.Graphics {
  paint(box: Box, theme: PaperTheme, badge: BadgeRow): void {
    const r = (Math.min(box.w, box.h) * FIT) / 2;
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;
    this.clear();
    this.fillStyle(parseHex(badge.earned ? theme.ink : theme.shade), badge.earned ? 1 : 0.55);
    this.fillCircle(cx, cy, r);
    this.lineStyle(Math.max(2, r * 0.12), parseHex(badge.earned ? PRIMARY : theme.crease), 1);
    this.strokeCircle(cx, cy, r * RING);
    this.pips(cx, cy, r, theme, badge.level, badge.earned);
  }

  /** Cấp huy hiệu = số chấm dưới vầng — đọc được không cần chữ (PC-O-02). */
  private pips(cx: number, cy: number, r: number, theme: PaperTheme, level: number, earned: boolean): void {
    if (level < 1) return;
    const dot = r * 0.12;
    const step = dot * 3;
    const x0 = cx - (step * (level - 1)) / 2;
    this.fillStyle(parseHex(earned ? theme.paper : theme.crease), 1);
    for (let i = 0; i < level; i += 1) this.fillCircle(x0 + step * i, cy + r * 0.55, dot);
  }
}
