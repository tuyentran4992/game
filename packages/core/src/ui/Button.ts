import Phaser from 'phaser';
import { palette, gradients, fonts, fontSizes, radius, shadows } from '../tokens';
import type { GameTheme } from '../theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ButtonStyle {
  variant?: ButtonVariant;
  label: string;
  width?: number;
  height?: number;
  fontSize?: number;
  textColor?: string;
  icon?: string;
  pulse?: boolean;
  disabled?: boolean;
  /** Per-game theme override. Falls back to shared tokens if omitted. */
  theme?: GameTheme;
}

/**
 * Gradient button with drop shadow, press state, and optional glow.
 * Accepts per-game `theme` override; falls back to shared tokens.
 */
export class Button {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Graphics;
  private labelText: Phaser.GameObjects.Text;
  private shadow: Phaser.GameObjects.Graphics;
  private glow: Phaser.GameObjects.Graphics | null = null;
  private _disabled = false;
  private t: GameTheme | null;

  public x: number; public y: number; public width: number; public height: number;
  public variant: ButtonVariant;
  private clickCallback: (() => void) | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, style: ButtonStyle) {
    this.scene = scene; this.x = x; this.y = y;
    this.variant = style.variant ?? 'primary';
    this.width = style.width ?? 280;
    this.height = style.height ?? 64;
    this._disabled = style.disabled ?? false;
    this.t = style.theme ?? null;

    this.container = scene.add.container(x, y);

    this.shadow = scene.add.graphics();
    this.drawShadow();
    this.container.add(this.shadow);

    if (style.pulse) {
      this.glow = scene.add.graphics();
      this.drawGlow();
      this.container.add(this.glow);
      this.startPulse();
    }

    this.bg = scene.add.graphics();
    this.drawBg(false);
    this.container.add(this.bg);

    const fullLabel = style.icon ? `${style.icon}  ${style.label}` : style.label;
    const defaultTextColor = style.textColor ?? (this.variant === 'ghost' ? '#00f5ff' : '#ffffff');
    this.labelText = scene.add.text(0, 0, fullLabel, {
      fontFamily: this.t?.fonts?.heading ?? fonts.heading.family,
      fontSize: `${style.fontSize ?? fontSizes.button}px`,
      fontStyle: 'bold',
      color: defaultTextColor,
      stroke: '#060614',
      strokeThickness: 3,
      align: 'center',
    });
    this.labelText.setOrigin(0.5);
    this.container.add(this.labelText);

    const hitArea = scene.add.rectangle(0, 0, this.width, this.height, 0xffffff, 0)
      .setInteractive({ useHandCursor: true });
    this.container.add(hitArea);

    hitArea.on('pointerover', () => {
      if (!this._disabled) { this.drawBg(true); scene.tweens.add({ targets: this.container, scaleX: 1.05, scaleY: 1.05, duration: 100, ease: 'Power2' }); }
    });
    hitArea.on('pointerout', () => { this.drawBg(false); if (!this._disabled) scene.tweens.add({ targets: this.container, scaleX: 1, scaleY: 1, duration: 100, ease: 'Power2' }); });
    hitArea.on('pointerdown', () => {
      if (!this._disabled) { scene.tweens.add({ targets: this.container, scaleX: 0.95, scaleY: 0.95, duration: 50, ease: 'Power2' }); this.scene.cameras.main.shake(50, 0.002); }
    });
    hitArea.on('pointerup', () => {
      if (!this._disabled) { scene.tweens.add({ targets: this.container, scaleX: 1.05, scaleY: 1.05, duration: 50, ease: 'Power2' }); if (this.clickCallback) this.clickCallback(); }
    });
  }

  onClick(cb: () => void): void { this.clickCallback = cb; }
  setDisabled(d: boolean): void { this._disabled = d; this.labelText.setAlpha(d ? 0.5 : 1); }
  setLabel(l: string): void { this.labelText.setText(l); }
  destroy(): void { this.container.destroy(); }
  getContainer(): Phaser.GameObjects.Container { return this.container; }

  private getR(): number { return this.t?.radii?.md ?? radius.md; }
  private getShadow() { return this.t?.shadows?.button ?? shadows.button; }
  private getGlowColor() { return this.t?.shadows?.glow?.color ?? (this.variant === 'primary' ? shadows.glowCyan.color : shadows.glowMagenta.color); }
  private getGlowAlpha() { return this.t?.shadows?.glow?.alpha ?? (this.variant === 'primary' ? shadows.glowCyan.alpha : shadows.glowMagenta.alpha); }

  private drawShadow(): void {
    this.shadow.clear();
    const s = this.getShadow();
    this.shadow.fillStyle(s.color, s.alpha);
    this.shadow.fillRoundedRect(-this.width / 2 + s.distance, -this.height / 2 + s.distance, this.width, this.height, this.getR());
  }

  private drawGlow(): void {
    if (!this.glow) return;
    this.glow.clear();
    this.glow.fillStyle(this.getGlowColor(), this.getGlowAlpha() * 0.4);
    this.glow.fillRoundedRect(-this.width / 2 - 4, -this.height / 2 - 4, this.width + 8, this.height + 8, this.getR() + 4);
  }

  private drawBg(hovered: boolean): void {
    this.bg.clear();
    const g = this.getGradient();
    this.bg.fillGradientStyle(g.tl, g.tr, g.bl, g.br, 1);
    if (this.variant === 'ghost') this.bg.lineStyle(2, this.t?.colors?.primary ?? palette.neonCyan, 0.8);
    this.bg.fillRoundedRect(-this.width / 2, -this.height / 2, this.width, this.height, this.getR());
    if (this.variant === 'ghost') this.bg.strokeRoundedRect(-this.width / 2, -this.height / 2, this.width, this.height, this.getR());
    if (!hovered) {
      this.bg.fillStyle(0xffffff, 0.08);
      this.bg.fillRoundedRect(-this.width / 2 + 4, -this.height / 2 + 2, this.width - 8, this.height / 3, { tl: this.getR(), tr: this.getR(), bl: 0, br: 0 });
    }
  }

  private getGradient(): { tl: number; tr: number; bl: number; br: number } {
    if (this.t) {
      const g = this.t.gradients;
      switch (this.variant) {
        case 'primary': return { tl: g.btnPrimary.topLeft, tr: g.btnPrimary.topRight, bl: g.btnPrimary.bottomLeft, br: g.btnPrimary.bottomRight };
        case 'secondary': return { tl: g.btnSecondary.topLeft, tr: g.btnSecondary.topRight, bl: g.btnSecondary.bottomLeft, br: g.btnSecondary.bottomRight };
        case 'danger': return { tl: this.t.colors.error, tr: this.t.colors.error, bl: this.t.colors.error, br: this.t.colors.error };
        default: return { tl: g.btnPrimary.topLeft, tr: g.btnPrimary.topRight, bl: g.btnPrimary.bottomLeft, br: g.btnPrimary.bottomRight };
      }
    }
    switch (this.variant) {
      case 'primary': return { tl: gradients.btnPrimary.topLeft, tr: gradients.btnPrimary.topRight, bl: gradients.btnPrimary.bottomLeft, br: gradients.btnPrimary.bottomRight };
      case 'secondary': return { tl: gradients.btnSecondary.topLeft, tr: gradients.btnSecondary.topRight, bl: gradients.btnSecondary.bottomLeft, br: gradients.btnSecondary.bottomRight };
      case 'danger': return { tl: gradients.blockNeonRed.topLeft, tr: gradients.blockNeonRed.topRight, bl: gradients.blockNeonRed.bottomLeft, br: gradients.blockNeonRed.bottomRight };
      case 'ghost': return { tl: gradients.btnGhost.topLeft, tr: gradients.btnGhost.topRight, bl: gradients.btnGhost.bottomLeft, br: gradients.btnGhost.bottomRight };
      default: return { tl: gradients.btnPrimary.topLeft, tr: gradients.btnPrimary.topRight, bl: gradients.btnPrimary.bottomLeft, br: gradients.btnPrimary.bottomRight };
    }
  }

  private startPulse(): void {
    if (!this.glow) return;
    this.scene.tweens.add({ targets: this.glow, alpha: { from: 0.6, to: 0.2 }, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }
}