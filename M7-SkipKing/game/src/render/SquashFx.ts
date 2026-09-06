/**
 * M7 Skip King — SquashFx (T3 Tầng B): squash 80ms đúng CONTRACT §6 juice giữ.
 * Hằng duration đọc FX.squashMs — không magic number.
 */
import * as Phaser from 'phaser';
import { FX } from './layout';

export class SquashFx {
  /** Biến dạng 1 nhịp (dẹt rồi hồi) trong FX.squashMs; giữ scale gốc sau khi xong. */
  apply(target: Phaser.GameObjects.Image & { scaleX: number; scaleY: number }): void {
    const sx0 = target.scaleX;
    const sy0 = target.scaleY;
    const running = target.scene.tweens.getTweensOf(target).length > 0;
    if (running) return; // squash đang chạy — không chồng tween (perf + không giật)
    target.scene.tweens.add({
      targets: target,
      scaleX: sx0 * 1.3,
      scaleY: sy0 * 0.68,
      duration: FX.squashMs / 2,
      yoyo: true,
      onComplete: () => {
        target.setScale(sx0, sy0);
      },
    });
  }
}
