// ============================================================================
// UI Component Engine M2 "Neon Sort: Galaxy Pour" — Studio-Grade Visuals
// High-End 3D Candy & Crystal Glass Aesthetics (Playgama / Poki Top-Tier Standard)
// Zero-Garbage, 60 FPS Locked Canvas/WebGL rendering.
// ============================================================================
import Phaser from 'phaser';
import {
  color,
  type,
  sp,
  radius,
  shadow,
  z,
  dur,
  glow,
  fx,
  fontStyle,
  studioFontStyle,
  toColor,
  lighten,
  darken,
  liquidPalette,
} from './tokens';
import { synthAudio } from './audio';

// ============================================================================
// 1. COLOR CACHE (O(1) lookups)
// ============================================================================
interface CachedColor {
  base: number;
  bright: number;
  dark: number;
  highlight: number;
}
const colorCache = new Map<string, CachedColor>();

export function getCachedLiquidColor(hex: string): CachedColor {
  let cached = colorCache.get(hex);
  if (!cached) {
    const base = toColor(hex);
    const bright = toColor(lighten(hex, 0.38));
    const highlight = toColor(lighten(hex, 0.65));
    const dark = toColor(darken(hex, 0.35));
    cached = { base, bright, dark, highlight };
    colorCache.set(hex, cached);
  }
  return cached;
}

// ============================================================================
// 2. NỀN VŨ TRỤ DEEP SPACE GALAXY HD (Nebula + Twinkling Stars)
// ============================================================================
export interface GalaxyBgObjects {
  g: Phaser.GameObjects.Graphics;
  bgImage: Phaser.GameObjects.Image | null;
  starsG?: Phaser.GameObjects.Graphics;
}

export function drawGalaxyBg(scene: Phaser.Scene): GalaxyBgObjects {
  const { width, height } = scene.scale;
  const g = scene.add.graphics().setDepth(z.bg);

  // 1. Nền deep space gradient (#0D0824 -> #060410)
  g.fillGradientStyle(
    toColor('#0D0824'),
    toColor('#0D0824'),
    toColor('#060410'),
    toColor('#060410'),
    1,
  );
  g.fillRect(0, 0, width, height);

  // 2. Ảnh nền Deep Cosmic Nebula HD (nếu có asset)
  let bgImage: Phaser.GameObjects.Image | null = null;
  const bgTextureKey = scene.textures.exists('bg_space') ? 'bg_space' : null;

  if (bgTextureKey) {
    bgImage = scene.add.image(width / 2, height / 2, bgTextureKey)
      .setDepth(z.bg + 0.5)
      .setAlpha(0.85);

    const scaleX = width / bgImage.width;
    const scaleY = height / bgImage.height;
    const coverScale = Math.max(scaleX, scaleY);
    bgImage.setScale(coverScale);
  }

  // 3. Ambient Stardust Twinkles (vector stars)
  const starsG = scene.add.graphics().setDepth(z.bg + 0.8).setBlendMode(Phaser.BlendModes.ADD);
  const starCount = Math.min(45, Math.floor((width * height) / 18000));
  for (let i = 0; i < starCount; i++) {
    const sx = ((i * 137.5 + 43) % width);
    const sy = ((i * 241.7 + 79) % height);
    const r = (i % 5 === 0) ? 2.2 : (i % 2 === 0 ? 1.4 : 0.9);
    const starCol = (i % 3 === 0) ? toColor(color.accent) : (i % 4 === 0 ? toColor(color.primary) : 0xFFFFFF);
    starsG.fillStyle(starCol, 0.45 + (i % 3) * 0.2);
    starsG.fillCircle(sx, sy, r);
  }

  // 4. Soft Center Vignette Overlay
  g.fillStyle(toColor('#060410'), 0.38);
  g.fillRect(0, 0, width, height);

  return { g, bgImage, starsG };
}

// ============================================================================
// 3. ĐỒ HỌA ỐNG NGHIỆM 3D CRYSTAL GLASS (Trong suốt & Sắc nét 100%)
// ============================================================================
export interface TubeViews {
  container: Phaser.GameObjects.Container;
  glass: Phaser.GameObjects.Graphics;
  liquidG: Phaser.GameObjects.Graphics;
  glowRing: Phaser.GameObjects.Graphics;
  ambientGlow: Phaser.GameObjects.Graphics;
  completionFx: Phaser.GameObjects.Container;
  ghostG: Phaser.GameObjects.Graphics;
  frostG: Phaser.GameObjects.Graphics;
  sealRing: Phaser.GameObjects.Graphics;
  shimmerG: Phaser.GameObjects.Graphics;
  glassImg: Phaser.GameObjects.Image | null;
  surfaceImg: Phaser.GameObjects.Image | null;
  sealed: boolean;
  width: number;
  height: number;
  capacity: number;
  currentContent: string[];
}

