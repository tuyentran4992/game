import Phaser from "phaser";
import { radius, z, dur } from "./tokens";
import { ctx } from "./context";

export interface ButtonOpts {
  testid?: string;
  variant?: "primary" | "ghost" | "amber" | "emerald" | "purple" | "gold";
  width?: number;
  height?: number;
  fontSize?: number;
  textColor?: string;
  icon?: string;
  enableShimmer?: boolean;
}

export interface ButtonResult {
  container: Phaser.GameObjects.Container;
  textObj: Phaser.GameObjects.Text;
}

/**
 * 3D Chunky Candy Button (Playgama / Poki Top-Tier Visual Standard):
 * - Soft ambient bottom drop shadow (6px)
 * - 3D dark bottom bevel extrusion (10px depth)
 * - Top glossy specular highlight sheen arc
 * - Shimmer light sweep animation across button face
 * - Bold punchy typography with double stroke and drop shadow
 * - Bouncy spring press physics
 */
export function drawButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  opts: ButtonOpts = {},
): ButtonResult {
  const variant = opts.variant ?? "primary";
  const w = opts.width ?? 380;
  const h = opts.height ?? 72;
  const fontSize = opts.fontSize ?? 25;
  const container = scene.add.container(x, y).setDepth(z.panel);

  const g = scene.add.graphics();
  const rad = radius.md;
  const bevel = 9; // 3D depth

  // 1. Soft Ambient Drop Shadow
  g.fillStyle(0x000000, 0.26);
  g.fillRoundedRect(-w / 2, -h / 2 + bevel + 4, w, h, rad);

  let fillColor = 0xff4d6d;
  let darkColor = 0xa4133c;
  let highlightColor = 0xff8fa3;
  let textColor = "#FFFFFF";
  let strokeColor = "#590D22";

  if (variant === "primary") {
    fillColor = 0xff4d6d; // Candy Strawberry Pink
    darkColor = 0x9b1137; // Deep 3D Shadow
    highlightColor = 0xffaec0; // Glossy highlight
    strokeColor = "#590D22";
  } else if (variant === "amber" || variant === "gold") {
    fillColor = 0xf59e0b; // Solar Amber Gold
    darkColor = 0xb45309; // Deep Amber Gold
    highlightColor = 0xfde68a; // Light Gold Specular
    strokeColor = "#78350F";
  } else if (variant === "emerald") {
    fillColor = 0x10b981; // Mint Emerald Green
    darkColor = 0x047857; // Deep Forest Emerald
    highlightColor = 0xa7f3d0; // Light Mint Gloss
    strokeColor = "#064E3B";
  } else if (variant === "purple") {
    fillColor = 0x8b5cf6; // Royal Neon Purple
    darkColor = 0x5b21b6; // Deep Violet Shadow
    highlightColor = 0xddd6fe; // Light Lilac Gloss
    strokeColor = "#4C1D95";
  } else if (variant === "ghost") {
    fillColor = 0xffffff;
    darkColor = 0xcbd5e1;
    highlightColor = 0xffffff;
    textColor = "#1E293B";
    strokeColor = "#94A3B8";
  }

  // 2. 3D Bottom Bevel (Chunky Base)
  g.fillStyle(darkColor, 1);
  g.fillRoundedRect(-w / 2, -h / 2 + bevel, w, h, rad);

  // 3. Top Face of Button
  g.fillStyle(fillColor, 1);
  g.fillRoundedRect(-w / 2, -h / 2, w, h - bevel, rad);

  // 4. Top Specular Gloss Highlight Sheen (Glass/Candy shine)
  if (variant !== "ghost") {
    g.fillStyle(highlightColor, 0.48);
    g.fillRoundedRect(
      -w / 2 + 10,
      -h / 2 + 3,
      w - 20,
      (h - bevel) * 0.42,
      rad - 4,
    );
    // Pure white specular rim
    g.fillStyle(0xffffff, 0.75);
    g.fillRoundedRect(-w / 2 + 20, -h / 2 + 4, w - 40, 3, 2);
  } else {
    g.lineStyle(3, 0xcbd5e1, 1);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, rad);
  }

  container.add(g);

  // 5. Shimmer Light Ribbon Sweep Animation (Top casual game polish)
  if (variant !== "ghost" && opts.enableShimmer !== false) {
    const shimmer = scene.add.graphics();
    shimmer.fillStyle(0xffffff, 0.4);
    shimmer.beginPath();
    shimmer.moveTo(-15, -h / 2 + 4);
    shimmer.lineTo(10, -h / 2 + 4);
    shimmer.lineTo(-5, h / 2 - bevel - 4);
    shimmer.lineTo(-30, h / 2 - bevel - 4);
    shimmer.closePath();
    shimmer.fillPath();
    shimmer.setAlpha(0);
    shimmer.setX(-w / 2 + 20);

    container.add(shimmer);

    scene.tweens.add({
      targets: shimmer,
      x: { from: -w / 2 + 20, to: w / 2 - 20 },
      alpha: {
        getStart: () => 0,
        getEnd: () => 0,
        ease: (t: number) => Math.sin(t * Math.PI) * 0.35,
      },
      duration: 850,
      repeat: -1,
      repeatDelay: 3200,
      ease: "Cubic.easeInOut",
    });
  }

  // 6. Label Text with crisp stroke and shadow
  const textContent = opts.icon ? `${opts.icon}  ${label}` : label;
  const textObj = scene.add
    .text(0, -bevel / 2, textContent, {
      fontFamily: "sans-serif",
      fontSize: `${fontSize}px`,
      fontStyle: "bold",
      color: opts.textColor ?? textColor,
    })
    .setOrigin(0.5);

  if (variant !== "ghost") {
    textObj.setStroke(strokeColor, 6);
    textObj.setShadow(0, 3, "rgba(0,0,0,0.40)", 3, false, true);
  }

  // Auto-fit calculation
  const maxTextW = w - 36;
  if (textObj.width > maxTextW) {
    textObj.setScale(maxTextW / textObj.width);
  }
  container.add(textObj);

  if (opts.testid) textObj.setData("testid", opts.testid);
  container.setSize(w, h);
  container.setInteractive({ useHandCursor: true });

  // Springy press animation
  container.on("pointerdown", () => {
    scene.tweens.add({
      targets: container,
      scaleX: 0.94,
      scaleY: 0.94,
      y: y + 4,
      duration: 65,
      yoyo: true,
      ease: "Quad.easeInOut",
    });
  });

  return { container, textObj };
}

