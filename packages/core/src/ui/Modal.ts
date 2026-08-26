import Phaser from 'phaser';
import { palette, radius, shadows, animation, spacing } from '../tokens';
import { Panel } from './Panel';
import { Button, type ButtonVariant } from './Button';

/**
 * Full-screen modal with backdrop overlay, title, and action buttons.
 *
 * Usage:
 * ```ts
 * const modal = new Modal(scene, 'Game Over', [
 *   { label: 'Retry', variant: 'primary', onClick: () => restart() },
 * ]);
 * modal.show();
 * ```
 */
export interface ModalAction {
  label: string;
  variant?: ButtonVariant;
  onClick: () => void;
}

export class Modal {
  private scene: Phaser.Scene;
  private overlay: Phaser.GameObjects.Graphics;
  private panel: Panel;
  private container: Phaser.GameObjects.Container;
  private buttons: Button[] = [];

  constructor(scene: Phaser.Scene, title: string, actions: ModalAction[], subtext?: string) {
    this.scene = scene;

    this.container = scene.add.container(0, 0);
    this.container.setAlpha(0);
    this.container.setScale(0.9);

    // Overlay backdrop
    this.overlay = scene.add.graphics();
    this.overlay.fillStyle(palette.bgOverlay, 0.7);
    this.overlay.fillRect(0, 0, scene.scale.width, scene.scale.height);
    this.overlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, scene.scale.width, scene.scale.height), Phaser.Geom.Rectangle.Contains);
    this.container.add(this.overlay);

    // Panel
    const panelW = 340;
    const panelH = actions.length > 2 ? 320 : 260;
    this.panel = new Panel(scene, scene.scale.width / 2, scene.scale.height / 2, panelW, panelH);
    this.panel.setTitle(title);
    this.container.add(this.panel.getContainer());

    // Subtext
    if (subtext) {
      const sub = scene.add.text(scene.scale.width / 2, scene.scale.height / 2 - 30, subtext, {
        fontFamily: 'Poppins',
        fontSize: '18px',
        color: '#8888bb',
        align: 'center',
        wordWrap: { width: panelW - 40 },
      });
      sub.setOrigin(0.5);
      this.container.add(sub);
    }

    // Action buttons
    const btnStartY = scene.scale.height / 2 + (actions.length > 2 ? 0 : 40);
    const btnGap = 72;
    actions.forEach((action, i) => {
      const btn = new Button(scene, scene.scale.width / 2, btnStartY + i * btnGap, {
        label: action.label,
        variant: action.variant ?? 'primary',
        width: 240,
        height: 56,
      });
      btn.onClick(() => action.onClick());
      this.container.add(btn.getContainer());
      this.buttons.push(btn);
    });

    // Close button (X)
    const closeBtn = scene.add.text(scene.scale.width / 2 + panelW / 2 - 10, scene.scale.height / 2 - panelH / 2 + 10, '✕', {
      fontFamily: 'Poppins',
      fontSize: '24px',
      color: '#8888bb',
    });
    closeBtn.setOrigin(0.5);
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.hide());
    this.container.add(closeBtn);
  }

  show(): void {
    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: animation.normal,
      ease: 'Back.easeOut',
    });
  }

  hide(): void {
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      scaleX: 0.9,
      scaleY: 0.9,
      duration: animation.fast,
      ease: 'Power2',
      onComplete: () => this.destroy(),
    });
  }

  destroy(): void {
    this.container.destroy();
  }
}