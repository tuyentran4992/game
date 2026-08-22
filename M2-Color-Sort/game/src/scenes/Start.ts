import Phaser from 'phaser';
import { color, type, sp, z, dur, glow, fontStyle, toColor } from '../tokens';
import { drawButton, drawGalaxyBg, drawTube, renderLiquid } from '../ui';
import { ctx } from '../context';

// StartScene M2 (DESIGN-SPEC §4.1) — nền galaxy + title + ống minh họa + nút Chơi.
export class StartScene extends Phaser.Scene {
  constructor() { super({ key: 'StartScene' }); }

  async create() {
    await ctx.load();
    const { width, height } = this.scale;
    drawGalaxyBg(this);

    // Title "NEON SORT / GALAXY POUR" (DESIGN-SPEC §4.1) — type.display, color.surface + stroke
    const title1 = this.add.text(width / 2, height * 0.22, 'NEON SORT', fontStyle(type.display, color.surface))
      .setOrigin(0.5).setDepth(z.hud);
    title1.setShadow(0, 3, color.shadow, 5, false, true);
    const title2 = this.add.text(width / 2, height * 0.30, 'GALAXY POUR', fontStyle(type.h1, color.accent))
      .setOrigin(0.5).setDepth(z.hud);
    title2.setShadow(0, 2, color.shadow, 4, false, true);

    // Ống minh họa (DESIGN-SPEC §4.1) — 1 ống chất lỏng neon glow nhấp nháy
    const demo = drawTube(this, 96, 240, 4);
    demo.container.setPosition(width / 2, height * 0.50).setDepth(z.actor);
    renderLiquid(demo, ['#00E5FF', '#FF2EC4', '#00E5FF', '#A8FF3E']);
    // tween glow nhấp nháy nhẹ
    this.tweens.add({
      targets: demo.container, scaleY: 1.04, scaleX: 0.98, duration: dur.slow * 2,
      yoyo: true, repeat: -1, ease: 'sine.inout',
    });

    // Nút Chơi (data-testid=start-btn) — btn-primary neon (§3.5)
    const { container } = drawButton(this, width / 2, height * 0.72, 'Chơi', { testid: 'start-btn' });
    container.on('pointerdown', () => {
      this.cameras.main.fadeOut(dur.scene, 0, 0, 0);
      this.time.delayedCall(dur.scene, () => this.scene.start('GameplayScene'));
    });

    // caption "Lv X bắt đầu" (DESIGN-SPEC §4.1) — type.small
    const startLevel = Math.max(1, ctx.currentLevel);
    this.add.text(width / 2, height * 0.80, `Lv ${startLevel} bắt đầu`, fontStyle(type.small, color.surface))
      .setOrigin(0.5).setAlpha(0.8).setDepth(z.hud).setShadow(0, 2, color.shadow, 3, false, true);

    this.scale.on('resize', (g: Phaser.Structs.Size) => {
      title1.setPosition(g.width / 2, g.height * 0.22);
      title2.setPosition(g.width / 2, g.height * 0.30);
      demo.container.setPosition(g.width / 2, g.height * 0.50);
      container.setPosition(g.width / 2, g.height * 0.72);
    });
  }
}