/**
 * Draw modern ambient tropical sunset skybox with radial spotlight and floating light sparkles.
 */
export function drawBackground(scene: Phaser.Scene): void {
  const { width, height } = scene.scale;

  // 1. Smooth Multi-stop Vibrant Sunset Gradient
  const g = scene.add.graphics().setDepth(z.bg);
  const steps = 40;
  const topC = 0xff5e7e; // Vibrant coral raspberry pink
  const midC = 0xffa834; // Warm honey amber orange
  const botC = 0xfff0b5; // Soft sunshine cream yellow

  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const c =
      t < 0.5 ? blend(topC, midC, t * 2) : blend(midC, botC, (t - 0.5) * 2);
    g.fillStyle(c, 1);
    g.fillRect(0, (height * i) / steps, width, height / steps + 1);
  }

  // 2. Soft Radial Spotlight Glow behind Playfield (Center Stage Light)
  const spotG = scene.add.graphics().setDepth(z.bgSpotlight);
  const spotRadius = Math.min(width, height) * 0.48;
  const spotRings = 10;
  for (let r = spotRings; r > 0; r--) {
    const currentR = (spotRadius * r) / spotRings;
    const alpha = (0.28 * (spotRings - r + 1)) / spotRings;
    spotG.fillStyle(0xffffff, alpha);
    spotG.fillCircle(width / 2, height * 0.52, currentR);
  }

  // 3. Ambient Floating Bokeh & Twinkling Stars in Background
  spawnAmbientBokeh(scene, width, height);

  // 4. Vibrant Tropical Meadow Turf Strip at the bottom
  const meadowH = 16;
  g.fillStyle(0x10b981, 1);
  g.fillRect(0, height - meadowH, width, meadowH);
  g.fillStyle(0x059669, 1);
  g.fillRect(0, height - meadowH + 4, width, meadowH - 4);
}

