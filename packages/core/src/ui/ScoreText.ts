import Phaser from 'phaser';
import type { GameTheme } from '../theme';

export class ScoreText {
  private scene: Phaser.Scene;
  private text: Phaser.GameObjects.Text;
  private glowText: Phaser.GameObjects.Text;
  private _value: number = 0;
  private prefix: string;
  private t: GameTheme | null;

  constructor(scene: Phaser.Scene, x: number, y: number, initialValue: number = 0, prefix: string = '', theme?: GameTheme) {
    this.scene = scene; this.prefix = prefix; this._value = initialValue; this.t = theme ?? null;
    const glowColor = this.t?.colors?.primary ?? 0x00f5ff;
    const colorHex = `#${glowColor.toString(16).padStart(6, '0')}`;

    this.glowText = scene.add.text(x, y, `${prefix}${initialValue}`, {
      fontFamily: this.t?.fonts?.mono ?? 'JetBrains Mono',
      fontSize: '36px', fontStyle: 'bold', color: colorHex,
      stroke: colorHex, strokeThickness: 8, align: 'center',
    });
    this.glowText.setOrigin(0.5); this.glowText.setAlpha(0.3);

    this.text = scene.add.text(x, y, `${prefix}${initialValue}`, {
      fontFamily: this.t?.fonts?.mono ?? 'JetBrains Mono',
      fontSize: '36px', fontStyle: 'bold', color: '#ffffff',
      stroke: '#000000', strokeThickness: 3, align: 'center',
    });
    this.text.setOrigin(0.5);
  }

  get value(): number { return this._value; }

  setValue(newValue: number, animate: boolean = true): void {
    const oldValue = this._value; this._value = newValue;
    if (animate && oldValue !== newValue) {
      const duration = Math.min(500, Math.max(200, Math.abs(newValue - oldValue) * 10));
      const timer = this.scene.time.addEvent({
        delay: 16, repeat: Math.floor(duration / 16),
        callback: () => {
          const p = timer.getOverallProgress();
          const d = `${this.prefix}${Math.round(oldValue + (newValue - oldValue) * p)}`;
          this.text.setText(d); this.glowText.setText(d);
        },
      });
      this.scene.tweens.add({ targets: [this.text, this.glowText], scaleX: 1.3, scaleY: 1.3, duration: 80, yoyo: true, ease: 'Power2' });
    } else {
      const d = `${this.prefix}${newValue}`;
      this.text.setText(d); this.glowText.setText(d);
    }
  }

  setPosition(x: number, y: number): void { this.text.setPosition(x, y); this.glowText.setPosition(x, y); }
  destroy(): void { this.text.destroy(); this.glowText.destroy(); }
}