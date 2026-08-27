// M3 Juicy Merge — Merge Processor
// Handles Matter collision detection, instant safe merging, bombs, rainbows, and stage progression checks.

import Phaser from 'phaser';
import { ctx } from '../context';
import { CONFIG } from '../logic/config';
import { z } from '../tokens';
import { fruitRadius, fruitDiameter, resolveFruitTexture } from './fruit-sprite';
import type { DroppedFruit, PendingMerge, CollisionEventHandle, MatterBodyHandle, CollidingFruit } from './merge-handler';
import { resolveMergeBatch } from './merge-handler';
import {
  type ObstacleGameObject,
  updateObstacleDamageVisual,
  playObstacleDestructionEffect,
} from './obstacle-sprite';
import {
  damageObstacle,
  evaluateObstacleDamageOnMerge,
  type ObstacleState,
} from '../logic/obstacles';
import {
  playJuiceSplash,
  playJackpotClimax,
  playBombExplosionVfx,
  playFireworksCelebration,
  computeComboDetune,
} from './juice-effects';
import { evaluateBombBlast } from '../logic/action-powerups';
import { evaluateStageProgress, type StageConfig } from '../logic/stages';

export interface MergeProcessorContext {
  fruits: DroppedFruit[];
  fruitsById: Map<number, DroppedFruit>;
  mergingFruitIds: Set<number>;
  pendingMerges: PendingMerge[];
  nextFruitId: number;
  stageObstacleStates: ObstacleState[];
  stageObstacleObjects: Map<string, ObstacleGameObject>;
  stageCreatedTiers: Map<number, number>;
  stageConfig?: StageConfig | undefined;
  stageId?: number | undefined;
  stageDropsUsed: number;
  stageDropsRemaining: number;
  stageVictoryCelebrated: boolean;
  cosmicVictoryCelebrated: boolean;
  dailyVictoryCelebrated: boolean;
  gameOverTriggered: boolean;
  lastMotionMs: number;
  gameMode: 'classic' | 'stage' | 'daily';
  layout: {
    bucketTopY: number;
    bucketBottomY: number;
    bucketHeight: number;
    bucketX0: number;
    bucketX1: number;
    dangerY: number;
    spawnY: number;
  };
}

export interface MergeProcessorCallbacks {
  updateHud: () => void;
  flashCombo: () => void;
  floatScorePopup: (gain: number, x: number, y: number) => void;
  floatPowerupPopup: (text: string, x: number, y: number, colorHex: string) => void;
  celebrateNewRecord: () => void;
  celebrateNewFruitDiscovery: (name: string) => void;
  celebrateDailyVictory: (rewardName?: string) => void;
  showCosmicVictoryModal: () => void;
  triggerGameOver: () => void;
  playSfx: (key: string, volume?: number, detune?: number) => void;
}

export function fruitOf(
  body: MatterBodyHandle | null | undefined,
): CollidingFruit | null {
  if (!body) return null;
  const anyBody = body as {
    gameObject?: unknown;
    parent?: { gameObject?: unknown };
  };
  const go = (anyBody.gameObject ??
    anyBody.parent?.gameObject) as Phaser.Physics.Matter.Image | null;
  if (!go || typeof go.getData !== 'function') return null;
  const id = go.getData('id');
  const tier = go.getData('tier');
  if (typeof id !== 'number' || typeof tier !== 'number') return null;
  return { id, tier };
}

export function spawnFruit(
  scene: Phaser.Scene,
  tier: number,
  x: number,
  y: number,
  ctxState: MergeProcessorContext,
): DroppedFruit {
  let key = '';
  let r = 24;
  let d = 48;

  if (tier === -1) {
    // Bomb
    key = 'fruit_01_cherry';
    r = 30;
    d = 60;
  } else if (tier === -2) {
    // Rainbow
    key = 'fruit_07_apple';
    r = 32;
    d = 64;
  } else {
    key = resolveFruitTexture(scene, tier);
    r = fruitRadius(tier);
    d = fruitDiameter(tier);
  }

  const fruit = scene.matter.add.image(x, y, key);
  fruit.setDisplaySize(d, d);
  fruit.setCircle(r, {
    restitution: CONFIG.physics.restitution,
    friction: CONFIG.physics.friction,
  });
  fruit.setOrigin(0.5, 0.5);
  fruit.setDepth(z.actor);

  if (tier === -1) {
    fruit.setTint(0x212121);
  } else if (tier === -2) {
    fruit.setTint(0xffd54f);
  }

  const id = ctxState.nextFruitId++;
  fruit.setData('id', id);
  fruit.setData('tier', tier);
  fruit.setData('spawnTime', scene.time.now);
  const df: DroppedFruit = { id, obj: fruit, tier };
  ctxState.fruits.push(df);
  ctxState.fruitsById.set(id, df);
  return df;
}

