import Phaser from 'phaser';
import { color, type, z, dur, radius } from '../tokens';
import { drawButton, drawBackground, drawMuteButton } from '../ui';
import { fruitKey } from '../assets';
import { fruitDiameter } from '../gameplay/fruit-sprite';
import { ctx } from '../context';
import { getAlbumProgress } from '../logic/album';
import { DAILY_MILESTONES } from '../logic/daily-challenge';

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

    // --- 3. Streak Progress Indicator Card (2 Clean Lines with Auto-Fit) ------
    const streak = ctx.score.dailyStreakCount || 0;
    const diff = ctx.getCurrentDailyDifficulty();
    const streakY = height * 0.47;
    const streakH = 56;
    
    const streakBg = this.add.graphics().setDepth(z.hud);
    streakBg.fillStyle(0x000000, 0.12);
    streakBg.fillRoundedRect(width / 2 - btnW / 2, streakY - streakH / 2 + 2, btnW, streakH, 26);
    streakBg.fillStyle(0xFFFFFF, 0.96);
    streakBg.fillRoundedRect(width / 2 - btnW / 2, streakY - streakH / 2, btnW, streakH, 26);
    streakBg.lineStyle(2, 0xF59E0B, 0.9);
    streakBg.strokeRoundedRect(width / 2 - btnW / 2, streakY - streakH / 2, btnW, streakH, 26);

    const maxTextW = btnW - 32;

    const streakTxt1 = this.add.text(width / 2, streakY - 11, `🔥 Daily Streak: ${streak}/12 Days Completed`, {
      fontFamily: 'sans-serif',
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#92400E',
    }).setOrigin(0.5).setDepth(z.hud + 1);

    if (streakTxt1.width > maxTextW) {
      streakTxt1.setScale(maxTextW / streakTxt1.width);
    }

    const streakTxt2 = this.add.text(width / 2, streakY + 12, `🐉 Day 3   •   👑 Day 6   •   🌌 Day 12`, {
      fontFamily: 'sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#B45309',
    }).setOrigin(0.5).setDepth(z.hud + 1);

    if (streakTxt2.width > maxTextW) {
      streakTxt2.setScale(maxTextW / streakTxt2.width);
    }

    // --- 4. Main Menu Buttons ------------------------------------------------
    // A. Classic Mode Button (Pink Candy)
    const { container: playBtn } = drawButton(this, width / 2, height * 0.57, 'Classic Mode', {
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
    const { container: dailyBtn } = drawButton(this, width / 2, height * 0.67, dailyLabel, {
      testid: 'daily-btn',
      variant: 'amber',
      icon: '📅',
      width: btnW,
      height: 74,
      fontSize: 23,
    });
    dailyBtn.on('pointerdown', () => {
      this.showDailyChallengeModal();
    });

    // C. Fruit Album Button (Emerald Mint)
    const unlocked = ctx.score.getUnlockedTiers();
    const albumProgress = getAlbumProgress(unlocked);
    const { container: albumBtn } = drawButton(this, width / 2, height * 0.77, `Fruit Album (${albumProgress.unlockedCount}/${albumProgress.totalCount})`, {
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
      const ry = [0.57, 0.67, 0.77];
      this.menuButtons.forEach((btn, i) => {
        if (ry[i] !== undefined && btn) btn.setPosition(menux, g.height * ry[i]!);
      });
      this.drawCornerDecor(g.width, g.height);
    });
  }

  /**
   * Daily Challenge Summary & Roadmap Modal
   */
  private showDailyChallengeModal(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;
    const streak = ctx.score.dailyStreakCount || 0;
    const diff = ctx.getCurrentDailyDifficulty();
    const isCompletedToday = ctx.isDailyCompletedToday();

    // 1. Dark backdrop overlay
    const backdrop = this.add.rectangle(cx, cy, width, height, 0x0F172A, 0.75)
      .setDepth(z.panel + 20).setInteractive();

    // 2. Modal container
    const modal = this.add.container(cx, cy).setDepth(z.panel + 21).setScale(0.85).setAlpha(0);

    const cardW = Math.min(560, width - 36);
    const cardH = 740;
    const bg = this.add.graphics();

    // Shadow
    bg.fillStyle(0x000000, 0.28);
    bg.fillRoundedRect(-cardW / 2, -cardH / 2 + 10, cardW, cardH, radius.lg);

    // Body
    bg.fillStyle(0xFFFFFF, 0.98);
    bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, radius.lg);

    // Amber header accent
    bg.fillStyle(0xF59E0B, 1);
    bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, 18, { tl: radius.lg, tr: radius.lg, bl: 0, br: 0 });
    bg.lineStyle(3, 0xF59E0B, 0.9);
    bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, radius.lg);
    modal.add(bg);

    // Icon & Header
    const icon = this.add.text(0, -cardH / 2 + 50, '📅', { fontSize: '42px' }).setOrigin(0.5);
    const title = this.add.text(0, -cardH / 2 + 96, 'DAILY CHALLENGE ROADMAP', {
      fontFamily: 'sans-serif',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#B45309',
    }).setOrigin(0.5);
    const subtitle = this.add.text(0, -cardH / 2 + 126, 'Conquer 12 Days of trials to unlock 3 Legendary Fruits!', {
      fontFamily: 'sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#64748B',
    }).setOrigin(0.5);
    modal.add([icon, title, subtitle]);

    // Progress bar box
    const progBoxY = -cardH / 2 + 175;
    const progBoxW = cardW - 48;
    const progBg = this.add.graphics();
    progBg.fillStyle(0xF8FAFC, 1);
    progBg.fillRoundedRect(-progBoxW / 2, progBoxY - 24, progBoxW, 48, radius.md);
    progBg.lineStyle(1.5, 0xE2E8F0, 1);
    progBg.strokeRoundedRect(-progBoxW / 2, progBoxY - 24, progBoxW, 48, radius.md);
    modal.add(progBg);

    const progTxt = this.add.text(0, progBoxY - 7, `🔥 Progress: ${streak}/12 Days Completed`, {
      fontFamily: 'sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#B45309',
    }).setOrigin(0.5);
    modal.add(progTxt);

    const barW = progBoxW - 40;
    const barH = 8;
    const barY = progBoxY + 11;
    const pBarBg = this.add.graphics();
    pBarBg.fillStyle(0xE2E8F0, 1);
    pBarBg.fillRoundedRect(-barW / 2, barY, barW, barH, 4);
    modal.add(pBarBg);

    const pFillW = Math.max(8, (barW * Math.min(12, streak)) / 12);
    const pBarFill = this.add.graphics();
    pBarFill.fillStyle(0xF59E0B, 1);
    pBarFill.fillRoundedRect(-barW / 2, barY, pFillW, barH, 4);
    modal.add(pBarFill);

    // 3 Milestone Cards
    const msY = -cardH / 2 + 275;
    const msCardW = (cardW - 64) / 3;
    const msCardH = 105;
    const msSpacing = msCardW + 8;
    const msStartX = -msSpacing;

    DAILY_MILESTONES.forEach((ms, idx) => {
      const msX = msStartX + idx * msSpacing;
      const isReached = streak >= ms.milestoneDay;
      const msBg = this.add.graphics();

      msBg.fillStyle(isReached ? 0xFEF3C7 : 0xF8FAFC, 1);
      msBg.fillRoundedRect(msX - msCardW / 2, msY - msCardH / 2, msCardW, msCardH, radius.md);
      msBg.lineStyle(1.5, isReached ? 0xF59E0B : 0xCBD5E1, 1);
      msBg.strokeRoundedRect(msX - msCardW / 2, msY - msCardH / 2, msCardW, msCardH, radius.md);
      modal.add(msBg);

      const msEmoji = this.add.text(msX, msY - 26, ms.emoji, { fontSize: '28px' }).setOrigin(0.5);
      const msDay = this.add.text(msX, msY + 6, `Day ${ms.milestoneDay}`, {
        fontFamily: 'sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#0F172A',
      }).setOrigin(0.5);
      const msStatus = this.add.text(msX, msY + 28, isReached ? '✓ UNLOCKED' : ms.name, {
        fontFamily: 'sans-serif',
        fontSize: '10px',
        fontStyle: 'bold',
        color: isReached ? '#059669' : '#64748B',
      }).setOrigin(0.5);
      modal.add([msEmoji, msDay, msStatus]);
    });

    // Today's Challenge Info Card
    const todayY = -cardH / 2 + 410;
    const todayW = cardW - 48;
    const todayH = 110;
    const todayBg = this.add.graphics();
    todayBg.fillStyle(0xFFFBEB, 1);
    todayBg.fillRoundedRect(-todayW / 2, todayY - todayH / 2, todayW, todayH, radius.md);
    todayBg.lineStyle(2, 0xF59E0B, 0.8);
    todayBg.strokeRoundedRect(-todayW / 2, todayY - todayH / 2, todayW, todayH, radius.md);
    modal.add(todayBg);

    const todayTitle = this.add.text(0, todayY - 32, `🎯 TODAY'S TRIAL (DAY ${diff.dayLevel})`, {
      fontFamily: 'sans-serif',
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#B45309',
    }).setOrigin(0.5);

    const todayGoal = this.add.text(0, todayY - 4, `Target: ${diff.targetScore} pts   •   Limit: ${diff.fruitLimit} drops`, {
      fontFamily: 'sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#0F172A',
    }).setOrigin(0.5);

    const statusTag = isCompletedToday
      ? '✅ Completed for today! You can replay to practice.'
      : '⚡ Ready to play! Beat the goal to advance your streak.';
    const todayStatus = this.add.text(0, todayY + 24, statusTag, {
      fontFamily: 'sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      color: isCompletedToday ? '#059669' : '#D97706',
    }).setOrigin(0.5);
    modal.add([todayTitle, todayGoal, todayStatus]);

    // Action Buttons with generous spacing & 100% inside card
    const modalBtnW = cardW - 64;
    const startBtnY = 195;
    const closeBtnY = 270;

    const { container: startChallengeBtn } = drawButton(this, 0, startBtnY, '▶  START CHALLENGE', {
      variant: 'amber',
      width: modalBtnW,
      height: 64,
      fontSize: 22,
    });
    modal.add(startChallengeBtn);

    const { container: closeBtn } = drawButton(this, 0, closeBtnY, '✕  CLOSE', {
      variant: 'ghost',
      width: modalBtnW,
      height: 52,
      fontSize: 18,
    });
    modal.add(closeBtn);

    const closeModal = (): void => {
      this.tweens.add({
        targets: modal,
        scale: 0.85,
        alpha: 0,
        duration: dur.fast,
        ease: 'Back.easeIn',
        onComplete: () => {
          backdrop.destroy();
          modal.destroy();
        },
      });
    };

    closeBtn.on('pointerdown', closeModal);
    backdrop.on('pointerdown', closeModal);

    startChallengeBtn.on('pointerdown', () => {
      closeModal();
      this.startBgm();
      ctx.startDailyChallenge();
      this.cameras.main.fadeOut(dur.scene, 0, 0, 0);
      this.time.delayedCall(dur.scene, () => this.scene.start('GameplayScene'));
    });

    // Entrance tween
    this.tweens.add({
      targets: modal,
      scale: 1,
      alpha: 1,
      duration: dur.pop,
      ease: 'Back.easeOut',
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
