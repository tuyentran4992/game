// M3 Juicy Merge — Powerup & Reward Modals
// Manages the Refill Power-ups modal and Daily Challenge Extra Drops modal.

import type Phaser from 'phaser';
import { ctx } from '../context';
import { z, dur, radius } from '../tokens';
import { drawButton } from '../ui';
import { playFireworksCelebration } from '../gameplay/juice-effects';
import { floatPowerupPopup } from '../gameplay/hud-manager';

export function promptRefillPowerupsModal(
  scene: Phaser.Scene,
  onComplete: () => void,
  onClose: () => void,
): void {
  const { width, height } = scene.scale;
  const cx = width / 2;
  const cy = height / 2;

  const backdrop = scene.add
    .rectangle(cx, cy, width, height, 0x0f172a, 0.72)
    .setDepth(z.overlay + 20)
    .setInteractive();

  const modal = scene.add
    .container(cx, cy)
    .setDepth(z.overlay + 21)
    .setScale(0.85)
    .setAlpha(0);
  const cardW = Math.min(520, width - 40);
  const cardH = 390;

  const bg = scene.add.graphics();
  bg.fillStyle(0x000000, 0.28);
  bg.fillRoundedRect(-cardW / 2, -cardH / 2 + 8, cardW, cardH, radius.lg);
  bg.fillStyle(0xffffff, 0.98);
  bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, radius.lg);
  bg.fillStyle(0x10b981, 1);
  bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, 16, {
    tl: radius.lg,
    tr: radius.lg,
    bl: 0,
    br: 0,
  });
  bg.lineStyle(2.5, 0x10b981, 0.9);
  bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, radius.lg);
  modal.add(bg);

  const icon = scene.add
    .text(0, -cardH / 2 + 50, '🎁', { fontSize: '40px' })
    .setOrigin(0.5);
  const title = scene.add
    .text(0, -cardH / 2 + 95, 'REFILL POWER-UPS', {
      fontFamily: 'sans-serif',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#065F46',
    })
    .setOrigin(0.5);

  const desc = scene.add
    .text(
      0,
      -cardH / 2 + 148,
      'You are out of power-ups!\nWatch a short video to instantly receive\n+2 Swaps 🔄 & +2 Shakes 📳!',
      {
        fontFamily: 'sans-serif',
        fontSize: '15px',
        fontStyle: 'bold',
        align: 'center',
        color: '#1E293B',
      },
    )
    .setOrigin(0.5);
  modal.add([icon, title, desc]);

  const btnW = cardW - 64;
  const { container: watchBtn } = drawButton(
    scene,
    0,
    50,
    '▶  WATCH AD (+2 🔄 & +2 📳)',
    {
      variant: 'emerald',
      width: btnW,
      height: 60,
      fontSize: 20,
    },
  );
  modal.add(watchBtn);

  const { container: cancelBtn } = drawButton(scene, 0, 122, '✕  CANCEL', {
    variant: 'ghost',
    width: btnW,
    height: 48,
    fontSize: 17,
  });
  modal.add(cancelBtn);

  const closeModal = (): void => {
    scene.tweens.add({
      targets: modal,
      scale: 0.85,
      alpha: 0,
      duration: dur.fast,
      ease: 'Back.easeIn',
      onComplete: () => {
        backdrop.destroy();
        modal.destroy();
        onClose();
      },
    });
  };

  cancelBtn.on('pointerdown', closeModal);
  backdrop.on('pointerdown', closeModal);

  watchBtn.on('pointerdown', async () => {
    watchBtn.disableInteractive();
    const success = await ctx.refillPowerupsViaAd();
    if (success) {
      closeModal();
      onComplete();
      floatPowerupPopup(scene, '+2 🔄 & +2 📳 ADDED!', cx, cy - 80, '#10B981');
      playFireworksCelebration(scene, 4, z.overlay + 30);
    } else {
      watchBtn.setInteractive({ useHandCursor: true });
    }
  });

  scene.tweens.add({
    targets: modal,
    scale: 1,
    alpha: 1,
    duration: dur.pop,
    ease: 'Back.easeOut',
  });
}

export function showDailyExtraDropsModal(
  scene: Phaser.Scene,
  onGranted: () => void,
  onEndRun: () => void,
): void {
  const { width, height } = scene.scale;
  const cx = width / 2;
  const cy = height / 2;
  const diff = ctx.getCurrentDailyDifficulty();
  const needed = diff.targetScore - ctx.engine.state.score;

  const backdrop = scene.add
    .rectangle(cx, cy, width, height, 0x0f172a, 0.72)
    .setDepth(z.overlay + 20)
    .setInteractive();

  const modal = scene.add
    .container(cx, cy)
    .setDepth(z.overlay + 21)
    .setScale(0.85)
    .setAlpha(0);
  const cardW = Math.min(520, width - 40);
  const cardH = 390;

  const bg = scene.add.graphics();
  bg.fillStyle(0x000000, 0.28);
  bg.fillRoundedRect(-cardW / 2, -cardH / 2 + 8, cardW, cardH, radius.lg);
  bg.fillStyle(0xffffff, 0.98);
  bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, radius.lg);
  bg.fillStyle(0xf59e0b, 1);
  bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, 16, {
    tl: radius.lg,
    tr: radius.lg,
    bl: 0,
    br: 0,
  });
  bg.lineStyle(2.5, 0xf59e0b, 0.9);
  bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, radius.lg);
  modal.add(bg);

  const icon = scene.add
    .text(0, -cardH / 2 + 50, '📅', { fontSize: '40px' })
    .setOrigin(0.5);
  const title = scene.add
    .text(0, -cardH / 2 + 95, 'OUT OF DROPS!', {
      fontFamily: 'sans-serif',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#B45309',
    })
    .setOrigin(0.5);

  const desc = scene.add
    .text(
      0,
      -cardH / 2 + 148,
      `You only need ${needed} pts to win Day ${diff.dayLevel}!\nWatch a short video to receive\n+15 EXTRA DROPS & save your streak?`,
      {
        fontFamily: 'sans-serif',
        fontSize: '15px',
        fontStyle: 'bold',
        align: 'center',
        color: '#1E293B',
      },
    )
    .setOrigin(0.5);
  modal.add([icon, title, desc]);

  const btnW = cardW - 64;
  const { container: watchBtn } = drawButton(
    scene,
    0,
    50,
    '▶  +15 DROPS (Watch Ad)',
    {
      variant: 'amber',
      width: btnW,
      height: 60,
      fontSize: 20,
    },
  );
  modal.add(watchBtn);

  const { container: endBtn } = drawButton(scene, 0, 122, '✕  END RUN', {
    variant: 'ghost',
    width: btnW,
    height: 48,
    fontSize: 17,
  });
  modal.add(endBtn);

  const closeModal = (): void => {
    scene.tweens.add({
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

  endBtn.on('pointerdown', () => {
    closeModal();
    onEndRun();
  });

  watchBtn.on('pointerdown', async () => {
    watchBtn.disableInteractive();
    const success = await ctx.grantDailyExtraDropsViaAd();
    if (success) {
      closeModal();
      onGranted();
      floatPowerupPopup(scene, '+15 DROPS ADDED! 🎯', cx, cy - 80, '#F59E0B');
      playFireworksCelebration(scene, 4, z.overlay + 30);
    } else {
      watchBtn.setInteractive({ useHandCursor: true });
    }
  });

  scene.tweens.add({
    targets: modal,
    scale: 1,
    alpha: 1,
    duration: dur.pop,
    ease: 'Back.easeOut',
  });
}
