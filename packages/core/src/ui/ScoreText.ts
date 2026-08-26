import Phaser from 'phaser';
import { palette, fonts, fontSizes, animation } from '../tokens';

/**
 * Animated score counter with neon glow effect.
 *
 * Usage:
 * ```ts
 * const score = new ScoreText(scene, 360, 100, 0);
 * score.setValue(42, true); // animates from current to 42
 * ```
 */
export class ScoreText {
  private scene: Phaser.Scene;
  private text: Phaser.GameObjects.Text;
  private glowText: Phaser.GameObjects.Text;
  private _value: number = 0;
  private prefix: string;

  constructor(scene: Phaser.Scene, x: number, y: number, initialValue: number = 0, prefix: string = '') {
    this.scene = scene;
    this.prefix = prefix;
    this._value = initialValue;

    // Glow layer (behind)
    this.glowText = scene.add.text(x, y, `${prefix}${initialValue}`, {
      fontFamily: fonts.mono.family,
      fontSize: `${fontSizes.score}px`,
      fontStyle: 'bold',
      color: '#00f5ff',
      stroke: '#00f5ff',
      strokeThickness: 8,
      align: 'center',
    });
    this.glowText.setOrigin(0.5);
    this.glowText.setAlpha(0.3);

    // Main text
    this.text = scene.add.text(x, y, `${prefix}${initialValue}`, {
      fontFamily: fonts.mono.family,
      fontSize: `${fontSizes.score}px`,
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
      align: 'center',
    });
    this.text.setOrigin(0.5);
  }

  get value(): number {
    return this._value;
  }

  setValue(newValue: number, animate: boolean = true): void {
    const oldValue = this._value;
    this._value = newValue;

    if (animate && oldValue !== newValue) {
      // Animated counter
      const duration = Math.min(500, Math.max(200, Math.abs(newValue - oldValue) * 10));
      const start = oldValue;
      const end = newValue;
      const timer = this.scene.time.addEvent({
        delay: 16,
        repeat: Math.floor(duration / 16),
        callback: () => {
          const progress = timer.getOverallProgress();
          const current = Math.round(start + (end - start) * progress);
          const display = `${this.prefix}${current}`;
          this.text.setText(display);
          this.glowText.setText(display);
        },
      });

      // Pop animation
      this.scene.tweens.add({
        targets: [this.text, this.glowText],
        scaleX: 1.3,
        scaleY: 1.3,
        duration: 80,
        yoyo: true,
        ease: 'Power2',
      });
    } else {
      const display = `${this.prefix}${newValue}`;
      this.text.setText(display);
      this.glowText.setText(display);
    }
  }

  setPosition(x: number, y: number): void {
    this.text.setPosition(x, y);
    this.glowText.setPosition(x, y);
  }

  destroy(): void {
    this.text.destroy();
    this.glowText.destroy();
  }
}