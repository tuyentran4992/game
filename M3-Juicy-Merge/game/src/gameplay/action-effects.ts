import Phaser from "phaser";
import { z } from "../tokens";

/**
 * Plays the Hammer Smash animation: Hammer appears above, swoops down, strikes, shakes screen.
 */
export function playHammerSmashVfx(
  scene: Phaser.Scene,
  x: number,
  y: number,
  onStrike?: () => void
): void {
  const hammerContainer = scene.add.container(x + 40, y - 90).setDepth(z.overlay + 10);

  const g = scene.add.graphics();
  // Hammer head (cyan steel)
  g.fillStyle(0x00bcd4, 1);
  g.fillRoundedRect(-24, -14, 48, 28, 6);
  g.lineStyle(2, 0xffffff, 0.9);
  g.strokeRoundedRect(-24, -14, 48, 28, 6);

  // Hammer handle (wooden brown)
  g.fillStyle(0x8d6e63, 1);
  g.fillRoundedRect(-6, 14, 12, 50, 4);
  hammerContainer.add(g);
  hammerContainer.setRotation(Phaser.Math.DegToRad(35));

  // Swoop strike animation
  scene.tweens.add({
    targets: hammerContainer,
    x,
    y: y - 20,
    rotation: Phaser.Math.DegToRad(-15),
    duration: 160,
    ease: "Back.easeIn",
    onComplete: () => {
      // Screen shake
      scene.cameras.main.shake(120, 0.012);

      // Star burst
      for (let i = 0; i < 10; i++) {
        const star = scene.add.graphics().setDepth(z.overlay + 11);
        star.fillStyle(0xffeb3b, 1);
        star.fillCircle(0, 0, Phaser.Math.Between(4, 8));
        star.setPosition(x, y);

        const angle = (i / 10) * Math.PI * 2;
        const dist = Phaser.Math.Between(40, 100);

        scene.tweens.add({
          targets: star,
          x: x + Math.cos(angle) * dist,
          y: y + Math.sin(angle) * dist,
          alpha: 0,
          scale: 0.2,
          duration: 250,
          onComplete: () => star.destroy(),
        });
      }

      onStrike?.();

      // Recoil and fade hammer
      scene.tweens.add({
        targets: hammerContainer,
        y: y - 60,
        alpha: 0,
        scale: 0.8,
        duration: 180,
        ease: "Quad.easeOut",
        onComplete: () => hammerContainer.destroy(),
      });
    },
  });
}

/**
 * Plays the Bomb explosion animation: expanding shockwave, fire particles, camera shake.
 */
export function playBombExplosionVfx(
  scene: Phaser.Scene,
  x: number,
  y: number,
  blastRadius: number,
  onExplode?: () => void
): void {
  scene.cameras.main.shake(200, 0.02);

  // Shockwave expanding circle
  const shockwave = scene.add.graphics().setDepth(z.overlay + 5);
  shockwave.lineStyle(6, 0xffd54f, 1);
  shockwave.strokeCircle(x, y, 10);

  scene.tweens.add({
    targets: shockwave,
    scaleX: blastRadius / 10,
    scaleY: blastRadius / 10,
    alpha: 0,
    duration: 280,
    ease: "Cubic.easeOut",
    onComplete: () => shockwave.destroy(),
  });

  // Fiery center explosion
  const core = scene.add.graphics().setDepth(z.overlay + 6);
  core.fillStyle(0xff5722, 0.9);
  core.fillCircle(x, y, blastRadius * 0.4);
  core.fillStyle(0xffeb3b, 1);
  core.fillCircle(x, y, blastRadius * 0.2);

  scene.tweens.add({
    targets: core,
    scaleX: 1.5,
    scaleY: 1.5,
    alpha: 0,
    duration: 250,
    ease: "Quad.easeOut",
    onComplete: () => core.destroy(),
  });

  // Spark and smoke particles
  for (let i = 0; i < 20; i++) {
    const p = scene.add.graphics().setDepth(z.overlay + 7);
    const isFire = i % 2 === 0;
    p.fillStyle(isFire ? 0xff9800 : 0xffffff, 1);
    p.fillCircle(0, 0, Phaser.Math.Between(5, 10));
    p.setPosition(x, y);

    const angle = (i / 20) * Math.PI * 2 + Math.random() * 0.3;
    const speed = Phaser.Math.Between(blastRadius * 0.5, blastRadius * 1.2);

    scene.tweens.add({
      targets: p,
      x: x + Math.cos(angle) * speed,
      y: y + Math.sin(angle) * speed,
      alpha: 0,
      scale: 0.1,
      duration: Phaser.Math.Between(250, 400),
      ease: "Quad.easeOut",
      onComplete: () => p.destroy(),
    });
  }

  onExplode?.();
}
