/**
 * M7 Skip King — Hud (T3 Tầng B): score/skips/best góc trên (CONTRACT mục 4 testid).
 * Chỉ ĐỌC số qua RunLifecycle + RunResult (tầng A public interface) — 0 tự tính điểm.
 * Text 100% EN (PB-5); cỡ chữ LAYOUT.hudFontSizePx (≥24px canvas 720); trắng trên
 * dải trời tối — T6 đo worst-case 8.2:1 ≥ AA 4.5 (measure_hud_contrast.py vùng A).
 * FUN2-C3: HUD pop — score nhảy scale-only khi điểm nhảy (bounce), decay về 1 trong
 * hudPopMs; KHÔNG đổi chữ/alpha/vị trí (contrast AA T6 giữ nguyên, layout không vỡ).
 */
import * as Phaser from 'phaser';
import { LAYOUT, SKIM } from '../render/layout';
import type { RunLifecycle } from '../logic/runLifecycle';

const HUD_COLOR = '#ffffff';
const HUD_X = 24;
const HUD_Y = 48;

export class Hud {
  private scoreText: Phaser.GameObjects.Text;
  private skipsText: Phaser.GameObjects.Text;
  private bestText: Phaser.GameObjects.Text;
  /** FUN2-C3 — pop scale hiện tại (1 = nghỉ; đỉnh SKIM.hudPopScaleMax — scale-only). */
  private popScale = 1;
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
      .setOrigin(0, 0) // pop scale quanh mép trái-giữa — không đụng vị trí neo
      .setData('testid', 'hud-score');
  this.skipsText = scene.add
      .text(HUD_X, HUD_Y + 40, 'SKIPS 0', style)
      .setDepth(20)
      .setOrigin(0, 0) // cùng neo với score — scale score không đè skips
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

  /** FUN2-C3 — pop HUD score: reset scale lên đỉnh (reset, không cộng dồn — spam-safe). */
  pop(): void {
    this.popScale = SKIM.hudPopScaleMax;
    this.applyPop();
  }

  /** FUN2-C3 — tiến decay pop về 1 theo delta render (ms); hitstop → 0 đứng hình đồng bộ. */
  update(deltaMs: number): void {
    if (this.popScale === 1) return;
    const t = Math.min(1, deltaMs / SKIM.hudPopMs);
    this.popScale = SKIM.hudPopScaleMax + (1 - SKIM.hudPopScaleMax) * t;
    if (t >= 1) this.popScale = 1;
    this.applyPop();
  }

  /** Scale-only: chỉ đụng scaleX/scaleY score — 0 đổi alpha/chữ/vị trí (AA T6 nguyên vẹn). */
  private applyPop(): void {
    this.scoreText.setScale(this.popScale);
  }

  /** Duyệt 3 text HUD (test + QA). */
  eachText(fn: (t: Phaser.GameObjects.Text) => void): void {
    fn(this.scoreText);
    fn(this.skipsText);
    fn(this.bestText);
  }

  // ---- mirror test (FUN2-C3 wiring — không lộ logic mới) ----
  popScaleForTest(): number {
    return this.popScale;
  }
}
