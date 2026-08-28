import Phaser from 'phaser';
import { color, type, radius, shadow, z, dur, fontStyle, toColor } from '../tokens';
import { drawButton } from '../ui';
import { ctx } from '../context';
import { sdk } from '@game/sdk';

export class GameOverScene extends Phaser.Scene {
  private root!: Phaser.GameObjects.Container;
  private bg!: Phaser.GameObjects.Image;

  constructor() { super({ key: 'GameOverScene' }); }

  async create(data: { score: number; bestScore: number; fish?: number; totalFish?: number; isNewRecord: boolean }) {
    const { width, height } = this.scale;
    const score = data?.score ?? 0;
    const best = data?.bestScore ?? 0;
    const fish = data?.fish ?? 0;
    const isNewRecord = data?.isNewRecord ?? false;

    this.sound.stopByKey('bgm_main');
    if (this.cache.audio.exists('sfx_gameover')) {
      this.sound.play('sfx_gameover', { volume: 0.45 });
    }

    // 1. High-resolution Background
    this.bg = this.add.image(width / 2, height / 2, 'bg_day').setDepth(z.bg);
    const bgScale = Math.max(width / this.bg.width, height / this.bg.height);
    this.bg.setScale(bgScale);

    // 2. Dark backdrop overlay
    const overlay = this.add.graphics().setDepth(z.bg + 1);
    overlay.fillStyle(0x0A0E1A, 0.75);
    overlay.fillRect(0, 0, width, height);
    overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains);

    // 3. Mobile-First Card Dimensions
    const pw = Math.min(330, width - 32);
    const canCont = ctx.engine.canContinue();
    const isShort = height < 560;
    const ph = isShort ? (canCont ? 505 : 445) : (canCont ? 555 : 495);
    const cx = width / 2;
    const cy = height / 2;

    this.root = this.add.container(cx, cy).setDepth(z.panel).setAlpha(0).setScale(0.88);

    // 4. Panel Background Graphics (Drawn inside root container centered at 0, 0)
    const panelG = this.add.graphics();
    // Ambient Drop Shadow
    panelG.fillStyle(toColor(color.shadow), shadow.panel.alpha);
    panelG.fillRoundedRect(-pw / 2, -ph / 2 + shadow.panel.dy, pw, ph, radius.lg);
    // Volumetric Surface Fill (Base surfaceDim + Top white)
    panelG.fillStyle(0xF8FAFC, 1);
    panelG.fillRoundedRect(-pw / 2, -ph / 2, pw, ph, radius.lg);
    panelG.fillStyle(0xFFFFFF, 0.94);
    panelG.fillRoundedRect(-pw / 2 + 3, -ph / 2 + 3, pw - 6, ph * 0.52, radius.lg - 2);
    // Primary Color Border (Candy 3D)
    panelG.lineStyle(4, toColor(color.primary), 1);
    panelG.strokeRoundedRect(-pw / 2, -ph / 2, pw, ph, radius.lg);
    // Subtle inner highlight line
    panelG.lineStyle(1.5, 0xFFFFFF, 0.70);
    panelG.strokeRoundedRect(-pw / 2 + 2, -ph / 2 + 2, pw - 4, ph - 4, radius.lg - 2);
    this.root.add(panelG);

    let curY = -ph / 2 + (isShort ? 24 : 30);

    // 5. Header: "GAME OVER"
    const title = this.add.text(0, curY, 'GAME OVER', fontStyle({ size: isShort ? '24px' : '26px', weight: '900', lh: 1 }, color.danger))
      .setOrigin(0.5);
    title.setShadow(0, 2, 'rgba(231, 76, 60, 0.35)', 4, false, true);
    this.root.add(title);
    curY += isShort ? 36 : 42;

    // 6. Mascot Avatar Sub-Container (Cat reaction with soft badge)
    const catBadgeRadius = isShort ? 28 : 34;
    const catSize = isShort ? 54 : 64;

    const avatarContainer = this.add.container(0, curY);

    const catBadgeG = this.add.graphics();
    catBadgeG.fillStyle(0xFFF3D6, 1);
    catBadgeG.fillCircle(0, 0, catBadgeRadius);
    catBadgeG.lineStyle(2, 0xFFA502, 1);
    catBadgeG.strokeCircle(0, 0, catBadgeRadius);
    avatarContainer.add(catBadgeG);

    const catImg = this.add.image(0, 0, ctx.engine.getSelectedSkinTexture())
      .setDisplaySize(catSize, catSize);
    avatarContainer.add(catImg);

    // Dazed / sweat reaction emoji
    const sweatTxt = this.add.text(catBadgeRadius * 0.75, -catBadgeRadius * 0.6, '💧', { fontSize: isShort ? '14px' : '16px' })
      .setOrigin(0.5);
    avatarContainer.add(sweatTxt);

