// M3 Juicy Merge — Playgama-grade UI component library
import Phaser from 'phaser';
import { color, radius, type, toColor, z, dur } from './tokens';
import { sdk } from './sdk-instance';

export interface ButtonOpts {
  testid?: string;
  variant?: 'primary' | 'ghost' | 'amber' | 'emerald' | 'purple' | 'gold';
  width?: number;
  height?: number;
  fontSize?: number;
  textColor?: string;
  icon?: string;
}

export interface ButtonResult {
  container: Phaser.GameObjects.Container;
  textObj: Phaser.GameObjects.Text;
}

/**
 * 3D Chunky Candy Button (Playgama/Poki Casual standard):
 * - Soft ambient bottom drop shadow
 * - 3D dark bottom bevel extrusion (8px depth)
 * - Top glossy specular highlight sheen arc
 * - Bold punchy typography with text shadow
 * - Bouncy spring press physics
 */
export function drawButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  opts: ButtonOpts = {},
): ButtonResult {
  const variant = opts.variant ?? 'primary';
  const w = opts.width ?? 380;
  const h = opts.height ?? 72;
  const fontSize = opts.fontSize ?? 26;
  const container = scene.add.container(x, y).setDepth(z.panel);

  const g = scene.add.graphics();
  const rad = radius.md;
  const bevel = 8; // 3D depth

  // 1. Soft Ambient Drop Shadow
  g.fillStyle(0x000000, 0.22);
  g.fillRoundedRect(-w / 2, -h / 2 + bevel + 4, w, h, rad);

  let fillColor = 0xFF4D6D;
  let darkColor = 0xC9184A;
  let highlightColor = 0xFF8FA3;
  let textColor = '#FFFFFF';
  let strokeColor = '#000000';

  if (variant === 'primary') {
    fillColor = 0xFF4D6D;
    darkColor = 0xA4133C;
    highlightColor = 0xFF8FA3;
    strokeColor = '#590D22';
  } else if (variant === 'amber' || variant === 'gold') {
    fillColor = 0xF59E0B;
    darkColor = 0xB45309;
    highlightColor = 0xFDE68A;
    strokeColor = '#78350F';
  } else if (variant === 'emerald') {
    fillColor = 0x10B981;
    darkColor = 0x047857;
    highlightColor = 0x6EE7B7;
    strokeColor = '#064E3B';
  } else if (variant === 'purple') {
    fillColor = 0x8B5CF6;
    darkColor = 0x6D28D9;
    highlightColor = 0xC4B5FD;
    strokeColor = '#4C1D95';
  } else if (variant === 'ghost') {
    fillColor = 0xFFFFFF;
    darkColor = 0xCBD5E1;
    highlightColor = 0xFFFFFF;
    textColor = '#1E293B';
    strokeColor = '#94A3B8';
  }

  // 2. 3D Bottom Bevel (Chunky Base)
  g.fillStyle(darkColor, 1);
  g.fillRoundedRect(-w / 2, -h / 2 + bevel, w, h, rad);

  // 3. Top Face of Button
  g.fillStyle(fillColor, 1);
  g.fillRoundedRect(-w / 2, -h / 2, w, h - bevel, rad);

  // 4. Top Specular Gloss Highlight Sheen (Glass/Candy shine)
  if (variant !== 'ghost') {
    g.fillStyle(highlightColor, 0.45);
    g.fillRoundedRect(-w / 2 + 10, -h / 2 + 4, w - 20, (h - bevel) * 0.42, rad - 4);
    // Tiny white reflection line at top
    g.fillStyle(0xFFFFFF, 0.65);
    g.fillRoundedRect(-w / 2 + 20, -h / 2 + 5, w - 40, 3, 2);
  } else {
    g.lineStyle(3, 0xCBD5E1, 1);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, rad);
  }

  container.add(g);

  // 5. Label Text with crisp stroke and shadow
  const textContent = opts.icon ? `${opts.icon} ${label}` : label;
  const textObj = scene.add.text(0, -bevel / 2, textContent, {
    fontFamily: 'sans-serif',
    fontSize: `${fontSize}px`,
    fontStyle: 'bold',
    color: opts.textColor ?? textColor,
  }).setOrigin(0.5);

  if (variant !== 'ghost') {
    textObj.setStroke(strokeColor, 5);
    textObj.setShadow(0, 2, 'rgba(0,0,0,0.35)', 2, false, true);
  }

  // Auto-fit calculation
  const maxTextW = w - 32;
  if (textObj.width > maxTextW) {
    textObj.setScale(maxTextW / textObj.width);
  }
  container.add(textObj);

  if (opts.testid) textObj.setData('testid', opts.testid);
  container.setSize(w, h);
  container.setInteractive({ useHandCursor: true });

  // Springy press animation
  container.on('pointerdown', () => {
    scene.tweens.add({
      targets: container,
      scaleX: 0.94,
      scaleY: 0.94,
      y: y + 3,
      duration: 60,
      yoyo: true,
      ease: 'Quad.easeInOut',
    });
  });

  return { container, textObj };
}

/**
 * Draw modern ambient tropical sunrise gradient background with floating light bokeh particles.
 */
