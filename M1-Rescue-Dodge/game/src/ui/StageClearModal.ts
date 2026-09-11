// StageClearModal — Màn hình hoàn thành Stage / Level Clear (Chuẩn Studio 3D candy).
// Xuất hiện khi người chơi đạt mục tiêu điểm của Stage, hiển thị 1-3 sao, thống kê màn,
// và nút "NEXT LEVEL" để người chơi chủ động bước tiếp sang stage kế tiếp.
import Phaser from 'phaser';
import { color, type, radius, shadow, z, dur, fontStyle, toColor } from '../tokens';
import { drawButton } from '../ui';
import { ctx } from '../context';
import type { StageClearResult } from '../logic/types';

export interface StageClearModalCallbacks {
  onNextStage: () => void;
  onPlayAgain?: () => void;
  onMenu?: () => void;
}

export class StageClearModal {
  private scene: Phaser.Scene;
  private root: Phaser.GameObjects.Container;
  private panelContainer!: Phaser.GameObjects.Container;
  private callbacks: StageClearModalCallbacks;
  private data: StageClearResult;
  private isClosing = false;

  constructor(scene: Phaser.Scene, data: StageClearResult, callbacks: StageClearModalCallbacks) {
    this.scene = scene;
    this.data = data;
    this.callbacks = callbacks;
    this.root = this.scene.add.container(0, 0).setDepth((z.dialog ?? 100) + 10);
    this.root.setData('testid', 'stage-clear-modal');

    this.create();
  }

  private create() {
    const { width, height } = this.scene.scale;
    const isShort = height < 560;
    const isStageMaster = this.data.isStageComplete;
    const isVictory = this.data.isVictory || (this.data.stage >= 3 && isStageMaster);

    // 1. Dark Backdrop chặn mọi thao tác gameplay phía sau
    const backdrop = this.scene.add.graphics();
    backdrop.fillStyle(0x0A0E1A, 0.82);
    backdrop.fillRect(0, 0, width, height);
    backdrop.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains);
    this.root.add(backdrop);

    // 2. Kích thước Panel
    const pw = Math.min(340, width - 28);
    const ph = Math.min(isShort ? (isVictory ? 460 : 420) : (isVictory ? 525 : 455), height - 20);
    const cx = width / 2;
    const cy = height / 2;

    this.panelContainer = this.scene.add.container(cx, cy);
    this.panelContainer.setScale(0.85).setAlpha(0);
    this.root.add(this.panelContainer);

    // Hiệu ứng bung Panel (Back Out)
    this.scene.tweens.add({
      targets: this.panelContainer,
      scale: 1.0,
      alpha: 1.0,
      duration: 260,
      ease: 'back.out',
    });

    // 3. Đồ hoạ khung Panel (3D Candy & Highlight)
    const panelG = this.scene.add.graphics();
    // Shadow
    panelG.fillStyle(toColor(color.shadow), shadow.panel.alpha);
    panelG.fillRoundedRect(-pw / 2, -ph / 2 + shadow.panel.dy, pw, ph, radius.lg);
    // Base Surface
    panelG.fillStyle(0xF8FAFC, 1);
    panelG.fillRoundedRect(-pw / 2, -ph / 2, pw, ph, radius.lg);
    // Glossy Top Half
    panelG.fillStyle(0xFFFFFF, 0.94);
    panelG.fillRoundedRect(-pw / 2 + 3, -ph / 2 + 3, pw - 6, ph * 0.48, radius.lg - 2);
    // Border viền vàng nổi bật (Primary Gold hoặc Victory Gold)
    panelG.lineStyle(4, isVictory ? 0xF59E0B : toColor(color.primary), 1);
    panelG.strokeRoundedRect(-pw / 2, -ph / 2, pw, ph, radius.lg);
    // Highlight trong
    panelG.lineStyle(1.5, 0xFFFFFF, 0.70);
    panelG.strokeRoundedRect(-pw / 2 + 2, -ph / 2 + 2, pw - 4, ph - 4, radius.lg - 2);
    this.panelContainer.add(panelG);

    let curY = -ph / 2 + (isShort ? 22 : 26);

