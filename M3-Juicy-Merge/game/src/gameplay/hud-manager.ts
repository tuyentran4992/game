// M3 Juicy Merge — HUD Manager
// Handles Header HUD (Score, Best Score, Previews, Powerup Counters, Banners) & Combo Popups.

import Phaser from 'phaser';
import { ctx } from '../context';
import { color, z, type, fontStyle, dur, radius } from '../tokens';
import { resolveFruitTexture } from './fruit-sprite';
import type { BucketLayout } from './physics-layout';
import { evaluateStageProgress, type StageConfig } from '../logic/stages';
import type { ObstacleState } from '../logic/obstacles';

export interface HudElements {
  scoreText: Phaser.GameObjects.Text;
  bestScoreText: Phaser.GameObjects.Text;
  swapButtonContainer?: Phaser.GameObjects.Container | undefined;
  swapCountText?: Phaser.GameObjects.Text | undefined;
  shakeButtonContainer?: Phaser.GameObjects.Container | undefined;
  shakeCountText?: Phaser.GameObjects.Text | undefined;
  nextPreview1: Phaser.GameObjects.Image;
  nextPreview2: Phaser.GameObjects.Image;
  dailyBannerText?: Phaser.GameObjects.Text | undefined;
  stageBannerText?: Phaser.GameObjects.Text | undefined;
  comboPopup: Phaser.GameObjects.Text;
}

export interface HudCallbacks {
  onSwap: () => void;
  onShake: () => void;
  onPause: () => void;
  onOpenAlbum: () => void;
}

export interface HudContextState {
  gameMode: 'classic' | 'stage' | 'daily';
  stageId?: number | undefined;
  stageConfig?: StageConfig | undefined;
  stageDropsRemaining?: number | undefined;
  stageDropsUsed?: number | undefined;
  stageObstacleStates?: ObstacleState[] | undefined;
  getCombinedStageTiers?: (() => Map<number, number>) | undefined;
  onUpdateActionBar?: (() => void) | undefined;
}

