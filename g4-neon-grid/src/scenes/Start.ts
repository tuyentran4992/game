import Phaser from 'phaser';
import { Button, ParticleEmitter } from '@game/core/ui';
import { neonGridTheme, blockColors } from '../ui/theme';

export class StartScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Start' });
  }

  create(): void {
    const t = neonGridTheme;
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(t.colors.bg, t.colors.bg, t.colors.surfaceDark, t.colors.surfaceDark, 1);
    bg.fillRect(0, 0, this.scale.width, this.scale.height);

    // Decorative grid lines
    const deco = this.add.graphics();
    deco.lineStyle(1, t.colors.primary, 0.05);
    for (let i = 0; i < 20; i++) deco.lineBetween(0, i * 64, this.scale.width, i * 64);
    for (let i = 0; i < 12; i++) deco.lineBetween(i * 64, 0, i * 64, this.scale.height);

    // Title
    this.add.text(cx, cy - 200, 'NEON GRID', {
      fontFamily: t.fonts.display,
      fontSize: '56px',
      fontStyle: '800',
      color: '#ffffff',
      stroke: '#00f5ff',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(cx, cy - 130, 'Block Puzzle', {
      fontFamily: t.fonts.body,
      fontSize: '24px',
      color: `#${t.colors.textSecondary.toString(16).padStart(6, '0')}`,
    }).setOrigin(0.5);

    // Decorative blocks
    this.drawDecoBlocks(cx, cy - 280);

    // PLAY button
    const playBtn = new Button(this, cx, cy + 80, {
      label: '▶  PLAY',
      width: 260,
      height: 64,
      fontSize: 28,
      pulse: true,
      theme: t,
    });
    playBtn.onClick(() => {
      ParticleEmitter.flash(this, t.colors.primary, 200);
      this.cameras.main.fadeOut(200, 0, 0, 0);
      this.time.delayedCall(200, () => this.scene.start('Gameplay'));
    });

    // Best score
    const saved = JSON.parse(localStorage.getItem('game_save') || '{}');
    const bestScore = saved.score || 0;
    if (bestScore > 0) {
      this.add.text(cx, cy + 180, `BEST: ${bestScore}`, {
        fontFamily: t.fonts.mono,
        fontSize: '22px',
        color: `#${t.colors.primary.toString(16).padStart(6, '0')}`,
      }).setOrigin(0.5);
    }

    // Version
    this.add.text(cx, this.scale.height - 40, 'v1.0 · @game/core', {
      fontFamily: t.fonts.body,
      fontSize: '14px',
      color: `#${t.colors.textMuted.toString(16).padStart(6, '0')}`,
    }).setOrigin(0.5);
  }

  private drawDecoBlocks(cx: number, cy: number): void {
    const g = this.add.graphics();
    for (let i = 0; i < 7; i++) {
      const x = cx - 120 + i * 40;
      const y = cy + Math.sin(i * 1.2) * 15;
      g.fillStyle(blockColors[i].fill, 0.8);
      g.fillRoundedRect(x, y, 28, 28, 4);
      g.fillStyle(0xffffff, 0.1);
      g.fillRoundedRect(x + 2, y + 1, 24, 12, { tl: 3, tr: 3, bl: 0, br: 0 });
    }
  }
}