function spawnAmbientBokeh(scene: Phaser.Scene, w: number, h: number): void {
  const particleCount = 18;
  const colors = [0xffffff, 0xffe066, 0xffd166, 0xff99c8, 0x70d6ff];

  for (let i = 0; i < particleCount; i++) {
    const px = Math.random() * w;
    const py = Math.random() * h;
    const size = Math.random() * 9 + 4;
    const alpha = Math.random() * 0.38 + 0.15;
    const col = colors[Math.floor(Math.random() * colors.length)] ?? 0xffffff;

    const dot = scene.add.graphics().setDepth(z.bgParticles);
    dot.fillStyle(col, alpha);
    dot.fillCircle(0, 0, size);
    dot.setPosition(px, py);

    // Floating upward drift with sine sway
    scene.tweens.add({
      targets: dot,
      y: `-=${Math.random() * 140 + 90}`,
      x: `+=${(Math.random() - 0.5) * 70}`,
      alpha: { from: alpha, to: 0.04 },
      duration: Math.random() * 4500 + 3500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
      delay: Math.random() * 2000,
    });
  }

  // Add a few twinkling stars (✨)
  for (let j = 0; j < 6; j++) {
    const sx = Math.random() * (w - 60) + 30;
    const sy = Math.random() * (h * 0.4) + 20;
    const star = scene.add
      .text(sx, sy, "✨", { fontSize: "20px" })
      .setOrigin(0.5)
      .setDepth(z.bgParticles)
      .setAlpha(0.2);

    scene.tweens.add({
      targets: star,
      scale: { from: 0.6, to: 1.2 },
      alpha: { from: 0.15, to: 0.6 },
      angle: { from: -15, to: 15 },
      duration: Math.random() * 2000 + 1500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
      delay: Math.random() * 1500,
    });
  }
}

function blend(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 255,
    ag = (a >> 8) & 255,
    ab = a & 255;
  const br = (b >> 16) & 255,
    bg = (b >> 8) & 255,
    bb = b & 255;
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
  strokeColor = 0xe2e8f0,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  // Soft outer drop shadow
  g.fillStyle(0x000000, 0.2);
  g.fillRoundedRect(x - w / 2, y - h / 2 + 8, w, h, rad);

  // Frosted white glass body
  g.fillStyle(0xffffff, 0.96);
  g.fillRoundedRect(x - w / 2, y - h / 2, w, h, rad);

  // Inner subtle highlight
  g.lineStyle(2, 0xffffff, 0.9);
  g.strokeRoundedRect(x - w / 2 + 1, y - h / 2 + 1, w - 2, h - 2, rad);

  // Crisp border stroke
  g.lineStyle(2.5, strokeColor, 0.9);
  g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, rad);

  return g;
}

/**
 * Draw a 3D Toy-Style Embossed HUD Badge (Score / Powerup / Status)
 */
export function draw3DBadge(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  baseColor: number,
  bevelColor: number,
  rad = radius.md,
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y).setDepth(z.hud);
  const g = scene.add.graphics();
  const bevel = 6;

  // Drop shadow
  g.fillStyle(0x000000, 0.18);
  g.fillRoundedRect(-w / 2, -h / 2 + bevel + 3, w, h, rad);

  // Bottom 3D bevel
  g.fillStyle(bevelColor, 1);
  g.fillRoundedRect(-w / 2, -h / 2 + bevel, w, h, rad);

  // Main body
  g.fillStyle(baseColor, 1);
  g.fillRoundedRect(-w / 2, -h / 2, w, h - bevel, rad);

  // Top specular highlight sheen
  g.fillStyle(0xffffff, 0.35);
  g.fillRoundedRect(-w / 2 + 6, -h / 2 + 3, w - 12, (h - bevel) * 0.4, rad - 4);

  // Subtle border outline
  g.lineStyle(2, bevelColor, 0.85);
  g.strokeRoundedRect(-w / 2, -h / 2, w, h, rad);

  container.add(g);
  return container;
}

