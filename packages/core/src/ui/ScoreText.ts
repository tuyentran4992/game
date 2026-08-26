import Phaser from 'phaser';
import type { GameTheme } from '../theme';

/**
 * Animated score counter with neon glow effect.
 */
export class ScoreText {
  private scene: Phaser.Scene;
  private text: Phaser.GameObjects.Text;
  private glowText: Phaser.GameObjects.Text;
  private _value: number = 0;
  private prefix: string;
  private theme: GameTheme;

  constructor(scene: Phaser.Scene, x: number, y: number, initialValue: number = 0, prefix: string = '', theme: GameTheme) {
    this.scene = scene;
    this.prefix = prefix;
    this._value = initialValue;
    this.theme = theme;

    const t = theme;
    const colorHex = `#${t.colors.primary.toString(16).padStart(6, '0')}`;

    this.glowText = scene.add.text(x, y, `${prefix}${initialValue}`, {
      fontFamily: t.fonts.mono,
      fontSize: `${t.fontSizes.score}px`,
      fontStyle: 'bold',
      color: colorHex,
      stroke: colorHex,
      strokeThickness: 8,
      align: 'center',
    });
    this.glowText.setOrigin(0.5);
    this.glowText.setAlpha(0.3);

    this.text = scene.add.text(x, y, `${prefix}${initialValue}`, {
      fontFamily: t.fonts.mono,
      fontSize: `${t.fontSizes.score}px`,
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
      align: 'center',
    });
    this.text.setOrigin(0.5);
  }

  get value(): number { return this._value; }

  setValue(newValue: number, animate: boolean = true): void {
    const oldValue = this._value;
    this._value = newValue;

    if (animate && oldValue !== newValue) {
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

      this.scene.tweens.add({
        targets: [this.text, this.glowText],
        scaleX: 1.3, scaleY: 1.3,
        duration: 80, yoyo: true, ease: 'Power2',
      });
    } else {
      const display = `${this.prefix}${newValue}`;
      this.text.setText(display);
      this.glowText.setText(display);
    }
  }

  setPosition(x: number, y: number): void { this.text.setPosition(x, y); this.glowText.setPosition(x, y); }
  destroy(): void { this.text.destroy(); this.glowText.destroy(); }
}