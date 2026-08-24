import Phaser from 'phaser';
import { color, type, sp, radius, shadow, z, dur, fontStyle, toColor } from '../tokens';
import { drawButton, drawGradientBg } from '../ui';
import { ctx } from '../context';
import { sdk } from '../sdk-instance';

export class GameOverScene extends Phaser.Scene {
  constructor() { super({ key: 'GameOverScene' }); }

  async create(data: { score: number; bestScore: number; fish?: number; totalFish?: number; isNewRecord: boolean }) {
    const { width, height } = this.scale;
    const score = data?.score ?? 0;
    const best = data?.bestScore ?? 0;
    const fish = data?.fish ?? 0;
    const isNewRecord = data?.isNewRecord ?? false;

    // F9 (ĐỢT 8): hiện màn Game Over → sfx_gameover; đảm bảo BGM đã dừng.
    this.sound.stopByKey('bgm_main');
    if (this.cache.audio.exists('sfx_gameover')) this.sound.play('sfx_gameover', { volume: 0.4 });

    // Nền + chi tiết rẻ tiền (F7: bụi cỏ + vạch lane đứt §2.3)
    drawGradientBg(this, color.bg.top, color.bg.bottom, color.grass);
    this.drawDecor(width, height);

    // overlay tối (z40) — DESIGN-SPEC §4.4
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, toColor(color.overlay), 0)
      .setDepth(z.overlay);
    this.tweens.add({ targets: overlay, alpha: 0.55, duration: dur.scene, ease: 'cubic.inout' });

    // ---- Panel (§3.3) + nội dung trong 1 container để slide-up (F7) ----
    const pw = Math.min(480, width - sp[8] * 2);
    const ph = Math.min(580, height - sp[8] * 2);
    const cx = width / 2;
    const cy = height / 2;
    // Bắt đầu lệch xuống 48px + trong suốt → slide-up (dur.slow) về giữa
    const root = this.add.container(cx, cy + 48).setDepth(z.panel).setAlpha(0);

    // Panel graphics (local 0,0): shadow trước, fill surface, border primary 4px
    const g = this.add.graphics();
    g.fillStyle(toColor(color.shadow), shadow.panel.alpha);
    g.fillRoundedRect(-pw / 2, -ph / 2 + shadow.panel.dy, pw, ph, radius.lg);
    g.fillStyle(toColor(color.surface), 1);
    g.fillRoundedRect(-pw / 2, -ph / 2, pw, ph, radius.lg);
    g.lineStyle(4, toColor(color.primary), 1);
    g.strokeRoundedRect(-pw / 2, -ph / 2, pw, ph, radius.lg);
    root.add(g);

    // Bố cục nội dung theo con trỏ y (local, padding sp[8]=32 mỗi cạnh)
    const pad = sp[8];
    let y = -ph / 2 + pad;

    // Title "GAME OVER" — type.h1, color.danger, bóng nhẹ cân đối (F7)
    const title = this.add.text(0, y + 21, 'GAME OVER', fontStyle(type.h1, color.danger))
      .setOrigin(0.5).setDepth(z.panel + 1);
    title.setShadow(0, 2, color.shadow, 3, false, true);
    root.add(title);
    y += 42 + sp[4]; // 16

    // Kỷ lục mới (nếu có) — type.small warning, ngay dưới title
    if (isNewRecord) {
      const star = this.add.text(0, y + 9, '★ NEW RECORD!', fontStyle(type.small, color.warning))
        .setOrigin(0.5).setDepth(z.panel + 1);
      root.add(star);
      y += 24;
    }

    // ĐIỂM (label) + final-score (data-testid=final-score)
    const fsLabel = this.add.text(0, y + 12, 'SCORE', fontStyle(type.small, color.textPrimary))
      .setOrigin(0.5).setDepth(z.panel + 1);
    root.add(fsLabel);
    y += 24 + sp[1]; // 4

    const finalScore = this.add.text(0, y + 24, String(score), fontStyle(type.display, color.textPrimary))
      .setOrigin(0.5).setDepth(z.panel + 1);
    finalScore.setData('testid', 'final-score');
    root.add(finalScore);
    y += 48 + sp[4];

