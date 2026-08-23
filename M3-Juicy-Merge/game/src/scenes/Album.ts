// M3 Juicy Merge — Album Modal Scene (Sticker Encyclopedia)
// SPEC: Hiển thị lưới 12 ô trái cây, thanh tiến trình mở khóa và danh hiệu Nông dân.

import Phaser from 'phaser';
import { ctx } from '../context';
import { color, z, dur, radius } from '../tokens';
import { FRUIT_ENCYCLOPEDIA, getAlbumProgress } from '../logic/album';
import { resolveFruitTexture } from '../gameplay/fruit-sprite';

interface AlbumInitData {
  returnScene: string;
}

export class AlbumScene extends Phaser.Scene {
  private returnScene = 'StartScene';

  constructor() {
    super({ key: 'AlbumScene' });
  }

  init(data: AlbumInitData): void {
    this.returnScene = data?.returnScene || 'StartScene';
  }

  create(): void {
    const { width, height } = this.scale;
    const unlocked = ctx.score.getUnlockedTiers();
    const progress = getAlbumProgress(unlocked);

    // 1. Semi-transparent backdrop overlay
    const backdrop = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.65)
      .setDepth(z.overlay).setInteractive();

    // 2. Modal Window Container
    const modal = this.add.container(width / 2, height / 2).setDepth(z.panel).setScale(0.8).setAlpha(0);

    const cardW = 640;
    const cardH = 920;
    const bg = this.add.graphics();
    bg.fillStyle(0xFFFFFF, 0.98);
    bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, radius.lg);
    bg.lineStyle(3, 0x3B82F6, 0.8);
    bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, radius.lg);
    modal.add(bg);

    // Header Title
    const title = this.add.text(0, -cardH / 2 + 45, '📖 BỘ SƯU TẬP TRÁI CÂY', {
      fontFamily: 'sans-serif',
      fontSize: '26px',
      fontStyle: 'bold',
      color: '#1F2937',
    }).setOrigin(0.5);
    modal.add(title);

    // Progress Subtitle & Badge
    const subtitle = this.add.text(0, -cardH / 2 + 82, `${progress.unlockedCount}/${progress.totalCount} Mở Khóa • ${progress.title}`, {
      fontFamily: 'sans-serif',
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#D97706',
    }).setOrigin(0.5);
    modal.add(subtitle);

    // Progress Bar
    const barW = 480;
    const barH = 12;
    const barY = -cardH / 2 + 110;
    const pBg = this.add.graphics();
    pBg.fillStyle(0xE5E7EB, 1);
    pBg.fillRoundedRect(-barW / 2, barY, barW, barH, 6);
    modal.add(pBg);

    const fillW = Math.max(12, (barW * progress.percentage) / 100);
    const pFill = this.add.graphics();
    pFill.fillStyle(0x10B981, 1);
    pFill.fillRoundedRect(-barW / 2, barY, fillW, barH, 6);
    modal.add(pFill);

    // 3. Grid of 12 Fruits (3 columns x 4 rows)
    const cols = 3;
    const rows = 4;
    const startX = -180;
    const startY = -cardH / 2 + 190;
    const spacingX = 180;
    const spacingY = 140;

    for (let i = 0; i < FRUIT_ENCYCLOPEDIA.length; i++) {
      const info = FRUIT_ENCYCLOPEDIA[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = startX + col * spacingX;
      const cy = startY + row * spacingY;
      const isUnlocked = unlocked.has(info.tier);

      // Card slot background
      const slotBg = this.add.graphics();
      slotBg.fillStyle(isUnlocked ? 0xF0FDF4 : 0xF3F4F6, 1);
      slotBg.fillRoundedRect(cx - 75, cy - 55, 150, 120, radius.md);
      slotBg.lineStyle(1.5, isUnlocked ? 0x86EFAC : 0xD1D5DB, 1);
      slotBg.strokeRoundedRect(cx - 75, cy - 55, 150, 120, radius.md);
      modal.add(slotBg);

      if (isUnlocked) {
        // Sprite
        const key = resolveFruitTexture(this, info.tier);
        const icon = this.add.image(cx, cy - 15, key).setDisplaySize(48, 48);
        modal.add(icon);

        const nameTxt = this.add.text(cx, cy + 24, info.name, {
          fontFamily: 'sans-serif',
          fontSize: '13px',
          fontStyle: 'bold',
          color: '#1F2937',
        }).setOrigin(0.5);
        modal.add(nameTxt);

        const scoreTxt = this.add.text(cx, cy + 42, `+${info.scoreGain} pts`, {
          fontFamily: 'sans-serif',
          fontSize: '11px',
          fontStyle: 'bold',
          color: '#059669',
        }).setOrigin(0.5);
        modal.add(scoreTxt);
      } else {
        // Locked silhouette
        const lockCircle = this.add.graphics();
        lockCircle.fillStyle(0x9CA3AF, 0.4);
        lockCircle.fillCircle(cx, cy - 15, 24);
        modal.add(lockCircle);

        const lockIcon = this.add.text(cx, cy - 15, '?', {
          fontFamily: 'sans-serif',
          fontSize: '22px',
          fontStyle: 'bold',
          color: '#6B7280',
        }).setOrigin(0.5);
        modal.add(lockIcon);

        const lockName = this.add.text(cx, cy + 24, 'Chưa Mở Khóa', {
          fontFamily: 'sans-serif',
          fontSize: '12px',
          fontStyle: 'bold',
          color: '#9CA3AF',
        }).setOrigin(0.5);
        modal.add(lockName);

        const hintTxt = this.add.text(cx, cy + 42, `Ghép Bậc ${info.tier}`, {
          fontFamily: 'sans-serif',
          fontSize: '10px',
          color: '#6B7280',
        }).setOrigin(0.5);
        modal.add(hintTxt);
      }
    }

    // 4. Close Button at bottom
    const closeBtnY = cardH / 2 - 50;
    const closeBtnBg = this.add.graphics();
    closeBtnBg.fillStyle(0xEF4444, 1);
    closeBtnBg.fillRoundedRect(-100, closeBtnY - 24, 200, 48, radius.md);
    modal.add(closeBtnBg);

    const closeBtnTxt = this.add.text(0, closeBtnY, '✕ ĐÓNG', {
      fontFamily: 'sans-serif',
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#FFFFFF',
    }).setOrigin(0.5);
    modal.add(closeBtnTxt);

    const closeHit = this.add.rectangle(0, closeBtnY, 200, 48, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    modal.add(closeHit);

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

    closeHit.on('pointerdown', onClose);
    backdrop.on('pointerdown', onClose);

    // Entrance Animation
    this.tweens.add({
      targets: modal,
      scale: 1,
      alpha: 1,
      duration: dur.base,
      ease: 'Back.easeOut',
    });
  }
}
