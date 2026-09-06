/**
 * M7 Skip King — ComboBanner (T4 TẦNG B — CONTRACT §2 + 3.4): banner 2 dòng khi PERFECT.
 * Dòng 1 "PERFECT FLICK!" · dòng 2 "×2" — ×2 ĐIỂM cú thả, KHÔNG multiplier chuỗi
 * (số ×2 sống trong tầng A: engine.toResult() score = bounces × 2 — banner chỉ đọc text).
 * Text từ MechanicsConfig.comboBanner (nguồn duy nhất — 0 hardcode).
 */
import * as Phaser from 'phaser';
import { MECHANICS } from '../config/mechanics';

/** Alpha tắt banner — [PLACEHOLDER] feel-tune. */
const FADE_MS = 900;
const HOLD_MS = 650;

export class ComboBanner {
  private line1: Phaser.GameObjects.Text;
  private line2: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, cx: number, cy: number) {
    this.line1 = scene.add
      .text(cx, cy - 46, MECHANICS.comboBanner.line1, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '58px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(30)
      .setAlpha(0);
    this.line2 = scene.add
      .text(cx, cy + 18, MECHANICS.comboBanner.line2, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '84px',
        color: '#8ef6b2',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(30)
      .setAlpha(0);
    // QA soi qua testid trên cả 2 dòng (CONTRACT mục 4: combo-banner).
    this.line1.setData('testid', 'combo-banner');
    this.line2.setData('testid', 'combo-banner');
  }

  /** Hiện banner (flash scale + fade) — gọi khi event PERFECT. */
  show(scene: Phaser.Scene): void {
    for (const t of [this.line1, this.line2]) {
      t.setScale(0.6);
      t.setAlpha(1);
    }
    scene.tweens.add({ targets: [this.line1, this.line2], scale: 1, duration: 160, ease: 'Back.easeOut' });
    scene.tweens.add({
      targets: [this.line1, this.line2],
      alpha: 0,
      delay: HOLD_MS,
      duration: FADE_MS,
    });
  }
}
