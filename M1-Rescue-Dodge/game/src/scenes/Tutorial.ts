import Phaser from 'phaser';
import { color, type, sp, radius, z, dur, fontStyle, toColor } from '../tokens';
import { drawGradientBg } from '../ui';

export class TutorialScene extends Phaser.Scene {
  constructor() { super({ key: 'TutorialScene' }); }

  create() {
    const { width, height } = this.scale;
    drawGradientBg(this, color.bg.top, color.bg.bottom, color.grass);

    // Bong bóng tutorial (DESIGN-SPEC 3.4) — data-testid=tutorial-text
    const padX = sp[6], padY = sp[4];
    const t = this.add.text(width / 2, height * 0.35, 'Giữ để né ong', fontStyle(type.body, color.textPrimary))
      .setOrigin(0.5).setDepth(z.tutorial + 1);
    t.setData('testid', 'tutorial-text');
    const tw = t.width + padX * 2, th = t.height + padY * 2;
    const bubble = this.add.graphics().setDepth(z.tutorial);
    bubble.fillStyle(toColor(color.surfaceDim), 0.9);
    bubble.fillRoundedRect(width / 2 - tw / 2, height * 0.35 - th / 2, tw, th, radius.md);

    // Demo nhẹ: mèo + ong
    const cat = this.add.image(width / 2, height * 0.72, 'cat_idle').setDisplaySize(160, 160).setDepth(z.actor);
    const bee = this.add.image(width, height * 0.72, 'bee_wasp').setDisplaySize(80, 80).setDepth(z.actor);
    this.tweens.add({ targets: bee, x: cat.x - 200, duration: 1400, yoyo: true, repeat: -1, ease: 'sine.inout' });
    this.tweens.add({ targets: cat, y: height * 0.62, duration: 300, yoyo: true, repeat: 2, ease: 'cubic.inout', delay: 700 });

    // Auto-advance sau 3 giây (SPEC 7)
    this.time.delayedCall(3000, () => {
      this.cameras.main.fadeOut(dur.scene, 0, 0, 0);
      this.time.delayedCall(dur.scene, () => this.scene.start('GameplayScene'));
    });

    this.scale.on('resize', (g: Phaser.Structs.Size) => {
      cat.setPosition(g.width / 2, g.height * 0.72);
    });
  }
}
