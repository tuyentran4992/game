// Pattern: Component (Phaser container)
// TRÁCH NHIỆM: con số Mực trên HUD + giọt mực. View chỉ in ra con số mà session đọc từ save;
//   không cộng trừ kinh tế ở đây (PC-11 thuộc logic/economy).
// V6.5: ô của giọt mực và Ô CHỮ SỐ do layout.inkFace phát ra (đã trừ pad an toàn trong hộp
//   `ink` 560,88,144,64) — ảnh chụp thật bản cũ có "0" nằm đè lên vòng sao thứ ba của HUD.

import Phaser from 'phaser';
import { inkFace, type Box } from '../layout';
import { centerOf, fittedStyle } from './fitText';
import { parseHex, type PaperTheme } from '../theme/paperTheme';

export class InkBadge extends Phaser.GameObjects.Container {
  private readonly drop: Phaser.GameObjects.Arc;

  private readonly digits: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, box: Box, theme: PaperTheme) {
    super(scene, box.x, box.y);
    this.drop = scene.add.circle(0, 0, 10, parseHex(theme.ink), 1);
    this.digits = scene.add.text(0, 0, '0', fittedStyle('digit', theme.ink, '0', box)).setOrigin(0.5);
    this.add([this.drop, this.digits]);
    this.retint(theme, box);
  }

  /** Chỉ có chữ số ⇒ không phải copy hiển thị nên không cần t() (PC-19 ràng buộc chuỗi chữ). */
  setValue(n: number): void {
    this.digits.setText(String(Math.max(0, Math.floor(n))));
  }

  retint(theme: PaperTheme, box: Box): void {
    const face = inkFace(box);
    const drop = centerOf(face.drop);
    this.x = box.x;
    this.y = box.y;
    this.drop.setPosition(drop.x - box.x, drop.y - box.y).setRadius(face.drop.w / 2);
    this.drop.setFillStyle(parseHex(theme.ink), 1);
    this.drop.setStrokeStyle(Math.max(2, face.drop.w * 0.12), parseHex(theme.shade), 1);
    const digits = centerOf(face.digits);
    this.digits
      .setStyle(fittedStyle('digit', theme.ink, this.digits.text, face.digits))
      .setPosition(digits.x - box.x, digits.y - box.y);
  }
}