export function removeFruit(
  scene: Phaser.Scene,
  df: DroppedFruit,
  ctxState: MergeProcessorContext,
): void {
  scene.tweens.killTweensOf(df.obj);
  ctxState.mergingFruitIds.delete(df.id);
  ctxState.fruitsById.delete(df.id);
  const i = ctxState.fruits.indexOf(df);
  if (i >= 0) ctxState.fruits.splice(i, 1);
  df.obj.destroy();
}

export function setupCollisions(
  scene: Phaser.Scene,
  ctxState: MergeProcessorContext,
  callbacks: MergeProcessorCallbacks,
): void {
  scene.matter.world.on('collisionstart', (event: CollisionEventHandle) => {
    handleCollisions(scene, event, ctxState, callbacks);
  });
}

export function handleCollisions(
  scene: Phaser.Scene,
  event: CollisionEventHandle,
  ctxState: MergeProcessorContext,
  callbacks: MergeProcessorCallbacks,
): void {
  if (ctxState.gameOverTriggered) return;

  const pairs: [CollidingFruit, CollidingFruit][] = [];
  for (const pair of event.pairs) {
    const a = fruitOf(pair.bodyA);
    const b = fruitOf(pair.bodyB);
    if (!a || !b || a.id === b.id) continue;

    // 1. Bomb detonation on contact
    if (a.tier === -1 || b.tier === -1) {
      const bombId = a.tier === -1 ? a.id : b.id;
      const bombFruit = ctxState.fruitsById.get(bombId);
      if (bombFruit && !ctxState.mergingFruitIds.has(bombId)) {
        ctxState.mergingFruitIds.add(bombId);
        detonateBomb(scene, bombFruit.obj.x, bombFruit.obj.y, bombId, ctxState, callbacks);
      }
      continue;
    }

    // 2. Rainbow wildcard merge on contact
    if (a.tier === -2 || b.tier === -2) {
      const otherFruit = a.tier === -2 ? b : a;
      if (
        otherFruit.tier >= 0 &&
        otherFruit.tier < CONFIG.maxTier &&
        !ctxState.mergingFruitIds.has(a.id) &&
        !ctxState.mergingFruitIds.has(b.id)
      ) {
        ctxState.mergingFruitIds.add(a.id);
        ctxState.mergingFruitIds.add(b.id);
        const newTier = Math.min(CONFIG.maxTier, otherFruit.tier + 1);
        const scoreGain = CONFIG.scorePerTier[newTier] || 50;
        executeSingleMerge(scene, a.id, b.id, newTier, scoreGain, ctxState, callbacks);
      }
      continue;
    }

    // 3. Regular same-tier merge
    if (a.tier === b.tier && !ctxState.mergingFruitIds.has(a.id) && !ctxState.mergingFruitIds.has(b.id)) {
      pairs.push([a, b]);
    }
  }

  if (pairs.length === 0) return;

  const now = scene.time.now;
  const plans = resolveMergeBatch(pairs, now, ctx.engine);
  for (const plan of plans) {
    ctxState.mergingFruitIds.add(plan.aId);
    ctxState.mergingFruitIds.add(plan.bId);
    executeSingleMerge(scene, plan.aId, plan.bId, plan.newTier, plan.scoreGain, ctxState, callbacks);
  }
}