    this.root.add(avatarContainer);

    // Bouncing/breathing animation on avatarContainer (container scale starts at 1, so 1.05 / 0.96 breathes naturally without distortion)
    this.tweens.add({
      targets: avatarContainer,
      scaleY: 1.05,
      scaleX: 0.96,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inout',
    });
    curY += catBadgeRadius + (isShort ? 14 : 18);

    // 7. New Record Banner (If achieved)
    if (isNewRecord) {
      const bannerW = pw - 60;
      const bannerH = 26;
      const bannerG = this.add.graphics();
      bannerG.fillStyle(0xFEF3C7, 1);
      bannerG.fillRoundedRect(-bannerW / 2, curY - bannerH / 2, bannerW, bannerH, 13);
      bannerG.lineStyle(1.5, 0xF59E0B, 1);
      bannerG.strokeRoundedRect(-bannerW / 2, curY - bannerH / 2, bannerW, bannerH, 13);
      this.root.add(bannerG);

      const recordTxt = this.add.text(0, curY, '★ NEW BEST RECORD! ★', fontStyle({ size: '12px', weight: '800', lh: 1 }, '#D97706'))
        .setOrigin(0.5);
      this.root.add(recordTxt);

      this.spawnSparkles(cx, cy + curY);
      curY += 28;
    }

    // 8. Score Card Box (Dedicated sleek card with count-up animation)
    const scoreBoxW = pw - 48;
    const scoreBoxH = isShort ? 66 : 74;
    const scoreBoxG = this.add.graphics();
    scoreBoxG.fillStyle(0xF8FAFC, 1);
    scoreBoxG.fillRoundedRect(-scoreBoxW / 2, curY, scoreBoxW, scoreBoxH, 14);
    scoreBoxG.lineStyle(1.5, 0xE2E8F0, 1);
    scoreBoxG.strokeRoundedRect(-scoreBoxW / 2, curY, scoreBoxW, scoreBoxH, 14);
    this.root.add(scoreBoxG);

    const scoreLabel = this.add.text(0, curY + 14, 'FINAL SCORE', fontStyle({ size: '11px', weight: '800', lh: 1 }, color.textSecondary))
      .setOrigin(0.5);
    this.root.add(scoreLabel);

    const finalScore = this.add.text(0, curY + (isShort ? 42 : 46), '0', fontStyle({ size: isShort ? '32px' : '36px', weight: '900', lh: 1 }, color.textPrimary))
      .setOrigin(0.5);
    finalScore.setData('testid', 'final-score');
    this.root.add(finalScore);

    // Number Count-Up Tween
    const scoreCounter = { val: 0 };
    this.tweens.add({
      targets: scoreCounter,
      val: score,
      duration: Math.min(650, Math.max(300, score * 12)),
      ease: 'cubic.out',
      onUpdate: () => {
        finalScore.setText(String(Math.floor(scoreCounter.val)));
      },
      onComplete: () => {
        finalScore.setText(String(score));
        this.tweens.add({
          targets: finalScore,
          scale: 1.15,
          duration: 120,
          yoyo: true,
          ease: 'back.out',
        });
      },
    });
    curY += scoreBoxH + (isShort ? 12 : 16);

    // 9. Stat Badges (Best Score & Fish Pills)
    const pillW = (pw - 56) / 2;
    const pillH = isShort ? 32 : 36;
    const pillY = curY + pillH / 2;

    // Left Pill: Best Score
    const bestPillG = this.add.graphics();
    bestPillG.fillStyle(0xF1F5F9, 1);
    bestPillG.fillRoundedRect(-pw / 2 + 24, curY, pillW, pillH, 10);
    bestPillG.lineStyle(1, 0xCBD5E1, 1);
    bestPillG.strokeRoundedRect(-pw / 2 + 24, curY, pillW, pillH, 10);
    this.root.add(bestPillG);

    const bestTxt = this.add.text(-pw / 2 + 24 + pillW / 2, pillY, `🏆 BEST: ${best}`, fontStyle({ size: '12px', weight: '800', lh: 1 }, color.textPrimary))
      .setOrigin(0.5);
    bestTxt.setData('testid', 'best-score');
    this.root.add(bestTxt);

    // Right Pill: Fish Collected
    const fishPillG = this.add.graphics();
    fishPillG.fillStyle(0xFFFBEB, 1);
    fishPillG.fillRoundedRect(pw / 2 - 24 - pillW, curY, pillW, pillH, 10);
    fishPillG.lineStyle(1, 0xFDE68A, 1);
    fishPillG.strokeRoundedRect(pw / 2 - 24 - pillW, curY, pillW, pillH, 10);
    this.root.add(fishPillG);

