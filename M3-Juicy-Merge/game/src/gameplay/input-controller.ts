// M3 Juicy Merge — Input Controller
// Manages pointer dragging, ghost fruit preview, aim guide line, dropping, swapping, and shaking.

import Phaser from 'phaser';
import { ctx } from '../context';
import { z, dur } from '../tokens';
import { fruitRadius, fruitDiameter, resolveFruitTexture } from './fruit-sprite';
import type { BucketLayout } from './physics-layout';
import type { DroppedFruit } from './merge-handler';
import {
  type ObstacleGameObject,
  updateObstacleDamageVisual,
  playObstacleDestructionEffect,
} from './obstacle-sprite';
import { damageObstacle } from '../logic/obstacles';
import { playHammerSmashVfx } from './juice-effects';
import { computeShakeImpulse } from '../logic/powerups';
import type { StageConfig } from '../logic/stages';

export interface InputControllerState {
  ghostX: number;
  ghostTier: number;
  isHammerMode: boolean;
  isBombActiveNext: boolean;
  isRainbowActiveNext: boolean;
  isShakingBucket: boolean;
  isPaused: boolean;
  gameOverTriggered: boolean;
  sceneStartTime: number;
  lastUiClickTime: number;
  lastMotionMs: number;
  gameMode: 'classic' | 'stage' | 'daily';
  stageDropsUsed: number;
  stageDropsRemaining: number;
  stageConfig?: StageConfig | undefined;
  hasClaimedDailyExtraDrops: boolean;
  fruits: DroppedFruit[];
  stageObstacleObjects: Map<string, ObstacleGameObject>;
  ghost: Phaser.GameObjects.Image;
  aimLine: Phaser.GameObjects.Graphics;
  hammerInstructionText?: Phaser.GameObjects.Text | undefined;
  swapButtonContainer?: Phaser.GameObjects.Container | undefined;
  shakeButtonContainer?: Phaser.GameObjects.Container | undefined;
}

export interface InputControllerCallbacks {
  promptRefillPowerups: () => void;
  updateHud: () => void;
  updateActionBar: () => void;
  spawnFruit: (tier: number, x: number, y: number) => DroppedFruit;
  removeFruit: (fruit: DroppedFruit) => void;
  checkStageProgress: () => void;
  showDailyExtraDropsModal: () => void;
  triggerGameOver: () => void;
  playSfx: (key: string, volume?: number, detune?: number) => void;
}

export function clampGhostX(x: number, tier: number, layout: BucketLayout): number {
  const r = fruitRadius(tier);
  return Phaser.Math.Clamp(x, layout.bucketX0 + r, layout.bucketX1 - r);
}

export function createAimLine(scene: Phaser.Scene): Phaser.GameObjects.Graphics {
  return scene.add.graphics().setDepth(z.bg + 2);
}

export function refreshAimLine(
  aimLine: Phaser.GameObjects.Graphics,
  layout: BucketLayout,
  ghostX: number,
  ghostTier: number,
  isGameOver: boolean,
): void {
  aimLine.clear();
  if (isGameOver) return;

  const r = fruitRadius(ghostTier);
  const startY = layout.spawnY + r + 4;
  const endY = layout.bucketBottomY - 10;

  aimLine.lineStyle(2, 0x9a6136, 0.4);
  const dash = 12;
  const gap = 8;
  for (let y = startY; y < endY; y += dash + gap) {
    const y2 = Math.min(y + dash, endY);
    aimLine.beginPath();
    aimLine.moveTo(ghostX, y);
    aimLine.lineTo(ghostX, y2);
    aimLine.strokePath();
  }
}

export function createGhost(
  scene: Phaser.Scene,
  layout: BucketLayout,
  ghostX: number,
  ghostTier: number,
): Phaser.GameObjects.Image {
  const key = resolveFruitTexture(scene, ghostTier);
  const d = fruitDiameter(ghostTier);
  const ghost = scene.add
    .image(ghostX, layout.spawnY, key)
    .setDisplaySize(d, d)
    .setAlpha(0.88)
    .setDepth(z.hud);
  ghost.setData('testid', 'drop-ghost');
  return ghost;
}

export function refreshGhost(
  scene: Phaser.Scene,
  layout: BucketLayout,
  state: InputControllerState,
): void {
  if (state.isBombActiveNext) {
    state.ghost.setTexture('fruit_01_cherry');
    state.ghost.setDisplaySize(56, 56);
    state.ghost.setTint(0x212121);
  } else if (state.isRainbowActiveNext) {
    state.ghost.setTexture('fruit_07_apple');
    state.ghost.setDisplaySize(60, 60);
    state.ghost.setTint(0xffd54f);
  } else {
    const key = resolveFruitTexture(scene, state.ghostTier);
    const d = fruitDiameter(state.ghostTier);
    state.ghost.setTexture(key);
    state.ghost.setDisplaySize(d, d);
    state.ghost.clearTint();
  }
  state.ghostX = clampGhostX(state.ghostX, state.ghostTier, layout);
  state.ghost.setPosition(state.ghostX, layout.spawnY);
  state.ghost.setAlpha(state.isHammerMode ? 0.25 : 0.88);
  refreshAimLine(state.aimLine, layout, state.ghostX, state.ghostTier, state.gameOverTriggered);
}

