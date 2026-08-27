// M3 Juicy Merge — Juice & Game Feel visual/audio effects module
import type Phaser from "phaser";
import { FRUIT_COLORS, fruitRadius } from "./fruit-sprite";
import { toColor, z, dur } from "../tokens";

/** Musical detune scale in cents for combo streaks (Do-Re-Mi-Fa-Sol-La-Si-Do). */
export const COMBO_DETUNE_STEPS: readonly number[] = [
  0, // Combo 1: Base (Do)
  200, // Combo 2: +2 semitones (Re)
  400, // Combo 3: +4 semitones (Mi)
  500, // Combo 4: +5 semitones (Fa)
  700, // Combo 5: +7 semitones (Sol)
  900, // Combo 6: +9 semitones (La)
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
  const hex = FRUIT_COLORS[tier] ?? FRUIT_COLORS[0] ?? "#FF5C8A";
  return toColor(hex);
}

function randBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const FIREWORK_PALETTE = [
  0xffd700, // Golden
  0xff3366, // Hot Pink
  0x00e5ff, // Cyan
  0x76ff03, // Bright Lime
  0x9d4edd, // Violet Purple
  0xff9100, // Amber Orange
  0xffffff, // Pure White Sparkle
  0xf72585, // Magenta
];

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
  ring.fillStyle(0xffffff, 0.5);
  ring.fillCircle(x, y, r * 0.3);

  scene.tweens.add({
    targets: ring,
    scaleX: 1.8,
    scaleY: 1.8,
    alpha: 0,
    duration: dur.pop,
    ease: "Cubic.easeOut",
    onComplete: () => ring.destroy(),
  });

  // Radial juicy droplets
  for (let i = 0; i < dropletCount; i++) {
    const angle =
      (Math.PI * 2 * i) / dropletCount + (Math.random() - 0.5) * 0.4;
    const speed = randBetween(Math.round(r * 1.2), Math.round(r * 2.8));
    const targetX = x + Math.cos(angle) * speed;
    const targetY = y + Math.sin(angle) * speed + randBetween(5, 20); // slight downward arc
    const dropletSize = randBetween(4, 8);

    const droplet = scene.add.graphics().setDepth(z.actor + 5);
    droplet.fillStyle(juiceColor, 0.95);
    droplet.fillCircle(0, 0, dropletSize);
    droplet.fillStyle(0xffffff, 0.7);
    droplet.fillCircle(
      -dropletSize * 0.25,
      -dropletSize * 0.25,
      dropletSize * 0.35,
    );
    droplet.setPosition(x, y);

    scene.tweens.add({
      targets: droplet,
      x: targetX,
      y: targetY,
      scaleX: 0.2,
      scaleY: 0.2,
      alpha: 0,
      duration: randBetween(260, 380),
      ease: "Quad.easeOut",
      onComplete: () => droplet.destroy(),
    });
  }
}

/**
 * Spawn celebratory star bursts for high-tier merges (optimized particle count).
 */
export function playStarBurst(
  scene: Phaser.Scene,
  x: number,
  y: number,
  depth = 120,
): void {
  const starCount = 8;

  for (let i = 0; i < starCount; i++) {
    const angle = (Math.PI * 2 * i) / starCount + (Math.random() - 0.5) * 0.3;
    const dist = randBetween(60, 140);
    const targetX = x + Math.cos(angle) * dist;
    const targetY = y + Math.sin(angle) * dist + randBetween(10, 30);
    const col = FIREWORK_PALETTE[i % FIREWORK_PALETTE.length] ?? 0xffd700;

    const star = scene.add.graphics().setDepth(depth);
    star.fillStyle(col, 1);
    // Draw 4-point star diamond
    star.beginPath();
    star.moveTo(0, -8);
    star.lineTo(4, 0);
    star.lineTo(0, 8);
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
      duration: randBetween(450, 650),
      ease: "Cubic.easeOut",
      onComplete: () => star.destroy(),
    });
  }
}

/**
 * Spawns an individual multi-layered firework explosion with glowing sparks and confetti (optimized).
 */