export function drawTube(
  scene: Phaser.Scene,
  tubeW: number,
  tubeH: number,
  capacity: number,
): TubeViews {
  const container = scene.add.container(0, 0).setDepth(z.actor);

  // 1. Ambient glow quanh ống (sau lưng ống)
  const ambientGlow = scene.add.graphics().setDepth(z.actor - 2).setBlendMode(Phaser.BlendModes.ADD);
  container.add(ambientGlow);

  // 2. Selection glow halo (Khớp 100% dáng ống nghiệm U-Shape)
  const glowRing = scene.add.graphics().setDepth(z.actor - 1).setBlendMode(Phaser.BlendModes.ADD);
  const ringPad = 4;
  const gW = tubeW + ringPad * 2;
  const gH = tubeH + ringPad * 2;
  const gCornerR = gW * 0.44;
  glowRing.lineStyle(3, toColor(color.accent), 0.95);
  glowRing.strokeRoundedRect(-gW / 2, -gH / 2, gW, gH, { tl: 4, tr: 4, bl: gCornerR, br: gCornerR });
  glowRing.setAlpha(0);
  container.add(glowRing);

  // 3. Lớp chất lỏng (rực rỡ, độ tương phản cao)
  const liquidG = scene.add.graphics().setDepth(z.actor);
  container.add(liquidG);

  // 4. Ghost preview
  const ghostG = scene.add.graphics().setDepth(z.actor + 0.5);
  container.add(ghostG);

  // 5. Shimmer khi seal
  const shimmerG = scene.add.graphics().setDepth(z.actor + 1).setBlendMode(Phaser.BlendModes.ADD);
  shimmerG.setAlpha(0);
  container.add(shimmerG);

  // 6. Frost kính khi seal
  const frostG = scene.add.graphics().setDepth(z.actor + 1.5);
  frostG.setAlpha(0);
  container.add(frostG);

  // 7. Thân ống thủy tinh 3D Crystal Glass (Clear & Crisp)
  const glass = scene.add.graphics().setDepth(z.actor + 2);
  redrawGlassBody(glass, tubeW, tubeH);
  container.add(glass);

  // 8. Vòng seal neon
  const sealRing = scene.add.graphics().setDepth(z.actor + 3).setBlendMode(Phaser.BlendModes.ADD);
  sealRing.setAlpha(0);
  container.add(sealRing);

  // 9. Container hiệu ứng
  const completionFx = scene.add.container(0, 0).setDepth(z.actor + 4);
  container.add(completionFx);

  return {
    container,
    glass,
    liquidG,
    glowRing,
    ambientGlow,
    completionFx,
    ghostG,
    frostG,
    sealRing,
    shimmerG,
    glassImg: null,
    surfaceImg: null,
    sealed: false,
    width: tubeW,
    height: tubeH,
    capacity,
    currentContent: [],
  };
}

function redrawGlassBody(glass: Phaser.GameObjects.Graphics, tubeW: number, tubeH: number) {
  glass.clear();
  const halfW = tubeW / 2;
  const halfH = tubeH / 2;
  const cornerR = tubeW * 0.44;

  // 1. Viền kính pha lê trắng sắc nét 100% trong trẻo (Zero blurry shadow)
  glass.lineStyle(2, 0xFFFFFF, 0.9);
  glass.strokeRoundedRect(-halfW, -halfH, tubeW, tubeH, { tl: 4, tr: 4, bl: cornerR, br: cornerR });

  // 2. Miệng ống loe 3D (Crystal Lip)
  const lipH = 5;
  const lipOverhang = 3.5;
  glass.fillStyle(0xFFFFFF, 0.35);
  glass.fillRoundedRect(-halfW - lipOverhang, -halfH - 2.5, tubeW + lipOverhang * 2, lipH, 2.5);
  glass.lineStyle(1.5, 0xFFFFFF, 0.95);
  glass.strokeRoundedRect(-halfW - lipOverhang, -halfH - 2.5, tubeW + lipOverhang * 2, lipH, 2.5);

  // 3. Dải phản chiếu ánh sáng mảnh dọc sườn trái
  glass.fillStyle(0xFFFFFF, 0.45);
  glass.fillRoundedRect(-halfW + 3, -halfH + 6, 2, tubeH - 22, 1);

  // 4. Khúc xạ đáy cong uốn lượn
  glass.lineStyle(1.5, 0xFFFFFF, 0.5);
  glass.beginPath();
  glass.arc(0, halfH - cornerR, cornerR - 3, 0.3, Math.PI - 0.3, false);
  glass.strokePath();
}

// ============================================================================
// 4. RENDER CHẤT LỎNG 3D VIBRANT & SẮC NÉT (Không bị mờ/đục)
// ============================================================================
export function renderLiquid(views: TubeViews, contentIn: string[] | undefined | null): void {
  const content = contentIn ?? [];
  views.currentContent = content.slice();
  const { liquidG, ambientGlow, width: tubeW, height: tubeH, capacity } = views;
  liquidG.clear();
  ambientGlow.clear();

  const halfW = tubeW / 2;
  const halfH = tubeH / 2;
  const innerPad = 2.5;
  const liquidW = tubeW - innerPad * 2;
  const usableH = tubeH - innerPad * 2 - 4;
  const layerH = usableH / capacity;
  const cornerR = (tubeW * 0.44) - innerPad;

  if (content.length === 0) return;

  const yBase = halfH - innerPad;

  for (let i = 0; i < content.length; i++) {
    const colInfo = getCachedLiquidColor(content[i]);
    const isTop = (i === content.length - 1);
    const isBottom = (i === 0);

    const layerBotY = yBase - i * layerH;
    const layerTopY = layerBotY - layerH;

    // 1. Thân màu chính 100% rực rỡ và đậm đà (Solid Vibrant Liquid)
    liquidG.fillStyle(colInfo.base, 1.0);
    if (isBottom) {
      liquidG.fillRoundedRect(-halfW + innerPad, layerTopY, liquidW, layerH, { tl: 0, tr: 0, bl: cornerR, br: cornerR });
    } else {
      liquidG.fillRect(-halfW + innerPad, layerTopY, liquidW, layerH);
    }

    // 2. 3D Cylindrical Highlight (Dải sáng thanh mảnh bên trái — dừng trước khúc cua đáy)
    liquidG.fillStyle(colInfo.bright, 0.24);
    if (isBottom) {
      const hlH = Math.max(2, layerH - cornerR * 0.7);
      liquidG.fillRect(-halfW + innerPad + liquidW * 0.10, layerTopY, liquidW * 0.20, hlH);
    } else {
      liquidG.fillRect(-halfW + innerPad + liquidW * 0.10, layerTopY, liquidW * 0.20, layerH);
    }

    // 3. 3D Cylindrical Shadow (Bóng sườn phải — dừng trước khúc cua đáy)
    liquidG.fillStyle(colInfo.dark, 0.28);
    if (isBottom) {
      const shH = Math.max(2, layerH - cornerR * 0.7);
      liquidG.fillRect(halfW - innerPad - liquidW * 0.15, layerTopY, liquidW * 0.15, shH);
    } else {
      liquidG.fillRect(halfW - innerPad - liquidW * 0.15, layerTopY, liquidW * 0.15, layerH);
    }

    // 4. Mặt thoáng chất lỏng (Meniscus 3D) - chỉ vẽ ở đỉnh lớp trên cùng
    if (isTop) {
      liquidG.fillStyle(colInfo.bright, 0.95);
      liquidG.fillEllipse(0, layerTopY, liquidW * 0.92, Math.min(6, layerH * 0.22));

      liquidG.fillStyle(0xFFFFFF, 0.85);
      liquidG.fillCircle(-liquidW * 0.20, layerTopY, 2);
    }

    // 5. Đường ngăn phân tầng màu sắc nét
    if (i < content.length - 1) {
      liquidG.lineStyle(2, colInfo.dark, 1.0);
      liquidG.beginPath();
      liquidG.moveTo(-halfW + innerPad, layerTopY);
      liquidG.lineTo(halfW - innerPad, layerTopY);
      liquidG.strokePath();

      liquidG.lineStyle(1, 0xFFFFFF, 0.25);
      liquidG.beginPath();
      liquidG.moveTo(-halfW + innerPad + 4, layerTopY + 1);
      liquidG.lineTo(halfW - innerPad - 4, layerTopY + 1);
      liquidG.strokePath();
    }
  }
}