    // ĐIỂM CAO (label) + best-score (data-testid=best-score)
    const bsLabel = this.add.text(0, y + 10, 'BEST: ' + best, fontStyle(type.small, color.textPrimary))
      .setOrigin(0.5).setDepth(z.panel + 1);
    bsLabel.setData('testid', 'best-score');
    root.add(bsLabel);
    y += 22;

    // CÁ VÀNG THU THẬP ĐƯỢC
    const fishLabel = this.add.text(0, y + 10, `🐟 ${fish} FISH COLLECTED`, fontStyle(type.small, color.warning))
      .setOrigin(0.5).setDepth(z.panel + 1);
    root.add(fishLabel);
    y += 28 + sp[4];

    // Nút "Chơi lại" = btn-primary (§3.1) — luôn có; phía trên
    const btnWidth = Math.min(280, pw - 32);
    const buttonsY = y + 36; // giữa nút 72px
    const retryBtn = drawButton(this, 0, buttonsY, 'Retry', { width: btnWidth, testid: 'retry-btn' });
    root.add(retryBtn.container);
    retryBtn.container.on('pointerdown', async () => {
      // interstitial từ lượt 2+ (BR-09)
      if (ctx.engine.shouldShowInterstitial()) {
        try { await sdk.requestInterstitialAd(); } catch { /* ignore */ }
      }
      this.cameras.main.fadeOut(dur.scene, 0, 0, 0);
      this.time.delayedCall(dur.scene, () => this.scene.start('GameplayScene', { resume: false }));
    });

    // Nút "Tiếp tục" = btn-ghost (§3.1) — hiển thị khi chưa dùng lượt tiếp tục (BR-10)
    let continueBtn: ReturnType<typeof drawButton> | null = null;
    if (ctx.engine.canContinue()) {
      continueBtn = drawButton(this, 0, buttonsY + 72 + sp[4], 'Continue',
        { variant: 'ghost', width: btnWidth, textType: type.h2, testid: 'continue-btn' });
      const btn = continueBtn; // non-null alias cho closure
      root.add(btn.container);
      btn.container.on('pointerdown', async () => {
        btn.textObj.setText('Loading…');
        btn.container.setAlpha(0.6).disableInteractive();
        const earned = await sdk.requestRewardedAd('continue');
        if (earned) {
          ctx.engine.useContinue();
          this.cameras.main.fadeOut(dur.scene, 0, 0, 0);
          this.time.delayedCall(dur.scene, () => {
            this.scene.start('GameplayScene', { resume: true });
          });
        } else {
          btn.textObj.setText('Continue');
          btn.container.setAlpha(1).setInteractive({ useHandCursor: true });
        }
      });
    }

    // slide-up + fade-in (F7: dur.slow) — panel + nội dung cùng trượt
    this.tweens.add({ targets: root, y: cy, alpha: 1, duration: dur.slow, ease: 'cubic.out' });

    this.scale.on('resize', (sz: Phaser.Structs.Size) => {
      this.cameras.main.setSize(sz.width, sz.height);
    });
  }

  // Chi tiết nền rẻ tiền (F7): bụi cỏ tam giác dọc mép cỏ + vạch lane đứt (§2.3)
  private drawDecor(width: number, height: number) {
    const g = this.add.graphics().setDepth(z.bg);
    const grassY = height * 0.62;
    // bụi cỏ tam giác nhỏ dọc mép cỏ
    g.fillStyle(toColor(color.grass), 1);
    for (let i = 0; i < width; i += 80) {
      const ox = i + 20;
      g.fillTriangle(ox, grassY, ox + 9, grassY - 16, ox + 18, grassY);
    }
    // vạch lane đứt (§2.3) ngay dưới mép cỏ
    g.lineStyle(4, toColor(color.lane), 0.35);
    const ly = grassY + 36;
    for (let x = 0; x < width; x += 30) {
      g.strokeLineShape(new Phaser.Geom.Line(x, ly, x + 18, ly));
    }
  }
}
