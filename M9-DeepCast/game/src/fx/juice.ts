// Juice: break flash/shake, splash, money float, sonar ring (DESIGN-SPEC §5 numbers).
import Phaser from 'phaser';
import type { GameState } from '../core/types.ts';
import { sfx } from './audio.ts';

export class Juice {
  private scene: Phaser.Scene;
  private alarmTimer = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  // call once per tick-event; dt in seconds
  handleEvents(state: GameState, events: { type: string; value?: number; text?: string }[], hookX: number, hookY: number): void {
    for (const e of events) {
      if (e.type === 'break' || e.type === 'shark-hit') {
        // red flash fullscreen 120ms + shake 8px 300ms (DESIGN-SPEC §5)
        this.scene.cameras.main.flash(120, 0xe7, 0x1d, 0x36);
        this.scene.cameras.main.shake(300, 0.008);
        sfx.play('creak');
      }
      if (e.type === 'dive-start') sfx.play('splash');
      if (e.type === 'attach') sfx.play('pop');
      if (e.type === 'surface' && (e.value ?? 0) > 0) {
        sfx.play('splash');
        this.moneyFloat(hookX, hookY, e.value ?? 0);
      }
      if (e.type === 'whale-hook') this.scene.cameras.main.shake(400, 0.006);
    }
    // tension >95 alarm beeps
    if (state.tension > 95) {
      this.alarmTimer -= 1 / 60;
      if (this.alarmTimer <= 0) {
        sfx.playAlarmBeep();
        this.alarmTimer = 0.3;
      }
    }
  }

  moneyFloat(x: number, y: number, value: number): void {
    const text = this.scene.add
      .text(x, y, `+$${Math.round(value)}`, {
        fontFamily: 'sans-serif', fontSize: '18px', color: '#FFE66D', stroke: '#1B2A41', strokeThickness: 4,
      })
      .setDepth(30);
    this.scene.tweens.add({
      targets: text,
      y: y - 140,
      alpha: 0,
      duration: 900,
      ease: 'Cubic.out',
      onComplete: () => text.destroy(),
    });
    // 6 gold sparkles flying toward the HUD (DESIGN-SPEC §5)
    for (let i = 0; i < 6; i++) {
      const spark = this.scene.add.image(x, y, 'sparkle').setDepth(30).setScale(0.8);
      const angle = (Math.PI * 2 * i) / 6;
      this.scene.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * 40,
        y: y + Math.sin(angle) * 40 - 30,
        alpha: 0,
        scale: 0.2,
        duration: 600,
        onComplete: () => spark.destroy(),
      });
    }
  }

  splashAt(x: number, y: number): void {
    const img = this.scene.add.image(x, y, 'splash').setDepth(12).setScale(0.7);
    this.scene.tweens.add({
      targets: img,
      alpha: 0,
      scale: 1.4,
      duration: 450,
      onComplete: () => img.destroy(),
    });
  }

  bubbles(x: number, y: number, count = 5): void {
    for (let i = 0; i < count; i++) {
      const b = this.scene.add
        .image(x + (i - count / 2) * 8, y, 'bubble')
        .setDepth(5)
        .setScale(0.3 + 0.1 * (i % 3));
      this.scene.tweens.add({
        targets: b,
        y: y - 90 - i * 10,
        alpha: 0,
        duration: 1200 + i * 100,
        onComplete: () => b.destroy(),
      });
    }
  }

  sonarRing(x: number, y: number): void {
    const ring = this.scene.add.image(x, y, 'sonar').setDepth(11).setScale(0.1).setAlpha(0.9);
    this.scene.tweens.add({
      targets: ring,
      scale: 1.6,
      alpha: 0,
      duration: 1200,
      onComplete: () => ring.destroy(),
    });
  }

  destroyAll(): void {
    // tweens tied to destroyed objects clean themselves; nothing persistent here
  }
}
