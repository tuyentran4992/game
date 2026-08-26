import Phaser from 'phaser';

/**
 * Simple particle emitter for visual effects.
 * Theme-agnostic: accepts color as parameter.
 */
export class ParticleEmitter {
  static burst(scene: Phaser.Scene, x: number, y: number, color: number, count: number = 8): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const speed = 80 + Math.random() * 120;
      const size = 3 + Math.random() * 4;
      const px = scene.add.circle(x, y, size, color, 1);
      px.setBlendMode(Phaser.BlendModes.ADD);
      scene.tweens.add({
        targets: px, x: x + Math.cos(angle) * speed, y: y + Math.sin(angle) * speed,
        alpha: 0, scaleX: 0.2, scaleY: 0.2, duration: 300 + Math.random() * 200, ease: 'Power2',
        onComplete: () => px.destroy(),
      });
    }
  }

  static reward(scene: Phaser.Scene, x: number, y: number): void {
    const colors = [0x00f5ff, 0xffdd00, 0x00ff88, 0xff00ff];
    for (let i = 0; i < 6; i++) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      const px = scene.add.circle(x + (Math.random() - 0.5) * 40, y, 3 + Math.random() * 3, color, 1);
      px.setBlendMode(Phaser.BlendModes.ADD);
      scene.tweens.add({
        targets: px, y: y - 60 - Math.random() * 40, x: x + (Math.random() - 0.5) * 60,
        alpha: 0, scaleX: 0.1, scaleY: 0.1, duration: 600 + Math.random() * 400, ease: 'Power2',
        delay: Math.random() * 100, onComplete: () => px.destroy(),
      });
    }
  }

  static shake(scene: Phaser.Scene, intensity: number = 0.005, duration: number = 100): void {
    scene.cameras.main.shake(duration, intensity);
  }

  static flash(scene: Phaser.Scene, color: number = 0xffffff, duration: number = 100): void {
    scene.cameras.main.flash(duration, (color >> 16) & 0xff, (color >> 8) & 0xff, color & 0xff);
  }
}