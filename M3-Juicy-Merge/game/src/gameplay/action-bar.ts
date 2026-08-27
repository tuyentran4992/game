// M3 Juicy Merge — Action Bar
// Manages the Stage Mode / Action Powerups Bar (Hammer, Bomb, Rainbow) and toggles.

import Phaser from 'phaser';
import { ctx } from '../context';
import { z } from '../tokens';
import type { BucketLayout } from './physics-layout';

export interface ActionBarElements {
  container: Phaser.GameObjects.Container;
  hammerButtonBg: Phaser.GameObjects.Graphics;
  bombButtonBg: Phaser.GameObjects.Graphics;
  rainbowButtonBg: Phaser.GameObjects.Graphics;
  hammerCountText: Phaser.GameObjects.Text;
  bombCountText: Phaser.GameObjects.Text;
  rainbowCountText: Phaser.GameObjects.Text;
  hammerInstructionText: Phaser.GameObjects.Text;
}

export interface ActionBarState {
  isHammerMode: boolean;
  isBombActiveNext: boolean;
  isRainbowActiveNext: boolean;
  isGameOver: () => boolean;
}

export interface ActionBarCallbacks {
  promptRefillPowerups: () => void;
  refreshGhost: () => void;
  onActionUsed?: () => void;
}

export function createActionBar(
  scene: Phaser.Scene,
  layout: BucketLayout,
  state: ActionBarState,
  callbacks: ActionBarCallbacks,
): ActionBarElements {
  const { width, height } = scene.scale;
  const barY = Math.min(height - 42, layout.bucketBottomY + 70);

  const container = scene.add.container(width / 2, barY).setDepth(z.hud);

  const btnW = 90;
  const btnH = 50;
  const spacing = 105;

  // 1. Hammer Button (Cyan)
  const hammerCont = scene.add.container(-spacing, 0);
  const hammerButtonBg = scene.add.graphics();
  renderActionButtonBg(hammerButtonBg, btnW, btnH, 0x00bcd4, state.isHammerMode);
  const hammerIcon = scene.add.text(-14, 0, '🔨', { fontSize: '20px' }).setOrigin(0.5);
  const hammerCountText = scene.add
    .text(16, 0, `x${ctx.score.powerups.hammer}`, {
      fontFamily: 'sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#FFFFFF',
    })
    .setOrigin(0.5);
  hammerCont.add([hammerButtonBg, hammerIcon, hammerCountText]);
  hammerCont.setSize(btnW, btnH);
  hammerCont.setInteractive({ useHandCursor: true });
  hammerCont.on('pointerdown', () => onUseHammer(state, callbacks, elements));

  // 2. Bomb Button (Orange)
  const bombCont = scene.add.container(0, 0);
  const bombButtonBg = scene.add.graphics();
  renderActionButtonBg(bombButtonBg, btnW, btnH, 0xff5722, state.isBombActiveNext);
  const bombIcon = scene.add.text(-14, 0, '💣', { fontSize: '20px' }).setOrigin(0.5);
  const bombCountText = scene.add
    .text(16, 0, `x${ctx.score.powerups.bomb}`, {
      fontFamily: 'sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#FFFFFF',
    })
    .setOrigin(0.5);
  bombCont.add([bombButtonBg, bombIcon, bombCountText]);
  bombCont.setSize(btnW, btnH);
  bombCont.setInteractive({ useHandCursor: true });
  bombCont.on('pointerdown', () => onUseBomb(state, callbacks, elements));

  // 3. Rainbow Button (Purple)
  const rainbowCont = scene.add.container(spacing, 0);
  const rainbowButtonBg = scene.add.graphics();
  renderActionButtonBg(rainbowButtonBg, btnW, btnH, 0x8b5cf6, state.isRainbowActiveNext);
  const rainbowIcon = scene.add.text(-14, 0, '🌈', { fontSize: '20px' }).setOrigin(0.5);
  const rainbowCountText = scene.add
    .text(16, 0, `x${ctx.score.powerups.rainbow}`, {
      fontFamily: 'sans-serif',
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#FFFFFF',
    })
    .setOrigin(0.5);
  rainbowCont.add([rainbowButtonBg, rainbowIcon, rainbowCountText]);
  rainbowCont.setSize(btnW, btnH);
  rainbowCont.setInteractive({ useHandCursor: true });
  rainbowCont.on('pointerdown', () => onUseRainbow(state, callbacks, elements));

  container.add([hammerCont, bombCont, rainbowCont]);

  // Instruction banner if hammer mode is active
  const hammerInstructionText = scene.add
    .text(width / 2, barY - 38, '🔨 TAP ANY FRUIT OR OBSTACLE TO SMASH!', {
      fontFamily: 'sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
      color: '#00BCD4',
    })
    .setOrigin(0.5)
    .setStroke('#FFFFFF', 3)
    .setDepth(z.hud + 2)
    .setAlpha(0);

  const elements: ActionBarElements = {
    container,
    hammerButtonBg,
    bombButtonBg,
    rainbowButtonBg,
    hammerCountText,
    bombCountText,
    rainbowCountText,
    hammerInstructionText,
  };

  return elements;
}