export function bindInput(
  scene: Phaser.Scene,
  layout: BucketLayout,
  state: InputControllerState,
  callbacks: InputControllerCallbacks,
): void {
  const HUD_SAFE_Y = Math.min(130, layout.spawnY - 30);

  scene.input.on('pointermove', (p: Phaser.Input.Pointer) => {
    if (state.isPaused || state.gameOverTriggered || p.worldY < HUD_SAFE_Y) return;
    state.ghostX = clampGhostX(p.worldX, state.ghostTier, layout);
    state.ghost.x = state.ghostX;
    refreshAimLine(state.aimLine, layout, state.ghostX, state.ghostTier, state.gameOverTriggered);
  });

  scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
    if (state.isPaused || state.gameOverTriggered || p.worldY < HUD_SAFE_Y) return;
    state.ghostX = clampGhostX(p.worldX, state.ghostTier, layout);
    state.ghost.x = state.ghostX;
    refreshAimLine(state.aimLine, layout, state.ghostX, state.ghostTier, state.gameOverTriggered);
  });

  scene.input.on('pointerup', (p: Phaser.Input.Pointer) => {
    if (state.isPaused || state.gameOverTriggered || p.worldY < HUD_SAFE_Y) return;
    if (scene.time.now - state.sceneStartTime < 400) return;
    if (scene.time.now - state.lastUiClickTime < 450) return;
    tryDrop(scene, layout, state, callbacks, p.worldX, p.worldY);
  });
}

export function tryDrop(
  scene: Phaser.Scene,
  layout: BucketLayout,
  state: InputControllerState,
  callbacks: InputControllerCallbacks,
  pointerX?: number,
  pointerY?: number,
): void {
  const now = scene.time.now;
  if (!ctx.engine.canDrop(now)) return;

  // 1. Handle Hammer Targeting Mode
  if (state.isHammerMode) {
    const clickX = pointerX ?? state.ghostX;
    const clickY = pointerY ?? layout.spawnY;

    // Find closest fruit to actual pointer tap position
    let closestFruit: DroppedFruit | null = null;
    let minFruitDist = 180;
    for (const f of state.fruits) {
      const d = Phaser.Math.Distance.Between(clickX, clickY, f.obj.x, f.obj.y);
      const touchR = fruitRadius(f.tier) + 40;
      if (d < touchR && d < minFruitDist) {
        minFruitDist = d;
        closestFruit = f;
      }
    }

    // Find closest obstacle to actual pointer tap position
    let closestObs: ObstacleGameObject | null = null;
    let minObsDist = 180;
    for (const obs of state.stageObstacleObjects.values()) {
      const d = Phaser.Math.Distance.Between(clickX, clickY, obs.container.x, obs.container.y);
      const touchR = Math.max(obs.state.width, obs.state.height) / 2 + 40;
      if (d < touchR && d < minObsDist) {
        minObsDist = d;
        closestObs = obs;
      }
    }

    if (closestFruit) {
      const target = closestFruit;
      playHammerSmashVfx(scene, target.obj.x, target.obj.y, () => {
        callbacks.removeFruit(target);
      });
      void ctx.score.consumePowerup('hammer');
      state.isHammerMode = false;
      if (state.hammerInstructionText) state.hammerInstructionText.setAlpha(0);
      refreshGhost(scene, layout, state);
      callbacks.updateHud();
      callbacks.playSfx('sfx_merge_big', 0.6);
      return;
    } else if (closestObs) {
      const targetObs = closestObs;
      playHammerSmashVfx(scene, targetObs.container.x, targetObs.container.y, () => {
        const { wasDestroyed } = damageObstacle(targetObs.state, 2);
        updateObstacleDamageVisual(targetObs);
        if (wasDestroyed) {
          playObstacleDestructionEffect(scene, targetObs);
          state.stageObstacleObjects.delete(String(targetObs.state.id));
        }
      });
      void ctx.score.consumePowerup('hammer');
      state.isHammerMode = false;
      if (state.hammerInstructionText) state.hammerInstructionText.setAlpha(0);
      refreshGhost(scene, layout, state);
      callbacks.updateHud();
      callbacks.checkStageProgress();
      callbacks.playSfx('sfx_merge_big', 0.6);
      return;
    } else {
      // Tapped in empty space during hammer mode: do NOT drop a fruit
      return;
    }
  }

  // 2. Handle Special Bomb or Rainbow Drop
  let tier = state.ghostTier;
  if (state.isBombActiveNext) {
    tier = -1; // Bomb
    void ctx.score.consumePowerup('bomb');
    state.isBombActiveNext = false;
    callbacks.updateActionBar();
  } else if (state.isRainbowActiveNext) {
    tier = -2; // Rainbow
    void ctx.score.consumePowerup('rainbow');
    state.isRainbowActiveNext = false;
    callbacks.updateActionBar();
  }

  ctx.engine.recordDrop(now);
  state.lastMotionMs = now;
  callbacks.spawnFruit(tier, state.ghostX, layout.spawnY);
  callbacks.playSfx('sfx_drop');

  if (state.gameMode === 'stage' && state.stageConfig) {
    state.stageDropsUsed++;
    state.stageDropsRemaining = Math.max(0, state.stageConfig.maxDrops - state.stageDropsUsed);
  }

  state.ghostTier = ctx.engine.nextFruit();
  refreshGhost(scene, layout, state);
  callbacks.updateHud();
  callbacks.checkStageProgress();

  if (ctx.isDailyMode && ctx.engine.state.dailyDropsRemaining <= 0) {
    scene.time.delayedCall(2000, () => {
      if (!state.gameOverTriggered) {
        const diff = ctx.getCurrentDailyDifficulty();
        if (
          ctx.engine.state.score < diff.targetScore &&
          !state.hasClaimedDailyExtraDrops
        ) {
          callbacks.showDailyExtraDropsModal();
        } else {
          callbacks.triggerGameOver();
        }
      }
    });
  }
}