    // 4. Header: VICTORY / STAGE COMPLETE / LEVEL CLEAR
    const currentLv = this.data.level ?? this.data.stage;
    let headerText: string;
    let subTitleText: string;
    let subTitleColor: string = color.textSecondary;

    if (isVictory) {
      headerText = '🏆 VICTORY! 🏆';
      subTitleText = '🎉 ALL STAGES CLEARED! 🎉';
      subTitleColor = '#D97706';
    } else if (isStageMaster) {
      headerText = `STAGE ${this.data.stage} COMPLETE! 🏆`;
      subTitleText = `STAGE ${this.data.stage + 1} UNLOCKED! 🚀`;
      subTitleColor = color.warning;
    } else {
      headerText = `LEVEL ${currentLv} CLEAR!`;
      const pal = (this.data.paletteIndex ?? 0) % 3;
      const sceneTheme = pal === 0 ? '🌸 MORNING GARDEN' : pal === 1 ? '🌅 SUNSET SPRINT' : '🌙 NIGHT GARDEN';
      subTitleText = `${sceneTheme} PASSED`;
    }

    const title = this.scene.add.text(
      0,
      curY,
      headerText,
      fontStyle({ size: isShort ? '19px' : '22px', weight: '900', lh: 1 }, isVictory ? '#D97706' : color.primary)
    ).setOrigin(0.5);
    title.setStroke('#1E0E02', 3.5);
    title.setShadow(0, 2, 'rgba(0,0,0,0.3)', 3, false, true);
    this.panelContainer.add(title);

    curY += isShort ? 24 : 28;

    const subTitle = this.scene.add.text(
      0,
      curY,
      subTitleText,
      fontStyle({ size: '13px', weight: '800', lh: 1 }, subTitleColor)
    ).setOrigin(0.5);
    this.panelContainer.add(subTitle);

    curY += isShort ? 34 : 38;

    // 5. Mascot Cat Badge (Mèo ăn mừng vui vẻ — nằm gọn gàng bên trong hình tròn)
    const mascotBadgeR = isShort ? 28 : 34;
    const mascotSize = isShort ? 44 : 52;
    const mascotG = this.scene.add.graphics();
    mascotG.fillStyle(isVictory ? 0xFEF3C7 : 0xFFF3D6, 1);
    mascotG.fillCircle(0, curY, mascotBadgeR);
    mascotG.lineStyle(3, isVictory ? 0xF59E0B : 0xFFA502, 1);
    mascotG.strokeCircle(0, curY, mascotBadgeR);
    this.panelContainer.add(mascotG);

    const catImg = this.scene.add.image(0, curY, ctx.engine.getSelectedSkinTexture())
      .setDisplaySize(mascotSize, mascotSize);
    this.panelContainer.add(catImg);

    const baseCatScaleX = catImg.scaleX;
    const baseCatScaleY = catImg.scaleY;

    // Mascot nảy vui sướng nhẹ nhàng bên trong vòng tròn
    this.scene.tweens.add({
      targets: catImg,
      y: curY - 3,
      scaleX: baseCatScaleX * 1.04,
      scaleY: baseCatScaleY * 0.96,
      yoyo: true,
      repeat: -1,
      duration: 380,
      ease: 'sine.inout',
    });

    curY += mascotBadgeR + (isShort ? 20 : 24);

    // 6. Stars Rating (3 Ngôi sao đánh giá thành tích)
    const starsContainer = this.scene.add.container(0, curY);
    starsContainer.setData('testid', 'stage-stars');
    this.panelContainer.add(starsContainer);

    const starPositions = [
      { x: -56, y: 4, scale: 0.9 },
      { x: 0, y: -8, scale: 1.15 },
      { x: 56, y: 4, scale: 0.9 },
    ];

    const earnedStars = this.data.stats.stars;