export function renderActionButtonBg(
  g: Phaser.GameObjects.Graphics,
  w: number,
  h: number,
  colorHex: number,
  isActive: boolean,
): void {
  g.clear();
  const halfW = w / 2;
  const halfH = h / 2;

  g.fillStyle(0x000000, 0.2);
  g.fillRoundedRect(-halfW, -halfH + 3, w, h, 14);

  g.fillStyle(colorHex, 1);
  g.fillRoundedRect(-halfW, -halfH, w, h, 14);

  g.fillStyle(0xffffff, 0.22);
  g.fillRoundedRect(-halfW + 3, -halfH + 3, w - 6, halfH - 2, 8);

  g.lineStyle(isActive ? 3 : 1.5, isActive ? 0xffeb3b : 0xffffff, 0.9);
  g.strokeRoundedRect(-halfW, -halfH, w, h, 14);
}

export function updateActionBar(elements: ActionBarElements, state: ActionBarState): void {
  if (elements.hammerCountText && elements.hammerCountText.scene && elements.hammerCountText.active) {
    elements.hammerCountText.setText(`x${ctx.score.powerups.hammer}`);
  }
  if (elements.bombCountText && elements.bombCountText.scene && elements.bombCountText.active) {
    elements.bombCountText.setText(`x${ctx.score.powerups.bomb}`);
  }
  if (elements.rainbowCountText && elements.rainbowCountText.scene && elements.rainbowCountText.active) {
    elements.rainbowCountText.setText(`x${ctx.score.powerups.rainbow}`);
  }
  if (elements.hammerButtonBg && elements.hammerButtonBg.scene && elements.hammerButtonBg.active) {
    renderActionButtonBg(elements.hammerButtonBg, 90, 50, 0x00bcd4, state.isHammerMode);
  }
  if (elements.bombButtonBg && elements.bombButtonBg.scene && elements.bombButtonBg.active) {
    renderActionButtonBg(elements.bombButtonBg, 90, 50, 0xff5722, state.isBombActiveNext);
  }
  if (elements.rainbowButtonBg && elements.rainbowButtonBg.scene && elements.rainbowButtonBg.active) {
    renderActionButtonBg(elements.rainbowButtonBg, 90, 50, 0x8b5cf6, state.isRainbowActiveNext);
  }
}

export function onUseHammer(
  state: ActionBarState,
  callbacks: ActionBarCallbacks,
  elements: ActionBarElements,
): void {
  if (state.isGameOver()) return;
  if (!ctx.score.canUsePowerup('hammer')) {
    callbacks.promptRefillPowerups();
    return;
  }
  state.isHammerMode = !state.isHammerMode;
  state.isBombActiveNext = false;
  state.isRainbowActiveNext = false;
  updateActionBar(elements, state);
  callbacks.refreshGhost();

  if (elements.hammerInstructionText) {
    elements.hammerInstructionText.setAlpha(state.isHammerMode ? 1 : 0);
  }
}

export function onUseBomb(
  state: ActionBarState,
  callbacks: ActionBarCallbacks,
  elements: ActionBarElements,
): void {
  if (state.isGameOver()) return;
  if (!ctx.score.canUsePowerup('bomb')) {
    callbacks.promptRefillPowerups();
    return;
  }
  state.isBombActiveNext = !state.isBombActiveNext;
  state.isHammerMode = false;
  state.isRainbowActiveNext = false;
  if (elements.hammerInstructionText) elements.hammerInstructionText.setAlpha(0);
  updateActionBar(elements, state);
  callbacks.refreshGhost();
}

export function onUseRainbow(
  state: ActionBarState,
  callbacks: ActionBarCallbacks,
  elements: ActionBarElements,
): void {
  if (state.isGameOver()) return;
  if (!ctx.score.canUsePowerup('rainbow')) {
    callbacks.promptRefillPowerups();
    return;
  }
  state.isRainbowActiveNext = !state.isRainbowActiveNext;
  state.isHammerMode = false;
  state.isBombActiveNext = false;
  if (elements.hammerInstructionText) elements.hammerInstructionText.setAlpha(0);
  updateActionBar(elements, state);
  callbacks.refreshGhost();
}
