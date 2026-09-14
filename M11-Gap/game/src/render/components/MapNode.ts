// Pattern: Component (một ô màn trên lưới map)
// TRÁCH NHIỆM: vẽ phần HOẠ của một ô: cụm sao của màn + dấu khoá. Nền ô và chữ số màn là của
//   makeButton (B3a) để phản hồi chạm đi qua đúng một cửa (PC-U-06); dữ liệu ô (sao, khoá) là
//   của view-model mapModel — scene truyền xuống, component không tự chấm sao, không tự suy khoá.
// RÀNG BUỘC: không setInteractive (nút đã có), không chuỗi hiển thị (PC-19), mọi số đo từ Box.

import Phaser from 'phaser';
import type { MapNode as NodeData } from '../viewmodel/mapModel';
import { RATIOS, type Box } from '../layout';
import { parseHex, type PaperTheme } from '../theme/paperTheme';
import { StarRow } from './StarRow';

/** Tỷ lệ dải sao chân ô — DỮ LIỆU ở layout.RATIOS, scene chỉ đưa trần px (DS:102: cụm sao 32px). */
const BAND = RATIOS.star.band;

export class MapNode extends Phaser.GameObjects.Container {
  private readonly stars: StarRow;

  private readonly lock: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, box: Box, theme: PaperTheme) {
    super(scene, box.x, box.y);
    this.stars = new StarRow(scene, bandOf(box), theme);
    this.lock = scene.add.graphics();
    this.add([this.lock, this.stars]);
    this.paintLock(box, theme);
  }

  /** Cờ của view-model ⇒ hình: bao nhiêu sao, có khoá hay không (scene không tính lại). */
  set(node: NodeData): void {
    this.stars.setCount(node.stars);
    this.lock.setVisible(node.locked);
  }

  /** Đổi cỡ camera/ theme: xếp lại dải sao + vẽ lại dấu khoá. */
  retint(theme: PaperTheme, box: Box): void {
    this.setPosition(box.x, box.y);
    this.stars.retint(theme, bandOf(box));
    this.paintLock(box, theme);
  }

  private paintLock(box: Box, theme: PaperTheme): void {
    const r = Math.min(box.w, box.h) * 0.16;
    this.lock.clear();
    this.lock.lineStyle(Math.max(2, r * 0.3), parseHex(theme.crease), 1);
    this.lock.strokeCircle(box.w / 2, box.h * 0.42, r);
    this.lock.fillStyle(parseHex(theme.crease), 1);
    this.lock.fillRect(box.w / 2 - r * 1.2, box.h * 0.42, r * 2.4, r * 1.6);
  }
}

/** Dải sao nằm chân ô, cao `BAND` ô nhưng không dày quá trần px mà scene đưa. */
function bandOf(box: Box): Box {
  return { x: 0, y: box.h * (1 - BAND), w: box.w, h: box.h * BAND };
}
