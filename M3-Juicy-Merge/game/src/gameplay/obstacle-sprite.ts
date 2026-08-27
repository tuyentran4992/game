import Phaser from "phaser";
import { type ObstacleState } from "../logic/obstacles";
import { z } from "../tokens";
import { resolveFruitTexture, fruitDiameter } from "./fruit-sprite";

export interface ObstacleGameObject {
  state: ObstacleState;
  container: Phaser.GameObjects.Container;
  body?: MatterJS.BodyType | undefined;
  mainSprite: Phaser.GameObjects.Image;
  crackGraphics: Phaser.GameObjects.Graphics;
}

export function ensureObstacleTextures(scene: Phaser.Scene): void {
  if (!scene.textures.exists("obstacle_ice")) {
    const g = scene.make.graphics({ x: 0, y: 0 });
    const size = 80;
    // Translucent Ice Block with vibrant blue crystal glow
    g.fillStyle(0x0288d1, 0.45);
    g.fillRoundedRect(0, 0, size, size, 14);
    g.fillStyle(0xe1f5fe, 0.9);
    g.fillRoundedRect(5, 5, size - 10, size - 10, 10);
    g.lineStyle(4, 0x0288d1, 1);
    g.strokeRoundedRect(0, 0, size, size, 14);
    // Frost highlight
    g.fillStyle(0xffffff, 0.95);
    g.beginPath();
    g.moveTo(10, 10);
    g.lineTo(28, 10);
    g.lineTo(10, 28);
    g.closePath();
    g.fillPath();
    g.generateTexture("obstacle_ice", size, size);
    g.destroy();
  }

  if (!scene.textures.exists("obstacle_crate")) {
    const g = scene.make.graphics({ x: 0, y: 0 });
    const size = 88;
    // 3D Wooden Crate: dark back bevel
    g.fillStyle(0x4e342e, 1);
    g.fillRoundedRect(0, 0, size, size, 12);
    // Warm wood body
    g.fillStyle(0x8d6e63, 1);
    g.fillRoundedRect(5, 5, size - 10, size - 10, 10);
    // Inner plank fill
    g.fillStyle(0xa1887f, 1);
    g.fillRoundedRect(10, 10, size - 20, size - 20, 8);
    // Heavy wooden X-brace
    g.lineStyle(8, 0x5d4037, 1);
    g.lineBetween(14, 14, size - 14, size - 14);
    g.lineBetween(size - 14, 14, 14, size - 14);
    // Border frame
    g.lineStyle(4, 0x3e2723, 1);
    g.strokeRoundedRect(0, 0, size, size, 12);
    // Golden brass rivets at corners
    g.fillStyle(0xf59e0b, 1);
    g.fillCircle(12, 12, 4);
    g.fillCircle(size - 12, 12, 4);
    g.fillCircle(12, size - 12, 4);
    g.fillCircle(size - 12, size - 12, 4);
    g.generateTexture("obstacle_crate", size, size);
    g.destroy();
  }

  if (!scene.textures.exists("obstacle_bubble")) {
    const g = scene.make.graphics({ x: 0, y: 0 });
    const size = 88;
    const r = size / 2;
    g.fillStyle(0x81d4fa, 0.45);
    g.fillCircle(r, r, r - 4);
    g.lineStyle(4, 0xb3e5fc, 0.95);
    g.strokeCircle(r, r, r - 4);
    // Shiny crescent highlight
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(r - 14, r - 14, 10);
    g.generateTexture("obstacle_bubble", size, size);
    g.destroy();
  }
}

/**
 * Creates a visual and physics representation of an obstacle in the bucket.
 */
