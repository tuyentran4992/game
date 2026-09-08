// Static world visuals: sky, 4 depth bands (parallax 2 layers), boat, treasure, pickups.
import Phaser from 'phaser';
import type { GameState } from '../core/types.ts';
import { SEA_TOP } from '../data/world.ts';
import { WHALE_TOSS_DRIFT, WHALE_TOSS_DRIFT_S } from '../data/upgrades.ts';

interface BandSpec {
  key: string;
  topPx: number;
  botPx: number;
  tint: number;
}

const BANDS_PX: BandSpec[] = [
  { key: 'bg_reef', topPx: SEA_TOP, botPx: SEA_TOP + 254, tint: 0xffffff },
  { key: 'bg_vents', topPx: SEA_TOP + 254, botPx: SEA_TOP + 604, tint: 0xddeeff },
  { key: 'bg_wreck', topPx: SEA_TOP + 604, botPx: SEA_TOP + 954, tint: 0xb8cce8 },
  { key: 'bg_trench', topPx: SEA_TOP + 954, botPx: 1300, tint: 0x99aacc },
];

export class WorldLayer {
  private scene: Phaser.Scene;
  boat!: Phaser.GameObjects.Image;
  private hookSprite!: Phaser.GameObjects.Image;
  private hookDoubleSprite!: Phaser.GameObjects.Image;
  private pickupSprites = new Map<number, Phaser.GameObjects.Image>();
  private treasure!: Phaser.GameObjects.Image;
  private wave!: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.buildSky();
    this.buildBands();
    this.buildTreasure();
    this.buildBoat();
    this.buildWaves();
    this.buildHook();
  }

  private buildSky(): void {
    this.scene.add.rectangle(240, SEA_TOP / 2, 480, SEA_TOP, 0x8ecae6).setDepth(0);
    this.scene.add.rectangle(240, SEA_TOP / 2 + 8, 480, 6, 0xffffff, 0.35).setDepth(0);
  }

  private buildBands(): void {
    for (const b of BANDS_PX) {
      const h = b.botPx - b.topPx;
      // layer 1: far parallax (0.3x), faded
      this.scene
        .add.image(240, b.topPx + h / 2, b.key)
        .setDisplaySize(480, h)
        .setAlpha(0.35)
        .setScrollFactor(0.3)
        .setDepth(1)
        .setTint(b.tint);
      // layer 2: near (1x)
      this.scene
        .add.image(240, b.topPx + h / 2, b.key)
        .setDisplaySize(480, h)
        .setDepth(2)
        .setTint(b.tint);
    }
  }

  private buildTreasure(): void {
    this.treasure = this.scene.add.image(240, 1252, 'treasure').setDepth(3);
    this.scene.tweens.add({
      targets: this.treasure,
      alpha: { from: 0.85, to: 1 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
    });
  }

  private buildBoat(): void {
    this.boat = this.scene.add.image(240, SEA_TOP - 42, 'boat').setDepth(10);
    // idle bob 2f
    this.scene.tweens.add({
      targets: this.boat,
      y: SEA_TOP - 46,
      duration: 1300,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut',
    });
  }

  private buildWaves(): void {
    this.wave = this.scene.add.graphics().setDepth(11);
  }

  private buildHook(): void {
    this.hookSprite = this.scene.add.image(240, SEA_TOP + 10, 'hook').setDepth(12);
    this.hookDoubleSprite = this.scene.add
      .image(240, SEA_TOP + 10, 'hook_double')
      .setDepth(12)
      .setVisible(false);
  }

  syncPickups(state: GameState): void {
    for (const p of state.pickups) {
      if (p.taken) {
        const s = this.pickupSprites.get(p.uid);
        if (s) {
          s.destroy();
          this.pickupSprites.delete(p.uid);
        }
        continue;
      }
      if (!this.pickupSprites.has(p.uid)) {
        const key = p.defId === 'up-double' ? 'hook_double' : p.defId === 'up-sonar' ? 'sonar' : 'chest';
        const img = this.scene.add.image(p.x, p.y, key).setDepth(4).setScale(0.9);
        this.pickupSprites.set(p.uid, img);
      }
    }
  }

  // boat bob is a tween; drift while WHALE_TOSS (±36px over 2.4s) + rod bend by tension
  updateBoat(state: GameState, timeS: number): void {
    let drift = 0;
    if (state.whaleHooked) drift = WHALE_TOSS_DRIFT * Math.sin((2 * Math.PI * timeS) / WHALE_TOSS_DRIFT_S);
    const bend = state.tension > 80 ? 0.06 : state.tension > 55 ? 0.035 : 0.015;
    this.boat.x = 240 + drift;
    this.boat.rotation = Math.sin(timeS * 1.3) * 0.02 + (drift / WHALE_TOSS_DRIFT) * bend * 2;
  }

  updateHook(state: GameState, timeS: number, doubleHook: boolean): void {
    const sway = Math.sin(timeS * 3) * 0.1;
    this.hookSprite.setPosition(state.hookX, state.hookY).setRotation(sway);
    this.hookDoubleSprite.setPosition(state.hookX, state.hookY).setRotation(sway);
    this.hookSprite.setVisible(!doubleHook);
    this.hookDoubleSprite.setVisible(doubleHook);
  }

  drawWaves(timeS: number): void {
    const g = this.wave;
    g.clear();
    g.lineStyle(3, 0xffffff, 0.5);
    for (let i = 0; i < 3; i++) {
      g.beginPath();
      for (let x = 0; x <= 480; x += 16) {
        const y = SEA_TOP + 6 + i * 7 + Math.sin(timeS * 1.6 + x * 0.05 + i) * 3;
        if (x === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.strokePath();
    }
  }

  get hookAnchor(): { x: number; y: number } {
    return { x: this.boat.x + 20, y: this.boat.y + 38 };
  }
}
