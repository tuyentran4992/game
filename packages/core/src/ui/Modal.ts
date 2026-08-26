import Phaser from 'phaser';
import type { GameTheme } from '../theme';
import { Panel } from './Panel';
import { Button, type ButtonVariant } from './Button';

export interface ModalAction {
  label: string;
  variant?: ButtonVariant;
  onClick: () => void;
}

interface ModalStyle {
  theme: GameTheme;
  actions: ModalAction[];
  subtext?: string;
}

/**
 * Full-screen modal with backdrop overlay, title, and action buttons.
 */
export class Modal {
  private scene: Phaser.Scene;
  private overlay: Phaser.GameObjects.Graphics;
  private panel: Panel;
  private container: Phaser.GameObjects.Container;
  private buttons: Button[] = [];
  private theme: GameTheme;

  constructor(scene: Phaser.Scene, title: string, style: ModalStyle) {
    this.scene = scene;
    this.theme = style.theme;
    const t = this.theme;

    this.container = scene.add.container(0, 0);
    this.container.setAlpha(0);
    this.container.setScale(0.9);

    // Overlay
    this.overlay = scene.add.graphics();
    this.overlay.fillStyle(t.colors.bgOverlay, 0.7);
    this.overlay.fillRect(0, 0, scene.scale.width, scene.scale.height);
    this.overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, scene.scale.width, scene.scale.height), Phaser.Geom.Rectangle.Contains);
    this.container.add(this.overlay);

    // Panel
    const panelW = 340;
    const panelH = style.actions.length > 2 ? 320 : 260;
    this.panel = new Panel(scene, scene.scale.width / 2, scene.scale.height / 2, panelW, panelH, { theme: t, title });
    this.container.add(this.panel.getContainer());

    if (style.subtext) {
      const sub = scene.add.text(scene.scale.width / 2, scene.scale.height / 2 - 30, style.subtext, {
        fontFamily: t.fonts.body,
        fontSize: '18px',
        color: `#${t.colors.textSecondary.toString(16).padStart(6, '0')}`,
        align: 'center',
        wordWrap: { width: panelW - 40 },
      });
      sub.setOrigin(0.5);
      this.container.add(sub);
    }

    // Buttons
    const btnStartY = scene.scale.height / 2 + (style.actions.length > 2 ? 0 : 40);
    const btnGap = 72;
    style.actions.forEach((action, i) => {
      const btn = new Button(scene, scene.scale.width / 2, btnStartY + i * btnGap, {
        label: action.label,
        variant: action.variant ?? 'primary',
        width: 240,
        height: 56,
        theme: t,
      });
      btn.onClick(() => action.onClick());
      this.container.add(btn.getContainer());
      this.buttons.push(btn);
    });

    // Close X
    const closeBtn = scene.add.text(scene.scale.width / 2 + panelW / 2 - 10, scene.scale.height / 2 - panelH / 2 + 10, '✕', {
      fontFamily: t.fonts.body,
      fontSize: '24px',
      color: `#${t.colors.textSecondary.toString(16).padStart(6, '0')}`,
    });
    closeBtn.setOrigin(0.5);
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.hide());
    this.container.add(closeBtn);
  }

  show(): void {
    this.scene.tweens.add({
      targets: this.container,
      alpha: 1, scaleX: 1, scaleY: 1,
      duration: this.theme.animation.normal,
      ease: 'Back.easeOut',
    });
  }

  hide(): void {
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0, scaleX: 0.9, scaleY: 0.9,
      duration: this.theme.animation.fast,
      ease: 'Power2',
      onComplete: () => this.destroy(),
    });
  }

  destroy(): void { this.container.destroy(); }
}