// ============================================================================
// 5. POUR TRANSITION — Rót chất lỏng mượt mà
// ============================================================================
export function renderPourTransition(
  views: TubeViews,
  baseContent: string[],
  transitionColor: string,
  ratio: number,
  count = 1,
): void {
  const { liquidG, width: tubeW, height: tubeH, capacity } = views;
  liquidG.clear();

  const halfW = tubeW / 2;
  const halfH = tubeH / 2;
  const innerPad = 2.5;
  const liquidW = tubeW - innerPad * 2;
  const usableH = tubeH - innerPad * 2 - 4;
  const layerH = usableH / capacity;
  const cornerR = (tubeW * 0.44) - innerPad;
  const yBase = halfH - innerPad;

  // 1. Phần tĩnh
  for (let i = 0; i < baseContent.length; i++) {
    const colInfo = getCachedLiquidColor(baseContent[i]);
    const isBottom = (i === 0);
    const layerTopY = yBase - i * layerH - layerH;

    liquidG.fillStyle(colInfo.base, 1.0);
    if (isBottom) {
      liquidG.fillRoundedRect(-halfW + innerPad, layerTopY, liquidW, layerH, { tl: 0, tr: 0, bl: cornerR, br: cornerR });
    } else {
      liquidG.fillRect(-halfW + innerPad, layerTopY, liquidW, layerH);
    }
    liquidG.fillStyle(colInfo.bright, 0.24);
    if (isBottom) {
      const hlH = Math.max(0, layerH - cornerR * 0.7);
      if (hlH > 0) liquidG.fillRect(-halfW + innerPad + liquidW * 0.10, layerTopY, liquidW * 0.20, hlH);
    } else {
      liquidG.fillRect(-halfW + innerPad + liquidW * 0.10, layerTopY, liquidW * 0.20, layerH);
    }
  }

  // 2. Phần đang rót/dâng
  const maxLayers = Math.max(0, Math.min(count, capacity - baseContent.length));
  const movingH = Math.max(0, Math.min(maxLayers * layerH, maxLayers * layerH * ratio));
  if (movingH > 0.4) {
    const colInfo = getCachedLiquidColor(transitionColor);
    const baseIdx = baseContent.length;
    const isBottom = (baseIdx === 0);
    const blockBotY = yBase - baseIdx * layerH;
    const blockTopY = blockBotY - movingH;

    liquidG.fillStyle(colInfo.base, 1.0);
    if (isBottom) {
      liquidG.fillRoundedRect(-halfW + innerPad, blockTopY, liquidW, movingH, { tl: 0, tr: 0, bl: cornerR, br: cornerR });
    } else {
      liquidG.fillRect(-halfW + innerPad, blockTopY, liquidW, movingH);
    }

    liquidG.fillStyle(colInfo.bright, 0.24);
    if (isBottom) {
      const hlH = Math.max(0, movingH - cornerR * 0.7);
      if (hlH > 0) liquidG.fillRect(-halfW + innerPad + liquidW * 0.10, blockTopY, liquidW * 0.20, hlH);
    } else {
      liquidG.fillRect(-halfW + innerPad + liquidW * 0.10, blockTopY, liquidW * 0.20, movingH);
    }

    // Meniscus đang chuyển động
    liquidG.fillStyle(colInfo.bright, 0.95);
    liquidG.fillEllipse(0, blockTopY, liquidW * 0.92, Math.min(6, layerH * 0.22));
    liquidG.fillStyle(0xFFFFFF, 0.85);
    liquidG.fillCircle(-liquidW * 0.20, blockTopY, 2);
  }
}

