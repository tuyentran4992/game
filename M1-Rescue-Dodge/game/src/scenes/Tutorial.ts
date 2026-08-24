import Phaser from 'phaser';
import { color, type, sp, radius, z, dur, fontStyle, toColor } from '../tokens';
import { ctx } from '../context';

export class TutorialScene extends Phaser.Scene {
  constructor() { super({ key: 'TutorialScene' }); }

  create() {
    const { width, height } = this.scale;

    // Background
    const bg = this.add.image(width / 2, height / 2, 'bg_day').setDepth(z.bg);
    const bgScale = Math.max(width / bg.width, height / bg.height);
    bg.setScale(bgScale);

    const isPortrait = height >= width;
    const laneSpan = isPortrait ? Math.min(125, width * 0.28) : Math.min(120, height * 0.22);
    const centerX = width / 2;
    const catY = height * 0.75;

    // Bong bóng tutorial
    const padX = sp[6], padY = sp[4];
    const t = this.add.text(centerX, height * 0.24, 'Tap Left / Right to dodge', fontStyle(type.body, '#FFFFFF'))
      .setOrigin(0.5).setDepth(z.tutorial + 1);
    t.setData('testid', 'tutorial-text');
    const tw = t.width + padX * 2, th = t.height + padY * 2;
    const bubble = this.add.graphics().setDepth(z.tutorial);
    bubble.fillStyle(0x0F172A, 0.85);
    bubble.fillRoundedRect(centerX - tw / 2, height * 0.24 - th / 2, tw, th, radius.md);
    bubble.lineStyle(2, 0xFFA502, 1);
    bubble.strokeRoundedRect(centerX - tw / 2, height * 0.24 - th / 2, tw, th, radius.md);

    // Vẽ 2 vạch phân làn demo
    const g = this.add.graphics().setDepth(z.bg + 1);
    g.lineStyle(3, 0xFFFFFF, 0.6);
    for (let y = 0; y < height; y += 30) {
      g.strokeLineShape(new Phaser.Geom.Line(centerX - laneSpan / 2, y, centerX - laneSpan / 2, y + 16));
      g.strokeLineShape(new Phaser.Geom.Line(centerX + laneSpan / 2, y, centerX + laneSpan / 2, y + 16));
    }

    // Demo Mèo ở dưới & Ong rơi từ trên xuống
    const catH = Math.round(laneSpan * 0.52);
    const catW = catH;
    const beeSize = Math.round(laneSpan * 0.38);
    const cat = this.add.image(centerX, catY, ctx.engine.getSelectedSkinTexture()).setDisplaySize(catW, catH).setDepth(z.actor);
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

