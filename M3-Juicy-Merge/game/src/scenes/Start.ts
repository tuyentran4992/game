import Phaser from 'phaser';
import { color, type, z, dur, radius } from '../tokens';
import { drawButton, drawBackground, drawMuteButton } from '../ui';
import { fruitKey } from '../assets';
import { fruitDiameter } from '../gameplay/fruit-sprite';
import { ctx } from '../context';
import { getAlbumProgress } from '../logic/album';

export class StartScene extends Phaser.Scene {
  private chainImages: Phaser.GameObjects.Image[] = [];
  private chainBackdrop?: Phaser.GameObjects.Graphics;
  private cornerImage?: Phaser.GameObjects.Image;
  private menuButtons: Phaser.GameObjects.Container[] = [];
  private logoContainer?: Phaser.GameObjects.Container;

  constructor() { super({ key: 'StartScene' }); }

  create() {
    const { width, height } = this.scale;
    drawBackground(this);

    // --- 1. 3D Juicy Casual Logo ---------------------------------------------
    this.createJuicyLogo(width / 2, height * 0.22);

    // --- 2. Decorative Fruit Evolution Chain ---------------------------------
    this.drawFruitChain(width / 2, height * 0.38);

    const btnW = Math.min(440, width - 64);

    // --- 3. Streak Progress Indicator Card -----------------------------------
    const streak = ctx.score.dailyStreakCount || 0;
    const diff = ctx.getCurrentDailyDifficulty();
    const streakY = height * 0.47;
    
    // Frosted gold streak capsule (Enlarged and bold)
    const streakH = 50;
    const streakBg = this.add.graphics().setDepth(z.hud);
    streakBg.fillStyle(0x000000, 0.12);
    streakBg.fillRoundedRect(width / 2 - btnW / 2, streakY - streakH / 2 + 2, btnW, streakH, 25);
    streakBg.fillStyle(0xFFFFFF, 0.96);
    streakBg.fillRoundedRect(width / 2 - btnW / 2, streakY - streakH / 2, btnW, streakH, 25);
    streakBg.lineStyle(2, 0xF59E0B, 0.9);
    streakBg.strokeRoundedRect(width / 2 - btnW / 2, streakY - streakH / 2, btnW, streakH, 25);

    const streakTxt = this.add.text(width / 2, streakY, `🔥 Daily Streak: ${streak}/12 Days  •  🐉 Day 3  👑 Day 6  🌌 Day 12`, {
      fontFamily: 'sans-serif',
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#92400E',
    }).setOrigin(0.5).setDepth(z.hud + 1);

    // --- 4. Main Menu Buttons ------------------------------------------------
    // A. Classic Mode Button (Pink Candy)
    const { container: playBtn } = drawButton(this, width / 2, height * 0.56, 'Classic Mode', {
      testid: 'start-btn',
      variant: 'primary',
      icon: '▶',
      width: btnW,
      height: 76,
      fontSize: 27,
    });
    playBtn.on('pointerdown', () => {
      this.startBgm();
      ctx.startClassicMode();
      this.cameras.main.fadeOut(dur.scene, 0, 0, 0);
      this.time.delayedCall(dur.scene, () => this.scene.start('GameplayScene'));
    });
    this.menuButtons.push(playBtn);

    // B. Daily Challenge Button (Golden Amber)
    const isCompletedToday = ctx.isDailyCompletedToday();
    const dailyLabel = isCompletedToday
      ? `Daily Challenge (Completed ✓)`
      : `Daily Challenge: Day ${diff.dayLevel}/12 🔥`;
    const { container: dailyBtn } = drawButton(this, width / 2, height * 0.66, dailyLabel, {
      testid: 'daily-btn',
      variant: 'amber',
      icon: '📅',
      width: btnW,
      height: 74,
      fontSize: 24,
    });
    dailyBtn.on('pointerdown', () => {
      this.startBgm();
      ctx.startDailyChallenge();
      this.cameras.main.fadeOut(dur.scene, 0, 0, 0);
      this.time.delayedCall(dur.scene, () => this.scene.start('GameplayScene'));
    });

    // C. Fruit Album Button (Emerald Mint)
    const unlocked = ctx.score.getUnlockedTiers();
    const albumProgress = getAlbumProgress(unlocked);
    const { container: albumBtn } = drawButton(this, width / 2, height * 0.76, `Fruit Album (${albumProgress.unlockedCount}/${albumProgress.totalCount})`, {
      testid: 'album-btn',
      variant: 'emerald',
      icon: '📖',
      width: btnW,
      height: 72,
      fontSize: 24,
    });
    albumBtn.on('pointerdown', () => {
      this.scene.pause();
      this.scene.launch('AlbumScene', { returnScene: 'StartScene' });
    });
    this.menuButtons.push(dailyBtn, albumBtn);

    // --- 5. Ambient Mascot Decor ---------------------------------------------
    this.drawCornerDecor(width, height);

    // Mute toggle in the top-right corner
    drawMuteButton(this);

    this.scale.on('resize', (g: Phaser.Structs.Size) => {
      if (this.logoContainer) this.logoContainer.setPosition(g.width / 2, g.height * 0.22);
      this.drawFruitChain(g.width / 2, g.height * 0.38);
      const menux = g.width / 2;
      const ry = [0.56, 0.66, 0.76];
      this.menuButtons.forEach((btn, i) => {
        if (ry[i] !== undefined && btn) btn.setPosition(menux, g.height * ry[i]!);
      });
      this.drawCornerDecor(g.width, g.height);
    });
  }