export function spawnFireworkBurst(
  scene: Phaser.Scene,
  x: number,
  y: number,
  depth = 150,
): void {
  const themeColor =
    FIREWORK_PALETTE[randBetween(0, FIREWORK_PALETTE.length - 1)] ?? 0xffd700;
  const secondaryColor =
    FIREWORK_PALETTE[randBetween(0, FIREWORK_PALETTE.length - 1)] ?? 0xffffff;

  // 1. Shockwave glow ring
  const ring = scene.add.graphics().setDepth(depth);
  ring.lineStyle(3, themeColor, 0.9);
  ring.strokeCircle(x, y, 8);
  ring.fillStyle(0xffffff, 0.7);
  ring.fillCircle(x, y, 5);

  scene.tweens.add({
    targets: ring,
    scaleX: 4,
    scaleY: 4,
    alpha: 0,
    duration: 300,
    ease: "Quad.easeOut",
    onComplete: () => ring.destroy(),
  });

  // 2. Radial Spark Particles (12 sparks - optimized)
  const sparkCount = 12;
  for (let i = 0; i < sparkCount; i++) {
    const angle = (Math.PI * 2 * i) / sparkCount + (Math.random() - 0.5) * 0.2;
    const speed = randBetween(50, 150);
    const targetX = x + Math.cos(angle) * speed;
    const targetY = y + Math.sin(angle) * speed + randBetween(20, 50); // gravity fall
    const col = i % 2 === 0 ? themeColor : secondaryColor;
    const sparkSize = randBetween(3, 5);

    const spark = scene.add.graphics().setDepth(depth + 1);
    spark.fillStyle(col, 1);
    spark.fillCircle(0, 0, sparkSize);
    spark.setPosition(x, y);

    scene.tweens.add({
      targets: spark,
      x: targetX,
      y: targetY,
      scaleX: 0.1,
      scaleY: 0.1,
      alpha: 0,
      duration: randBetween(500, 800),
      ease: "Cubic.easeOut",
      onComplete: () => spark.destroy(),
    });
  }

  // 3. Floating / Tumbling Confetti Slips (6 pieces - optimized)
  const confettiCount = 6;
  for (let i = 0; i < confettiCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = randBetween(30, 90);
    const targetX = x + Math.cos(angle) * dist + (Math.random() - 0.5) * 40;
    const targetY = y + Math.sin(angle) * dist + randBetween(50, 120); // fluttering down
    const cCol = FIREWORK_PALETTE[i % FIREWORK_PALETTE.length] ?? 0xffd700;

    const confetti = scene.add.graphics().setDepth(depth + 2);
    confetti.fillStyle(cCol, 1);
    confetti.fillRoundedRect(-4, -2, 8, 5, 2);
    confetti.setPosition(x, y);

    scene.tweens.add({
      targets: confetti,
      x: targetX,
      y: targetY,
      rotation: Math.PI * 2 * (Math.random() > 0.5 ? 1 : -1),
      scaleX: 0.4,
      scaleY: 0.4,
      alpha: { from: 1, to: 0 },
      duration: randBetween(700, 1100),
      ease: "Sine.easeOut",
      onComplete: () => confetti.destroy(),
    });
  }
}

/**
 * Launch a full multi-rocket firework celebration show across the screen.
 */
export function playFireworksCelebration(
  scene: Phaser.Scene,
  burstCount = 3,
  depth = 150,
): void {
  const { width, height } = scene.scale;

  for (let i = 0; i < burstCount; i++) {
    const delay = i * randBetween(200, 280);
    scene.time.delayedCall(delay, () => {
      const bx = randBetween(
        Math.round(width * 0.2),
        Math.round(width * 0.8),
      );
      const by = randBetween(
        Math.round(height * 0.2),
        Math.round(height * 0.5),
      );
      spawnFireworkBurst(scene, bx, by, depth);
    });
  }
}

/**
 * Trigger jackpot climax for high tier (Melon / Watermelon / Cosmic):
 * Gentle screen pop + crisp fireworks.
 */
export function playJackpotClimax(
  scene: Phaser.Scene,
  x: number,
  y: number,
  depth = 150,
): void {
  scene.cameras.main.shake(100, 0.003);
  scene.cameras.main.flash(80, 255, 255, 255, false);
  spawnFireworkBurst(scene, x, y, depth);
  playStarBurst(scene, x, y, depth);
}