export function executeSingleMerge(
  scene: Phaser.Scene,
  aId: number,
  bId: number,
  newTier: number,
  scoreGain: number,
  ctxState: MergeProcessorContext,
  callbacks: MergeProcessorCallbacks,
): void {
  const a = ctxState.fruitsById.get(aId);
  const b = ctxState.fruitsById.get(bId);
  if (!a || !b) return;

  const midX = (a.obj.x + b.obj.x) / 2;
  const midY = (a.obj.y + b.obj.y) / 2;

  removeFruit(scene, a, ctxState);
  removeFruit(scene, b, ctxState);

  const merged = spawnFruit(scene, newTier, midX, midY, ctxState);
  merged.obj.setVelocity(0, -2);

  // Pop tween (scaleX and scaleY must both be tweened back to exact resting display size)
  const finalScaleX = merged.obj.scaleX;
  const finalScaleY = merged.obj.scaleY;
  merged.obj.setScale(finalScaleX * 0.4, finalScaleY * 0.4);
  scene.tweens.add({
    targets: merged.obj,
    scaleX: finalScaleX,
    scaleY: finalScaleY,
    duration: 200,
    ease: 'Back.easeOut',
  });

  // Record stage tier creation
  ctxState.stageCreatedTiers.set(
    newTier,
    (ctxState.stageCreatedTiers.get(newTier) || 0) + 1,
  );

  // Visual juice: shockwave + colored radial juice droplets
  playJuiceSplash(scene, midX, midY, newTier);
  callbacks.floatScorePopup(scoreGain, midX, midY - 12);
  callbacks.flashCombo();

  // Check obstacle damage from merge shockwave
  if (ctxState.stageObstacleStates.length > 0) {
    const worldPositions = new Map<number, { x: number; y: number }>();
    for (const [id, obsObj] of ctxState.stageObstacleObjects.entries()) {
      worldPositions.set(Number(id), { x: obsObj.container.x, y: obsObj.container.y });
    }

    const obsDamage = evaluateObstacleDamageOnMerge(
      { x: midX, y: midY },
      ctxState.stageObstacleStates,
      worldPositions,
      130,
    );

    for (const damagedObs of obsDamage.damaged) {
      const obsObj = ctxState.stageObstacleObjects.get(String(damagedObs.id));
      if (obsObj) {
        updateObstacleDamageVisual(obsObj);
      }
    }

    for (const destroyedObs of obsDamage.destroyed) {
      const obsObj = ctxState.stageObstacleObjects.get(String(destroyedObs.id));
      if (obsObj) {
        playObstacleDestructionEffect(scene, obsObj);
        if (typeof destroyedObs.containedFruitTier === 'number') {
          spawnFruit(
            scene,
            destroyedObs.containedFruitTier,
            obsObj.container.x,
            obsObj.container.y,
            ctxState,
          );
        }
        ctxState.stageObstacleObjects.delete(String(destroyedObs.id));
      }
    }
  }

  const bigMerge = newTier >= CONFIG.maxTier - 1;
  if (bigMerge) {
    playJackpotClimax(scene, midX, midY);
  }

  ctxState.lastMotionMs = scene.time.now;

  // 1. Process Fruit Discovery in Album & Cosmic Victory
  if (newTier === 14 && !ctxState.cosmicVictoryCelebrated) {
    ctxState.cosmicVictoryCelebrated = true;
    callbacks.showCosmicVictoryModal();
  }
  ctx.discoverFruit(newTier).then(({ isNew, info }) => {
    if (isNew) {
      callbacks.celebrateNewFruitDiscovery(info.name);
      ctx.engine.addSwap(1);
      ctx.engine.addShake(1);
      callbacks.updateHud();
    }
  });

  // 2. Process Milestone rewards and New Record
  const { reward, isNewRecordBroken } = ctx.engine.processMergeMilestones();
  const popX = midX;
  const popY = ctxState.layout.bucketTopY + 80;

  if (reward === 'swap') {
    callbacks.floatPowerupPopup('+1 SWAP 🔄', popX, popY, '#10B981');
  } else if (reward === 'shake') {
    callbacks.floatPowerupPopup('+1 SHAKE 📳', popX, popY, '#8B5CF6');
  }

  if (isNewRecordBroken) {
    callbacks.celebrateNewRecord();
  }

  // 3. Process Daily Challenge Victory
  const diff = ctx.getCurrentDailyDifficulty();
  if (
    ctx.isDailyMode &&
    ctx.engine.state.score >= diff.targetScore &&
    !ctxState.dailyVictoryCelebrated
  ) {
    ctxState.dailyVictoryCelebrated = true;
    ctx
      .recordDailyVictory(ctx.engine.state.score)
      .then(({ milestoneReward }) => {
        callbacks.celebrateDailyVictory(
          milestoneReward
            ? `${milestoneReward.name} ${milestoneReward.emoji}`
            : undefined,
        );
        callbacks.updateHud();
      });
  }

  callbacks.updateHud();
  checkStageProgress(scene, ctxState, callbacks);

  const combo = ctx.engine.state.comboCount;
  const detune = computeComboDetune(combo);
  callbacks.playSfx(bigMerge ? 'sfx_merge_big' : 'sfx_merge', 0.5, detune);
}

