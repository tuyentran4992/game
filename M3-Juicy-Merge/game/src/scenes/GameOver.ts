import Phaser from 'phaser';
import { ctx } from '../context';
import { color, type, z, dur, fontStyle, radius } from '../tokens';
import { drawButton, drawMuteButton, type ButtonResult } from '../ui';
import { playFireworksCelebration } from '../gameplay/juice-effects';

export class GameOverScene extends Phaser.Scene {
  private continueBtn: ButtonResult | null = null;
  private retryBtn: Phaser.GameObjects.Container | null = null;

  constructor() { super({ key: 'GameOverScene' }); }

  create(): void {
    const { width, height } = this.scale;

    const score = ctx.engine.state.score;
    const prevBest = ctx.score.bestScore;
    const isNewRecord = score > 0 && score > prevBest;
    void ctx.onGameOver(score);

    // 1. Dim overlay
    this.add.rectangle(0, 0, width, height, 0x0F172A)
      .setOrigin(0).setAlpha(0.68).setDepth(z.overlay);

    drawMuteButton(this);

    const panelW = Math.min(520, width - 44);
    const panelH = 670;
    const cx = width / 2;
    const cy = height / 2;
    const panel = this.add.container(cx, cy).setDepth(z.panel);

    const card = this.add.graphics();
    // Outer drop shadow
    card.fillStyle(0x000000, 0.28);
    card.fillRoundedRect(-panelW / 2, -panelH / 2 + 10, panelW, panelH, radius.lg);

    // Frosted white glass body
    card.fillStyle(0xFFFFFF, 0.98);
    card.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, radius.lg);

    const diff = ctx.getCurrentDailyDifficulty();
    const isDailyWin = ctx.isDailyMode && score >= diff.targetScore;