// ============================================================================
// 6. GHOST PREVIEW (Bóng mờ xem trước nước rót)
// ============================================================================
export function renderGhostSegments(
  views: TubeViews,
  contentLength: number,
  colorHex: string,
  count: number,
): void {
  const { ghostG, width: tubeW, height: tubeH, capacity } = views;
  ghostG.clear();
  if (count <= 0) return;

  const halfW = tubeW / 2;
  const halfH = tubeH / 2;
  const innerPad = 2.5;
  const liquidW = tubeW - innerPad * 2;
  const usableH = tubeH - innerPad * 2 - 4;
  const layerH = usableH / capacity;
  const cornerR = (tubeW * 0.44) - innerPad;
  const yBase = halfH - innerPad;
  const colInfo = getCachedLiquidColor(colorHex);
  const n = Math.min(count, capacity - contentLength);

  for (let k = 0; k < n; k++) {
    const idx = contentLength + k;
    const layerTopY = yBase - idx * layerH - layerH;
    const isBottom = (idx === 0);

    ghostG.fillStyle(colInfo.base, 0.36);
    if (isBottom) {
      ghostG.fillRoundedRect(-halfW + innerPad, layerTopY, liquidW, layerH, { tl: 0, tr: 0, bl: cornerR, br: cornerR });
      ghostG.lineStyle(1.5, colInfo.bright, 0.75);
      ghostG.strokeRoundedRect(-halfW + innerPad, layerTopY, liquidW, layerH, { tl: 0, tr: 0, bl: cornerR, br: cornerR });
    } else {
      ghostG.fillRect(-halfW + innerPad, layerTopY, liquidW, layerH);
      ghostG.lineStyle(1.5, colInfo.bright, 0.75);
      ghostG.strokeRect(-halfW + innerPad, layerTopY, liquidW, layerH);
    }
  }

  const topY = yBase - (contentLength + n) * layerH;
  ghostG.lineStyle(2.5, toColor(color.accent), 0.95);
  ghostG.beginPath();
  ghostG.moveTo(-halfW + innerPad, topY);
  ghostG.lineTo(halfW - innerPad, topY);
  ghostG.strokePath();
}

export function showGhostPreview(
  scene: Phaser.Scene,
  views: TubeViews,
  contentLength: number,
  colorHex: string,
  count: number,
): void {
  scene.tweens.killTweensOf(views.ghostG);
  renderGhostSegments(views, contentLength, colorHex, count);
  views.ghostG.setAlpha(fx.ghostMin);
  scene.tweens.add({
    targets: views.ghostG,
    alpha: fx.ghostMax,
    duration: 600,
    yoyo: true,
    repeat: -1,
    ease: 'sine.inout',
  });
}

export function clearGhostPreview(scene: Phaser.Scene, views: TubeViews): void {
  scene.tweens.killTweensOf(views.ghostG);
  views.ghostG.clear();
  views.ghostG.setAlpha(1);
}

// ============================================================================
// 7. SEAL MOMENT (Đóng băng pha lê + Khóa nắp neon + Shimmer)
// ============================================================================
function drawFrost(g: Phaser.GameObjects.Graphics, tubeW: number, tubeH: number): void {
  g.clear();
  const halfW = tubeW / 2;
  const halfH = tubeH / 2;
  const cornerR = tubeW * 0.44;

  g.fillStyle(0xFFFFFF, fx.frostAlpha);
  g.fillRoundedRect(-halfW + 1, -halfH + 1, tubeW - 2, tubeH - 2, { tl: 4, tr: 4, bl: cornerR, br: cornerR });

  // Hoa văn tinh thể băng tuyết pha lê
  g.fillStyle(0xFFFFFF, 0.22);
  const bands = 5;
  for (let i = 0; i < bands; i++) {
    const y = -halfH + 12 + (i * (tubeH - 28)) / bands;
    const w = tubeW * (i % 2 === 0 ? 0.55 : 0.38);
    const x = i % 2 === 0 ? -tubeW * 0.24 : tubeW * 0.05;
    g.fillRoundedRect(x, y, w, 2.5, 1.2);
  }
}

function drawSealRing(g: Phaser.GameObjects.Graphics, tubeW: number, tubeH: number, hex: string): void {
  g.clear();
  const pad = 3;
  const w = tubeW + pad * 2;
  const h = tubeH + pad * 2;
  const cornerR = w * 0.44;
  const colInfo = getCachedLiquidColor(hex);

  // 1. Vòng viền phát sáng ôm khít 100% hình dáng ống nghiệm U-Shape
  g.lineStyle(4, colInfo.base, 0.45);
  g.strokeRoundedRect(-w / 2, -h / 2, w, h, { tl: 4, tr: 4, bl: cornerR, br: cornerR });
  g.lineStyle(2, 0xFFFFFF, 0.95);
  g.strokeRoundedRect(-w / 2, -h / 2, w, h, { tl: 4, tr: 4, bl: cornerR, br: cornerR });

  // 2. Vành miệng ống phát sáng neon tinh tế (ôm đúng miệng ống)
  const lipW = tubeW + 7;
  g.fillStyle(colInfo.bright, 0.9);
  g.fillRoundedRect(-lipW / 2, -tubeH / 2 - 2.5, lipW, 5, 2.5);
  g.lineStyle(1.5, 0xFFFFFF, 1.0);
  g.strokeRoundedRect(-lipW / 2, -tubeH / 2 - 2.5, lipW, 5, 2.5);
}

function drawShimmerBand(g: Phaser.GameObjects.Graphics, tubeW: number, hex: string): void {
  g.clear();
  const colInfo = getCachedLiquidColor(hex);
  const w = tubeW - 8;
  g.fillStyle(colInfo.bright, 0.16);
  g.fillRoundedRect(-w / 2, -6, w, 12, 6);
  g.fillStyle(0xFFFFFF, 0.12);
  g.fillRoundedRect(-w / 2, -2, w, 4, 2);
}