export function createHud(
  scene: Phaser.Scene,
  layout: BucketLayout,
  callbacks: HudCallbacks,
  state: HudContextState,
): HudElements {
  const { width } = scene.scale;

  // 1. Score & Best Score Plaque (Solar Gold 3D Toy Plaque)
  const scoreX = 10;
  const scoreW = 156;
  const scoreH = 72;
  const scoreBg = scene.add.graphics().setDepth(z.hud);

  // Drop shadow
  scoreBg.fillStyle(0x000000, 0.22);
  scoreBg.fillRoundedRect(scoreX, 16 + 5, scoreW, scoreH, radius.md);
  // 3D Bevel Base (Amber dark)
  scoreBg.fillStyle(0xb45309, 1);
  scoreBg.fillRoundedRect(scoreX, 16 + 5, scoreW, scoreH, radius.md);
  // Main Solar Gold face
  scoreBg.fillStyle(0xf59e0b, 1);
  scoreBg.fillRoundedRect(scoreX, 16, scoreW, scoreH - 5, radius.md);
  // Specular shine
  scoreBg.fillStyle(0xfde68a, 0.45);
  scoreBg.fillRoundedRect(scoreX + 6, 19, scoreW - 12, 26, radius.sm);
  scoreBg.lineStyle(2, 0x78350f, 0.9);
  scoreBg.strokeRoundedRect(scoreX, 16, scoreW, scoreH, radius.md);

  const scoreText = scene.add
    .text(scoreX + 10, 35, '💎 SCORE 0', {
      fontFamily: 'sans-serif',
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#FFFFFF',
    })
    .setOrigin(0, 0.5)
    .setStroke('#78350F', 5)
    .setDepth(z.hud + 1);
  scoreText.setData('testid', 'score-label');

  const bestScoreText = scene.add
    .text(scoreX + 10, 60, `🏆 BEST ${ctx.engine.state.bestScore}`, {
      fontFamily: 'sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#FEF08A',
    })
    .setOrigin(0, 0.5)
    .setStroke('#78350F', 4)
    .setDepth(z.hud + 1);

  // 2. Next Fruit & Swap Powerup Capsule (Cyan Mint 3D Capsule)
  const swapContainer = scene.add
    .container(174, 16)
    .setDepth(z.hud);
  swapContainer.setData('testid', 'next-fruit');

  const swapW = 186;
  const swapH = 72;
  const swapBg = scene.add.graphics();

  // Drop shadow
  swapBg.fillStyle(0x000000, 0.22);
  swapBg.fillRoundedRect(0, 5, swapW, swapH, radius.md);
  // 3D Bevel base (Dark Cyan)
  swapBg.fillStyle(0x047857, 1);
  swapBg.fillRoundedRect(0, 5, swapW, swapH, radius.md);
  // Main Mint Cyan face
  swapBg.fillStyle(0x06d6a0, 1);
  swapBg.fillRoundedRect(0, 0, swapW, swapH - 5, radius.md);
  // Specular gloss
  swapBg.fillStyle(0xa7f3d0, 0.45);
  swapBg.fillRoundedRect(6, 3, swapW - 12, 26, radius.sm);
  swapBg.lineStyle(2, 0x064e3b, 0.9);
  swapBg.strokeRoundedRect(0, 0, swapW, swapH, radius.md);

  // Circular glowing preview pedestals
  swapBg.fillStyle(0xffffff, 0.92);
  swapBg.fillCircle(112, 33, 21);
  swapBg.lineStyle(2, 0x047857, 0.8);
  swapBg.strokeCircle(112, 33, 21);

  swapBg.fillStyle(0xffffff, 0.88);
  swapBg.fillCircle(158, 33, 15);
  swapBg.lineStyle(1.5, 0x047857, 0.8);
  swapBg.strokeCircle(158, 33, 15);
  swapContainer.add(swapBg);

  const swapTitle = scene.add
    .text(10, 23, 'NEXT 🔄', {
      fontFamily: 'sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#FFFFFF',
    })
    .setOrigin(0, 0.5)
    .setStroke('#064E3B', 5);
  swapContainer.add(swapTitle);

  const swapCountText = scene.add
    .text(10, 48, `x${ctx.engine.powerups.swapCount} Swap`, {
      fontFamily: 'sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#FEF08A',
    })
    .setOrigin(0, 0.5)
    .setStroke('#064E3B', 4);
  swapContainer.add(swapCountText);

  const key0 = resolveFruitTexture(scene, 0);
  const nextPreview1 = scene.add.image(112, 33, key0).setDisplaySize(36, 36);
  const nextPreview2 = scene.add
    .image(158, 33, key0)
    .setDisplaySize(24, 24)
    .setAlpha(0.85);
  swapContainer.add(nextPreview1);
  swapContainer.add(nextPreview2);

  swapContainer.setInteractive(
    new Phaser.Geom.Rectangle(0, 0, swapW, swapH),
    Phaser.Geom.Rectangle.Contains,
  );
  if (swapContainer.input) swapContainer.input.cursor = 'pointer';
  swapContainer.on('pointerdown', () => callbacks.onSwap());

  // 3. Bucket Shake Button (Royal Purple 3D Candy Capsule)
  const shakeW = 104;
  const shakeH = 72;
  const shakeContainer = scene.add
    .container(368, 16)
    .setDepth(z.hud);
  shakeContainer.setData('testid', 'shake-btn');

  const shakeBg = scene.add.graphics();
  shakeBg.fillStyle(0x000000, 0.22);
  shakeBg.fillRoundedRect(0, 5, shakeW, shakeH, radius.md);
  shakeBg.fillStyle(0x5b21b6, 1);
  shakeBg.fillRoundedRect(0, 5, shakeW, shakeH, radius.md);
  shakeBg.fillStyle(0x8b5cf6, 1);
  shakeBg.fillRoundedRect(0, 0, shakeW, shakeH - 5, radius.md);
  shakeBg.fillStyle(0xddd6fe, 0.45);
  shakeBg.fillRoundedRect(6, 3, shakeW - 12, 26, radius.sm);
  shakeBg.lineStyle(2, 0x4c1d95, 0.9);
  shakeBg.strokeRoundedRect(0, 0, shakeW, shakeH, radius.md);
  shakeContainer.add(shakeBg);

  const shakeTitle = scene.add
    .text(52, 23, '📳 SHAKE', {
      fontFamily: 'sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#FFFFFF',
    })
    .setOrigin(0.5)
    .setStroke('#4C1D95', 5);
  shakeContainer.add(shakeTitle);

  const shakeCountText = scene.add
    .text(52, 48, `x${ctx.engine.powerups.shakeCount}`, {
      fontFamily: 'sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#FEF08A',
    })
    .setOrigin(0.5)
    .setStroke('#4C1D95', 4);
  shakeContainer.add(shakeCountText);

  shakeContainer.setInteractive(
    new Phaser.Geom.Rectangle(0, 0, shakeW, shakeH),
    Phaser.Geom.Rectangle.Contains,
  );
  if (shakeContainer.input) shakeContainer.input.cursor = 'pointer';
  shakeContainer.on('pointerdown', () => callbacks.onShake());

  // 4. Fruit Album Button 📖 (Coral Emerald 3D Square)
  const albumContainer = scene.add.container(480, 16).setDepth(z.hud);
  const albumW = 62;
  const albumH = 72;
  const albumBg = scene.add.graphics();
  albumBg.fillStyle(0x000000, 0.22);
  albumBg.fillRoundedRect(0, 5, albumW, albumH, radius.md);
  albumBg.fillStyle(0x047857, 1);
  albumBg.fillRoundedRect(0, 5, albumW, albumH, radius.md);
  albumBg.fillStyle(0x10b981, 1);
  albumBg.fillRoundedRect(0, 0, albumW, albumH - 5, radius.md);
  albumBg.fillStyle(0xa7f3d0, 0.45);
  albumBg.fillRoundedRect(6, 3, albumW - 12, 26, radius.sm);
  albumBg.lineStyle(2, 0x064e3b, 0.9);
  albumBg.strokeRoundedRect(0, 0, albumW, albumH, radius.md);
  albumContainer.add(albumBg);

  const albumIcon = scene.add
    .text(31, 33, '📖', { fontSize: '26px' })
    .setOrigin(0.5);
  albumContainer.add(albumIcon);

  albumContainer.setInteractive(
    new Phaser.Geom.Rectangle(0, 0, albumW, albumH),
    Phaser.Geom.Rectangle.Contains,
  );
  if (albumContainer.input) albumContainer.input.cursor = 'pointer';
  albumContainer.on('pointerdown', () => callbacks.onOpenAlbum());

  // 5. Pause Button ⏸️ (Slate Blue 3D Square)
  const pauseContainer = scene.add.container(550, 16).setDepth(z.hud);
  const pauseW = 62;
  const pauseH = 72;
  const pauseBg = scene.add.graphics();
  pauseBg.fillStyle(0x000000, 0.22);
  pauseBg.fillRoundedRect(0, 5, pauseW, pauseH, radius.md);
  pauseBg.fillStyle(0x1e293b, 1);
  pauseBg.fillRoundedRect(0, 5, pauseW, pauseH, radius.md);
  pauseBg.fillStyle(0x334155, 1);
  pauseBg.fillRoundedRect(0, 0, pauseW, pauseH - 5, radius.md);
  pauseBg.fillStyle(0x64748b, 0.45);
  pauseBg.fillRoundedRect(6, 3, pauseW - 12, 26, radius.sm);
  pauseBg.lineStyle(2, 0x0f172a, 0.9);
  pauseBg.strokeRoundedRect(0, 0, pauseW, pauseH, radius.md);
  pauseContainer.add(pauseBg);

  const pauseIcon = scene.add
    .text(31, 33, '⏸️', { fontSize: '24px' })
    .setOrigin(0.5);
  pauseContainer.add(pauseIcon);

  pauseContainer.setInteractive(
    new Phaser.Geom.Rectangle(0, 0, pauseW, pauseH),
    Phaser.Geom.Rectangle.Contains,
  );
  if (pauseContainer.input) pauseContainer.input.cursor = 'pointer';
  pauseContainer.on('pointerdown', () => callbacks.onPause());

  // 6. Daily Challenge Sub-Header Banner (if active)
  let dailyBannerText: Phaser.GameObjects.Text | undefined;
  if (ctx.isDailyMode) {
    const diff = ctx.getCurrentDailyDifficulty();
    const bannerW = Math.min(540, width - 40);
    const bannerH = 46;
    const bannerY = 100;
    const bannerBg = scene.add.graphics().setDepth(z.hud);
    bannerBg.fillStyle(0x000000, 0.16);
    bannerBg.fillRoundedRect(width / 2 - bannerW / 2, bannerY + 4, bannerW, bannerH, 23);
    bannerBg.fillStyle(0xffffff, 0.98);
    bannerBg.fillRoundedRect(width / 2 - bannerW / 2, bannerY, bannerW, bannerH, 23);
    bannerBg.lineStyle(2.5, 0xf59e0b, 1);
    bannerBg.strokeRoundedRect(width / 2 - bannerW / 2, bannerY, bannerW, bannerH, 23);

    dailyBannerText = scene.add
      .text(
        width / 2,
        bannerY + bannerH / 2,
        `📅 Day ${diff.dayLevel}/12: ${diff.fruitLimit} fruits left   •   Goal: ${diff.targetScore} pts 🎯`,
        {
          fontFamily: 'sans-serif',
          fontSize: '15px',
          fontStyle: 'bold',
          color: '#B45309',
        },
      )
      .setOrigin(0.5)
      .setDepth(z.hud + 1);
  }

  // 7. Stage Mode Sub-Header Banner (if active)
  let stageBannerText: Phaser.GameObjects.Text | undefined;
  if (state.gameMode === 'stage' && state.stageConfig) {
    const bannerW = Math.min(560, width - 36);
    const bannerH = 48;
    const bannerY = 96;
    const bannerBg = scene.add.graphics().setDepth(z.hud);
    bannerBg.fillStyle(0x000000, 0.16);
    bannerBg.fillRoundedRect(width / 2 - bannerW / 2, bannerY + 4, bannerW, bannerH, 24);
    bannerBg.fillStyle(0xffffff, 0.98);
    bannerBg.fillRoundedRect(width / 2 - bannerW / 2, bannerY, bannerW, bannerH, 24);
    bannerBg.lineStyle(2.5, 0x10b981, 1);
    bannerBg.strokeRoundedRect(width / 2 - bannerW / 2, bannerY, bannerW, bannerH, 24);

    stageBannerText = scene.add
      .text(
        width / 2,
        bannerY + bannerH / 2,
        `🗺️ Stage ${state.stageId}: ${state.stageConfig.name} • 🪂 ${state.stageDropsRemaining ?? 0} left`,
        {
          fontFamily: 'sans-serif',
          fontSize: '14px',
          fontStyle: 'bold',
          color: '#065F46',
        },
      )
      .setOrigin(0.5)
      .setDepth(z.hud + 1);
  }

  // 8. Combo popup text
  const comboPopup = createComboPopup(scene, layout);

  const elements: HudElements = {
    scoreText,
    bestScoreText,
    swapButtonContainer: swapContainer,
    swapCountText,
    shakeButtonContainer: shakeContainer,
    shakeCountText,
    nextPreview1,
    nextPreview2,
    dailyBannerText,
    stageBannerText,
    comboPopup,
  };

  updateHud(scene, elements, state);
  return elements;
}

