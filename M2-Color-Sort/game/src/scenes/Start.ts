import Phaser from 'phaser';
import { color, type, sp, z, dur, glow, fontStyle, toColor } from '../tokens';
import { drawButton, drawGalaxyBg, drawTube, renderLiquid, synthAudio, GalaxyBgObjects } from '../ui';
import { ctx } from '../context';

export class StartScene extends Phaser.Scene {
  private bgObjects!: GalaxyBgObjects;
  private titleContainer!: Phaser.GameObjects.Container;
  private demoContainer!: Phaser.GameObjects.Container;
  private startBtn!: Phaser.GameObjects.Container;
  private caption!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'StartScene' });
  }

  async create() {
    await ctx.load();
    const { width, height } = this.scale;
    this.bgObjects = drawGalaxyBg(this);

    // 1. Logo / Title container (Crisp & Static, zero text scaling jitter)
    this.titleContainer = this.add.container(width / 2, height * 0.22).setDepth(z.hud).setAlpha(0);

    const title1 = this.add.text(0, -18, 'NEON SORT', fontStyle(type.display, color.surface))
      .setOrigin(0.5);
    title1.setShadow(0, 3, 'rgba(0,0,0,0.7)', 6, false, true);

    const title2 = this.add.text(0, 30, '⚡ GALAXY POUR ⚡', fontStyle(type.h1, color.accent))
      .setOrigin(0.5);
    title2.setShadow(0, 2, color.accent, 10, false, true);

    this.titleContainer.add([title1, title2]);

    // Smooth single entrance transition
    this.tweens.add({
      targets: this.titleContainer,
      y: height * 0.22,
      alpha: 1,
      duration: 400,
      ease: 'cubic.out',
    });

    // 2. Demo Ống Nghiệm minh họa
    this.demoContainer = this.add.container(width / 2, height * 0.48).setDepth(z.actor).setScale(0.85).setAlpha(0);

    const tube1 = drawTube(this, 76, 180, 4);
    tube1.container.setPosition(-54, 0);
    renderLiquid(tube1, ['#00E5FF', '#FF2EC4', '#00E5FF', '#A8FF3E']);
    this.demoContainer.add(tube1.container);

    const tube2 = drawTube(this, 76, 180, 4);
    tube2.container.setPosition(54, 0);
    renderLiquid(tube2, ['#FF2EC4', '#A8FF3E', '#FFC400', '#FF2EC4']);
    this.demoContainer.add(tube2.container);

    // Smooth entrance
    this.tweens.add({
      targets: this.demoContainer,
      scale: 1,
      alpha: 1,
      duration: 450,
      delay: 100,
      ease: 'back.out',
    });

    // 3. Neon Play Button (data-testid: start-btn)
    const { container } = drawButton(this, width / 2, height * 0.72, '▶ PLAY', {
      testid: 'start-btn',
      width: 270,
      height: 72,
      variant: 'primary',
      glowColor: color.primary,
    });
    this.startBtn = container;
    this.startBtn.setAlpha(0).setScale(0.9);

    // Smooth button entrance
    this.tweens.add({
      targets: this.startBtn,
      alpha: 1,
      scale: 1,
      duration: 450,
      delay: 180,
      ease: 'back.out',
    });

    this.startBtn.on('pointerdown', () => {
      synthAudio.playClick();
      this.cameras.main.fadeOut(dur.scene, 0, 0, 0);
      this.time.delayedCall(dur.scene, () => this.scene.start('GameplayScene'));
    });

    // 4. Caption Level
    const startLevel = Math.max(1, ctx.currentLevel);
    this.caption = this.add.text(
      width / 2,
      height * 0.81,
      `Start Level ${startLevel}`,
      fontStyle(type.small, color.accent),
    ).setOrigin(0.5).setDepth(z.hud).setAlpha(0);
    this.caption.setShadow(0, 2, color.shadow, 4, false, true);

    this.tweens.add({
      targets: this.caption,
      alpha: 0.9,
      duration: 400,
      delay: 250,
      ease: 'quad.out',
    });

    this.scale.on('resize', (g: Phaser.Structs.Size) => {
      this.titleContainer.setPosition(g.width / 2, g.height * 0.22);
      this.demoContainer.setPosition(g.width / 2, g.height * 0.48);
      this.startBtn.setPosition(g.width / 2, g.height * 0.72);
      this.caption.setPosition(g.width / 2, g.height * 0.81);
    });
  }
}
