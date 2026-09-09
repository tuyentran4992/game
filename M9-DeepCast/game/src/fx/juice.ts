// Juice: break flash/shake, splash, money float, sonar ring (DESIGN-SPEC §5 numbers).
import Phaser from 'phaser';
import type { GameState } from '../core/types.ts';
import { comboMult } from '../data/upgrades.ts';
import { sfx } from './audio.ts';

// Tier color by value (Stage C): bigger catch = hotter float, readable at a glance.
export const tierColor = (value: number): string =>
  value >= 120 ? '#E71D36' : value >= 60 ? '#FF9F1C' : value >= 25 ? '#FFE66D' : '#FFFFFF';

export interface FloatOpts {
  small?: boolean; // attach ping at the fish (vs the big surface-sell float)
  comboX?: number; // append the visible streak multiplier
}

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
        // sellHooked already advanced state.combo — the multiplier actually APPLIED
        // to this sale was the previous chain step (combo-1; exact for 1-fish sales,
        // which is the common case). The HUD chip shows the NEXT-sale multiplier.
        const bankedX = comboMult(Math.max(0, state.combo - 1));
        this.moneyFloat(hookX, hookY, e.value ?? 0, { comboX: bankedX });
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

  moneyFloat(x: number, y: number, value: number, opts: FloatOpts = {}): void {
    const color = tierColor(value);
    const combo = opts.comboX !== undefined && opts.comboX > 1 ? `  x${opts.comboX.toFixed(2)}` : '';
    const text = this.scene.add
      .text(x, y, `+$${Math.round(value)}${combo}`, {
        fontFamily: 'sans-serif',
        fontSize: opts.small ? '15px' : '22px',
        color,
        stroke: '#1B2A41',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(30);
    this.scene.tweens.add({
      targets: text,
      // the small attach ping lingers longer (1.4s) and rises less — a new player
      // needs the value to be READABLE, not a 0.9s flash (Stage C early reward)
      y: y - (opts.small ? 90 : 140),
      alpha: 0,
      duration: opts.small ? 1400 : 900,
      ease: 'Cubic.out',
      onComplete: () => text.destroy(),
    });
    // gold sparkles flying toward the HUD (DESIGN-SPEC §5); richer catch = more sparks
    const sparks = value >= 60 ? 10 : 6;
    for (let i = 0; i < sparks; i++) {
      const spark = this.scene.add.image(x, y, 'sparkle').setDepth(30).setScale(0.8);
      const angle = (Math.PI * 2 * i) / sparks;
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