export function updateHud(
  scene: Phaser.Scene,
  elements: HudElements,
  state: HudContextState,
): void {
  elements.scoreText.setText(`💎 SCORE ${ctx.engine.state.score}`);
  elements.bestScoreText.setText(
    `🏆 BEST ${Math.max(ctx.engine.state.bestScore, ctx.engine.state.score)}`,
  );
  if (elements.swapCountText) {
    elements.swapCountText.setText(`x${ctx.engine.powerups.swapCount} Swap`);
    elements.swapCountText.setColor(
      ctx.engine.powerups.swapCount > 0 ? '#10B981' : '#9CA3AF',
    );
  }
  if (elements.shakeCountText) {
    elements.shakeCountText.setText(`x${ctx.engine.powerups.shakeCount}`);
    elements.shakeCountText.setColor(
      ctx.engine.powerups.shakeCount > 0 ? '#8B5CF6' : '#9CA3AF',
    );
  }
  if (elements.dailyBannerText && ctx.isDailyMode) {
    const diff = ctx.getCurrentDailyDifficulty();
    const remaining = ctx.engine.state.dailyDropsRemaining;
    const reached = ctx.engine.state.score >= diff.targetScore;
    if (reached) {
      elements.dailyBannerText.setText(
        `🎉 DAY ${diff.dayLevel} COMPLETED: ${ctx.engine.state.score}/${diff.targetScore} pts (Left ${remaining}) 🏆`,
      );
      elements.dailyBannerText.setColor('#059669');
    } else {
      elements.dailyBannerText.setText(
        `📅 Day ${diff.dayLevel}/12: ${remaining}/${diff.fruitLimit} fruits left   •   Goal: ${diff.targetScore} pts 🎯`,
      );
      elements.dailyBannerText.setColor('#B45309');
    }
  }
  if (elements.stageBannerText && state.gameMode === 'stage' && state.stageConfig) {
    const activeObs = (state.stageObstacleStates ?? []).filter((o) => !o.isDestroyed).length;
    const combined = state.getCombinedStageTiers ? state.getCombinedStageTiers() : new Map<number, number>();
    const res = evaluateStageProgress(
      state.stageConfig,
      state.stageDropsUsed ?? 0,
      ctx.engine.state.score,
      combined,
      activeObs,
    );
    elements.stageBannerText.setText(
      `🗺️ Stg ${state.stageId} • 🪂 ${state.stageDropsRemaining} left • ${res.progressSummary}`,
    );
  }
  if (state.onUpdateActionBar) {
    state.onUpdateActionBar();
  }
  updateNextFruitHud(scene, elements);
}

