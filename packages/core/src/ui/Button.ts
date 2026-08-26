import Phaser from 'phaser';
import { palette, gradients, fonts, fontSizes, radius, shadows, spacing, animation } from '../tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ButtonStyle {
  variant?: ButtonVariant;
  label: string;
  width?: number;
  height?: number;
  fontSize?: number;
  textColor?: string;
  /** Icon character/emoji prepended to label */
  icon?: string;
  /** If true, shows a pulsing glow animation */
  pulse?: boolean;
  /** Disable interaction */
  disabled?: boolean;
}

/**
 * Professional gradient button with drop shadow, press state, and optional glow.
 *
 * Usage:
 * ```ts
 * const btn = new Button(scene, 360, 600, {
 *   variant: 'primary',
 *   label: 'Play',
 *   pulse: true,
 * });
 * btn.onClick(() => startGame());
 * ```
 */
export class Button {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Graphics;
  private labelText: Phaser.GameObjects.Text;
  private shadow: Phaser.GameObjects.Graphics;
  private glow: Phaser.GameObjects.Graphics | null = null;
  private _disabled = false;

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

    this.container = scene.add.container(x, y);

    // Shadow layer (behind bg)
    this.shadow = scene.add.graphics();
    this.drawShadow();
    this.container.add(this.shadow);

    // Glow layer (behind bg, for pulse)
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
    const defaultTextColor = style.textColor ?? (this.variant === 'ghost' ? '#00f5ff' : '#ffffff');
    this.labelText = scene.add.text(0, 0, fullLabel, {
      fontFamily: fonts.heading.family,
      fontSize: `${style.fontSize ?? fontSizes.button}px`,
      fontStyle: `bold`,
      color: defaultTextColor,
      stroke: '#060614',
      strokeThickness: 3,
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

  onClick(cb: () => void): void {
    this.clickCallback = cb;
  }

  setDisabled(disabled: boolean): void {
    this._disabled = disabled;
    this.labelText.setAlpha(disabled ? 0.5 : 1);
  }

  setLabel(label: string): void {
    this.labelText.setText(label);
  }

  destroy(): void {
    this.container.destroy();
  }

  getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  // ── Private drawing ────────────────────────────────────────────────

  private drawShadow(): void {
    this.shadow.clear();
    const s = shadows.button;
    this.shadow.fillStyle(s.color, s.alpha);
    this.shadow.fillRoundedRect(
      -this.width / 2 + s.distance,
      -this.height / 2 + s.distance,
      this.width,
      this.height,
      radius.md,
    );
  }

  private drawGlow(): void {
    if (!this.glow) return;
    this.glow.clear();
    const g = this.variant === 'primary' ? shadows.glowCyan : shadows.glowMagenta;
    this.glow.fillStyle(g.color, g.alpha * 0.4);
    this.glow.fillRoundedRect(-this.width / 2 - 4, -this.height / 2 - 4, this.width + 8, this.height + 8, radius.md + 4);
  }

  private drawBg(hovered: boolean): void {
    this.bg.clear();
    const g = this.getGradient();
    this.bg.fillGradientStyle(g.topLeft, g.topRight, g.bottomLeft, g.bottomRight, 1);

    // Border glow
    if (this.variant === 'ghost') {
      this.bg.lineStyle(2, palette.neonCyan, 0.8);
    }

    this.bg.fillRoundedRect(-this.width / 2, -this.height / 2, this.width, this.height, radius.md);

    if (this.variant === 'ghost') {
      this.bg.strokeRoundedRect(-this.width / 2, -this.height / 2, this.width, this.height, radius.md);
    }

    // Inner highlight (top edge)
    if (!hovered) {
      this.bg.fillStyle(0xffffff, 0.08);
      this.bg.fillRoundedRect(-this.width / 2 + 4, -this.height / 2 + 2, this.width - 8, this.height / 3, { tl: radius.md, tr: radius.md, bl: 0, br: 0 });
    }
  }

  private getGradient(): { topLeft: number; topRight: number; bottomLeft: number; bottomRight: number } {
    switch (this.variant) {
      case 'primary': return gradients.btnPrimary;
      case 'secondary': return gradients.btnSecondary;
      case 'danger': return gradients.blockNeonRed;
      case 'ghost': return gradients.btnGhost;
      default: return gradients.btnPrimary;
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