export function sealTube(
  scene: Phaser.Scene,
  views: TubeViews,
  colorHex: string,
  instant = false,
): void {
  views.sealed = true;
  const { width: tubeW, height: tubeH } = views;

  drawFrost(views.frostG, tubeW, tubeH);
  drawSealRing(views.sealRing, tubeW, tubeH, colorHex);
  drawShimmerBand(views.shimmerG, tubeW, colorHex);

  const shimmerTop = -tubeH / 2 + 14;
  const shimmerBot = tubeH / 2 - 14;

  scene.tweens.killTweensOf(views.frostG);
  scene.tweens.killTweensOf(views.sealRing);
  scene.tweens.killTweensOf(views.shimmerG);

  if (instant) {
    views.frostG.setAlpha(1);
    views.sealRing.setAlpha(fx.sealRingIdleAlpha).setScale(1);
  } else {
    views.frostG.setAlpha(0);
    scene.tweens.add({ targets: views.frostG, alpha: 1, duration: dur.slow, ease: 'quad.out' });

    views.sealRing.setAlpha(0).setScale(1.35);
    scene.tweens.add({
      targets: views.sealRing,
      scale: 1,
      alpha: 1,
      duration: dur.pop,
      ease: 'back.out',
      onComplete: () => {
        scene.tweens.add({ targets: views.sealRing, alpha: fx.sealRingIdleAlpha, duration: dur.base, ease: 'quad.out' });
      },
    });
  }

  views.shimmerG.setAlpha(0.9);
  views.shimmerG.y = shimmerBot;
  scene.tweens.add({
    targets: views.shimmerG,
    y: shimmerTop,
    duration: fx.shimmerLoopMs,
    ease: 'sine.inout',
    yoyo: true,
    repeat: -1,
    delay: instant ? 0 : dur.pop,
  });
}

export function unsealTube(scene: Phaser.Scene, views: TubeViews): void {
  views.sealed = false;
  scene.tweens.killTweensOf(views.frostG);
  scene.tweens.killTweensOf(views.sealRing);
  scene.tweens.killTweensOf(views.shimmerG);
  views.frostG.clear();
  views.frostG.setAlpha(0);
  views.sealRing.clear();
  views.sealRing.setAlpha(0).setScale(1);
  views.shimmerG.clear();
  views.shimmerG.setAlpha(0);
  views.shimmerG.y = 0;
  views.completionFx.removeAll(true);
}

// ============================================================================
// 8. DÒNG CHẢY RÓT NƯỚC VÀ HIỆU ỨNG TIA NƯỚC
// ============================================================================
export function drawPourStream(
  graphics: Phaser.GameObjects.Graphics,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  colorHex: string,
  thickness = 6,
): void {
  graphics.clear();
  const colInfo = getCachedLiquidColor(colorHex);

  const midX = (fromX + toX) / 2;
  const arcH = Math.max(22, Math.abs(toX - fromX) * 0.22);
  const midY = Math.min(fromY, toY) - arcH;

  // 1. Quầng sáng Neon Aura ngoài cùng
  graphics.lineStyle(thickness + 6, colInfo.base, 0.35);
  graphics.beginPath();
  graphics.moveTo(fromX, fromY);
  graphics.lineTo(midX, midY);
  graphics.lineTo(toX, toY);
  graphics.strokePath();

  // 2. Tia nước chính
  graphics.lineStyle(thickness, colInfo.base, 0.98);
  graphics.beginPath();
  graphics.moveTo(fromX, fromY);
  graphics.lineTo(midX, midY);
  graphics.lineTo(toX, toY);
  graphics.strokePath();

  // 3. Tia sáng lõi trắng trong trẻo
  graphics.lineStyle(Math.max(2, thickness * 0.45), colInfo.bright, 0.95);
  graphics.beginPath();
  graphics.moveTo(fromX, fromY);
  graphics.lineTo(midX, midY);
  graphics.lineTo(toX, toY);
  graphics.strokePath();
}

// ============================================================================
// 9. STARDUST CELEBRATION & NEON BURSTS
// ============================================================================
export function spawnNeonBurst(
  scene: Phaser.Scene,
  x: number,
  y: number,
  palette: readonly string[],
  count = 32,
  spread = 220,
  depth: number = z.tutorial,
): void {
  for (let i = 0; i < count; i++) {
    const hex = palette[Math.floor(Math.random() * palette.length)];
    const size = Phaser.Math.Between(4, 8);
    const isStar = i % 3 === 0;

    const p = isStar
      ? scene.add.rectangle(x, y, size, size * 2.2, toColor(hex), 1)
      : scene.add.circle(x, y, size / 2, toColor(hex), 1);
    p.setDepth(depth).setBlendMode(Phaser.BlendModes.ADD);

    const angle = Math.random() * Math.PI * 2;
    const dist = Phaser.Math.Between(spread * 0.3, spread);
    scene.tweens.add({
      targets: p,
      x: x + Math.cos(angle) * dist,
      y: y + Math.sin(angle) * dist + Phaser.Math.Between(30, 100),
      alpha: 0,
      angle: Phaser.Math.Between(-360, 360),
      scale: 0.3,
      duration: Phaser.Math.Between(550, 1050),
      ease: 'cubic.out',
      onComplete: () => p.destroy(),
    });
  }
}

// ============================================================================
// 10. STUDIO-GRADE CHUNKY 3D CANDY BUTTON (Playgama / Poki Standard)
// ============================================================================
export interface ButtonOptions {
  width?: number;
  height?: number;
  variant?: 'primary' | 'cyan' | 'emerald' | 'amber' | 'purple' | 'ghost' | 'glass';
  testid?: string;
  textType?: { size: string; weight: string; lh: number };
  fontSize?: number;
  icon?: 'undo' | 'restart' | 'hint' | null;
  glowColor?: string;
  enableShimmer?: boolean;
}

