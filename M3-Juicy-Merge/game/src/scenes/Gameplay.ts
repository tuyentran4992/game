import Phaser from 'phaser';
import { color, z, fontStyle, type } from '../tokens';
import { drawGradientBg } from '../ui';

// Gameplay placeholder (boot test) — bucket/physics/merge theo SPEC giao Claude code bước sau
export class GameplayScene extends Phaser.Scene {
  constructor() { super({ key: 'GameplayScene' }); }

  create() {
    const { width, height } = this.scale;
    drawGradientBg(this, color.bgTop, color.bgBottom, color.grass);
    const t = this.add.text(width / 2, height / 2, 'Gameplay (in progress)', fontStyle(type.h2, color.textPrimary))
      .setOrigin(0.5).setDepth(z.hud);
    t.setData('testid', 'game-canvas');
  }
}