// M3 Juicy Merge — Bucket & Physics Renderer
// Renders the 3D acrylic glass & polished cedar wood bucket, Matter bounds, and animated danger line.

import Phaser from 'phaser';
import { CONFIG } from '../logic/config';
import { z, radius } from '../tokens';
import type { BucketLayout } from './physics-layout';

/**
 * Configure Matter physics gravity, bounds, and walls for the bucket.
 */
export function setupPhysics(scene: Phaser.Scene, layout: BucketLayout): void {
  scene.matter.world.setGravity(0, CONFIG.physics.gravityY, 0.001);
  scene.matter.world.setBounds(
    0,
    0,
    scene.scale.width,
    scene.scale.height,
    100,
    true,
    true,
    false,
    true,
  );
  buildBucketWalls(scene, layout);
  scene.matter.world.resume();
}

/**
 * Build static Matter rectangle physics bodies for the left/right walls and floor.
 */
export function buildBucketWalls(scene: Phaser.Scene, layout: BucketLayout): void {
  const L = layout;
  const wallThick = 60;
  const floorThick = 80;
  const topY = L.spawnY - 40;
  const H = L.bucketBottomY - topY;
  const midY = (topY + L.bucketBottomY) / 2;
  const opt = {
    isStatic: true,
    restitution: CONFIG.physics.restitution,
    friction: CONFIG.physics.friction,
  };

  // Left wall
  scene.matter.add.rectangle(
    L.bucketX0 - wallThick / 2,
    midY,
    wallThick,
    H,
    opt,
  );
  // Right wall
  scene.matter.add.rectangle(
    L.bucketX1 + wallThick / 2,
    midY,
    wallThick,
    H,
    opt,
  );
  // Floor (thick 80px static block whose top surface sits exactly at bucketBottomY)
  scene.matter.add.rectangle(
    (L.bucketX0 + L.bucketX1) / 2,
    L.bucketBottomY + floorThick / 2,
    L.bucketWidth + 2 * wallThick,
    floorThick,
    opt,
  );
}

/**
 * Draw the bucket visuals: drop shadow, frosted acrylic backplate, glossy specular sheens,
 * cedar wood pillars with golden dome caps, sturdy foundation, and corner rivets.
 */