export function drawBackground(scene: Phaser.Scene): void {
  const { width, height } = scene.scale;

  // 1. Smooth Multi-stop Sunrise Gradient
  const g = scene.add.graphics().setDepth(z.bg);
  const steps = 32;
  const topC = 0xFFF3E3;    // Warm golden sunlight
  const midC = 0xFFE3D8;    // Soft peach
  const botC = 0xD4EEFA;    // Crisp sky blue

  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const c = t < 0.5 ? blend(topC, midC, t * 2) : blend(midC, botC, (t - 0.5) * 2);
    g.fillStyle(c, 1);
    g.fillRect(0, (height * i) / steps, width, height / steps + 1);
  }

  // 2. Soft Ambient Floating Bokeh / Sparkles in Background
  spawnAmbientBokeh(scene, width, height);

  // 3. Cute meadow turf strip at the bottom
  const meadowH = 14;
  g.fillStyle(0x10B981, 1);
  g.fillRect(0, height - meadowH, width, meadowH);
  g.fillStyle(0x059669, 1);
  g.fillRect(0, height - meadowH + 4, width, meadowH - 4);
}

function spawnAmbientBokeh(scene: Phaser.Scene, w: number, h: number): void {
  const particleCount = 14;
  for (let i = 0; i < particleCount; i++) {
    const px = Math.random() * w;
    const py = Math.random() * h;
    const size = Math.random() * 8 + 4;
    const alpha = Math.random() * 0.35 + 0.15;

    const dot = scene.add.graphics().setDepth(z.bgParticles);
    dot.fillStyle(0xFFFFFF, alpha);
    dot.fillCircle(0, 0, size);
    dot.setPosition(px, py);

    // Floating upward drift tween
    scene.tweens.add({
      targets: dot,
      y: `-=${Math.random() * 120 + 80}`,
      x: `+=${(Math.random() - 0.5) * 60}`,
      alpha: { from: alpha, to: 0.05 },
      duration: Math.random() * 4000 + 4000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: Math.random() * 2000,
    });
  }
}

function blend(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  const r = Math.round(ar + (br - ar) * t);
  const gg = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (gg << 8) | bl;
}

/**
 * Draw a Frosted Glass Card Panel with smooth rounded corners, drop shadow, and clean border.
 */
export function drawFrostedCard(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  rad = radius.lg,
  strokeColor = 0xE2E8F0,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  // Soft outer drop shadow
  g.fillStyle(0x000000, 0.16);
  g.fillRoundedRect(x - w / 2, y - h / 2 + 8, w, h, rad);

  // Frosted white glass body
  g.fillStyle(0xFFFFFF, 0.94);
  g.fillRoundedRect(x - w / 2, y - h / 2, w, h, rad);

  // Inner subtle highlight
  g.lineStyle(2, 0xFFFFFF, 0.9);
  g.strokeRoundedRect(x - w / 2 + 1, y - h / 2 + 1, w - 2, h - 2, rad);

  // Crisp border stroke
  g.lineStyle(2.5, strokeColor, 0.9);
  g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, rad);

  return g;
}

// --- Mute button -------------------------------------------------------------
let userMuted = false;
export function isUserMuted(): boolean { return userMuted; }

export function applyMute(game: Phaser.Game, sdkAudioEnabled: boolean): void {
  game.sound.mute = userMuted || !sdkAudioEnabled;
}

function drawSpeakerIcon(g: Phaser.GameObjects.Graphics, on: boolean): void {
  g.clear();
  // 3D round bubble backdrop
  g.fillStyle(0x000000, 0.15);
  g.fillCircle(0, 3, 26);

  g.fillStyle(0xFFFFFF, 0.96);
  g.fillCircle(0, 0, 26);
  g.lineStyle(2.5, 0xF59E0B, 0.9);
  g.strokeCircle(0, 0, 26);

  const body = on ? 0x475569 : 0x94A3B8;
  g.fillStyle(body, 1);
  g.fillRect(-14, -6, 7, 12);
  g.beginPath();
  g.moveTo(-7, -6);
  g.lineTo(2, -13);
  g.lineTo(2, 13);
  g.lineTo(-7, 6);
  g.closePath();
  g.fillPath();

  if (on) {
    g.lineStyle(2.5, 0xF59E0B, 1);
    g.beginPath();
    g.arc(6, 0, 8, -Math.PI / 4, Math.PI / 4, false);
    g.strokePath();
    g.beginPath();
    g.arc(6, 0, 13, -Math.PI / 4, Math.PI / 4, false);
    g.strokePath();
  } else {
    g.lineStyle(3.5, 0xEF4444, 1);
    g.beginPath();
    g.moveTo(-15, -15);
    g.lineTo(15, 15);
    g.strokePath();
  }
}

export function drawMuteButton(scene: Phaser.Scene): Phaser.GameObjects.Container {
  const { width } = scene.scale;
  const container = scene.add.container(width - 50, 50).setDepth(60);
  const icon = scene.add.graphics();
  const redraw = (): void => drawSpeakerIcon(icon, !userMuted);
  redraw();
  container.add(icon);

  const hit = scene.add.rectangle(0, 0, 70, 70, 0x000000, 0)
    .setInteractive({ useHandCursor: true });
  hit.setData('testid', 'mute-btn');
  container.add(hit);

  hit.on('pointerdown', () => {
    userMuted = !userMuted;
    applyMute(scene.game, sdk.isAudioEnabled());
    redraw();
    scene.tweens.add({
      targets: container,
      scale: { from: 0.9, to: 1 },
      duration: dur.fast,
      ease: 'Back.easeOut',
    });
  });
  return container;
}