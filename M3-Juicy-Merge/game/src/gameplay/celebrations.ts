// M3 Juicy Merge — Celebrations & Victory Modals
// Handles fireworks, record banners, fruit discovery banners, daily victory, and cosmic victory modal.

import Phaser from 'phaser';
import { ctx } from '../context';
import { color, z, type, fontStyle, dur, radius } from '../tokens';
import { resolveFruitTexture } from './fruit-sprite';
import { drawButton } from '../ui';
import {
  playJackpotClimax,
  playFireworksCelebration,
} from './juice-effects';

export function celebrateNewRecord(
  scene: Phaser.Scene,
  dangerY: number,
  playSfx: (key: string, volume?: number, detune?: number) => void,
): void {
  const { width } = scene.scale;
  const cy = dangerY - 50;

  // Golden sparks & fireworks
  playJackpotClimax(scene, width / 2, cy, z.overlay + 30);
  playFireworksCelebration(scene, 2, z.overlay + 30);
  playSfx('sfx_merge_big', 0.8, 200);

  const banner = scene.add
    .text(width / 2, cy, '🎉 NEW RECORD! 🎉', {
      fontFamily: 'sans-serif',
      fontSize: '32px',
      fontStyle: 'bold',
      color: '#F59E0B',
    })
    .setOrigin(0.5)
    .setDepth(z.overlay + 10)
    .setStroke('#FFFFFF', 8)
    .setScale(0.4)
    .setAlpha(0);

  scene.tweens.add({
    targets: banner,
    scale: 1.2,
    alpha: 1,
    duration: dur.pop,
    ease: 'Back.easeOut',
    onComplete: () => {
      scene.tweens.add({
        targets: banner,
        alpha: 0,
        y: cy - 60,
        duration: dur.slow,
        delay: 800,
        onComplete: () => banner.destroy(),
      });
    },
  });
}

export function celebrateNewFruitDiscovery(
  scene: Phaser.Scene,
  dangerY: number,
  name: string,
  playSfx: (key: string, volume?: number, detune?: number) => void,
): void {
  const { width } = scene.scale;
  const cy = dangerY - 50;

  playJackpotClimax(scene, width / 2, cy, z.overlay + 30);
  playFireworksCelebration(scene, 2, z.overlay + 30);
  playSfx('sfx_merge_big', 0.9, 300);

  const banner = scene.add
    .text(width / 2, cy, `🌟 NEW DISCOVERY: ${name.toUpperCase()}! 🌟`, {
      fontFamily: 'sans-serif',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#10B981',
    })
    .setOrigin(0.5)
    .setDepth(z.overlay + 10)
    .setStroke('#FFFFFF', 8)
    .setScale(0.4)
    .setAlpha(0);

  const subBanner = scene.add
    .text(width / 2, cy + 32, '+1 Swap 🔄 & +1 Shake 📳', {
      fontFamily: 'sans-serif',
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#3B82F6',
    })
    .setOrigin(0.5)
    .setDepth(z.overlay + 10)
    .setStroke('#FFFFFF', 6)
    .setScale(0.4)
    .setAlpha(0);

  scene.tweens.add({
    targets: [banner, subBanner],
    scale: 1.15,
    alpha: 1,
    duration: dur.pop,
    ease: 'Back.easeOut',
    onComplete: () => {
      scene.tweens.add({
        targets: [banner, subBanner],
        alpha: 0,
        y: '-=50',
        duration: dur.slow,
        delay: 1400,
        onComplete: () => {
          banner.destroy();
          subBanner.destroy();
        },
      });
    },
  });
}

export function celebrateDailyVictory(
  scene: Phaser.Scene,
  dangerY: number,
  rewardName?: string,
  playSfx?: (key: string, volume?: number, detune?: number) => void,
): void {
  const { width } = scene.scale;
  const cy = dangerY - 50;
  const diff = ctx.getCurrentDailyDifficulty();

  playJackpotClimax(scene, width / 2, cy, z.overlay + 30);
  playFireworksCelebration(scene, 3, z.overlay + 30);
  if (playSfx) playSfx('sfx_merge_big', 0.9, 200);

  const bannerText = rewardName
    ? `🏆 DAY ${diff.dayLevel} WON! UNLOCKED ${rewardName}! 🌟`
    : `🏆 DAY ${diff.dayLevel} GOAL REACHED (${diff.targetScore} pts)! 🏆`;

  const banner = scene.add
    .text(width / 2, cy, bannerText, {
      fontFamily: 'sans-serif',
      fontSize: rewardName ? '20px' : '22px',
      fontStyle: 'bold',
      color: '#F59E0B',
    })
    .setOrigin(0.5)
    .setDepth(z.overlay + 10)
    .setStroke('#FFFFFF', 8)
    .setScale(0.4)
    .setAlpha(0);

  scene.tweens.add({
    targets: banner,
    scale: 1.15,
    alpha: 1,
    duration: dur.pop,
    ease: 'Back.easeOut',
    onComplete: () => {
      scene.tweens.add({
        targets: banner,
        alpha: 0,
        y: cy - 60,
        duration: dur.slow,
        delay: 1500,
        onComplete: () => banner.destroy(),
      });
    },
  });
}