    const fishTxt = this.add.text(pw / 2 - 24 - pillW / 2, pillY, `🐟 +${fish} FISH`, fontStyle({ size: '12px', weight: '800', lh: 1 }, '#D97706'))
      .setOrigin(0.5);
    this.root.add(fishTxt);

    curY += pillH + (isShort ? 16 : 20);

    // 10. Action Buttons
    const btnWidth = Math.min(250, pw - 48);

    // Nút Primary: "🔁 Play Again"
    const retryBtnH = isShort ? 48 : 54;
    const retryBtn = drawButton(this, 0, curY + retryBtnH / 2, '🔁 Play Again', {
      width: btnWidth,
      height: retryBtnH,
      testid: 'retry-btn',
      textType: { size: isShort ? '17px' : '19px', weight: '900', lh: 1 },
    });
    this.root.add(retryBtn.container);

    retryBtn.container.on('pointerdown', async () => {
      retryBtn.container.disableInteractive();
      if (ctx.engine.shouldShowInterstitial()) {
        try { await sdk.requestInterstitialAd(); } catch { /* ignore */ }
      }
      this.cameras.main.fadeOut(dur.scene, 0, 0, 0);
      this.time.delayedCall(dur.scene, () => {
        this.scene.start('GameplayScene', { resume: false });
      });
    });
    curY += retryBtnH + (isShort ? 10 : 12);

    // Nút Secondary (Rewarded): "🎬 Revive (+1 Life)"
    if (canCont) {
      const contBtnH = isShort ? 42 : 46;
      const continueBtn = drawButton(this, 0, curY + contBtnH / 2, '🎬 Revive (+1 Life)', {
        variant: 'ghost',
        width: btnWidth,
        height: contBtnH,
        textType: { size: isShort ? '14px' : '15px', weight: '800', lh: 1 },
        testid: 'continue-btn',
      });
      this.root.add(continueBtn.container);

      continueBtn.container.on('pointerdown', async () => {
        continueBtn.textObj.setText('Loading…');
        continueBtn.container.setAlpha(0.6).disableInteractive();
        const earned = await sdk.requestRewardedAd('continue');
        if (earned) {
          ctx.engine.useContinue();
          this.cameras.main.fadeOut(dur.scene, 0, 0, 0);
          this.time.delayedCall(dur.scene, () => {
            this.scene.start('GameplayScene', { resume: true });
          });
        } else {
          continueBtn.textObj.setText('🎬 Revive (+1 Life)');
          continueBtn.container.setAlpha(1).setInteractive({ useHandCursor: true });
        }
      });
      curY += contBtnH + (isShort ? 10 : 12);
    }

    // Nút Ghost: "🏠 Main Menu"
    const menuBtnH = isShort ? 38 : 42;
    const menuBtn = drawButton(this, 0, curY + menuBtnH / 2, '🏠 Main Menu', {
      variant: 'ghost',
      width: btnWidth,
      height: menuBtnH,
      textType: { size: isShort ? '13px' : '14px', weight: '800', lh: 1 },
      testid: 'menu-btn',
    });
    this.root.add(menuBtn.container);
    menuBtn.container.on('pointerdown', () => {
      menuBtn.container.disableInteractive();
      this.cameras.main.fadeOut(dur.scene, 0, 0, 0);
      this.time.delayedCall(dur.scene, () => {
        this.scene.start('StartScene');
      });
    });

    // 11. Card Entrance Animation (Back.out pop)
    this.tweens.add({
      targets: this.root,
      alpha: 1,
      scale: 1,
      duration: dur.pop,
      ease: 'back.out',
    });

    // 12. Responsive Safe Centering on Window Resize
    const resizeListener = (gameSize: Phaser.Structs.Size) => {
      const nw = gameSize.width;
      const nh = gameSize.height;
      if (this.bg && this.bg.active) {
        this.bg.setPosition(nw / 2, nh / 2).setScale(Math.max(nw / this.bg.width, nh / this.bg.height));
      }
      if (this.root && this.root.active) {
        this.root.setPosition(nw / 2, nh / 2);
      }
    };
    this.scale.on('resize', resizeListener);
    this.events.once('shutdown', () => {
      this.scale.off('resize', resizeListener);
    });
  }

  private spawnSparkles(x: number, y: number) {
    for (let i = 0; i < 16; i++) {
      const p = this.add.circle(x, y, Phaser.Math.Between(3, 7), 0xF59E0B).setDepth(z.panel + 5);
      const angle = (i / 16) * Math.PI * 2;
      const dist = Phaser.Math.Between(30, 80);
      this.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        scale: 0.2,
        duration: 600,
        ease: 'quad.out',
        onComplete: () => p.destroy(),
      });
    }
  }
}
