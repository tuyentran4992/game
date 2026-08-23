// M3 Juicy Merge — Juice & Game Feel visual/audio effects module
import type Phaser from 'phaser';
import { FRUIT_COLORS, fruitRadius } from './fruit-sprite';
import { toColor, z, dur } from '../tokens';

/** Musical detune scale in cents for combo streaks (Do-Re-Mi-Fa-Sol-La-Si-Do). */
export const COMBO_DETUNE_STEPS: readonly number[] = [
  0,    // Combo 1: Base (Do)
  200,  // Combo 2: +2 semitones (Re)
  400,  // Combo 3: +4 semitones (Mi)
  500,  // Combo 4: +5 semitones (Fa)
  700,  // Combo 5: +7 semitones (Sol)
  900,  // Combo 6: +9 semitones (La)
  1100, // Combo 7: +11 semitones (Si)
  1200, // Combo 8+: Octave (+12 semitones)
];

/**
 * Compute the musical pitch detune (in cents) for a given combo streak count.
 * Pure function, fully unit-testable.
 */
export function computeComboDetune(comboCount: number): number {
  if (comboCount <= 1) return 0;
  const idx = Math.min(comboCount - 1, COMBO_DETUNE_STEPS.length - 1);
  return COMBO_DETUNE_STEPS[idx] ?? 1200;
}

/**
 * Resolve the hex color number for juice particles based on fruit tier.
 * Pure function, fully unit-testable.
 */
export function getFruitJuiceColor(tier: number): number {
  const hex = FRUIT_COLORS[tier] ?? FRUIT_COLORS[0] ?? '#FF5C8A';
  return toColor(hex);
}

function randBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Spawn radial juice droplets that burst outward, decelerate, and fade out.
 */
export function playJuiceSplash(
  scene: Phaser.Scene,
  x: number,
  y: number,
  tier: number,
): void {
  const r = fruitRadius(tier);
  const juiceColor = getFruitJuiceColor(tier);
  const dropletCount = Math.min(16, 8 + Math.floor(tier * 0.7));

  // Shockwave ring
  const ring = scene.add.graphics().setDepth(z.actor + 4);
  ring.lineStyle(4, juiceColor, 0.9);
  ring.strokeCircle(x, y, r * 0.5);
  ring.fillStyle(0xFFFFFF, 0.5);
  ring.fillCircle(x, y, r * 0.3);

  scene.tweens.add({
    targets: ring,
    scaleX: 1.8,
    scaleY: 1.8,
    alpha: 0,
    duration: dur.pop,
    ease: 'Cubic.easeOut',
    onComplete: () => ring.destroy(),
  });

  // Radial juicy droplets
  for (let i = 0; i < dropletCount; i++) {
    const angle = (Math.PI * 2 * i) / dropletCount + (Math.random() - 0.5) * 0.4;
    const speed = randBetween(Math.round(r * 1.2), Math.round(r * 2.8));
    const targetX = x + Math.cos(angle) * speed;
    const targetY = y + Math.sin(angle) * speed + randBetween(5, 20); // slight downward arc
    const dropletSize = randBetween(4, 8);

    const droplet = scene.add.graphics().setDepth(z.actor + 5);
    droplet.fillStyle(juiceColor, 0.95);
    droplet.fillCircle(0, 0, dropletSize);
    droplet.fillStyle(0xFFFFFF, 0.7);
    droplet.fillCircle(-dropletSize * 0.25, -dropletSize * 0.25, dropletSize * 0.35);
    droplet.setPosition(x, y);

    scene.tweens.add({
      targets: droplet,
      x: targetX,
      y: targetY,
      scaleX: 0.2,
      scaleY: 0.2,
      alpha: 0,
      duration: randBetween(260, 380),
      ease: 'Quad.easeOut',
      onComplete: () => droplet.destroy(),
    });
  }
}

/**
 * Spawn celebratory star bursts for high-tier merges (Melon / Watermelon).
 */
export function playStarBurst(
  scene: Phaser.Scene,
  x: number,
  y: number,
): void {
  const starCount = 12;
  const starColors = [0xFFD700, 0xFF6B81, 0x7ED957, 0x00D2D3, 0xFFA502];

  for (let i = 0; i < starCount; i++) {
    const angle = (Math.PI * 2 * i) / starCount + (Math.random() - 0.5) * 0.3;
    const dist = randBetween(70, 150);
    const targetX = x + Math.cos(angle) * dist;
    const targetY = y + Math.sin(angle) * dist;
    const col = starColors[i % starColors.length] ?? 0xFFD700;

    const star = scene.add.graphics().setDepth(z.actor + 6);
    star.fillStyle(col, 1);
    // Draw 4-point star diamond
    star.beginPath();
    star.moveTo(0, -9);
    star.lineTo(4, 0);
    star.lineTo(0, 9);
    star.lineTo(-4, 0);
    star.closePath();
    star.fillPath();
    star.setPosition(x, y);

    scene.tweens.add({
      targets: star,
      x: targetX,
      y: targetY,
      rotation: Math.PI * 2,
      scaleX: 0.2,
      scaleY: 0.2,
      alpha: 0,
      duration: randBetween(400, 600),
      ease: 'Cubic.easeOut',
      onComplete: () => star.destroy(),
    });
  }
}

/**
 * Trigger jackpot climax for high tier (Melon / Watermelon):
 * Screen shake + flash + star bursts.
 */
export function playJackpotClimax(
  scene: Phaser.Scene,
  x: number,
  y: number,
): void {
  // Gentle camera shake and white flash
  scene.cameras.main.shake(160, 0.008);
  scene.cameras.main.flash(100, 255, 255, 255, false);
  playStarBurst(scene, x, y);
}
