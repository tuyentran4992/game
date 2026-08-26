/**
 * Neon Grid — Start Scene
 *
 * Thin scene: title screen with Play button.
 * Uses @game/core UI components for professional look.
 */

import Phaser from 'phaser';
import { Button } from '@game/core/ui';
import { palette, fonts, fontSizes, layout } from '@game/core/tokens';
import { ParticleEmitter } from '@game/core/ui';

export class StartScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Start' });
  }

  create(): void {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    // Background gradient
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a1a, 0x0a0a1a, 0x1a1a3e, 0x1a1a3e, 1);
    bg.fillRect(0, 0, this.scale.width, this.scale.height);

    // Decorative grid lines
    const deco = this.add.graphics();
    deco.lineStyle(1, 0x00f5ff, 0.05);
    for (let i = 0; i < 20; i++) {
      const y = i * 64;
      deco.lineBetween(0, y, this.scale.width, y);
    }
    for (let i = 0; i < 12; i++) {
      const x = i * 64;
      deco.lineBetween(x, 0, x, this.scale.height);
    }

    // Title
    this.add.text(cx, cy - 200, 'NEON GRID', {
      fontFamily: fonts.display.family,
      fontSize: '56px',
      fontStyle: '800',
      color: '#ffffff',
      stroke: '#00f5ff',
      strokeThickness: 4,
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(cx, cy - 130, 'Block Puzzle', {
      fontFamily: fonts.body.family,
      fontSize: '24px',
      color: '#8888bb',
    }).setOrigin(0.5);

    // Decorative blocks
    this.drawDecoBlocks(cx, cy - 280);

    // Play button
    const playBtn = new Button(this, cx, cy + 80, {
      variant: 'primary',
      label: '▶  PLAY',
      width: 260,
      height: 64,
      fontSize: 28,
      pulse: true,
    });
    playBtn.onClick(() => {
      ParticleEmitter.flash(this, 0x00f5ff, 200);
      this.cameras.main.fadeOut(200, 0, 0, 0);
      this.time.delayedCall(200, () => {
        this.scene.start('Gameplay');
      });
    });

    // High score
    const savedData = JSON.parse(localStorage.getItem('game_save') || '{}');
    const bestScore = savedData.score || 0;
    if (bestScore > 0) {
      this.add.text(cx, cy + 180, `BEST: ${bestScore}`, {
        fontFamily: fonts.mono.family,
        fontSize: '22px',
        color: '#00f5ff',
      }).setOrigin(0.5);
    }

    // Version
    this.add.text(cx, this.scale.height - 40, 'v1.0 · made with @game/core', {
      fontFamily: fonts.body.family,
      fontSize: '14px',
      color: '#555577',
    }).setOrigin(0.5);
  }

  private drawDecoBlocks(cx: number, cy: number): void {
    const g = this.add.graphics();
    const colors = [0x00f5ff, 0xff00ff, 0xffdd00, 0x00ff88, 0xff6600, 0xff2244, 0x4488ff];
    for (let i = 0; i < 7; i++) {
      const x = cx - 120 + i * 40;
      const y = cy + Math.sin(i * 1.2) * 15;
      g.fillStyle(colors[i], 0.8);
      g.fillRoundedRect(x, y, 28, 28, 4);
      g.fillStyle(0xffffff, 0.1);
      g.fillRoundedRect(x + 2, y + 1, 24, 12, { tl: 3, tr: 3, bl: 0, br: 0 });
    }
  }
}