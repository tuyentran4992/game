// UI helpers — vẽ nút/panel trong canvas (DESIGN-SPEC §3). Không dùng DOM.
import Phaser from 'phaser';
import { color, type, sp, radius, shadow, z, dur, fontStyle, toColor } from './tokens';

export function drawButton(
  scene: Phaser.Scene,
  x: number, y: number, text: string,
  opts: { width?: number; height?: number; variant?: 'primary' | 'ghost'; testid?: string; textType?: { size: string; weight: string; lh: number }; glow?: boolean; pulseMs?: number } = {}
): { container: Phaser.GameObjects.Container; textObj: Phaser.GameObjects.Text; } {
  const width = opts.width ?? 280;
  const height = opts.height ?? (opts.variant === 'ghost' ? 52 : 64);
  const variant = opts.variant ?? 'primary';
  const textType = opts.textType ?? (opts.variant === 'ghost' ? type.body : type.display);
  const r = Math.min(height / 2, radius.lg);
  const g = scene.add.graphics();
  const txtColor = variant === 'primary' ? color.textOnAccent : color.textPrimary;

  const drawState = (state: 'default' | 'hover' | 'active') => {
    g.clear();
    const bevelH = 6;
    const pressOffset = state === 'active' ? 2 : 0;

    // 1. Drop Shadow
    g.fillStyle(toColor(color.shadow), state === 'active' ? 0.18 : shadow.btn.alpha);
    g.fillRoundedRect(-width / 2, -height / 2 + shadow.btn.dy + pressOffset, width, height, r);

    if (variant === 'primary') {
      // 2. 3D Bottom Base (primaryDark 6px)
      g.fillStyle(toColor(color.primaryDark), 1);
      g.fillRoundedRect(-width / 2, -height / 2 + pressOffset, width, height, r);

      // 3. Top Button Body with vibrant candy gradient
      const topH = height - bevelH + (state === 'active' ? 2 : 0);
      const topColor = state === 'hover' ? 0xFFB03A : 0xFF9F1C;
      g.fillStyle(topColor, 1);
      g.fillRoundedRect(-width / 2, -height / 2 + pressOffset, width, topH, r);

      // 4. Gloss Specular Highlight (top 1/3 pill)
      if (state !== 'active') {
        const glossW = width - 20;
        const glossH = Math.max(10, Math.floor(topH * 0.36));
        g.fillStyle(0xFFFFFF, state === 'hover' ? 0.40 : 0.28);
        g.fillRoundedRect(-glossW / 2, -height / 2 + 3, glossW, glossH, Math.min(glossH / 2, r));
      }
    } else {
      // Ghost Button
      g.fillStyle(toColor(color.surface), 1);
      g.fillRoundedRect(-width / 2, -height / 2 + pressOffset, width, height, r);

      // Primary border
      g.lineStyle(3, toColor(color.primary), 1);
      g.strokeRoundedRect(-width / 2, -height / 2 + pressOffset, width, height, r);

      // Subtle top gloss
      if (state !== 'active') {
        const glossW = width - 16;
        const glossH = Math.max(8, Math.floor(height * 0.32));
        g.fillStyle(0xFFFFFF, 0.55);
        g.fillRoundedRect(-glossW / 2, -height / 2 + 3, glossW, glossH, Math.min(glossH / 2, r));
      }
    }
  };

  drawState('default');
  g.setDepth(z.panel);

  const t = scene.add.text(0, 0, text, fontStyle(textType, txtColor)).setOrigin(0.5).setDepth(z.panel + 1);
  if (variant === 'primary') {
    t.setShadow(0, 1.5, 'rgba(0,0,0,0.35)', 2, false, true);
  }

  const container = scene.add.container(x, y, [g, t]).setSize(width, height).setDepth(z.panel);
  if (opts.testid) {
    g.setData('testid', opts.testid);
    t.setData('testid', opts.testid);
    container.setData('testid', opts.testid);
  }
  container.setInteractive({ useHandCursor: true });

  // R5 (t_a562b030): CTA glow ring + pulse — nút hành động chính nổi nhất màn.
  // Glow là con của container (index 0) nên đi theo panel khi scale/resize; token-only màu.
  if (opts.glow && variant === 'primary') {
    const glowG = scene.add.graphics();
    glowG.setScale(1.02);
    glowG.setAlpha(0.4);
    const drawGlow = (alpha: number) => {
      glowG.clear();
      glowG.fillStyle(toColor(color.primary), alpha);
      glowG.fillRoundedRect(-width * 0.54, -height * 0.62, width * 1.08, height * 1.24, r);
    };
    drawGlow(0.4);
    container.addAt(glowG, 0);
    const pulseMs = opts.pulseMs ?? dur.slow;
    const glowTween = scene.tweens.add({
      targets: glowG,
      scale: 1.14,
      alpha: 0.14,
      duration: pulseMs,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inout',
    });
    glowG.once('destroy', () => {
      glowTween.remove();
      glowG.clear();
    });
  }

  const playClick = () => {
    if (scene.cache.audio.exists('sfx_click')) scene.sound.play('sfx_click', { volume: 0.35 });
  };

  // Hover and active states
  container.on('pointerover', () => {
    drawState('hover');
    scene.tweens.add({ targets: container, scale: 1.03, duration: dur.tn, ease: 'quad.out' });
  });
  container.on('pointerout', () => {
    drawState('default');
    t.setY(0);
    scene.tweens.add({ targets: container, scale: 1, duration: dur.tn, ease: 'quad.out' });
  });
  container.on('pointerdown', () => {
    playClick();
    drawState('active');
    t.setY(2);
    scene.tweens.add({ targets: container, scale: 0.96, duration: dur.fast, ease: 'quad.in' });
  });
  container.on('pointerup', () => {
    drawState('hover');
    t.setY(0);
    scene.tweens.add({ targets: container, scale: 1.03, duration: dur.tn, ease: 'quad.out' });
  });

  return { container, textObj: t };
}