  private createJuicyLogo(cx: number, cy: number): void {
    this.logoContainer = this.add.container(cx, cy).setDepth(z.hud);

    // 1. 3D Shadow Layer
    const shadow = this.add.text(0, 6, 'JUICE MERGE', {
      fontFamily: 'sans-serif',
      fontSize: '56px',
      fontStyle: 'bold',
      color: '#7A0C2E',
    }).setOrigin(0.5).setStroke('#50071C', 10);
    this.logoContainer.add(shadow);

    // 2. Main 3D White Outlined Logo
    const mainTitle = this.add.text(0, 0, 'JUICE MERGE', {
      fontFamily: 'sans-serif',
      fontSize: '56px',
      fontStyle: 'bold',
      color: '#FF4D6D',
    }).setOrigin(0.5).setStroke('#FFFFFF', 8);
    mainTitle.setData('testid', 'start-title');
    this.logoContainer.add(mainTitle);

    // 3. Sparkling decorative icons
    const starL = this.add.text(-195, -20, '✨', { fontSize: '28px' }).setOrigin(0.5);
    const starR = this.add.text(195, -20, '✨', { fontSize: '28px' }).setOrigin(0.5);
    this.logoContainer.add([starL, starR]);

    // 4. Mascot Fruit Wobble (Strawberry & Watermelon)
    if (this.textures.exists(fruitKey(1))) {
      const mascot1 = this.add.image(-220, 10, fruitKey(1)).setDisplaySize(50, 50);
      this.logoContainer.add(mascot1);
      this.tweens.add({
        targets: mascot1,
        angle: { from: -10, to: 10 },
        y: '-=6',
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    if (this.textures.exists(fruitKey(11))) {
      const mascot2 = this.add.image(220, 10, fruitKey(11)).setDisplaySize(58, 58);
      this.logoContainer.add(mascot2);
      this.tweens.add({
        targets: mascot2,
        angle: { from: 8, to: -8 },
        y: '-=8',
        duration: 1100,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // Gentle logo breathing animation
    this.tweens.add({
      targets: this.logoContainer,
      y: cy - 6,
      scaleX: 1.02,
      scaleY: 1.02,
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private startBgm(): void {
    if (!this.cache.audio.exists('bgm_main')) return;
    if (this.sound.get('bgm_main')) return;
    this.sound.play('bgm_main', { loop: true, volume: 0.4 });
  }

  private drawFruitChain(cx: number, cy: number): void {
    for (const img of this.chainImages) img.destroy();
    this.chainImages = [];
    this.chainBackdrop?.destroy();

    const n = 12;
    const maxChainW = Math.min(660, this.scale.width - 32);
    const slot = maxChainW / n;
    const x0 = cx - (slot * (n - 1)) / 2;
    const size = Math.min(42, slot - 4);

    // Frosted Capsule Backdrop for fruit chain
    this.chainBackdrop = this.add.graphics().setDepth(z.hud - 1);
    this.chainBackdrop.fillStyle(0xFFFFFF, 0.90);
    this.chainBackdrop.fillRoundedRect(cx - maxChainW / 2 - 8, cy - 26, maxChainW + 16, 52, 26);
    this.chainBackdrop.lineStyle(2, 0xCBD5E1, 0.8);
    this.chainBackdrop.strokeRoundedRect(cx - maxChainW / 2 - 8, cy - 26, maxChainW + 16, 52, 26);

    for (let tier = 0; tier < n; tier++) {
      const key = fruitKey(tier);
      if (!this.textures.exists(key)) continue;
      const img = this.add.image(x0 + tier * slot, cy, key)
        .setDisplaySize(size, size)
        .setDepth(z.hud)
        .setAlpha(0.98);
      this.chainImages.push(img);
    }
  }

  private drawCornerDecor(w: number, h: number): void {
    this.cornerImage?.destroy();
    const key = fruitKey(11); // watermelon
    if (!this.textures.exists(key)) return;
    const size = fruitDiameter(11);
    this.cornerImage = this.add.image(w - 12, h - 12, key)
      .setOrigin(1, 1)
      .setDisplaySize(size * 0.9, size * 0.9)
      .setDepth(z.bg + 1)
      .setAlpha(0.45);
  }
}