export function drawBucket(scene: Phaser.Scene, layout: BucketLayout): void {
  const L = layout;
  const H = L.bucketBottomY - L.bucketTopY;
  const g = scene.add.graphics().setDepth(z.bucketGlass);

  // 1. Soft Ambient Outer Drop Shadow (Triple-pass depth)
  g.fillStyle(0x000000, 0.22);
  g.fillRoundedRect(
    L.bucketX0 - 10,
    L.bucketTopY + 12,
    L.bucketWidth + 20,
    H + 16,
    { tl: 0, tr: 0, bl: radius.lg, br: radius.lg },
  );

  // 2. Frosted Acrylic Glass Backplate (Glossy Translucent)
  g.fillStyle(0xffffff, 0.42);
  g.fillRoundedRect(L.bucketX0, L.bucketTopY, L.bucketWidth, H, {
    tl: 0,
    tr: 0,
    bl: radius.md,
    br: radius.md,
  });

  // Diagonal Specular Glossy Light Sheens on Glass
  g.fillStyle(0xffffff, 0.18);
  g.beginPath();
  g.moveTo(L.bucketX0 + 30, L.bucketTopY);
  g.lineTo(L.bucketX0 + 90, L.bucketTopY);
  g.lineTo(L.bucketX0 + 20, L.bucketBottomY);
  g.lineTo(L.bucketX0 - 40, L.bucketBottomY);
  g.closePath();
  g.fillPath();

  g.fillStyle(0xffffff, 0.12);
  g.beginPath();
  g.moveTo(L.bucketX0 + 120, L.bucketTopY);
  g.lineTo(L.bucketX0 + 150, L.bucketTopY);
  g.lineTo(L.bucketX0 + 80, L.bucketBottomY);
  g.lineTo(L.bucketX0 + 50, L.bucketBottomY);
  g.closePath();
  g.fillPath();

  // Inner Glass Edge Highlights
  g.lineStyle(2.5, 0xffffff, 0.9);
  g.strokeRoundedRect(
    L.bucketX0 + 1,
    L.bucketTopY + 1,
    L.bucketWidth - 2,
    H - 2,
    { tl: 0, tr: 0, bl: radius.md, br: radius.md },
  );

  g.fillStyle(0x000000, 0.04);
  g.fillRect(L.bucketX0, L.bucketTopY, 16, H);
  g.fillRect(L.bucketX1 - 16, L.bucketTopY, 16, H);

  // 3. Left & Right 3D Cedar Wood Pillars with Gold Fittings
  const fg = scene.add.graphics().setDepth(z.bucketFrame);

  // Left Pillar
  fg.fillStyle(0x000000, 0.22);
  fg.fillRoundedRect(L.bucketX0 - 20, L.bucketTopY - 14 + 6, 20, H + 16, 6);
  fg.fillStyle(0x5c3414, 1);
  fg.fillRoundedRect(L.bucketX0 - 20, L.bucketTopY - 14, 20, H + 16, 6);
  fg.fillStyle(0x9a6136, 1);
  fg.fillRect(L.bucketX0 - 18, L.bucketTopY - 12, 10, H + 12);
  fg.fillStyle(0xc7844e, 0.85);
  fg.fillRect(L.bucketX0 - 16, L.bucketTopY - 10, 4, H + 8);
  // Golden Dome Cap
  fg.fillStyle(0xf59e0b, 1);
  fg.fillCircle(L.bucketX0 - 10, L.bucketTopY - 16, 11);
  fg.fillStyle(0xfde68a, 1);
  fg.fillCircle(L.bucketX0 - 12, L.bucketTopY - 18, 4);

  // Right Pillar
  fg.fillStyle(0x000000, 0.22);
  fg.fillRoundedRect(L.bucketX1, L.bucketTopY - 14 + 6, 20, H + 16, 6);
  fg.fillStyle(0x5c3414, 1);
  fg.fillRoundedRect(L.bucketX1, L.bucketTopY - 14, 20, H + 16, 6);
  fg.fillStyle(0x9a6136, 1);
  fg.fillRect(L.bucketX1 + 2, L.bucketTopY - 12, 10, H + 12);
  fg.fillStyle(0xc7844e, 0.85);
  fg.fillRect(L.bucketX1 + 4, L.bucketTopY - 10, 4, H + 8);
  // Golden Dome Cap
  fg.fillStyle(0xf59e0b, 1);
  fg.fillCircle(L.bucketX1 + 10, L.bucketTopY - 16, 11);
  fg.fillStyle(0xfde68a, 1);
  fg.fillCircle(L.bucketX1 + 8, L.bucketTopY - 18, 4);

  // 4. Sturdy 3D Wooden Base Foundation & Floor Beam
  fg.fillStyle(0x000000, 0.28);
  fg.fillRoundedRect(
    L.bucketX0 - 26,
    L.bucketBottomY + 10,
    L.bucketWidth + 52,
    34,
    radius.sm,
  );
  // Dark bottom bevel
  fg.fillStyle(0x3b1a04, 1);
  fg.fillRoundedRect(
    L.bucketX0 - 26,
    L.bucketBottomY + 6,
    L.bucketWidth + 52,
    30,
    radius.sm,
  );
  // Main base body
  fg.fillStyle(0x6e3915, 1);
  fg.fillRoundedRect(
    L.bucketX0 - 26,
    L.bucketBottomY,
    L.bucketWidth + 52,
    30,
    radius.sm,
  );
  // Gold metallic top strip
  fg.fillStyle(0xf59e0b, 1);
  fg.fillRect(L.bucketX0 - 22, L.bucketBottomY + 2, L.bucketWidth + 44, 6);
  fg.fillStyle(0xfde68a, 0.95);
  fg.fillRect(L.bucketX0 - 20, L.bucketBottomY + 3, L.bucketWidth + 40, 2);

  // Golden Corner Rivets
  fg.fillStyle(0xf59e0b, 1);
  fg.fillCircle(L.bucketX0 - 12, L.bucketBottomY + 17, 6);
  fg.fillCircle(L.bucketX1 + 12, L.bucketBottomY + 17, 6);
  fg.fillStyle(0xfde68a, 1);
  fg.fillCircle(L.bucketX0 - 14, L.bucketBottomY + 15, 2.5);
  fg.fillCircle(L.bucketX1 + 10, L.bucketBottomY + 15, 2.5);

  // Container anchor for QA
  const bucket = scene.add
    .container(L.bucketX0, L.bucketTopY)
    .setDepth(z.actor);
  bucket.setSize(L.bucketWidth, H);
  bucket.setData('testid', 'bucket');
}

/**
 * Create the danger line graphics object and draw initial stroke.
 */
export function createDangerLine(scene: Phaser.Scene, layout: BucketLayout): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics().setDepth(z.hud);
  drawDangerLineStroke(g, layout, 0.8);
  g.setData('testid', 'danger-line');
  return g;
}

/**
 * Draw the danger line dashed stroke with glowing halo.
 */
export function drawDangerLineStroke(
  g: Phaser.GameObjects.Graphics,
  layout: BucketLayout,
  alpha: number,
): void {
  const L = layout;
  g.clear();
  // Ambient red glow behind danger line
  g.lineStyle(8, 0xef4444, alpha * 0.35);
  g.lineBetween(L.bucketX0, L.dangerY, L.bucketX1, L.dangerY);

  // Crisp dashed hazard line
  g.lineStyle(3.5, 0xef4444, alpha);
  const dash = 20;
  const gap = 12;
  for (let x = L.bucketX0; x < L.bucketX1; x += dash + gap) {
    const x2 = Math.min(x + dash, L.bucketX1);
    g.beginPath();
    g.moveTo(x, L.dangerY);
    g.lineTo(x2, L.dangerY);
    g.strokePath();
  }
}

/**
 * Trigger or kill pulsing animation on the danger line depending on nearDanger state.
 */
export function refreshDangerLine(
  scene: Phaser.Scene,
  dangerLine: Phaser.GameObjects.Graphics,
  layout: BucketLayout,
  nearDanger: boolean,
): void {
  if (nearDanger) {
    if (!dangerLine.getData('pulsing')) {
      dangerLine.setData('pulsing', true);
      scene.tweens.add({
        targets: dangerLine,
        alpha: { from: 1, to: 0.25 },
        duration: 300,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  } else {
    scene.tweens.killTweensOf(dangerLine);
    dangerLine.setData('pulsing', false);
    drawDangerLineStroke(dangerLine, layout, 0.8);
    dangerLine.setAlpha(1);
  }
}
