// UI draw helpers tái dùng (design-system component core)
import Phaser from 'phaser';
import { color, radius, type, toColor, z, dur } from './tokens';
import { sdk } from './sdk-instance';

export interface ButtonOpts {
  testid?: string;
  variant?: 'primary' | 'ghost' | 'amber' | 'emerald' | 'purple';
  width?: number;
  height?: number;
  fontSize?: number;
  textColor?: string;
}

export interface ButtonResult {
  container: Phaser.GameObjects.Container;
  textObj: Phaser.GameObjects.Text;
}

// btn-primary / btn-ghost (design-system §3.1) — vẽ bằng Graphics, nút chibi nổi
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
  const container = scene.add.container(x, y).setDepth(50);

  const g = scene.add.graphics();
  // Shadow
  g.fillStyle(0x000000, 0.20);
  g.fillRoundedRect(-w / 2, -h / 2 + 5, w, h, radius.md);

  let fillColor = 0xFF6B81;
  let darkColor = 0xE8556F;
  let textColor = '#FFFFFF';

  if (variant === 'primary') {
    fillColor = 0xFF6B81;
    darkColor = 0xE8556F;
  } else if (variant === 'amber') {
    fillColor = 0xF59E0B;
    darkColor = 0xD97706;
  } else if (variant === 'emerald') {
    fillColor = 0x10B981;
    darkColor = 0x059669;
  } else if (variant === 'purple') {
    fillColor = 0x8B5CF6;
    darkColor = 0x7C3AED;
  } else if (variant === 'ghost') {
    fillColor = 0xFFFFFF;
    darkColor = 0xE2E8F0;
    textColor = '#4A2C2A';
  }

  // Nền nút
  g.fillStyle(fillColor, 1);
  g.fillRoundedRect(-w / 2, -h / 2, w, h, radius.md);

  if (variant !== 'ghost') {
    // 3D bottom bevel nổi chibi
    g.fillStyle(darkColor, 1);
    g.fillRoundedRect(-w / 2, h / 2 - 6, w, 6, { tl: 0, tr: 0, bl: radius.md, br: radius.md });
  } else {
    g.lineStyle(3, 0xFF6B81, 1);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, radius.md);
  }
  container.add(g);

  // Label text with auto-fit calculation (đảm bảo text luôn nằm gọn 100% trong khung)
  const textObj = scene.add.text(0, -1, label, {
    fontFamily: 'sans-serif',
    fontSize: `${fontSize}px`,
    fontStyle: 'bold',
    color: opts.textColor ?? textColor,
  }).setOrigin(0.5);

  const maxTextW = w - 36;
  if (textObj.width > maxTextW) {
    const fitScale = maxTextW / textObj.width;
    textObj.setScale(fitScale);
  }
  container.add(textObj);

  if (opts.testid) textObj.setData('testid', opts.testid);
  container.setSize(w, h);
  container.setInteractive({ useHandCursor: true });

  container.on('pointerdown', () => {
    scene.tweens.add({
      targets: container,
      scaleX: 0.96,
      scaleY: 0.96,
      duration: 60,
      yoyo: true,
    });
  });

  return { container, textObj };
}

// Background (step 14b): prefer the generated `bg_gradient` PNG (a soft pastel
// vertical gradient) and stretch it to fill the portrait world; fall back to the
// programmatic gradient when the texture is not loaded (dev before assets). The
// grass strip is kept in both paths for the meadow accent (DESIGN-SPEC §3.1).
export function drawBackground(scene: Phaser.Scene): void {
  const { width, height } = scene.scale;
  if (scene.textures.exists('bg_gradient')) {
    scene.add.image(0, 0, 'bg_gradient')
      .setOrigin(0, 0)
      .setDisplaySize(width, height) // smooth gradient -> vertical stretch is invisible
      .setDepth(z.bg);
  } else {
    drawGradientBg(scene, color.bgTop, color.bgBottom, undefined);
  }
  // Meadow strip at the very bottom, over the gradient image.
  const g = scene.add.graphics().setDepth(z.bg);
  g.fillStyle(toColor(color.grass), 1);
  g.fillRect(0, height - height * 0.02, width, height * 0.02);
}

