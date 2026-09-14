// Pattern: Component (Phaser container)
// TRÁCH NHIỆM: hàng 3 ô sao của HUD. View CHỈ vẽ số sao được đưa vào — không tự chấm
//   (stars.win là việc của logic, PC-16).
// RÀNG BUỘC: không import đồng hồ/ngẫu nhiên; mọi số đo lấy từ Box của layout.ts.

import Phaser from 'phaser';
import { STAR_SCALE } from '../../logic/progression';
import { RATIOS, iconRow, type Box } from '../layout';
import { centerOf } from './fitText';
import { parseHex, type PaperTheme } from '../theme/paperTheme';

/**
 * Số ô sao ĐỌC từ thang sao của logic (progression.STAR_SCALE.max) — tầng vẽ không được
 * khai lại con số 3 (review F1/G3: hằng thứ hai cùng giá trị ở hai file là hai sự thật).
 */
const SLOTS: number = STAR_SCALE.max;

export class StarRow extends Phaser.GameObjects.Container {
  private readonly marks: Phaser.GameObjects.Arc[] = [];

  private inkColor = 0x17324d;

  constructor(scene: Phaser.Scene, box: Box, theme: PaperTheme) {
    super(scene, box.x, box.y);
    for (let i = 0; i < SLOTS; i += 1) {
      const mark = scene.add.circle(0, 0, 10, 0, 1);
      mark.setStrokeStyle(3, parseHex(theme.crease));
      this.marks.push(mark);
      this.add(mark);
    }
    this.retint(theme, box);
  }

  /** Sao = lỗ đục: đầy = mực, trống = chỉ còn nét (đọc được cả khi tắt tiếng + tắt chữ). */
  setCount(n: number): void {
    this.marks.forEach((mark, i) => mark.setFillStyle(i < n ? this.inkColor : 0, i < n ? 1 : 0));
  }

  /** Tô lại theo theme + xếp lại 3 ô khi đổi kích thước camera. */
  retint(theme: PaperTheme, box: Box): void {
    this.inkColor = parseHex(theme.ink);
    // Container ngồi tại GỐC ô (quy ước như mọi component khác) — đổi camera là phải dời luôn.
    this.x = box.x;
    this.y = box.y;
    // Đường kính sao = `ratio` cạnh hàng, doubled lên thành ô vuông; `iconRow` giữ cả hàng
    // TRONG vùng an toàn, chiếc đầu áp mép trái ⇒ chung trục dọc với nhãn HUD (Việc 2).
    const cells = iconRow(box, SLOTS, box.h * RATIOS.star.ratio * 2);
    const side = cells.length > 0 ? cells[0].w : 0;
    this.marks.forEach((mark, i) => {
      const cell = cells[i];
      if (!cell) return;
      mark.setStrokeStyle(Math.max(2, box.h * 0.06), parseHex(theme.crease));
      const at = centerOf(cell);
      mark.setPosition(at.x - box.x, at.y - box.y);
      mark.setRadius(side / 2);
    });
  }
}