export function detonateBomb(
  scene: Phaser.Scene,
  x: number,
  y: number,
  bombFruitId: number | undefined,
  ctxState: MergeProcessorContext,
  callbacks: MergeProcessorCallbacks,
): void {
  const blastRadius = 160;
  playBombExplosionVfx(scene, x, y, blastRadius, () => {
    if (bombFruitId) {
      const bombFruit = ctxState.fruitsById.get(bombFruitId);
      if (bombFruit) removeFruit(scene, bombFruit, ctxState);
    }

    const fruitPositions = ctxState.fruits.map((f) => ({ id: f.id, x: f.obj.x, y: f.obj.y }));
    const obsPositions = Array.from(ctxState.stageObstacleObjects.values()).map((o) => ({
      id: o.state.id,
      x: o.container.x,
      y: o.container.y,
    }));

    const blast = evaluateBombBlast({ x, y }, blastRadius, fruitPositions, obsPositions);

    for (const fId of blast.affectedFruitIds) {
      if (fId === bombFruitId) continue;
      const f = ctxState.fruitsById.get(fId);
      if (f) {
        playJuiceSplash(scene, f.obj.x, f.obj.y, f.tier);
        removeFruit(scene, f, ctxState);
      }
    }

    for (const obsId of blast.affectedObstacleIds) {
      const obsObj = ctxState.stageObstacleObjects.get(String(obsId));
      if (obsObj) {
        const { wasDestroyed } = damageObstacle(obsObj.state, 2);
        updateObstacleDamageVisual(obsObj);
        if (wasDestroyed) {
          playObstacleDestructionEffect(scene, obsObj);
          ctxState.stageObstacleObjects.delete(String(obsId));
        }
      }
    }

    ctxState.lastMotionMs = scene.time.now;
    callbacks.updateHud();
    checkStageProgress(scene, ctxState, callbacks);
  });
}

export function getCombinedStageTiers(ctxState: MergeProcessorContext): Map<number, number> {
  const map = new Map<number, number>(ctxState.stageCreatedTiers);
  for (const f of ctxState.fruits) {
    if (f.tier >= 0) {
      map.set(f.tier, (map.get(f.tier) || 0) + 1);
    }
  }
  return map;
}

export function checkStageProgress(
  scene: Phaser.Scene,
  ctxState: MergeProcessorContext,
  callbacks: MergeProcessorCallbacks,
): void {
  if (
    ctxState.gameMode !== 'stage' ||
    !ctxState.stageConfig ||
    ctxState.stageVictoryCelebrated ||
    ctxState.gameOverTriggered
  ) {
    return;
  }

  const activeObs = ctxState.stageObstacleStates.filter((o) => !o.isDestroyed).length;
  const res = evaluateStageProgress(
    ctxState.stageConfig,
    ctxState.stageDropsUsed,
    ctx.engine.state.score,
    getCombinedStageTiers(ctxState),
    activeObs,
  );

  if (res.isCompleted) {
    ctxState.stageVictoryCelebrated = true;
    playFireworksCelebration(scene, 8, z.overlay + 30);
    if (ctxState.stageId) {
      void ctx.score.recordStageResult(ctxState.stageId, res.stars, ctx.engine.state.score);
    }
    if (ctxState.stageConfig.rewardPowerup) {
      void ctx.score.grantPowerup(
        ctxState.stageConfig.rewardPowerup,
        ctxState.stageConfig.rewardCount || 1,
      );
    }
    scene.time.delayedCall(1200, () => {
      if (!ctxState.gameOverTriggered) {
        ctx.engine.setGameOver(true, false);
        scene.matter.world.pause();
        scene.scene.pause();
        scene.scene.launch('GameOverScene', {
          isStageMode: true,
          stageId: ctxState.stageId,
          isStageVictory: true,
          stars: res.stars,
          score: ctx.engine.state.score,
        });
      }
    });
  } else if (res.isFailed) {
    scene.time.delayedCall(1500, () => {
      if (!ctxState.stageVictoryCelebrated && !ctxState.gameOverTriggered) {
        callbacks.triggerGameOver();
      }
    });
  }
}