// nền gradient (top → bottom + dải cỏ dưới)
export function drawGradientBg(scene: Phaser.Scene, top: string, bottom: string, grass?: string) {
  const { width, height } = scene.scale;
  const g = scene.add.graphics().setDepth(0);
  const topC = toColor(top), botC = toColor(bottom);
  // gradient xấp xỉ: vài dải ngang blend
  const steps = 24;
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const c = blend(topC, botC, t);
    g.fillStyle(c, 1);
    g.fillRect(0, (height * i) / steps, width, height / steps + 1);
  }
  if (grass) {
    g.fillStyle(toColor(grass), 1);
    g.fillRect(0, height - height * 0.02, width, height * 0.02);
  }
  return g;
}

function blend(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  const r = Math.round(ar + (br - ar) * t);
  const gg = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (gg << 8) | bl;
}

// --- Mute button (step 15, M3-10 / UI-12) ----------------------------------
// A canvas-drawn speaker icon (top-right corner) the player taps to mute or
// unmute the game. The SoundManager is global, so the player's choice is kept
// in a module-global flag that survives scene transitions (Start -> Gameplay ->
// GameOver all read the same flag). `applyMute` folds the player choice with the
// SDK `isAudioEnabled` flag — EITHER being "off" silences the game — so the host
// audio toggle and the in-canvas button never fight. The icon redraws on every
// toggle (speaker + waves when on, speaker + red slash when off) for a clear
// visual counterpart to the audio state, as UI-12 requires.

/** Player's explicit mute choice (combined with the SDK flag at apply time). */
let userMuted = false;

/** Read-only view of the player mute flag (used by main's SDK pause/resume). */
export function isUserMuted(): boolean { return userMuted; }

/** Recompute the global SoundManager mute from BOTH the player toggle and the
 *  SDK audio-enabled flag — either being off mutes the game (UI-12). */
export function applyMute(game: Phaser.Game, sdkAudioEnabled: boolean): void {
  game.sound.mute = userMuted || !sdkAudioEnabled;
}

/** Draw the speaker icon in its current state onto a graphics object. Speaker
 *  body + cone always; two wave arcs when on, a red diagonal slash when off. */
function drawSpeakerIcon(g: Phaser.GameObjects.Graphics, on: boolean): void {
  g.clear();
  // circular backdrop so the icon reads on gradient, bucket, and overlay alike
  g.fillStyle(toColor(color.surface), 0.9);
  g.fillCircle(0, 0, 30);
  g.lineStyle(3, toColor(color.primary), 0.5);
  g.strokeCircle(0, 0, 30);

  const body = on ? toColor(color.textPrimary) : toColor(color.textSecondary);
  // speaker magnet (small rect) + cone (triangle opening right)
  g.fillStyle(body, 1);
  g.fillRect(-16, -7, 8, 14);
  g.beginPath();
  g.moveTo(-8, -7);
  g.lineTo(2, -15);
  g.lineTo(2, 15);
  g.lineTo(-8, 7);
  g.closePath();
  g.fillPath();

  if (on) {
    // two sound-wave arcs emerging to the right
    g.lineStyle(3, body, 1);
    g.beginPath();
    g.arc(8, 0, 9, -Math.PI / 4, Math.PI / 4, false);
    g.strokePath();
    g.beginPath();
    g.arc(8, 0, 15, -Math.PI / 4, Math.PI / 4, false);
    g.strokePath();
  } else {
    // red diagonal slash = muted
    g.lineStyle(4, toColor(color.danger), 1);
    g.beginPath();
    g.moveTo(-18, -18);
    g.lineTo(18, 18);
    g.strokePath();
  }
}

/** Build the mute toggle button at the top-right of the world. Mobile-first:
 *  the icon sits inside the 720 portrait world (Scale.FIT keeps it in-viewport
 *  on desktop pillarbox), and the 80×80 hit area exceeds the 44px touch minimum.
 *  Depth 60 stays above the game-over overlay (z.overlay=40) and panel (z.panel=50)
 *  so the button is reachable from every scene. */
export function drawMuteButton(scene: Phaser.Scene): Phaser.GameObjects.Container {
  const { width } = scene.scale;
  const container = scene.add.container(width - 56, 56).setDepth(60);
  const icon = scene.add.graphics();
  const redraw = (): void => drawSpeakerIcon(icon, !userMuted);
  redraw();
  container.add(icon);
  // Generous invisible hit area so a fingertip always lands the tap.
  const hit = scene.add.rectangle(0, 0, 80, 80, 0x000000, 0)
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