export function showCosmicVictoryModal(
  scene: Phaser.Scene,
  playSfx: (key: string, volume?: number, detune?: number) => void,
): void {
  const { width, height } = scene.scale;
  const cx = width / 2;
  const cy = height / 2;

  // 1. Fireworks Show: Multiple grand bursts across screen above the modal!
  playJackpotClimax(scene, cx, cy - 80, z.overlay + 60);
  playFireworksCelebration(scene, 4, z.overlay + 60);
  playSfx('sfx_merge_big', 1.0, 100);

  // 2. Modal Container
  const modal = scene.add.container(cx, cy).setDepth(z.overlay + 50);

  // Dark cosmic nebula backdrop
  const backdrop = scene.add.rectangle(0, 0, width, height, 0x0b081e, 0.88);
  backdrop.setInteractive(); // Block input behind modal
  modal.add(backdrop);

  // Main Card
  const cardW = Math.min(520, width - 40);
  const cardH = 580;
  const cardBg = scene.add.graphics();
  cardBg.fillStyle(0x18122b, 0.98);
  cardBg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, radius.lg);
  cardBg.lineStyle(3, 0xa855f7, 0.9);
  cardBg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, radius.lg);
  modal.add(cardBg);

  // Crown Icon
  const crown = scene.add
    .text(0, -cardH / 2 + 38, '👑', { fontSize: '42px' })
    .setOrigin(0.5);
  modal.add(crown);

  // Title
  const title = scene.add
    .text(0, -cardH / 2 + 82, 'COSMIC VICTORY!', {
      fontFamily: 'sans-serif',
      fontSize: '28px',
      fontStyle: 'bold',
      color: '#FBBF24',
    })
    .setOrigin(0.5)
    .setStroke('#FFFFFF', 3);
  modal.add(title);

  // Subtitle
  const subtitle = scene.add
    .text(
      0,
      -cardH / 2 + 120,
      'You created the Ultimate Tier 14\nGalaxy Watermelon! 🌌',
      {
        fontFamily: 'sans-serif',
        fontSize: '15px',
        fontStyle: 'bold',
        color: '#E2E8F0',
        align: 'center',
      },
    )
    .setOrigin(0.5);
  modal.add(subtitle);

  // Rotating Glowing Halo behind fruit
  const halo = scene.add.graphics();
  halo.fillStyle(0x9333ea, 0.35);
  halo.fillCircle(0, -20, 80);
  modal.add(halo);

  // Galaxy Watermelon Sprite (Tier 14)
  const key14 = resolveFruitTexture(scene, 14);
  const fruitSprite = scene.add.image(0, -20, key14).setDisplaySize(130, 130);
  modal.add(fruitSprite);

  scene.tweens.add({
    targets: fruitSprite,
    scaleX: 1.08,
    scaleY: 1.08,
    duration: 700,
    yoyo: true,
    repeat: -1,
    ease: 'Sine.easeInOut',
  });

  // Reward Badge
  const badgeW = cardW - 60;
  const badgeH = 50;
  const badgeY = 95;
  const badgeBg = scene.add.graphics();
  badgeBg.fillStyle(0x3b0764, 0.9);
  badgeBg.fillRoundedRect(
    -badgeW / 2,
    badgeY - badgeH / 2,
    badgeW,
    badgeH,
    radius.md,
  );
  badgeBg.lineStyle(1.5, 0xf59e0b, 0.8);
  badgeBg.strokeRoundedRect(
    -badgeW / 2,
    badgeY - badgeH / 2,
    badgeW,
    badgeH,
    radius.md,
  );
  modal.add(badgeBg);

  const badgeTxt = scene.add
    .text(0, badgeY, '💎 +500 JACKPOT PTS • COSMIC MASTER 🌌', {
      fontFamily: 'sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#FDE047',
    })
    .setOrigin(0.5);
  modal.add(badgeTxt);

  // Buttons
  const btnW = cardW - 70;
  const { container: keepPlayingBtn } = drawButton(
    scene,
    0,
    175,
    '▶  KEEP PLAYING',
    {
      testid: 'cosmic-keep-playing-btn',
      variant: 'primary',
      width: btnW,
      height: 64,
      fontSize: 22,
    },
  );
  modal.add(keepPlayingBtn);

  keepPlayingBtn.on('pointerdown', () => {
    scene.tweens.add({
      targets: modal,
      alpha: 0,
      scale: 0.9,
      duration: dur.base,
      ease: 'Cubic.easeIn',
      onComplete: () => modal.destroy(),
    });
  });

  const { container: menuBtn } = drawButton(scene, 0, 245, '🏠  MAIN MENU', {
    testid: 'cosmic-menu-btn',
    variant: 'ghost',
    width: btnW,
    height: 56,
    fontSize: 20,
  });
  modal.add(menuBtn);

  menuBtn.on('pointerdown', () => {
    ctx.saveSession();
    scene.cameras.main.fadeOut(dur.scene, 0, 0, 0);
    scene.time.delayedCall(dur.scene, () => {
      scene.scene.stop('GameplayScene');
      scene.scene.start('StartScene');
    });
  });

  // Pop-in entrance animation
  modal.setScale(0.7);
  modal.setAlpha(0);
  scene.tweens.add({
    targets: modal,
    scale: 1,
    alpha: 1,
    duration: dur.pop,
    ease: 'Back.easeOut',
  });
}

export function floatScorePopup(
  scene: Phaser.Scene,
  gain: number,
  x: number,
  y: number,
): void {
  const txt = scene.add
    .text(x, y, `+${gain}`, fontStyle(type.score, color.warning))
    .setOrigin(0.5)
    .setDepth(z.hud)
    .setStroke(color.textStroke, 6);
  txt.setScale(0.5);

  scene.tweens.add({
    targets: txt,
    scaleX: 1.25,
    scaleY: 1.25,
    duration: dur.pop,
    ease: 'Back.easeOut',
    onComplete: () => {
      scene.tweens.add({
        targets: txt,
        alpha: 0,
        y: y - 40,
        duration: dur.base,
        ease: 'Cubic.easeOut',
        onComplete: () => txt.destroy(),
      });
    },
  });
}
