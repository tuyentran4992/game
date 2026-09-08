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

// Tints darken with depth but stay light enough to keep texture detail visible
// (multiplying an already-dark texture at 0.99aacc turned the trench pure black).
const BANDS_PX: BandSpec[] = [
  { key: 'bg_reef', topPx: SEA_TOP, botPx: SEA_TOP + 254, tint: 0xffffff },
  { key: 'bg_vents', topPx: SEA_TOP + 254, botPx: SEA_TOP + 604, tint: 0xe8f4ff },
  { key: 'bg_wreck', topPx: SEA_TOP + 604, botPx: SEA_TOP + 954, tint: 0xd6e4f8 },
  { key: 'bg_trench', topPx: SEA_TOP + 954, botPx: 1300, tint: 0xc6d8f2 },
];

// Shrink a sprite to `w` display width, keeping the source art's aspect ratio.
// Production PNGs ship far larger than their DESIGN-SPEC §3 display size.
function fitToWidth(img: Phaser.GameObjects.Image, w: number): void {
  img.setDisplaySize(w, Math.round((w * img.height) / img.width));
}

export class WorldLayer {
  private scene: Phaser.Scene;
  boat!: Phaser.GameObjects.Image;
  private hookSprite!: Phaser.GameObjects.Image;
  private hookDoubleSprite!: Phaser.GameObjects.Image;
  private pickupSprites = new Map<number, Phaser.GameObjects.Image>();
  private treasure!: Phaser.GameObjects.Image;
  private wave!: Phaser.GameObjects.Graphics;
  private ambientTimer = 0;

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
    for (let i = 0; i < BANDS_PX.length; i++) {
      const b = BANDS_PX[i]!;
      // 1px overlap into each neighbour (+2px at the world floor) so rounding
      // never exposes a black hairline seam or a strip of clear color
      const top = b.topPx - (i > 0 ? 1 : 0);
      const bot = b.botPx + (i < BANDS_PX.length - 1 ? 1 : 2);
      const h = bot - top;
      // layer 1: far parallax (0.3x), faded
      this.scene
        .add.image(240, top + h / 2, b.key)
        .setDisplaySize(480, h)
        .setAlpha(0.35)
        .setScrollFactor(0.3)
        .setDepth(1)
        .setTint(b.tint);
      // layer 2: near (1x)
      this.scene
        .add.image(240, top + h / 2, b.key)
        .setDisplaySize(480, h)
        .setDepth(2)
        .setTint(b.tint);
    }
    // Water veil: translucent depth-gradient over the whole column — turns the
    // vents band's black bubble-field art into deep navy, fades its white
    // specks, and blends hard seams between bands into one ocean.
    this.scene.add.image(240, 650, 'water_veil').setDisplaySize(480, 1300 - 0).setDepth(2.5);
    this.buildSeamShadows();
  }

  // Thermocline shadows: a stepped alpha ramp centred on every band boundary reads
  // as a natural dark depth transition instead of a hard tile seam (no shader needed).
  private buildSeamShadows(): void {
    const STEP_H = 12;
    const STEPS = 9; // steps on each side of the seam
    const SPAN = STEPS * STEP_H;
    for (let i = 1; i < BANDS_PX.length; i++) {
      const seamY = BANDS_PX[i]!.topPx;
      for (let s = -STEPS; s < STEPS; s++) {
        const cy = seamY + s * STEP_H + STEP_H / 2;
        const fade = 1 - Math.abs(cy - seamY) / SPAN; // 1 at the seam -> 0 at the edges
        this.scene.add.rectangle(240, cy, 480, STEP_H, 0x081827, 0.03 + fade * 0.3).setDepth(2.6);
      }
    }
  }

  private buildTreasure(): void {
    this.treasure = this.scene.add.image(240, 1252, 'treasure').setDepth(3);
    fitToWidth(this.treasure, 200); // DESIGN-SPEC §3: 200px wide (source 800x497)
    this.scene.tweens.add({
      targets: this.treasure,
      alpha: { from: 0.85, to: 1 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
    });
  }

  private buildBoat(): void {
    // Source art is 736x692 (near-square: tall fisherman + rod) while the sky
    // strip above the waterline is only SEA_TOP=96px — displaying it at natural
    // size clipped the fisherman's head off the top of the canvas. 140px wide
    // is the largest aspect-true fit that keeps the hat on screen through the
    // whole bob tween with the hull sitting ~25px below the waterline.
    this.boat = this.scene.add.image(240, SEA_TOP - 40, 'boat').setDepth(10);
    fitToWidth(this.boat, 140);
    // idle bob 2f
    this.scene.tweens.add({
      targets: this.boat,
      y: SEA_TOP - 44,
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
    // DESIGN-SPEC §3 display caps: hook 40x56 (≤48px), hook-double ≤64px.
    // Source art is 139x140 / 400x413 — natural size dwarfed the 480px world.
    this.hookSprite = this.scene.add.image(240, SEA_TOP + 10, 'hook').setDepth(12);
    fitToWidth(this.hookSprite, 48);
    this.hookDoubleSprite = this.scene.add
      .image(240, SEA_TOP + 10, 'hook_double')
      .setDepth(12)
      .setVisible(false);
    fitToWidth(this.hookDoubleSprite, 64);
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
        const img = this.scene.add.image(p.x, p.y, key).setDepth(4);
        // Per-key display size (DESIGN-SPEC §3). The sonar icon ships at 900x901
        // — at its old natural-ish scale it covered the whole deep-water band
        // with its black center and speckled rim, reading as a starry void.
        if (key === 'chest') fitToWidth(img, 56);
        else if (key === 'sonar') img.setDisplaySize(64, 64);
        else fitToWidth(img, 64); // hook_double pickup
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

  // Ambient bubbles rising through the camera view (the committed bubble.png was
  // never used ambiently). Deterministic pseudo-random column via a sine hash —
  // house style keeps Math.random out of render too.
  updateAmbient(state: GameState, timeS: number): void {
    this.ambientTimer -= 1 / 60;
    if (this.ambientTimer > 0) return;
    this.ambientTimer = 0.55;
    const h = Math.abs(Math.sin(timeS * 12.9898) * 43758.5453) % 1;
    const y = state.hookY + 480; // near the bottom of the view (camera keeps hook ~340 from top)
    if (y < SEA_TOP + 60) return;
    const x = 30 + h * 420;
    const b = this.scene.add.image(x, y, 'bubble').setDepth(3).setScale(0.2 + h * 0.3).setAlpha(0.5);
    this.scene.tweens.add({
      targets: b,
      y: y - 240,
      x: x + (h - 0.5) * 36,
      alpha: 0,
      duration: 5000,
      onComplete: () => b.destroy(),
    });
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
