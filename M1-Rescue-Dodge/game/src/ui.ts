// UI helpers — vẽ nút/panel trong canvas (DESIGN-SPEC §3). Không dùng DOM.
import Phaser from 'phaser';
import { color, type, sp, radius, shadow, z, dur, fontStyle, toColor } from './tokens';

export function drawButton(
  scene: Phaser.Scene,
  x: number, y: number, text: string,
  opts: { width?: number; variant?: 'primary' | 'ghost'; testid?: string; textType?: { size: string; weight: string; lh: number } } = {}
): { container: Phaser.GameObjects.Container; textObj: Phaser.GameObjects.Text; } {
  const width = opts.width ?? 280;
  const height = 72;
  const variant = opts.variant ?? 'primary';
  const textType = opts.textType ?? type.display;
  const g = scene.add.graphics();
  const fill = variant === 'primary' ? color.primary : color.surface;
  const border = variant === 'primary' ? color.primaryDark : color.primary;
  const txtColor = variant === 'primary' ? color.textOnAccent : color.textPrimary;
  // SHADOW vẽ TRƯỚC (đằng sau nút) để không đè lên fill — fix F1 (nút bị tối/đen)
  g.fillStyle(toColor(color.shadow), shadow.btn.alpha);
  g.fillRoundedRect(-width / 2, -height / 2 + shadow.btn.dy, width, height, radius.lg);
  // FILL chính (token color.primary cam) — DESIGN-SPEC §3.1 btn-primary
  g.fillStyle(toColor(fill), 1);
  g.fillRoundedRect(-width / 2, -height / 2, width, height, radius.lg);
  // viền dưới đậm 6px (nút nổi chibi) — color.primary.dark
  g.fillStyle(toColor(border), 1);
  g.fillRect(-width / 2, height / 2 - 6, width, 6);
  g.setDepth(z.panel);
  const t = scene.add.text(0, 0, text, fontStyle(textType, txtColor)).setOrigin(0.5).setDepth(z.panel + 1);
  const container = scene.add.container(x, y, [g, t]).setSize(width, height).setDepth(z.panel);
  if (opts.testid) {
    g.setData('testid', opts.testid);
    t.setData('testid', opts.testid);
    container.setData('testid', opts.testid);
  }
  container.setInteractive({ useHandCursor: true });
  // hover/active states (DESIGN-SPEC 5.9/5.10)
  container.on('pointerover', () => scene.tweens.add({ targets: container, scale: 1.03, duration: dur.tn, ease: 'quad.out' }));
  container.on('pointerout', () => scene.tweens.add({ targets: container, scale: 1, duration: dur.tn, ease: 'quad.out' }));
  container.on('pointerdown', () => scene.tweens.add({ targets: container, scale: 0.96, duration: dur.fast, ease: 'quad.in' }));
  container.on('pointerup', () => scene.tweens.add({ targets: container, scale: 1.03, duration: dur.tn, ease: 'quad.out' }));
  return { container, textObj: t };
}

export function drawPanel(scene: Phaser.Scene, x: number, y: number, width: number, height: number): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  // shadow vẽ trước (đằng sau panel) — không đè lên fill
  g.fillStyle(toColor(color.shadow), shadow.panel.alpha);
  g.fillRoundedRect(x - width / 2, y - height / 2 + shadow.panel.dy, width, height, radius.lg);
  // fill panel (token color.surface trắng)
  g.fillStyle(toColor(color.surface), 1);
  g.fillRoundedRect(x - width / 2, y - height / 2, width, height, radius.lg);
  // border (token color.primary)
  g.lineStyle(4, toColor(color.primary), 1);
  g.strokeRoundedRect(x - width / 2, y - height / 2, width, height, radius.lg);
  g.setDepth(z.panel);
  return g;
}

export function drawGradientBg(scene: Phaser.Scene, top: string, bottom: string, grass: string): Phaser.GameObjects.Graphics {
  const { width, height } = scene.scale;
  const g = scene.add.graphics();
  // gradient 2 lớp (trời)
  const steps = 24;
  const topC = Phaser.Display.Color.HexStringToColor(top);
  const botC = Phaser.Display.Color.HexStringToColor(bottom);
  for (let i = 0; i < steps; i++) {
    const c = Phaser.Display.Color.Interpolate.ColorWithColor(topC, botC, steps, i);
    const y1 = (height * 0.62) * (i / steps);
    const y2 = (height * 0.62) * ((i + 1) / steps);
    g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
    g.fillRect(0, y1, width, y2 - y1 + 1);
  }
  // cỏ đáy 38%
  g.fillStyle(toColor(grass), 1);
  g.fillRect(0, height * 0.62, width, height * 0.38);
  g.setDepth(z.bg);
  return g;
}

export { color, type, sp, radius, shadow, z, dur, fontStyle, toColor };
