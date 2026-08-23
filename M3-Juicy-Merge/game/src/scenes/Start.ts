import Phaser from 'phaser';
import { color, type, z, dur, fontStyle } from '../tokens';
import { drawButton, drawBackground } from '../ui';
import { fruitKey } from '../assets';
import { fruitDiameter } from '../gameplay/fruit-sprite';

// Start scene (step 14b) — title + decorative fruit chain + Play button, per
// DESIGN-SPEC §3.1 mockup. The real `logo` PNG was not generated (image API
// refused), so the title is Phaser text with a stroke (the mockup's "logo chữ có
// color.text.stroke"); the 12-fruit chain + corner watermelon are the gen'd
// sprites, used decoratively.
export class StartScene extends Phaser.Scene {
  /** Tracked decor images so a resize rebuilds them cleanly (destroy + redraw). */
  private chainImages: Phaser.GameObjects.Image[] = [];
  private cornerImage?: Phaser.GameObjects.Image;

  constructor() { super({ key: 'StartScene' }); }

  create() {
    const { width, height } = this.scale;
    drawBackground(this);

    // --- Title (fallback for the un-gen'd logo) -----------------------------
    // type.display 64px per mockup; bumped here so the title reads as a logo.
    const title = this.add.text(width / 2, height * 0.30, 'JUICE MERGE', {
      ...fontStyle(type.display, color.primaryDark),
      fontSize: '64px',
    })
      .setOrigin(0.5).setDepth(z.hud)
      .setStroke(color.textStroke, 8);
    title.setData('testid', 'start-title');

    // --- Decorative fruit chain (cherry -> watermelon, mockup §3.1) ---------
    this.drawFruitChain(width / 2, height * 0.46);

    // --- Play button (btn-primary 320x96, mockup §3.1) ----------------------
    const { container } = drawButton(this, width / 2, height * 0.66, 'Play', {
      testid: 'start-btn',
      width: 320,
      height: 96,
    });
    container.on('pointerdown', () => {
      // Start BGM on the user's Play tap (browsers block autoplay without a
      // gesture). Phaser's SoundManager is global, so the track keeps looping
      // across Start -> Gameplay -> GameOver.
      this.startBgm();
      this.cameras.main.fadeOut(dur.scene, 0, 0, 0);
      this.time.delayedCall(dur.scene, () => this.scene.start('GameplayScene'));
    });

    // --- Corner watermelon decoration (alpha 0.5, mockup §3.1) ---------------
    this.drawCornerDecor(width, height);

    this.scale.on('resize', (g: Phaser.Structs.Size) => {
      title.setPosition(g.width / 2, g.height * 0.30);
      this.drawFruitChain(g.width / 2, g.height * 0.46);
      container.setPosition(g.width / 2, g.height * 0.66);
      this.drawCornerDecor(g.width, g.height);
    });
  }

  /** Start the looping BGM (light volume so it never gets harsh on mobile).
   *  Guarded: no-op if the asset is missing or already playing. The global mute
   *  flag (set from sdk.isAudioEnabled in main) silences it automatically. */
  private startBgm(): void {
    if (!this.cache.audio.exists('bgm_main')) return;
    if (this.sound.get('bgm_main')) return; // already playing
    this.sound.play('bgm_main', { loop: true, volume: 0.4 });
  }

  /** Lay the 12-fruit chain (cherry -> watermelon) in a horizontal row, small
   *  sprites so the player previews the full merge line. Idempotent across
   *  resizes: prior images are destroyed before rebuilding. */
  private drawFruitChain(cx: number, cy: number): void {
    for (const img of this.chainImages) img.destroy();
    this.chainImages = [];
    const n = 12;
    const slot = 54; // fixed slot width; sprites scale to a uniform preview size
    const x0 = cx - (slot * (n - 1)) / 2;
    for (let tier = 0; tier < n; tier++) {
      const key = fruitKey(tier);
      if (!this.textures.exists(key)) continue; // skip missing (dev pre-asset)
      const size = 48; // uniform small preview size for the chain
      const img = this.add.image(x0 + tier * slot, cy, key)
        .setDisplaySize(size, size)
        .setDepth(z.hud)
        .setAlpha(0.92);
      this.chainImages.push(img);
    }
  }

  /** Large watermelon in the bottom-right corner at low alpha as ambient decor. */
  private drawCornerDecor(w: number, h: number): void {
    this.cornerImage?.destroy();
    const key = fruitKey(11); // watermelon
    if (!this.textures.exists(key)) return;
    const size = fruitDiameter(11); // biggest tier, ~244
    this.cornerImage = this.add.image(w - 8, h - 8, key)
      .setOrigin(1, 1)
      .setDisplaySize(size * 0.9, size * 0.9)
      .setDepth(z.bg + 1)
      .setAlpha(0.5);
  }
}