export function drawButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  opts: ButtonOptions = {},
): { container: Phaser.GameObjects.Container; textObj: Phaser.GameObjects.Text } {
  const width = opts.width ?? 260;
  const height = opts.height ?? 68;
  const variant = opts.variant ?? 'primary';
  const useIcon = opts.icon === 'undo' || opts.icon === 'restart' || opts.icon === 'hint';
  const bevel = 8; // 3D Extrusion depth
  const rad = Math.min(height / 2, radius.lg);

  const container = scene.add.container(x, y).setSize(width, height).setDepth(z.panel);
  const g = scene.add.graphics();

  // Bảng màu 3D Candy theo variant
  let fillColor = 0xB967FF;     // Neon Purple/Magenta
  let darkColor = 0x6E1FB8;     // Deep 3D Shadow Base
  let strokeColor = '#430878';
  let textColor = '#FFFFFF';

  if (variant === 'primary') {
    fillColor = 0xB967FF;
    darkColor = 0x6E1FB8;
    strokeColor = '#430878';
  } else if (variant === 'cyan') {
    fillColor = 0x00E5FF;
    darkColor = 0x0088A8;
    strokeColor = '#004A5E';
  } else if (variant === 'emerald') {
    fillColor = 0x10B981;
    darkColor = 0x047857;
    strokeColor = '#064E3B';
  } else if (variant === 'amber') {
    fillColor = 0xF59E0B;
    darkColor = 0xB45309;
    strokeColor = '#78350F';
  } else if (variant === 'ghost') {
    fillColor = 0x1B143D;
    darkColor = 0x0F0A24;
    strokeColor = '#3A2E70';
    textColor = '#FFFFFF';
  } else {
    fillColor = 0x221B47;
    darkColor = 0x120D2C;
    strokeColor = '#00E5FF';
  }

  // 1. Soft Ambient Drop Shadow dưới đáy nút
  g.fillStyle(0x000000, 0.35);
  g.fillRoundedRect(-width / 2, -height / 2 + bevel + 3, width, height - bevel, rad);

  // 2. 3D Bottom Bevel (Chunky Extruded Base)
  g.fillStyle(darkColor, 1);
  g.fillRoundedRect(-width / 2, -height / 2 + bevel, width, height - bevel, rad);

  // 3. Top Face of Button
  g.fillStyle(fillColor, 1);
  g.fillRoundedRect(-width / 2, -height / 2, width, height - bevel, rad);

  // 4. Subtle Top Rim Sheen (Sạch sẽ, không bị viền hộp xấu)
  if (variant !== 'ghost') {
    g.lineStyle(1.5, 0xFFFFFF, 0.35);
    g.strokeRoundedRect(-width / 2 + 1, -height / 2 + 1, width - 2, height - bevel - 2, rad - 1);
  } else {
    g.lineStyle(2, toColor(color.primary), 0.85);
    g.strokeRoundedRect(-width / 2, -height / 2, width, height - bevel, rad);
  }

  container.add(g);

  // 5. Diagonal Shimmer Ribbon Sweep (nếu bật shimmer)
  if (variant !== 'ghost' && opts.enableShimmer !== false) {
    const shimmer = scene.add.graphics();
    shimmer.fillStyle(0xFFFFFF, 0.3);
    shimmer.beginPath();
    shimmer.moveTo(-20, -height / 2);
    shimmer.lineTo(12, -height / 2);
    shimmer.lineTo(-4, height / 2 - bevel);
    shimmer.lineTo(-36, height / 2 - bevel);
    shimmer.closePath();
    shimmer.fillPath();

    const maskG = scene.make.graphics();
    maskG.setVisible(false);
    maskG.fillStyle(0xFFFFFF, 1);
    maskG.fillRoundedRect(x - width / 2, y - height / 2, width, height - bevel, rad);
    const mask = maskG.createGeometryMask();
    shimmer.setMask(mask);
    container.add(shimmer);

    container.on('destroy', () => {
      maskG.destroy();
      mask.destroy();
    });

    shimmer.setX(-width / 2 - 35);
    scene.tweens.add({
      targets: shimmer,
      x: width / 2 + 45,
      duration: 800,
      repeat: -1,
      repeatDelay: 2800,
      ease: 'cubic.inout',
    });
  }

  // 6. Text / Icon Label
  const parsedSize = opts.fontSize
    ? opts.fontSize
    : (opts.textType ? parseInt(opts.textType.size, 10) : 26);
  const fStyle = studioFontStyle(parsedSize, textColor, '800', strokeColor, 5);
  const t = scene.add.text(0, -bevel / 2, useIcon ? '' : text, fStyle).setOrigin(0.5);
  t.setShadow(0, 2.5, 'rgba(0,0,0,0.5)', 3, false, true);

  // Auto-fit label width
  const maxW = width - 28;
  if (t.width > maxW) t.setScale(maxW / t.width);
  container.add(t);

  let iconG: Phaser.GameObjects.Graphics | null = null;
  if (useIcon && opts.icon) {
    const iconColor = variant === 'primary' ? 0xFFFFFF : toColor(color.accent);
    iconG = drawToolbarIcon(scene, opts.icon, iconColor, Math.min(30, height - 26));
    iconG.setPosition(0, -bevel / 2);
    container.add(iconG);
  }

  if (opts.testid) {
    g.setData('testid', opts.testid);
    t.setData('testid', opts.testid);
    container.setData('testid', opts.testid);
    if (iconG) iconG.setData('testid', opts.testid);
  }

  // 7. Tactile Spring Press Physics
  container.setInteractive({ useHandCursor: true });
  container.on('pointerover', () => {
    scene.tweens.killTweensOf(container);
    scene.tweens.add({ targets: container, scaleX: 1.04, scaleY: 1.04, duration: dur.hover, ease: 'quad.out' });
  });
  container.on('pointerout', () => {
    scene.tweens.killTweensOf(container);
    scene.tweens.add({ targets: container, scaleX: 1.0, scaleY: 1.0, y, duration: dur.hover, ease: 'quad.out' });
  });
  container.on('pointerdown', () => {
    synthAudio.playClick();
    scene.tweens.killTweensOf(container);
    scene.tweens.add({
      targets: container,
      scaleX: 0.93,
      scaleY: 0.93,
      y: y + bevel * 0.5,
      duration: 65,
      yoyo: true,
      ease: 'quad.inout',
    });
  });
  container.on('pointerup', () => {
    scene.tweens.killTweensOf(container);
    scene.tweens.add({ targets: container, scaleX: 1.04, scaleY: 1.04, y, duration: dur.hover, ease: 'quad.out' });
  });

  return { container, textObj: t };
}