export function updateNextFruitHud(scene: Phaser.Scene, elements: HudElements): void {
  if (!elements.nextPreview1 || !elements.nextPreview2) return;
  const nextTiers = ctx.engine.peekNext();
  const t1 = nextTiers[0] ?? 0;
  const t2 = nextTiers[1] ?? 0;

  const key1 = resolveFruitTexture(scene, t1);
  const key2 = resolveFruitTexture(scene, t2);

  elements.nextPreview1.setTexture(key1).setDisplaySize(34, 34);
  elements.nextPreview2.setTexture(key2).setDisplaySize(24, 24);
}

export function createComboPopup(scene: Phaser.Scene, layout: BucketLayout): Phaser.GameObjects.Text {
  const cx = (layout.bucketX0 + layout.bucketX1) / 2;
  const cy = layout.bucketTopY + layout.bucketHeight * 0.12;
  const comboPopup = scene.add
    .text(cx, cy, '', fontStyle(type.h1, color.warning))
    .setOrigin(0.5)
    .setDepth(z.hud)
    .setAlpha(0)
    .setStroke(color.textStroke, 6);
  comboPopup.setData('testid', 'combo-popup');
  return comboPopup;
}

export function flashCombo(scene: Phaser.Scene, comboPopup: Phaser.GameObjects.Text): void {
  const n = ctx.engine.state.comboCount;
  if (n < 2) return;

  const comboColors = [
    '#FFC048',
    '#FF9F1A',
    '#FF5252',
    '#FF1493',
    '#9B59B6',
    '#00D2D3',
  ];
  const colHex = comboColors[Math.min(n - 2, comboColors.length - 1)] ?? '#FFC048';

  comboPopup.setText(`Combo x${n}`);
  comboPopup.setColor(colHex);
  comboPopup.setAlpha(1);
  comboPopup.setScale(0.5);

  scene.tweens.killTweensOf(comboPopup);
  scene.tweens.add({
    targets: comboPopup,
    scaleX: 1.35,
    scaleY: 1.35,
    alpha: { from: 1, to: 0 },
    y: { from: comboPopup.y, to: comboPopup.y - 45 },
    duration: dur.slow + 100,
    ease: 'Back.easeOut',
  });
}

export function floatPowerupPopup(
  scene: Phaser.Scene,
  text: string,
  x: number,
  y: number,
  colorHex: string,
): void {
  const txt = scene.add
    .text(x, y, text, {
      fontFamily: 'sans-serif',
      fontSize: '22px',
      fontStyle: 'bold',
      color: colorHex,
    })
    .setOrigin(0.5)
    .setDepth(z.overlay + 5)
    .setStroke('#FFFFFF', 6)
    .setScale(0.5);

  scene.tweens.add({
    targets: txt,
    scale: 1.25,
    duration: dur.pop,
    ease: 'Back.easeOut',
    onComplete: () => {
      scene.tweens.add({
        targets: txt,
        alpha: 0,
        y: y - 50,
        duration: dur.base + 100,
        ease: 'Cubic.easeOut',
        onComplete: () => txt.destroy(),
      });
    },
  });
}
