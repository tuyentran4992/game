import Phaser from 'phaser';
import { color, type, sp, radius, z, dur, fontStyle, toColor } from '../tokens';
import { drawGradientBg } from '../ui';

export class TutorialScene extends Phaser.Scene {
  constructor() { super({ key: 'TutorialScene' }); }

  create() {
    const { width, height } = this.scale;
    drawGradientBg(this, color.bg.top, color.bg.bottom, color.grass);

    const isPortrait = height >= width;
    const laneSpan = isPortrait ? Math.min(125, width * 0.28) : Math.min(120, height * 0.22);
    const centerX = width / 2;
    const catY = height * 0.75;

    // Bong bóng tutorial (data-testid=tutorial-text)
    const padX = sp[6], padY = sp[4];
    const t = this.add.text(centerX, height * 0.28, 'Tap Left / Right to dodge', fontStyle(type.body, color.textPrimary))
      .setOrigin(0.5).setDepth(z.tutorial + 1);
    t.setData('testid', 'tutorial-text');
    const tw = t.width + padX * 2, th = t.height + padY * 2;
    const bubble = this.add.graphics().setDepth(z.tutorial);
    bubble.fillStyle(toColor(color.surfaceDim), 0.9);
    bubble.fillRoundedRect(centerX - tw / 2, height * 0.28 - th / 2, tw, th, radius.md);

    // Vẽ 2 vạch phân làn demo
    const g = this.add.graphics().setDepth(z.bg);
    g.lineStyle(3, toColor(color.lane), 0.35);
    for (let y = 0; y < height; y += 30) {
      g.strokeLineShape(new Phaser.Geom.Line(centerX - laneSpan / 2, y, centerX - laneSpan / 2, y + 16));
      g.strokeLineShape(new Phaser.Geom.Line(centerX + laneSpan / 2, y, centerX + laneSpan / 2, y + 16));
    }

    // Demo Mèo ở dưới & Ong rơi từ trên xuống
    const catH = Math.round(laneSpan * 0.52);
    const catW = Math.round(catH * 1.18);
    const beeSize = Math.round(laneSpan * 0.38);
    const cat = this.add.image(centerX, catY, 'cat_idle').setDisplaySize(catW, catH).setDepth(z.actor);
    const bee = this.add.image(centerX, height * 0.40, 'bee_wasp').setDisplaySize(beeSize, beeSize).setDepth(z.actor);

    // Mèo nhảy né sang phải rồi về giữa
    this.tweens.add({
      targets: cat,
      x: centerX + laneSpan,
      duration: 300,
      yoyo: true,
      repeat: 2,
      ease: 'cubic.inout',
      delay: 500,
    });

    // Ong bay xuống
    this.tweens.add({
      targets: bee,
      y: catY + 60,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inout',
    });

    // Auto-advance sau 3 giây (SPEC 7)
    this.time.delayedCall(3000, () => {
      this.cameras.main.fadeOut(dur.scene, 0, 0, 0);
      this.time.delayedCall(dur.scene, () => this.scene.start('GameplayScene', { resume: false }));
    });

    this.scale.on('resize', (sz: Phaser.Structs.Size) => {
      this.cameras.main.setSize(sz.width, sz.height);
    });
  }
}

