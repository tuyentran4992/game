import Phaser from 'phaser';
import type { GameTheme } from '../theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ButtonStyle {
  variant?: ButtonVariant;
  label: string;
  width?: number;
  height?: number;
  fontSize?: number;
  icon?: string;
  pulse?: boolean;
  disabled?: boolean;
  theme: GameTheme;
}

/**
 * Professional gradient button with drop shadow, press state, and optional glow.
 * Theme-agnostic: accepts a GameTheme for colors, fonts, radii, shadows.
 */
export class Button {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Graphics;
  private labelText: Phaser.GameObjects.Text;
  private shadow: Phaser.GameObjects.Graphics;
  private glow: Phaser.GameObjects.Graphics | null = null;
  private _disabled = false;
  private theme: GameTheme;

  public x: number;
  public y: number;
  public width: number;
  public height: number;
  public variant: ButtonVariant;

  private clickCallback: (() => void) | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, style: ButtonStyle) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.variant = style.variant ?? 'primary';
    this.width = style.width ?? 280;
    this.height = style.height ?? 64;
    this._disabled = style.disabled ?? false;
    this.theme = style.theme;

    const t = this.theme;

    this.container = scene.add.container(x, y);

    // Shadow
    this.shadow = scene.add.graphics();
    this.drawShadow();
    this.container.add(this.shadow);

    // Glow
    if (style.pulse) {
      this.glow = scene.add.graphics();
      this.drawGlow();
      this.container.add(this.glow);
      this.startPulse();
    }

    // Background
    this.bg = scene.add.graphics();
    this.drawBg(false);
    this.container.add(this.bg);

    // Label
    const fullLabel = style.icon ? `${style.icon}  ${style.label}` : style.label;
    this.labelText = scene.add.text(0, 0, fullLabel, {
      fontFamily: t.fonts.heading,
      fontSize: `${style.fontSize ?? t.fontSizes.button}px`,
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#00000055',
      strokeThickness: 2,
      align: 'center',
    });
    this.labelText.setOrigin(0.5);
    this.container.add(this.labelText);

    // Interactive
    const hitArea = scene.add.rectangle(0, 0, this.width, this.height, 0xffffff, 0)
      .setInteractive({ useHandCursor: true });
    this.container.add(hitArea);

    hitArea.on('pointerover', () => {
      if (!this._disabled) {
        this.drawBg(true);
        scene.tweens.add({ targets: this.container, scaleX: 1.05, scaleY: 1.05, duration: 100, ease: 'Power2' });
      }
    });
    hitArea.on('pointerout', () => {
      this.drawBg(false);
      if (!this._disabled) {
        scene.tweens.add({ targets: this.container, scaleX: 1, scaleY: 1, duration: 100, ease: 'Power2' });
      }
    });
    hitArea.on('pointerdown', () => {
      if (!this._disabled) {
        scene.tweens.add({ targets: this.container, scaleX: 0.95, scaleY: 0.95, duration: 50, ease: 'Power2' });
        this.scene.cameras.main.shake(50, 0.002);
      }
    });
    hitArea.on('pointerup', () => {
      if (!this._disabled) {
        scene.tweens.add({ targets: this.container, scaleX: 1.05, scaleY: 1.05, duration: 50, ease: 'Power2' });
        if (this.clickCallback) this.clickCallback();
      }
    });
  }

  onClick(cb: () => void): void { this.clickCallback = cb; }
  setDisabled(disabled: boolean): void { this._disabled = disabled; this.labelText.setAlpha(disabled ? 0.5 : 1); }
  setLabel(label: string): void { this.labelText.setText(label); }
  destroy(): void { this.container.destroy(); }
  getContainer(): Phaser.GameObjects.Container { return this.container; }

  private drawShadow(): void {
    this.shadow.clear();
    const s = this.theme.shadows.button;
    this.shadow.fillStyle(s.color, s.alpha);
    this.shadow.fillRoundedRect(
      -this.width / 2 + s.distance,
      -this.height / 2 + s.distance,
      this.width, this.height,
      this.theme.radii.md,
    );
  }

  private drawGlow(): void {
    if (!this.glow) return;
    this.glow.clear();
    const g = this.theme.shadows.glow;
    this.glow.fillStyle(g.color, g.alpha * 0.4);
    this.glow.fillRoundedRect(-this.width / 2 - 4, -this.height / 2 - 4, this.width + 8, this.height + 8, this.theme.radii.md + 4);
  }

  private drawBg(hovered: boolean): void {
    this.bg.clear();
    const t = this.theme;
    const grad = this.getGradient();
    this.bg.fillGradientStyle(grad.topLeft, grad.topRight, grad.bottomLeft, grad.bottomRight, 1);

    if (this.variant === 'ghost') {
      this.bg.lineStyle(2, t.colors.primary, 0.8);
    }

    this.bg.fillRoundedRect(-this.width / 2, -this.height / 2, this.width, this.height, t.radii.md);

    if (this.variant === 'ghost') {
      this.bg.strokeRoundedRect(-this.width / 2, -this.height / 2, this.width, this.height, t.radii.md);
    }

    // Inner highlight
    if (!hovered) {
      this.bg.fillStyle(0xffffff, 0.08);
      this.bg.fillRoundedRect(-this.width / 2 + 4, -this.height / 2 + 2, this.width - 8, this.height / 3,
        { tl: t.radii.md, tr: t.radii.md, bl: 0, br: 0 });
    }
  }

  private getGradient() {
    const t = this.theme;
    switch (this.variant) {
      case 'primary': return t.gradients.btnPrimary;
      case 'secondary': return t.gradients.btnSecondary;
      case 'danger': return { topLeft: t.colors.error, topRight: t.colors.error, bottomLeft: t.colors.error, bottomRight: t.colors.error };
      case 'ghost': return { topLeft: 0xffffff, topRight: 0xffffff, bottomLeft: 0xccccdd, bottomRight: 0xccccdd };
      default: return t.gradients.btnPrimary;
    }
  }

  private startPulse(): void {
    if (!this.glow) return;
    this.scene.tweens.add({
      targets: this.glow,
      alpha: { from: 0.6, to: 0.2 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }
}