// --- Mute button -------------------------------------------------------------
let userMuted = false;
export function isUserMuted(): boolean {
  return userMuted;
}

export function applyMute(game: Phaser.Game, sdkAudioEnabled?: boolean): void {
  const enabled =
    sdkAudioEnabled !== undefined ? sdkAudioEnabled : ctx.isAudioEnabled();
  game.sound.mute = userMuted || !enabled;
}

function drawSpeakerIcon(g: Phaser.GameObjects.Graphics, on: boolean): void {
  g.clear();
  // 3D round bubble backdrop
  g.fillStyle(0x000000, 0.18);
  g.fillCircle(0, 4, 26);

  g.fillStyle(0xffffff, 0.98);
  g.fillCircle(0, 0, 26);
  g.lineStyle(2.5, 0xf59e0b, 1);
  g.strokeCircle(0, 0, 26);

  const body = on ? 0x475569 : 0x94a3b8;
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
    g.lineStyle(2.5, 0xf59e0b, 1);
    g.beginPath();
    g.arc(6, 0, 8, -Math.PI / 4, Math.PI / 4, false);
    g.strokePath();
    g.beginPath();
    g.arc(6, 0, 13, -Math.PI / 4, Math.PI / 4, false);
    g.strokePath();
  } else {
    g.lineStyle(3.5, 0xef4444, 1);
    g.beginPath();
    g.moveTo(-15, -15);
    g.lineTo(15, 15);
    g.strokePath();
  }
}

export function drawMuteButton(
  scene: Phaser.Scene,
): Phaser.GameObjects.Container {
  const { width } = scene.scale;
  const container = scene.add.container(width - 50, 50).setDepth(60);
  const icon = scene.add.graphics();
  const redraw = (): void => drawSpeakerIcon(icon, !userMuted);
  redraw();
  container.add(icon);

  const hit = scene.add
    .rectangle(0, 0, 70, 70, 0x000000, 0)
    .setInteractive({ useHandCursor: true });
  hit.setData("testid", "mute-btn");
  container.add(hit);

  hit.on("pointerdown", () => {
    userMuted = !userMuted;
    ctx.setAudioEnabled(!userMuted);
    applyMute(scene.game, !userMuted);
    redraw();
    scene.tweens.add({
      targets: container,
      scale: { from: 0.9, to: 1 },
      duration: dur.fast,
      ease: "Back.easeOut",
    });
  });
  return container;
}

// --- Leaderboard Button ------------------------------------------------------
export function drawLeaderboardButton(
  scene: Phaser.Scene,
  x = 50,
  y = 50,
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y).setDepth(60);
  const iconBg = scene.add.graphics();
  // 3D round bubble backdrop
  iconBg.fillStyle(0x000000, 0.18);
  iconBg.fillCircle(0, 4, 26);

  iconBg.fillStyle(0xffffff, 0.98);
  iconBg.fillCircle(0, 0, 26);
  iconBg.lineStyle(2.5, 0xf59e0b, 1);
  iconBg.strokeCircle(0, 0, 26);

  const trophyText = scene.add
    .text(0, 0, "🏆", { fontSize: "24px" })
    .setOrigin(0.5);
  container.add([iconBg, trophyText]);

  const hit = scene.add
    .rectangle(0, 0, 70, 70, 0x000000, 0)
    .setInteractive({ useHandCursor: true });
  hit.setData("testid", "leaderboard-btn");
  container.add(hit);

  hit.on("pointerdown", async () => {
    scene.tweens.add({
      targets: container,
      scale: { from: 0.88, to: 1 },
      duration: dur.fast,
      ease: "Back.easeOut",
    });
    const { LeaderboardModal } = await import("./ui/LeaderboardModal");
    new LeaderboardModal(scene);
  });

  return container;
}
