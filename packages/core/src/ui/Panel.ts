import Phaser from 'phaser';
import type { GameTheme } from '../theme';

interface PanelStyle {
  theme?: GameTheme;
  title?: string;
  titleColor?: number;
}

export class Panel {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Graphics;
  private borderGlow: Phaser.GameObjects.Graphics;
  private titleText: Phaser.GameObjects.Text | null = null;
  private t: GameTheme | null;
  public x: number; public y: number; public width: number; public height: number;

  constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number, style: PanelStyle = {}) {
    this.scene = scene; this.x = x; this.y = y; this.width = width; this.height = height;
    this.t = style.theme ?? null;
    this.container = scene.add.container(x, y);
    this.borderGlow = scene.add.graphics(); this.drawBorderGlow(); this.container.add(this.borderGlow);
    this.bg = scene.add.graphics(); this.drawBg(); this.container.add(this.bg);
    if (style.title) this.setTitle(style.title, style.titleColor);
  }

  setTitle(text: string, color: number = 0xffffff): void {
    if (this.titleText) this.titleText.destroy();
    this.titleText = this.scene.add.text(0, -this.height / 2 + 24, text, {
      fontFamily: this.t?.fonts?.heading ?? 'Poppins', fontSize: '24px', fontStyle: 'bold',
      color: `#${color.toString(16).padStart(6, '0')}`,
    });
    this.titleText.setOrigin(0.5, 0); this.container.add(this.titleText);
  }

  add(child: Phaser.GameObjects.GameObject): void { this.container.add(child); }
  destroy(): void { this.container.destroy(); }
  getContainer(): Phaser.GameObjects.Container { return this.container; }

  private drawBorderGlow(): void {
    this.borderGlow.clear();
    const c = this.t?.colors?.primary ?? 0x00f5ff;
    this.borderGlow.fillStyle(c, 0.15);
    this.borderGlow.fillRoundedRect(-this.width / 2 - 2, -this.height / 2 - 2, this.width + 4, this.height + 4, 22);
  }

  private drawBg(): void {
    this.bg.clear();
    const tl = 0x1a1a3e, br = 0x12122e;
    this.bg.fillGradientStyle(tl, tl, br, br, 1);
    this.bg.fillRoundedRect(-this.width / 2, -this.height / 2, this.width, this.height, 20);
    const c = this.t?.colors?.primary ?? 0x00f5ff;
    this.bg.lineStyle(1, c, 0.2);
    this.bg.strokeRoundedRect(-this.width / 2, -this.height / 2, this.width, this.height, 20);
  }
}