// ============================================================================
// 11. HUD CAPSULE / BADGES (Glassmorphism Studio Standard)
// ============================================================================
export function drawHudCapsule(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  borderColorHex: string = color.primary,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics().setDepth(z.hud);
  const r = height / 2;

  // Đổ bóng dưới
  g.fillStyle(0x000000, 0.45);
  g.fillRoundedRect(x - width / 2, y - height / 2 + 4, width, height, r);

  // Nền kính tối sang trọng
  g.fillStyle(toColor('#0E0A28'), 0.92);
  g.fillRoundedRect(x - width / 2, y - height / 2, width, height, r);

  // Viền neon phát sáng
  g.lineStyle(2.2, toColor(borderColorHex), 0.95);
  g.strokeRoundedRect(x - width / 2, y - height / 2, width, height, r);

  return g;
}

// ============================================================================
// 12. VECTOR ICONS (Toolbar & HUD)
// ============================================================================
function drawArcArrow(
  g: Phaser.GameObjects.Graphics,
  r: number,
  startAngle: number,
  endAngle: number,
  anticlockwise: boolean,
  col: number,
  lineWidth: number,
  arrowAt: 'start' | 'end',
  ah: number,
  aw: number,
): void {
  let sweep = endAngle - startAngle;
  if (!anticlockwise) {
    if (sweep <= 0) sweep += Math.PI * 2;
  } else {
    if (sweep >= 0) sweep -= Math.PI * 2;
  }
  const segs = 24;
  g.lineStyle(lineWidth, col, 1);
  g.beginPath();
  for (let i = 0; i <= segs; i++) {
    const a = startAngle + sweep * (i / segs);
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.strokePath();

  const ang = arrowAt === 'start' ? startAngle : endAngle;
  const px = Math.cos(ang) * r;
  const py = Math.sin(ang) * r;
  const dir = anticlockwise ? -1 : 1;
  const tdx = -Math.sin(ang) * dir;
  const tdy = Math.cos(ang) * dir;
  const tipx = px;
  const tipy = py;
  const bcx = px - tdx * ah;
  const bcy = py - tdy * ah;
  const nx = -tdy;
  const ny = tdx;
  g.fillStyle(col, 1);
  g.fillTriangle(tipx, tipy, bcx + nx * aw, bcy + ny * aw, bcx - nx * aw, bcy - ny * aw);
}

export function drawToolbarIcon(
  scene: Phaser.Scene,
  kind: 'undo' | 'restart' | 'hint',
  col: number,
  size = 30,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  const r = size * 0.42;
  const lw = Math.max(2.8, size * 0.12);
  const ah = size * 0.34;
  const aw = size * 0.24;

  if (kind === 'undo') {
    const start = Phaser.Math.DegToRad(135);
    const end = Phaser.Math.DegToRad(45);
    drawArcArrow(g, r, start, end, false, col, lw, 'start', ah, aw);
  } else if (kind === 'restart') {
    const start = Phaser.Math.DegToRad(30);
    const end = Phaser.Math.DegToRad(330);
    drawArcArrow(g, r, start, end, false, col, lw, 'end', ah, aw);
  } else if (kind === 'hint') {
    g.lineStyle(lw, col, 1);
    g.strokeCircle(0, -size * 0.15, size * 0.32);
    g.fillStyle(col, 0.4);
    g.fillCircle(0, -size * 0.15, size * 0.28);
    g.fillStyle(col, 1);
    g.fillRect(-size * 0.15, size * 0.12, size * 0.3, size * 0.14);
    g.fillRect(-size * 0.1, size * 0.28, size * 0.2, size * 0.08);
  }
  return g;
}

export function drawSoundIcon(
  scene: Phaser.Scene,
  col: number,
  size = 30,
  muted = false,
  target?: Phaser.GameObjects.Graphics,
): Phaser.GameObjects.Graphics {
  const g = target ?? scene.add.graphics();
  if (target) g.clear();
  const s = size;
  const lw = Math.max(2.4, s * 0.12);
  const bodyW = s * 0.4, bodyH = s * 0.5;

  g.fillStyle(col, 1);
  g.fillRoundedRect(-bodyW - s * 0.06, -bodyH / 2, bodyW * 0.5, bodyH, 2);
  g.fillTriangle(-bodyW * 0.5, -bodyH * 0.42, -bodyW * 0.5, bodyH * 0.42, bodyW * 0.14, 0);

  if (muted) {
    g.lineStyle(lw, col, 1);
    const bx = bodyW * 0.14;
    g.beginPath();
    g.moveTo(bx + s * 0.02, -bodyH * 0.22);
    g.lineTo(bx + s * 0.34, bodyH * 0.22);
    g.moveTo(bx + s * 0.34, -bodyH * 0.22);
    g.lineTo(bx + s * 0.02, bodyH * 0.22);
    g.strokePath();
  } else {
    g.lineStyle(lw, col, 0.95);
    g.beginPath();
    g.arc(bodyW * 0.1, 0, bodyH * 0.3, -Math.PI / 2.5, Math.PI / 2.5, false);
    g.strokePath();
    g.beginPath();
    g.arc(bodyW * 0.1, 0, bodyH * 0.56, -Math.PI / 3.2, Math.PI / 3.2, false);
    g.strokePath();
  }
  return g;
}

export function drawMovesArrow(
  scene: Phaser.Scene,
  col: number,
  size = 30,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  const s = size;
  const lw = Math.max(2.6, s * 0.12);

  const startX = s * 0.12, startY = -s * 0.3;
  const endX = -s * 0.08, endY = s * 0.18;
  const ctrlX = -s * 0.3, ctrlY = -s * 0.02;

  g.lineStyle(lw, col, 1);
  g.beginPath();
  g.moveTo(startX, startY);
  const SEGS = 16;
  for (let i = 1; i <= SEGS; i++) {
    const t = i / SEGS;
    const u = 1 - t;
    const x = u * u * startX + 2 * u * t * ctrlX + t * t * endX;
    const y = u * u * startY + 2 * u * t * ctrlY + t * t * endY;
    g.lineTo(x, y);
  }
  g.strokePath();

  const ang = Math.atan2(ctrlY - endY, ctrlX - endX);
  const ah = s * 0.26;
  const lx = endX - Math.cos(ang - 0.6) * ah;
  const ly = endY - Math.sin(ang - 0.6) * ah;
  const rx = endX - Math.cos(ang + 0.6) * ah;
  const ry = endY - Math.sin(ang + 0.6) * ah;
  g.fillStyle(col, 1);
  g.fillTriangle(endX, endY, lx, ly, rx, ry);
  return g;
}

export function drawStar(
  scene: Phaser.Scene,
  col: number,
  size = 30,
  filled = true,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  const R = size / 2;
  const r = R * 0.4;
  if (filled) g.fillStyle(col, 1);
  else g.lineStyle(Math.max(2, size * 0.1), col, 0.7);

  g.beginPath();
  for (let i = 0; i < 5; i++) {
    const outer = i * 2 * (Math.PI / 5) - Math.PI / 2;
    const inner = (i * 2 + 1) * (Math.PI / 5) - Math.PI / 2;
    const px = Math.cos(outer) * R, py = Math.sin(outer) * R;
    const qx = Math.cos(inner) * r, qy = Math.sin(inner) * r;
    if (i === 0) g.moveTo(px, py);
    else g.lineTo(px, py);
    g.lineTo(qx, qy);
  }
  g.closePath();
  if (filled) g.fillPath();
  else g.strokePath();
  return g;
}

export function drawBolt(
  scene: Phaser.Scene,
  col: number,
  size = 30,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  const s = size * 0.5;
  g.fillStyle(col, 1);
  g.beginPath();
  g.moveTo(s * 0.22, -s);
  g.lineTo(-s * 0.32, -s * 0.02);
  g.lineTo(s * 0.03, -s * 0.02);
  g.lineTo(-s * 0.22, s);
  g.lineTo(s * 0.32, s * 0.02);
  g.lineTo(-s * 0.03, s * 0.02);
  g.closePath();
  g.fillPath();
  return g;
}

export function drawHintArc(
  graphics: Phaser.GameObjects.Graphics,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  alpha = 1.0,
): void {
  graphics.clear();
  if (alpha <= 0) return;

  const midX = (fromX + toX) / 2;
  const arcH = Math.max(35, Math.abs(toX - fromX) * 0.28);
  const midY = Math.min(fromY, toY) - arcH;

  graphics.lineStyle(5, toColor(color.accent), 0.4 * alpha);
  graphics.beginPath();
  graphics.moveTo(fromX, fromY);
  graphics.lineTo(midX, midY);
  graphics.lineTo(toX, toY);
  graphics.strokePath();

  graphics.lineStyle(2.5, 0xFFFFFF, 0.95 * alpha);
  graphics.beginPath();
  graphics.moveTo(fromX, fromY);
  graphics.lineTo(midX, midY);
  graphics.lineTo(toX, toY);
  graphics.strokePath();

  const angle = Phaser.Math.Angle.Between(midX, midY, toX, toY);
  const arrowSize = 10;
  const leftX = toX - Math.cos(angle - Math.PI / 6) * arrowSize;
  const leftY = toY - Math.sin(angle - Math.PI / 6) * arrowSize;
  const rightX = toX - Math.cos(angle + Math.PI / 6) * arrowSize;
  const rightY = toY - Math.sin(angle + Math.PI / 6) * arrowSize;

  graphics.fillStyle(toColor(color.accent), 0.95 * alpha);
  graphics.fillTriangle(toX, toY, leftX, leftY, rightX, rightY);
}

// ============================================================================
// 13. FROSTED GLASS PANEL (Clean Single Border)
// ============================================================================
export function drawPanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
): Phaser.GameObjects.Container {
  const root = scene.add.container(0, 0).setDepth(z.panel);
  const g = scene.add.graphics();
  const r = radius.lg;

  // Soft Ambient Drop Shadow
  g.fillStyle(0x000000, 0.65);
  g.fillRoundedRect(x - width / 2, y - height / 2 + shadow.panel.dy, width, height, r);

  // Outer Neon Glow Rim
  g.fillStyle(toColor(color.primary), 0.18);
  g.fillRoundedRect(x - width / 2 - 6, y - height / 2 - 6, width + 12, height + 12, r + 4);

  const hasChrome = scene.textures.exists('ui_chrome');
  if (!hasChrome) {
    g.fillStyle(toColor('#120E2E'), 0.96);
    g.fillRoundedRect(x - width / 2, y - height / 2, width, height, r);
  }

  if (!hasChrome) {
    g.lineStyle(3, toColor(color.primary), 0.95);
    g.strokeRoundedRect(x - width / 2, y - height / 2, width, height, r);
  }

  if (hasChrome) {
    const chrome = scene.add.nineslice(x, y, 'ui_chrome', undefined, width, height, 46, 46, 40, 40)
      .setAlpha(0.97);
    root.add(chrome);
  }
  root.add(g);
  return root;
}

export { synthAudio };
export { color, type, sp, radius, shadow, z, dur, glow, fx, fontStyle, toColor, lighten, darken, liquidPalette };
