import Phaser from 'phaser';
import { color, radius, z, dur } from '../tokens';
import { FRUIT_ENCYCLOPEDIA, getAlbumProgress } from '../logic/album';
import { resolveFruitTexture } from '../gameplay/fruit-sprite';
import { ctx } from '../context';
import { drawButton } from '../ui';

export class AlbumScene extends Phaser.Scene {
  private returnScene = 'StartScene';

  constructor() { super({ key: 'AlbumScene' }); }

  init(data: { returnScene?: string }): void {
    if (data.returnScene) this.returnScene = data.returnScene;
  }

  create(): void {
    const { width, height } = this.scale;
    const unlocked = ctx.score.getUnlockedTiers();
    const progress = getAlbumProgress(unlocked);

    // 1. Semi-transparent backdrop overlay
    const backdrop = this.add.rectangle(width / 2, height / 2, width, height, 0x0F172A, 0.70)
      .setDepth(z.overlay).setInteractive();

    // 2. Modal Window Container
    const modal = this.add.container(width / 2, height / 2).setDepth(z.panel).setScale(0.8).setAlpha(0);

    const cardW = Math.min(660, width - 36);
    const cardH = Math.min(980, height - 60);
    const bg = this.add.graphics();

    // Soft outer shadow
    bg.fillStyle(0x000000, 0.25);
    bg.fillRoundedRect(-cardW / 2, -cardH / 2 + 8, cardW, cardH, radius.lg);

    // Frosted white glass body
    bg.fillStyle(0xFFFFFF, 0.98);
    bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, radius.lg);
    bg.lineStyle(3, 0x10B981, 0.9);
    bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, radius.lg);
    modal.add(bg);

    // Header Title
    const title = this.add.text(0, -cardH / 2 + 38, '📖 FRUIT ENCYCLOPEDIA', {
      fontFamily: 'sans-serif',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#0F172A',
    }).setOrigin(0.5);
    modal.add(title);

    // Progress Subtitle & Badge
    const subtitle = this.add.text(0, -cardH / 2 + 70, `${progress.unlockedCount}/${progress.totalCount} Unlocked • ${progress.title}`, {
      fontFamily: 'sans-serif',
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#D97706',
    }).setOrigin(0.5);
    modal.add(subtitle);

    // Progress Bar
    const barW = Math.min(500, cardW - 80);
    const barH = 12;
    const barY = -cardH / 2 + 94;
    const pBg = this.add.graphics();
    pBg.fillStyle(0xE2E8F0, 1);
    pBg.fillRoundedRect(-barW / 2, barY, barW, barH, 6);
    modal.add(pBg);

    const fillW = Math.max(12, (barW * progress.percentage) / 100);
    const pFill = this.add.graphics();
    pFill.fillStyle(0x10B981, 1);
    pFill.fillRoundedRect(-barW / 2, barY, fillW, barH, 6);
    pFill.fillStyle(0x6EE7B7, 0.8);
    pFill.fillRect(-barW / 2 + 2, barY + 2, fillW - 4, 3);
    modal.add(pFill);

    // 3. Grid of 15 Fruits (3 columns x 5 rows)
    const cols = 3;
    const spacingX = Math.min(180, (cardW - 40) / cols);
    const spacingY = 135;
    const startX = -spacingX * ((cols - 1) / 2);
    const startY = -cardH / 2 + 165;

    for (let i = 0; i < FRUIT_ENCYCLOPEDIA.length; i++) {
      const info = FRUIT_ENCYCLOPEDIA[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = startX + col * spacingX;
      const cy = startY + row * spacingY;
      const isUnlocked = unlocked.has(info.tier);
      const isLegendary = info.tier >= 12;

      // Card slot background
      const slotBg = this.add.graphics();
      let slotFill = isUnlocked ? 0xF0FDF4 : 0xF8FAFC;
      let slotStroke = isUnlocked ? 0x86EFAC : 0xE2E8F0;
      if (isLegendary) {
        slotFill = isUnlocked ? 0xFEF3C7 : 0xFAF5FF;
        slotStroke = isUnlocked ? 0xF59E0B : 0xC084FC;
      }

      // Soft shadow
      slotBg.fillStyle(0x000000, 0.05);
      slotBg.fillRoundedRect(cx - 75, cy - 52, 150, 118, radius.md);

      slotBg.fillStyle(slotFill, 1);
      slotBg.fillRoundedRect(cx - 75, cy - 54, 150, 118, radius.md);
      slotBg.lineStyle(isLegendary ? 2.5 : 1.5, slotStroke, 1);
      slotBg.strokeRoundedRect(cx - 75, cy - 54, 150, 118, radius.md);
      modal.add(slotBg);

      if (isUnlocked) {
        // Sprite
        const key = resolveFruitTexture(this, info.tier);
        const icon = this.add.image(cx, cy - 16, key).setDisplaySize(44, 44);
        modal.add(icon);

        const nameTxt = this.add.text(cx, cy + 22, info.name, {
          fontFamily: 'sans-serif',
          fontSize: '12px',
          fontStyle: 'bold',
          color: isLegendary ? '#B45309' : '#1E293B',
        }).setOrigin(0.5);
        modal.add(nameTxt);

        const scoreTxt = this.add.text(cx, cy + 38, isLegendary ? `+${info.scoreGain} pts ★ Legendary` : `+${info.scoreGain} pts`, {
          fontFamily: 'sans-serif',
          fontSize: '10px',
          fontStyle: 'bold',
          color: isLegendary ? '#D97706' : '#059669',
        }).setOrigin(0.5);
        modal.add(scoreTxt);
      } else {
        // Locked silhouette
        const lockCircle = this.add.graphics();
        lockCircle.fillStyle(isLegendary ? 0xC084FC : 0x94A3B8, 0.35);
        lockCircle.fillCircle(cx, cy - 16, 22);
        modal.add(lockCircle);

        const lockIcon = this.add.text(cx, cy - 16, isLegendary ? '🔒' : '?', {
          fontFamily: 'sans-serif',
          fontSize: '18px',
          fontStyle: 'bold',
          color: isLegendary ? '#7C3AED' : '#64748B',
        }).setOrigin(0.5);
        modal.add(lockIcon);

        const lockName = this.add.text(cx, cy + 22, isLegendary ? info.name : 'Locked', {
          fontFamily: 'sans-serif',
          fontSize: '11px',
          fontStyle: 'bold',
          color: isLegendary ? '#7C3AED' : '#94A3B8',
        }).setOrigin(0.5);
        modal.add(lockName);

        const milestoneReq = info.tier === 12 ? 'Win Day 3' : (info.tier === 13 ? 'Win Day 6' : (info.tier === 14 ? 'Win Day 12' : `Merge Tier ${info.tier}`));
        const hintTxt = this.add.text(cx, cy + 38, milestoneReq, {
          fontFamily: 'sans-serif',
          fontSize: '10px',
          fontStyle: isLegendary ? 'bold' : 'normal',
          color: isLegendary ? '#9333EA' : '#64748B',
        }).setOrigin(0.5);
        modal.add(hintTxt);
      }
    }

    // 4. Close Button at bottom (3D Candy Button)
    const closeBtnY = cardH / 2 - 42;
    const { container: closeBtn } = drawButton(this, 0, closeBtnY, '✕ CLOSE', {
      variant: 'primary',
      width: 220,
      height: 54,
      fontSize: 20,
    });
    modal.add(closeBtn);

    const onClose = (): void => {
      this.tweens.add({
        targets: modal,
        scale: 0.8,
        alpha: 0,
        duration: dur.fast,
        ease: 'Back.easeIn',
        onComplete: () => {
          this.scene.stop();
          this.scene.resume(this.returnScene);
        },
      });
    };

    closeBtn.on('pointerdown', onClose);
    backdrop.on('pointerdown', onClose);

    // Modal entrance animation
    this.tweens.add({
      targets: modal,
      scale: 1,
      alpha: 1,
      duration: dur.pop,
      ease: 'Back.easeOut',
    });
  }
}