    starPositions.forEach((pos, idx) => {
      // Nền sao xám (chưa đạt)
      const emptyStar = this.scene.add.text(pos.x, pos.y, '★', {
        fontSize: '34px',
        color: '#CBD5E1',
      }).setOrigin(0.5).setScale(pos.scale);
      starsContainer.add(emptyStar);

      // Nếu đạt được sao này, tạo sao vàng với animation pop-in
      if (idx < earnedStars) {
        const star = this.scene.add.text(pos.x, pos.y, '★', {
          fontSize: '34px',
          color: '#FFD700',
        })
          .setOrigin(0.5)
          .setStroke('#B45309', 3)
          .setShadow(0, 2, 'rgba(0,0,0,0.3)', 2)
          .setScale(0);

        starsContainer.add(star);

        this.scene.tweens.add({
          targets: star,
          scale: pos.scale,
          delay: 200 + idx * 180,
          duration: 320,
          ease: 'back.out',
          onStart: () => {
            if (this.scene.cache.audio.exists('sfx_score')) {
              this.scene.sound.play('sfx_score', { volume: 0.4 + idx * 0.15 });
            }
          },
        });
      }
    });

    curY += isShort ? 36 : 42;

    // 7. Stats Box (Thống kê Stage)
    const statsBoxW = pw - 36;
    const statsBoxH = isShort ? 74 : 84;
    const statsG = this.scene.add.graphics();
    statsG.fillStyle(0xF1F5F9, 1);
    statsG.fillRoundedRect(-statsBoxW / 2, curY, statsBoxW, statsBoxH, radius.md);
    statsG.lineStyle(1.5, 0xE2E8F0, 1);
    statsG.strokeRoundedRect(-statsBoxW / 2, curY, statsBoxW, statsBoxH, radius.md);
    this.panelContainer.add(statsG);

    // 2 hàng thống kê:
    const row1Y = curY + (isShort ? 20 : 23);
    const stageScoreTxt = this.scene.add.text(
      -statsBoxW / 2 + 16,
      row1Y,
      `🎯 STAGE PTS: +${this.data.stats.stageScore}`,
      fontStyle({ size: '13px', weight: '800', lh: 1 }, color.textPrimary)
    ).setOrigin(0, 0.5);
    const totalScoreTxt = this.scene.add.text(
      statsBoxW / 2 - 16,
      row1Y,
      `TOTAL: ${this.data.totalScore}`,
      fontStyle({ size: '13px', weight: '800', lh: 1 }, color.primary)
    ).setOrigin(1, 0.5);
    this.panelContainer.add([stageScoreTxt, totalScoreTxt]);

    const row2Y = curY + (isShort ? 48 : 56);
    const fishTxt = this.scene.add.text(
      -statsBoxW / 2 + 16,
      row2Y,
      `🐟 FISH: ×${this.data.stats.stageFish}`,
      fontStyle({ size: '13px', weight: '800', lh: 1 }, '#D97706')
    ).setOrigin(0, 0.5);
    const comboTxt = this.scene.add.text(
      statsBoxW / 2 - 16,
      row2Y,
      `⚡ MAX COMBO: ×${this.data.stats.maxCombo}`,
      fontStyle({ size: '13px', weight: '800', lh: 1 }, '#2563EB')
    ).setOrigin(1, 0.5);
    this.panelContainer.add([fishTxt, comboTxt]);

    curY += statsBoxH + (isShort ? 12 : 16);

    // Banner: "STAGE 4+ COMING SOON" nếu hoàn thành Stage 3
    if (isVictory) {
      const bannerW = statsBoxW;
      const bannerH = isShort ? 30 : 34;
      const bannerG = this.scene.add.graphics();
      bannerG.fillStyle(0x0F172A, 0.90);
      bannerG.fillRoundedRect(-bannerW / 2, curY, bannerW, bannerH, radius.md);
      bannerG.lineStyle(1.5, 0x38BDF8, 0.9);
      bannerG.strokeRoundedRect(-bannerW / 2, curY, bannerW, bannerH, radius.md);

      const bannerTxt = this.scene.add.text(
        0,
        curY + bannerH / 2,
        '🚧 NEW STAGES COMING SOON! ✨',
        fontStyle({ size: isShort ? '12px' : '13px', weight: '900', lh: 1 }, '#38BDF8')
      ).setOrigin(0.5);
      this.panelContainer.add([bannerG, bannerTxt]);

      curY += bannerH + (isShort ? 10 : 14);
    }

