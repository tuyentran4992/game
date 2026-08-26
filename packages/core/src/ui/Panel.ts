import Phaser from 'phaser';
import { palette, gradients, radius, shadows, spacing } from '../tokens';

/**
 * Rounded panel with gradient background, border glow, and optional title.
 *
 * Usage:
 * ```ts
 * const panel = new Panel(scene, 360, 500, 320, 400);
 * panel.setTitle('Settings');
 * ```
 */
export class Panel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Graphics;
  private borderGlow: Phaser.GameObjects.Graphics;
  private titleText: Phaser.GameObjects.Text | null = null;

  public x: number;
  public y: number;
  public width: number;
  public height: number;

  constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;

    this.container = scene.add.container(x, y);

    // Border glow
    this.borderGlow = scene.add.graphics();
    this.drawBorderGlow();
    this.container.add(this.borderGlow);

    // Background
    this.bg = scene.add.graphics();
    this.drawBg();
    this.container.add(this.bg);
  }

  setTitle(text: string, color: number = 0xffffff): void {
    if (this.titleText) this.titleText.destroy();
    this.titleText = this.scene.add.text(0, -this.height / 2 + spacing.lg, text, {
      fontFamily: 'Poppins',
      fontSize: '24px',
      fontStyle: 'bold',
      color: `#${color.toString(16).padStart(6, '0')}`,
    });
    this.titleText.setOrigin(0.5, 0);
    this.container.add(this.titleText);
  }

  add(child: Phaser.GameObjects.GameObject): void {
    this.container.add(child);
  }

  destroy(): void {
    this.container.destroy();
  }

  getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  private drawBorderGlow(): void {
    this.borderGlow.clear();
    this.borderGlow.fillStyle(palette.neonCyan, 0.15);
    this.borderGlow.fillRoundedRect(
      -this.width / 2 - 2,
      -this.height / 2 - 2,
      this.width + 4,
      this.height + 4,
      radius.lg + 2,
    );
  }

  private drawBg(): void {
    this.bg.clear();
    const g = gradients.panel;
    this.bg.fillGradientStyle(g.topLeft, g.topRight, g.bottomLeft, g.bottomRight, 1);
    this.bg.fillRoundedRect(-this.width / 2, -this.height / 2, this.width, this.height, radius.lg);

    // Border stroke
    this.bg.lineStyle(1, palette.neonCyan, 0.2);
    this.bg.strokeRoundedRect(-this.width / 2, -this.height / 2, this.width, this.height, radius.lg);
  }
}