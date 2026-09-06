/**
 * M7 Skip King — Hud (T3 Tầng B): score/skips/best góc trên (CONTRACT mục 4 testid).
 * Chỉ ĐỌC số qua RunLifecycle + RunResult (tầng A public interface) — 0 tự tính điểm.
 * Text 100% EN (PB-5); cỡ chữ LAYOUT.hudFontSizePx (≥24px canvas 720); trắng trên
 * dải trời tối — T6 đo worst-case 8.2:1 ≥ AA 4.5 (measure_hud_contrast.py vùng A).
 */
import * as Phaser from 'phaser';
import { LAYOUT } from '../render/layout';
import type { RunLifecycle } from '../logic/runLifecycle';

const HUD_COLOR = '#ffffff';
const HUD_X = 24;
const HUD_Y = 48;

export class Hud {
  private scoreText: Phaser.GameObjects.Text;
  private skipsText: Phaser.GameObjects.Text;
  private bestText: Phaser.GameObjects.Text;
  readonly colorHex = HUD_COLOR;
  readonly fontSizePx = LAYOUT.hudFontSizePx;

  constructor(scene: Phaser.Scene) {
    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${LAYOUT.hudFontSizePx}px`,
      color: HUD_COLOR,
      fontStyle: 'bold',
    };
    // Dải trời phụ kiện tương phản (không đụng art): mờ tối phía trên.
    scene.add
      .rectangle(
        scene.scale.width / 2,
        LAYOUT.hudBandHeightPx / 2,
        scene.scale.width,
        LAYOUT.hudBandHeightPx,
        0x0a1428,
        0.35,
      )
      .setDepth(18);
    this.scoreText = scene.add
      .text(HUD_X, HUD_Y, 'SCORE 0', style)
      .setDepth(20)
      .setData('testid', 'hud-score');
    this.skipsText = scene.add
      .text(HUD_X, HUD_Y + 40, 'SKIPS 0', style)
      .setDepth(20)
      .setData('testid', 'hud-skips');
    this.bestText = scene.add
      .text(scene.scale.width - HUD_X, HUD_Y, 'BEST 0', { ...style })
      .setOrigin(1, 0)
      .setDepth(20)
      .setData('testid', 'hud-best');
  }

  /** Vẽ lại số — nguồn duy nhất RunLifecycle (tầng A). */
  render(lc: RunLifecycle): void {
    this.scoreText.setText(`SCORE ${Math.round(lc.score)}`);
    this.skipsText.setText(`SKIPS ${lc.bounces}`);
    this.bestText.setText(`BEST ${Math.round(lc.best)}`);
  }

  /** Duyệt 3 text HUD (test + QA). */
  eachText(fn: (t: Phaser.GameObjects.Text) => void): void {
    fn(this.scoreText);
    fn(this.skipsText);
    fn(this.bestText);
  }
}
