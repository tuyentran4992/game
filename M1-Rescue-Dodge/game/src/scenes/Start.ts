import Phaser from 'phaser';
import { color, type, sp, z, dur, fontStyle } from '../tokens';
import { drawButton, drawGradientBg } from '../ui';
import { ctx } from '../context';

export class StartScene extends Phaser.Scene {
  constructor() { super({ key: 'StartScene' }); }

  create() {
    const { width, height } = this.scale;
    drawGradientBg(this, color.bg.top, color.bg.bottom, color.grass);

    // Mèo to idle (DESIGN-SPEC 4.1) — asset cat_idle, tween thở (5.4)
    const cat = this.add.image(width / 2, height * 0.38, 'cat_idle').setDisplaySize(260, 260).setDepth(z.actor);
    cat.setData('testid', 'cat-idle');
    this.tweens.add({ targets: cat, scaleY: 1.04, scaleX: 0.98, duration: 1600, yoyo: true, repeat: -1, ease: 'sine.inout' });

    // Play button (data-testid=start-btn)
    const { container } = drawButton(this, width / 2, height * 0.60, 'Play', { testid: 'start-btn' });
    container.on('pointerdown', () => {
      this.cameras.main.fadeOut(dur.scene, 0, 0, 0);
      this.time.delayedCall(dur.scene, () => this.scene.start('TutorialScene'));
    });

    // BR-05: responsive — re-center khi resize
    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      cat.setPosition(gameSize.width / 2, gameSize.height * 0.38);
      container.setPosition(gameSize.width / 2, gameSize.height * 0.60);
    });
  }
}