export function onSwapFruit(
  scene: Phaser.Scene,
  layout: BucketLayout,
  state: InputControllerState,
  callbacks: InputControllerCallbacks,
): void {
  state.lastUiClickTime = scene.time.now;
  if (state.gameOverTriggered) return;
  if (!ctx.engine.canSwap()) {
    callbacks.promptRefillPowerups();
    return;
  }

  const { success, newGhostTier } = ctx.engine.swapGhost(state.ghostTier);
  if (!success) return;

  state.ghostTier = newGhostTier;
  refreshGhost(scene, layout, state);
  callbacks.updateHud();

  callbacks.playSfx('sfx_drop', 0.6, 500);
  const baseScaleX = state.ghost.scaleX;
  const baseScaleY = state.ghost.scaleY;
  scene.tweens.add({
    targets: state.ghost,
    scaleX: { from: baseScaleX * 0.2, to: baseScaleX },
    scaleY: { from: baseScaleY * 1.3, to: baseScaleY },
    duration: dur.pop,
    ease: 'Back.easeOut',
  });
  if (state.swapButtonContainer) {
    scene.tweens.add({
      targets: state.swapButtonContainer,
      scaleX: { from: 0.95, to: 1 },
      scaleY: { from: 0.95, to: 1 },
      duration: dur.fast,
      ease: 'Back.easeOut',
    });
  }
}

export function onShakeBucket(
  scene: Phaser.Scene,
  state: InputControllerState,
  callbacks: InputControllerCallbacks,
): void {
  state.lastUiClickTime = scene.time.now;
  if (state.gameOverTriggered || state.isShakingBucket) return;
  if (!ctx.engine.canShake()) {
    callbacks.promptRefillPowerups();
    return;
  }

  if (!ctx.engine.useShake()) return;
  state.isShakingBucket = true;
  callbacks.updateHud();

  scene.cameras.main.shake(1200, 0.005);
  callbacks.playSfx('sfx_merge', 0.8, -300);

  const startTime = scene.time.now;
  const shakeDurationMs = 1200;

  scene.time.addEvent({
    delay: 16,
    repeat: Math.floor(shakeDurationMs / 16),
    callback: () => {
      const elapsed = (scene.time.now - startTime) / 1000;
      for (let i = 0; i < state.fruits.length; i++) {
        const f = state.fruits[i];
        if (!f) continue;
        const b = f.obj.body as MatterJS.BodyType | undefined;
        if (!b) continue;
        const { fx, fy } = computeShakeImpulse(b.mass ?? 1, elapsed, i);
        f.obj.applyForce(new Phaser.Math.Vector2(fx, fy));
      }
    },
  });

  scene.time.delayedCall(shakeDurationMs + 50, () => {
    state.isShakingBucket = false;
    state.lastMotionMs = scene.time.now;
  });

  if (state.shakeButtonContainer) {
    scene.tweens.add({
      targets: state.shakeButtonContainer,
      scaleX: { from: 0.95, to: 1 },
      scaleY: { from: 0.95, to: 1 },
      duration: dur.fast,
      ease: 'Back.easeOut',
    });
  }
}