export function createObstacleVisual(
  scene: Phaser.Scene,
  state: ObstacleState,
  worldX: number,
  worldY: number
): ObstacleGameObject {
  ensureObstacleTextures(scene);

  const container = scene.add.container(worldX, worldY).setDepth(z.actor + 2);
  container.setSize(state.width, state.height);

  const texKey =
    state.type === "ice"
      ? "obstacle_ice"
      : state.type === "crate"
      ? "obstacle_crate"
      : "obstacle_bubble";

  const mainSprite = scene.add
    .image(0, 0, texKey)
    .setDisplaySize(state.width, state.height);
  const crackGraphics = scene.add.graphics();
  container.add([mainSprite, crackGraphics]);

  // If bubble, render trapped fruit inside behind the bubble shell
  if (state.type === "bubble" && typeof state.containedFruitTier === "number") {
    const fruitTex = resolveFruitTexture(scene, state.containedFruitTier);
    const fruitD = fruitDiameter(state.containedFruitTier);
    const fruitImg = scene.add
      .image(0, 0, fruitTex)
      .setDisplaySize(state.width * 0.68, state.height * 0.68);
    container.add(fruitImg);
    container.sendToBack(fruitImg); // Fruit inside bubble

    // Gentle float/pulse animation
    scene.tweens.add({
      targets: fruitImg,
      scaleX: ((state.width * 0.68) / fruitD) * 1.08,
      scaleY: ((state.height * 0.68) / fruitD) * 1.08,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  // Create Matter.js static or sensor body
  let body: MatterJS.BodyType | undefined;
  if (scene.matter && scene.matter.add) {
    if (state.type === "ice" || state.type === "crate") {
      body = scene.matter.add.rectangle(worldX, worldY, state.width, state.height, {
        isStatic: true,
        restitution: 0.1,
        friction: 0.2,
        label: `obstacle_${state.id}_${state.type}`,
      });
    } else if (state.type === "bubble") {
      // Bubble is a soft static circle
      body = scene.matter.add.circle(worldX, worldY, state.width / 2, {
        isStatic: true,
        isSensor: false,
        restitution: 0.3,
        label: `obstacle_${state.id}_bubble`,
      });
    }
  }

  return {
    state,
    container,
    body,
    mainSprite,
    crackGraphics,
  };
}

/**
 * Updates crack visuals when an obstacle takes damage.
 */
export function updateObstacleDamageVisual(obsObj: ObstacleGameObject): void {
  const { crackGraphics, state, mainSprite } = obsObj;
  crackGraphics.clear();

  if (state.hp < state.maxHp && !state.isDestroyed) {
    // Shake effect
    mainSprite.setTint(0xff8a80);
    setTimeout(() => mainSprite.clearTint(), 150);

    crackGraphics.lineStyle(3.5, 0xffffff, 0.95);
    const halfW = state.width / 2;
    const halfH = state.height / 2;
    // Draw bold zigzag crack line
    crackGraphics.beginPath();
    crackGraphics.moveTo(-halfW * 0.45, -halfH * 0.45);
    crackGraphics.lineTo(-halfW * 0.1, -halfH * 0.1);
    crackGraphics.lineTo(0, 0.1);
    crackGraphics.lineTo(halfW * 0.35, halfH * 0.45);
    crackGraphics.strokePath();
  }
}

/**
 * Plays burst destruction VFX and removes the obstacle object.
 */
export function playObstacleDestructionEffect(
  scene: Phaser.Scene,
  obsObj: ObstacleGameObject
): void {
  const { container, state, body } = obsObj;
  const x = container.x;
  const y = container.y;

  // Remove physics body
  if (body && scene.matter && scene.matter.world) {
    scene.matter.world.remove(body);
  }

  // Particle bursts
  const particleColor =
    state.type === "ice"
      ? 0x81d4fa
      : state.type === "crate"
      ? 0xa1887f
      : 0xb3e5fc;

  for (let i = 0; i < 14; i++) {
    const angle = (i / 14) * Math.PI * 2;
    const speed = Phaser.Math.Between(80, 220);
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;

    const p = scene.add.graphics().setDepth(z.actor + 4);
    p.fillStyle(particleColor, 0.9);
    p.fillCircle(0, 0, Phaser.Math.Between(4, 8));
    p.setPosition(x, y);

    scene.tweens.add({
      targets: p,
      x: x + vx * 0.4,
      y: y + vy * 0.4 + 40,
      alpha: 0,
      scale: 0.2,
      duration: 350,
      ease: "Quad.easeOut",
      onComplete: () => p.destroy(),
    });
  }

  // Pop tween and destroy container
  scene.tweens.add({
    targets: container,
    scaleX: 1.3,
    scaleY: 1.3,
    alpha: 0,
    duration: 180,
    ease: "Back.easeIn",
    onComplete: () => container.destroy(),
  });
}