    // 8. Action Buttons
    const btnW = pw - 40;
    if (isVictory) {
      const playAgainBtnH = isShort ? 44 : 48;
      const playAgainBtn = drawButton(
        this.scene,
        0,
        curY + playAgainBtnH / 2,
        '🔁 PLAY AGAIN',
        {
          width: btnW,
          height: playAgainBtnH,
          variant: 'primary',
          testid: 'next-stage-btn',
          textType: { size: isShort ? '16px' : '17px', weight: '900', lh: 1 },
          glow: true,
          pulseMs: 1200,
        }
      );
      playAgainBtn.container.on('pointerdown', () => this.handleAction('playAgain'));
      playAgainBtn.textObj.setInteractive({ useHandCursor: true });
      playAgainBtn.textObj.on('pointerdown', () => this.handleAction('playAgain'));
      this.panelContainer.add(playAgainBtn.container);

      curY += playAgainBtnH + (isShort ? 8 : 10);

      const menuBtnH = isShort ? 38 : 42;
      const menuBtn = drawButton(
        this.scene,
        0,
        curY + menuBtnH / 2,
        '🏠 MAIN MENU',
        {
          width: btnW,
          height: menuBtnH,
          variant: 'ghost',
          testid: 'menu-btn',
          textType: { size: isShort ? '13px' : '14px', weight: '800', lh: 1 },
        }
      );
      menuBtn.container.on('pointerdown', () => this.handleAction('menu'));
      menuBtn.textObj.setInteractive({ useHandCursor: true });
      menuBtn.textObj.on('pointerdown', () => this.handleAction('menu'));
      this.panelContainer.add(menuBtn.container);

      const onKey = () => this.handleAction('playAgain');
      this.scene.input.keyboard?.once('keydown-SPACE', onKey);
      this.scene.input.keyboard?.once('keydown-ENTER', onKey);
    } else {
      const btnH = isShort ? 50 : 56;
      const nextBtn = drawButton(
        this.scene,
        0,
        curY + btnH / 2,
        isStageMaster ? 'NEXT STAGE  ➔' : 'NEXT LEVEL  ➔',
        {
          width: btnW,
          height: btnH,
          variant: 'primary',
          testid: 'next-stage-btn',
          textType: { size: isShort ? '18px' : '20px', weight: '900', lh: 1 },
          glow: true,
          pulseMs: 1200,
        }
      );

      nextBtn.container.on('pointerdown', () => this.handleAction('nextStage'));
      nextBtn.textObj.setInteractive({ useHandCursor: true });
      nextBtn.textObj.on('pointerdown', () => this.handleAction('nextStage'));

      const onKey = () => this.handleAction('nextStage');
      this.scene.input.keyboard?.once('keydown-SPACE', onKey);
      this.scene.input.keyboard?.once('keydown-ENTER', onKey);

      this.panelContainer.add(nextBtn.container);
    }
  }

  private handleAction(action: 'nextStage' | 'playAgain' | 'menu') {
    if (this.isClosing) return;
    this.isClosing = true;

    if (this.scene.cache.audio.exists('sfx_click')) {
      this.scene.sound.play('sfx_click', { volume: 0.5 });
    }

    // Hiệu ứng đóng Modal mượt mà
    this.scene.tweens.add({
      targets: this.panelContainer,
      scale: 0.85,
      alpha: 0,
      duration: 180,
      ease: 'back.in',
      onComplete: () => {
        this.destroy();
        if (action === 'playAgain') {
          if (this.callbacks.onPlayAgain) {
            this.callbacks.onPlayAgain();
          } else {
            this.callbacks.onNextStage();
          }
        } else if (action === 'menu') {
          if (this.callbacks.onMenu) {
            this.callbacks.onMenu();
          } else {
            this.scene.scene.start('StartScene');
          }
        } else {
          this.callbacks.onNextStage();
        }
      },
    });
  }

  destroy() {
    if (this.root && this.root.active) {
      this.root.destroy();
    }
  }
}