    // Top Header Banner Accent
    card.fillStyle(isDailyWin ? 0xF59E0B : 0xFF4D6D, 1);
    card.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, 20, {
      tl: radius.lg, tr: radius.lg, bl: 0, br: 0,
    });
    // Inner outline
    card.lineStyle(2.5, isDailyWin ? 0xF59E0B : 0xFF4D6D, 0.9);
    card.strokeRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, radius.lg);
    panel.add(card);

    if (isDailyWin || isNewRecord) {
      playFireworksCelebration(this, 6, z.overlay + 30);
    }

    // 2. Title & Trophy Icon
    const trophyIcon = isDailyWin ? '🏆' : (isNewRecord ? '👑' : '🍉');
    const trophy = this.add.text(0, -panelH / 2 + 65, trophyIcon, { fontSize: '44px' }).setOrigin(0.5);
    panel.add(trophy);

    const titleText = isDailyWin ? 'DAILY VICTORY' : 'GAME OVER';
    const titleColor = isDailyWin ? '#B45309' : '#C9184A';
    const title = this.add.text(0, -panelH / 2 + 115, titleText, {
      fontFamily: 'sans-serif',
      fontSize: '32px',
      fontStyle: 'bold',
      color: titleColor,
    }).setOrigin(0.5).setStroke('#FFFFFF', 4);
    panel.add(title);
    title.setData('testid', 'gameover-title');

    if (isNewRecord) {
      this.showRecordBadge(panel, -panelH / 2 + 155);
    }

    // 3. Dual Score Card (2-column neat card)
    const best = ctx.engine.state.bestScore;
    const scoreCardW = panelW - 56;
    const scoreCardH = 110;
    const scoreCardY = isNewRecord ? -50 : -65;

    const scoreCardBg = this.add.graphics();
    scoreCardBg.fillStyle(0xF8FAFC, 1);
    scoreCardBg.fillRoundedRect(-scoreCardW / 2, scoreCardY - scoreCardH / 2, scoreCardW, scoreCardH, radius.md);
    scoreCardBg.lineStyle(2, 0xE2E8F0, 1);
    scoreCardBg.strokeRoundedRect(-scoreCardW / 2, scoreCardY - scoreCardH / 2, scoreCardW, scoreCardH, radius.md);
    // Center divider
    scoreCardBg.lineStyle(2, 0xCBD5E1, 0.8);
    scoreCardBg.lineBetween(0, scoreCardY - scoreCardH / 2 + 16, 0, scoreCardY + scoreCardH / 2 - 16);
    panel.add(scoreCardBg);

    // Left Column: SCORE
    const leftColX = -scoreCardW / 4;
    const finalLabel = this.add.text(leftColX, scoreCardY - 24, '💎 FINAL SCORE', {
      fontFamily: 'sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#64748B',
    }).setOrigin(0.5);
    const finalVal = this.add.text(leftColX, scoreCardY + 16, `${score}`, {
      fontFamily: 'sans-serif',
      fontSize: '32px',
      fontStyle: 'bold',
      color: '#0F172A',
    }).setOrigin(0.5);
    panel.add(finalLabel);
    panel.add(finalVal);
    finalVal.setData('testid', 'final-score');

    // Right Column: BEST
    const rightColX = scoreCardW / 4;
    const bestLabel = this.add.text(rightColX, scoreCardY - 24, '🏆 ALL-TIME BEST', {
      fontFamily: 'sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#D97706',
    }).setOrigin(0.5);
    const bestVal = this.add.text(rightColX, scoreCardY + 16, `${best}`, {
      fontFamily: 'sans-serif',
      fontSize: '32px',
      fontStyle: 'bold',
      color: '#B45309',
    }).setOrigin(0.5);
    panel.add(bestLabel);
    panel.add(bestVal);
    bestVal.setData('testid', 'best-score');

    // 4. Action Buttons (Playgama 3D Candy Buttons)
    const btnW = panelW - 64;
    const canContinue = ctx.engine.canContinue();

    if (canContinue) {
      const continueY = 35;
      const retryY = 125;
      const homeY = 210;

      const res = drawButton(this, 0, continueY, 'CONTINUE (Watch Ad)', {
        testid: 'continue-btn',
        variant: 'primary',
        icon: '▶',
        width: btnW,
        height: 70,
        fontSize: 23,
      });
      this.continueBtn = res;
      panel.add(res.container);
      res.container.on('pointerdown', () => { void this.onContinue(); });

      const { container: retryBtn } = drawButton(this, 0, retryY, 'PLAY AGAIN', {
        testid: 'retry-btn',
        variant: 'amber',
        icon: '🔄',
        width: btnW,
        height: 70,
        fontSize: 24,
      });
      this.retryBtn = retryBtn;
      panel.add(retryBtn);
      retryBtn.on('pointerdown', () => this.onRetry());

      const { container: homeBtn } = drawButton(this, 0, homeY, 'MAIN MENU', {
        testid: 'home-btn',
        variant: 'ghost',
        icon: '🏠',
        width: btnW,
        height: 56,
        fontSize: 20,
      });
      panel.add(homeBtn);
      homeBtn.on('pointerdown', async () => {
        await ctx.triggerSmartInterstitial();
        this.scene.stop('GameplayScene');
        this.scene.stop('GameOverScene');
        this.scene.start('StartScene');
      });
    } else {
      const retryY = 65;
      const homeY = 160;

      const { container: retryBtn } = drawButton(this, 0, retryY, 'PLAY AGAIN', {
        testid: 'retry-btn',
        variant: 'amber',
        icon: '🔄',
        width: btnW,
        height: 74,
        fontSize: 25,
      });
      this.retryBtn = retryBtn;
      panel.add(retryBtn);
      retryBtn.on('pointerdown', () => this.onRetry());

      const { container: homeBtn } = drawButton(this, 0, homeY, 'MAIN MENU', {
        testid: 'home-btn',
        variant: 'ghost',
        icon: '🏠',
        width: btnW,
        height: 60,
        fontSize: 21,
      });
      panel.add(homeBtn);
      homeBtn.on('pointerdown', async () => {
        await ctx.triggerSmartInterstitial();
        this.scene.stop('GameplayScene');
        this.scene.stop('GameOverScene');
        this.scene.start('StartScene');
      });
    }

    panel.setScale(0.85).setAlpha(0);
    this.input.enabled = true;
    this.tweens.add({
      targets: panel,
      scale: 1,
      alpha: 1,
      duration: dur.base,
      ease: 'Back.easeOut',
    });
  }

  private showRecordBadge(panel: Phaser.GameObjects.Container, y: number): void {
    const badge = this.add.text(0, y, '✨ NEW RECORD BROKEN! ✨', {
      fontFamily: 'sans-serif',
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#D97706',
    }).setOrigin(0.5).setStroke('#FFFFFF', 4);
    badge.setData('testid', 'record-popup');
    panel.add(badge);
    badge.setScale(0.4).setAlpha(0);
    this.tweens.add({
      targets: badge,
      scale: 1, alpha: 1,
      duration: dur.pop, ease: 'Back.easeOut',
    });
  }

  private async onContinue(): Promise<void> {
    if (!ctx.engine.canContinue()) return;
    this.continueBtn?.container.disableInteractive();
    const earned = await ctx.sdk.requestRewardedAd('continue');
    if (!earned) {
      this.showRewardDenied();
      return;
    }
    ctx.engine.useContinue();
    const gameplay = this.scene.get('GameplayScene') as { clearFruitsAboveDanger?: () => void };
    gameplay.clearFruitsAboveDanger?.();
    this.scene.resume('GameplayScene');
    this.scene.stop();
  }

  private showRewardDenied(): void {
    if (!this.continueBtn) return;
    this.continueBtn.container.disableInteractive();
    this.continueBtn.container.setAlpha(0.45);
    const hint = this.add.text(0, 260, 'Ad not completed', fontStyle(type.small, color.textSecondary))
      .setOrigin(0.5);
    this.tweens.add({
      targets: hint,
      alpha: { from: 0, to: 1 },
      duration: dur.base,
      yoyo: true, repeat: 1, repeatDelay: 600,
    });
  }

  private async onRetry(): Promise<void> {
    await ctx.triggerSmartInterstitial();
    ctx.startNewTurn();
    this.scene.start('GameplayScene');
  }
}