export function drawPanel(scene: Phaser.Scene, x: number, y: number, width: number, height: number): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  // 1. Shadow underneath
  g.fillStyle(toColor(color.shadow), shadow.panel.alpha);
  g.fillRoundedRect(x - width / 2, y - height / 2 + shadow.panel.dy, width, height, radius.lg);
  
  // 2. Volumetric panel surface (subtle gradient white -> surfaceDim)
  g.fillStyle(0xF8FAFC, 1);
  g.fillRoundedRect(x - width / 2, y - height / 2, width, height, radius.lg);

  g.fillStyle(0xFFFFFF, 0.94);
  g.fillRoundedRect(x - width / 2 + 3, y - height / 2 + 3, width - 6, height * 0.55, radius.lg - 2);

  // 3. Primary Color Border (Candy 3D)
  g.lineStyle(4, toColor(color.primary), 1);
  g.strokeRoundedRect(x - width / 2, y - height / 2, width, height, radius.lg);

  // 4. Subtle inner highlight line
  g.lineStyle(1.5, 0xFFFFFF, 0.70);
  g.strokeRoundedRect(x - width / 2 + 2, y - height / 2 + 2, width - 4, height - 4, radius.lg - 2);

  g.setDepth(z.panel);
  return g;
}

export function drawGradientBg(scene: Phaser.Scene, top: string, bottom: string, grass: string, grassRatio?: number): Phaser.GameObjects.Graphics {
  const { width, height } = scene.scale;
  const isPortrait = height > width;
  const splitRatio = grassRatio ?? (isPortrait ? 0.48 : 0.58);
  const g = scene.add.graphics();
  // gradient 2 lớp (trời)
  const steps = 24;
  const topC = Phaser.Display.Color.HexStringToColor(top);
  const botC = Phaser.Display.Color.HexStringToColor(bottom);
  for (let i = 0; i < steps; i++) {
    const c = Phaser.Display.Color.Interpolate.ColorWithColor(topC, botC, steps, i);
    const y1 = (height * splitRatio) * (i / steps);
    const y2 = (height * splitRatio) * ((i + 1) / steps);
    g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
    g.fillRect(0, y1, width, y2 - y1 + 1);
  }
  // cỏ đáy
  g.fillStyle(toColor(grass), 1);
  g.fillRect(0, height * splitRatio, width, height * (1 - splitRatio));
  g.setDepth(z.bg);
  return g;
}

export { color, type, sp, radius, shadow, z, dur, fontStyle, toColor };
