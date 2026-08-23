import Phaser from 'phaser';
import { color, type, z, dur, fontStyle } from '../tokens';
import { drawButton, drawGradientBg } from '../ui';

// Start placeholder (boot test) — chi tiết art/UI theo DESIGN-SPEC M3 giao Claude/xử lý bước sau
export class StartScene extends Phaser.Scene {
  constructor() { super({ key: 'StartScene' }); }

  create() {
    const { width, height } = this.scale;
    drawGradientBg(this, color.bgTop, color.bgBottom, color.grass);

    const title = this.add.text(width / 2, height * 0.35, 'JUICE MERGE', fontStyle(type.display, color.primaryDark))
      .setOrigin(0.5).setDepth(z.hud);
    title.setData('testid', 'start-title');

    const { container } = drawButton(this, width / 2, height * 0.62, 'Play', { testid: 'start-btn' });
    container.on('pointerdown', () => {
      this.cameras.main.fadeOut(dur.scene, 0, 0, 0);
      this.time.delayedCall(dur.scene, () => this.scene.start('GameplayScene'));
    });

    this.scale.on('resize', (g: Phaser.Structs.Size) => {
      title.setPosition(g.width / 2, g.height * 0.35);
      container.setPosition(g.width / 2, g.height * 0.62);
    });
  }
}