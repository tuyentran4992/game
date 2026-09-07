// Slice Studio — scenes/EndScene.ts (Tier B, thin)
import * as Phaser from 'phaser';
import { LEVELS, LEVEL_COUNT } from '../level/levels';
import { totalStars } from '../core/scoring';
import { fillPoly } from '../render/fx';
import type { Vec } from '../geom/path';

export class EndScene extends Phaser.Scene {
  private stars = 0;

  constructor() {
    super('EndScene');
  }

  init(data: { totalStars?: number }): void {
    // TraceScene passes the run award list via registry (simple + typed enough for proto)
    const awards = this.registry.get('awards') as { stars: number }[] | undefined;
    this.stars = data.totalStars ?? (awards ? totalStars(awards) : 0);
  }

  create(): void {
    const bg = this.add.graphics();
    bg.fillRoundedRect(160, 340, 400, 520, 28);
    bg.fillStyle(0x111827, 0.92);

    this.add.text(360, 420, 'ALL LEVELS CLEAR', {
      fontFamily: 'Arial', fontSize: '44px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(5);

    this.add.text(360, 540, '★'.repeat(Math.min(this.stars, LEVEL_COUNT * 3)), {
      fontFamily: 'Arial', fontSize: '60px', color: '#fde047',
    }).setOrigin(0.5).setDepth(5);

    this.add.text(360, 620, `${this.stars} / ${LEVEL_COUNT * 3} stars`, {
      fontFamily: 'Arial', fontSize: '34px', color: '#cbd5e1',
    }).setOrigin(0.5).setDepth(5);

    const again = this.add.text(360, 760, 'PLAY AGAIN', {
      fontFamily: 'Arial', fontSize: '40px', color: '#67e8f9', fontStyle: 'bold',
      backgroundColor: '#0e7490', padding: { x: 28, y: 12 },
    }).setOrigin(0.5).setDepth(5).setInteractive({ useHandCursor: true });
    again.on('pointerdown', () => {
      this.registry.set('awards', []);
      this.scene.start('TraceScene');
    });

    // decorative silhouette + cut
    const g = this.add.graphics().setDepth(1);
    const pts: Vec[] = [];
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      pts.push({ x: 360 + 130 * Math.cos(a), y: 300 + 110 * Math.sin(a) });
    }
    fillPoly(g, pts, 0x1f2937, 1);

    this.add.text(360, 900, 'Slice Studio — prototype', {
      fontFamily: 'Arial', fontSize: '22px', color: '#64748b',
    }).setOrigin(0.5).setDepth(5);

    void LEVELS;
  }
}
