import Phaser from 'phaser';
import { color, type, sp, radius, z, dur, fontStyle } from '../tokens';
import { drawButton, drawPanel, drawGradientBg } from '../ui';
import { ctx } from '../context';
import { sdk } from '../sdk-instance';

export class GameOverScene extends Phaser.Scene {
  constructor() { super({ key: 'GameOverScene' }); }

  async create(data: { score: number; bestScore: number; isNewRecord: boolean }) {
    const { width, height } = this.scale;
    const score = data?.score ?? 0;
    const best = data?.bestScore ?? 0;
    const isNewRecord = data?.isNewRecord ?? false;

    drawGradientBg(this, color.bg.top, color.bg.bottom, color.grass);

    // overlay tối (z40)
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.55).setDepth(z.overlay);

    // panel (3.3)
    const pw = Math.min(480, width - sp[8]), ph = Math.min(560, height - sp[8]);
    const panel = drawPanel(this, width / 2, height / 2, pw, ph);
    panel.setScale(0.8).setAlpha(0);
    this.tweens.add({ targets: panel, scale: 1, alpha: 1, duration: dur.pop, ease: 'back.out' });

    // title
    const title = this.add.text(width / 2, height / 2 - ph / 2 + 40, 'GAME OVER', fontStyle(type.h1, color.danger))
      .setOrigin(0.5).setDepth(z.panel + 1).setAlpha(0);

    // final score (data-testid=final-score)
    const finalScore = this.add.text(width / 2, height / 2 - 30, String(score), fontStyle(type.display, color.textPrimary))
      .setOrigin(0.5).setDepth(z.panel + 1).setAlpha(0);
    finalScore.setData('testid', 'final-score');
    const fsLabel = this.add.text(width / 2, height / 2 - 70, 'ĐIỂM', fontStyle(type.small, color.textPrimary))
      .setOrigin(0.5).setDepth(z.panel + 1).setAlpha(0);

    // best score (data-testid=best-score)
    const bestScore = this.add.text(width / 2, height / 2 + 40, String(best), fontStyle(type.h2, color.textPrimary))
      .setOrigin(0.5).setDepth(z.panel + 1).setAlpha(0);
    bestScore.setData('testid', 'best-score');
    const bsLabel = this.add.text(width / 2, height / 2 + 10, 'ĐIỂM CAO', fontStyle(type.small, color.textPrimary))
      .setOrigin(0.5).setDepth(z.panel + 1).setAlpha(0);

    if (isNewRecord) {
      this.add.text(width / 2, height / 2 - ph / 2 + 80, '★ KỶ lục mới!', fontStyle(type.small, color.warning))
        .setOrigin(0.5).setDepth(z.panel + 1).setAlpha(0);
    }

    // nút: retry luôn có; continue chỉ lượt 2+ (BR-09/10)
    const buttonsY = height / 2 + ph / 2 - 100;
    const retryBtn = drawButton(this, width / 2, buttonsY, 'Chơi lại', { testid: 'retry-btn' });
    retryBtn.container.setAlpha(0);
    retryBtn.container.on('pointerdown', async () => {
      // interstitial từ lượt 2+ (BR-09)
      if (ctx.engine.shouldShowInterstitial()) {
        try { await sdk.requestInterstitialAd(); } catch { /* ignore */ }
      }
      this.cameras.main.fadeOut(dur.scene, 0, 0, 0);
      this.time.delayedCall(dur.scene, () => this.scene.start('GameplayScene'));
    });

    let continueBtn: ReturnType<typeof drawButton> | null = null;
    if (ctx.engine.canContinue() && ctx.engine.shouldShowInterstitial()) {
      continueBtn = drawButton(this, width / 2, buttonsY + 88, 'Tiếp tục (xem ad)', { variant: 'ghost', width: 280, testid: 'continue-btn' });
      const btn = continueBtn; // non-null alias cho closure
      btn.container.setAlpha(0);
      btn.container.on('pointerdown', async () => {
        btn.textObj.setText('Đang tải…');
        btn.container.setAlpha(0.6).disableInteractive();
        const earned = await sdk.requestRewardedAd('continue');
        if (earned) {
          ctx.engine.useContinue();
          this.scene.start('GameplayScene', { resume: true });
        } else {
          btn.textObj.setText('Tiếp tục (xem ad)');
          btn.container.setAlpha(1).setInteractive({ useHandCursor: true });
        }
      });
    }

    // nút xuất hiện sau delay (5.2)
    this.time.delayedCall(100, () => {
      this.tweens.add({ targets: [title, finalScore, fsLabel, bestScore, bsLabel], alpha: 1, duration: dur.scene, ease: 'cubic.inout' });
      this.tweens.add({ targets: retryBtn.container, alpha: 1, duration: dur.scene, ease: 'cubic.inout' });
      if (continueBtn) this.tweens.add({ targets: continueBtn.container, alpha: 1, duration: dur.scene, ease: 'cubic.inout' });
    });

    // overlay fade in
    overlay.setAlpha(0);
    this.tweens.add({ targets: overlay, alpha: 0.55, duration: dur.scene, ease: 'cubic.inout' });

    this.scale.on('resize', (g: Phaser.Structs.Size) => {
      this.cameras.main.setSize(g.width, g.height);
    });
  }
}
