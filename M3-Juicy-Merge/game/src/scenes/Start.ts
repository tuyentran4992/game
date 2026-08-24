import Phaser from 'phaser';
import { color, type, z, dur, fontStyle } from '../tokens';
import { drawButton, drawBackground, drawMuteButton } from '../ui';
import { fruitKey } from '../assets';
import { fruitDiameter } from '../gameplay/fruit-sprite';
import { ctx } from '../context';
import { getAlbumProgress } from '../logic/album';

// Start scene (step 14b) — title + decorative fruit chain + Play button, per
// DESIGN-SPEC §3.1 mockup. The real `logo` PNG was not generated (image API
// refused), so the title is Phaser text with a stroke (the mockup's "logo chữ có
// color.text.stroke"); the 12-fruit chain + corner watermelon are the gen'd
// sprites, used decoratively.
export class StartScene extends Phaser.Scene {
  /** Tracked decor images so a resize rebuilds them cleanly (destroy + redraw). */
  private chainImages: Phaser.GameObjects.Image[] = [];
  private cornerImage?: Phaser.GameObjects.Image;
  /** Button containers, repositioned together on resize (FIT keeps world fixed). */
  private menuButtons: Phaser.GameObjects.Container[] = [];

  constructor() { super({ key: 'StartScene' }); }

  create() {
    const { width, height } = this.scale;
    drawBackground(this);

    // --- Title (fallback for the un-gen'd logo) -----------------------------
    const title = this.add.text(width / 2, height * 0.26, 'JUICE MERGE', {
      ...fontStyle(type.display, color.primaryDark),
      fontSize: '60px',
    })
      .setOrigin(0.5).setDepth(z.hud)
      .setStroke(color.textStroke, 8);
    title.setData('testid', 'start-title');

    // --- Decorative fruit chain (cherry -> watermelon, mockup §3.1) ---------
    this.drawFruitChain(width / 2, height * 0.40);

    const btnW = Math.min(440, width - 64);

    // --- 1. Play Classic Mode Button ----------------------------------------
    const { container: playBtn } = drawButton(this, width / 2, height * 0.54, '▶  Chơi Cổ Điển', {
      testid: 'start-btn',
      variant: 'primary',
      width: btnW,
      height: 76,
      fontSize: 26,
    });
    playBtn.on('pointerdown', () => {
      this.startBgm();
      ctx.startClassicMode();
      this.cameras.main.fadeOut(dur.scene, 0, 0, 0);
      this.time.delayedCall(dur.scene, () => this.scene.start('GameplayScene'));
    });
    this.menuButtons.push(playBtn);

    // --- 2. Daily Challenge Mode Button -------------------------------------
    const isCompletedToday = ctx.isDailyCompletedToday();
    const dailyLabel = isCompletedToday ? '📅  Thử Thách Ngày (✓)' : '📅  Thử Thách Ngày';
    const { container: dailyBtn } = drawButton(this, width / 2, height * 0.63, dailyLabel, {
      testid: 'daily-btn',
      variant: 'amber',
      width: btnW,
      height: 70,
      fontSize: 24,
    });
    dailyBtn.on('pointerdown', () => {
      this.startBgm();
      ctx.startDailyChallenge();
      this.cameras.main.fadeOut(dur.scene, 0, 0, 0);
      this.time.delayedCall(dur.scene, () => this.scene.start('GameplayScene'));
    });

    // --- 3. Fruit Album / Encyclopedia Button -------------------------------
    const unlocked = ctx.score.getUnlockedTiers();
    const albumProgress = getAlbumProgress(unlocked);
    const { container: albumBtn } = drawButton(this, width / 2, height * 0.72, `📖  Bộ Sưu Tập (${albumProgress.unlockedCount}/12)`, {
      testid: 'album-btn',
      variant: 'emerald',
      width: btnW,
      height: 66,
      fontSize: 24,
    });
    albumBtn.on('pointerdown', () => {
      this.scene.pause();
      this.scene.launch('AlbumScene', { returnScene: 'StartScene' });
    });
    this.menuButtons.push(dailyBtn, albumBtn);

    // --- Corner watermelon decoration (alpha 0.5, mockup §3.1) ---------------
    this.drawCornerDecor(width, height);

    // Mute toggle in the top-right corner
    drawMuteButton(this);

    this.scale.on('resize', (g: Phaser.Structs.Size) => {
      title.setPosition(g.width / 2, g.height * 0.26);
      this.drawFruitChain(g.width / 2, g.height * 0.40);
      const menux = g.width / 2;
      const ry = [0.54, 0.63, 0.72];
      this.menuButtons.forEach((btn, i) => {
        if (ry[i] !== undefined && btn) btn.setPosition(menux, g.height * ry[i]!);
      });
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
