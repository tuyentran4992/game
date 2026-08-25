// UI helpers M2 Neon Galaxy — Tối ưu hóa siêu hiệu năng 60 FPS (Zero-Garbage, O(1) Draw)
// Canvas Phaser Graphics, KHÔNG DOM. Tham chiếu DESIGN-SPEC §3.
import Phaser from 'phaser';
import { color, type, sp, radius, shadow, z, dur, glow, fx, fontStyle, toColor, lighten, darken, liquidPalette } from './tokens';

// ============================================================================
// 1. AUDIO — MỘT BUS DUY NHẤT (src/audio.ts). Re-export giữ API cũ `synthAudio`.
//    SDK pause/mute chỉ cần 1 dòng: synthAudio.setMuted(true) (xem main.ts).
// ============================================================================
import { synthAudio } from './audio';

// ============================================================================
// 2. COLOR CACHE
// ============================================================================
interface CachedColor {
  base: number;
  bright: number;
  dark: number;
}
const colorCache = new Map<string, CachedColor>();

export function getCachedLiquidColor(hex: string): CachedColor {
  let cached = colorCache.get(hex);
  if (!cached) {
    const base = toColor(hex);
    const bright = toColor(lighten(hex, 0.35));
    const dark = toColor(darken(hex, 0.28));
    cached = { base, bright, dark };
    colorCache.set(hex, cached);
  }
  return cached;
}

// ============================================================================
// 3. NỀN VŨ TRỤ DEEP SPACE DARK CHUẨN TƯƠNG PHẢN CAO
// ============================================================================
export interface GalaxyBgObjects {
  g: Phaser.GameObjects.Graphics;
  bgImage: Phaser.GameObjects.Image | null;
}

export function drawGalaxyBg(scene: Phaser.Scene): GalaxyBgObjects {
  const { width, height } = scene.scale;
  const g = scene.add.graphics().setDepth(z.bg);

  // 1. Nền deep space (#09071A)
  g.fillStyle(toColor('#09071A'), 1);
  g.fillRect(0, 0, width, height);

  // 2. Ảnh nền Deep Cosmic Nebula HD
  let bgImage: Phaser.GameObjects.Image | null = null;
  const bgTextureKey = scene.textures.exists('bg_space') ? 'bg_space' : null;

  if (bgTextureKey) {
    bgImage = scene.add.image(width / 2, height / 2, bgTextureKey)
      .setDepth(z.bg + 0.5)
      .setAlpha(0.92);

    const scaleX = width / bgImage.width;
    const scaleY = height / bgImage.height;
    const coverScale = Math.max(scaleX, scaleY);
    bgImage.setScale(coverScale);
  }

  // 3. Dark overlay cân bằng (vừa thấy rõ tinh vân vũ trụ tuyệt đẹp xung quanh, vừa có nền trung tâm tối êm dịu cho gameplay)
  g.fillStyle(toColor('#080516'), 0.42);
  g.fillRect(0, 0, width, height);

  return { g, bgImage };
}

// ============================================================================
// 4. ĐỒ HỌA ỐNG NGHIỆM 3D GLASS & CHẤT LỎNG NEON
// ============================================================================
export interface TubeViews {
  container: Phaser.GameObjects.Container;
  glass: Phaser.GameObjects.Graphics;
  liquidG: Phaser.GameObjects.Graphics;
  glowRing: Phaser.GameObjects.Graphics;
  ambientGlow: Phaser.GameObjects.Graphics;
  completionFx: Phaser.GameObjects.Container;
  /** ghost preview: khối chất lỏng "sẽ được đổ" (trong suốt) */
  ghostG: Phaser.GameObjects.Graphics;
  /** SEAL: kính bị đóng băng (frost) */
  frostG: Phaser.GameObjects.Graphics;
  /** SEAL: vòng neon "khép lại" quanh ống */
  sealRing: Phaser.GameObjects.Graphics;
  /** SEAL: dải sáng chạy chậm trên khối chất lỏng (shimmer) */
  shimmerG: Phaser.GameObjects.Graphics;
  /** ART: thân ống thuỷ tinh chụp thật (tube_base.png) — null nếu texture thiếu */
  glassImg: Phaser.GameObjects.Image | null;
  /** ART: mặt thoáng chất lỏng phát sáng (liquid_neon.png, tint theo màu đỉnh) */
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

  // 1. Ambient glow quanh ống
  const ambientGlow = scene.add.graphics().setDepth(z.actor - 2).setBlendMode(Phaser.BlendModes.ADD);
  container.add(ambientGlow);

  // 2. Selection glow halo
  const glowRing = scene.add.graphics().setDepth(z.actor - 1).setBlendMode(Phaser.BlendModes.ADD);
  const ringPad = 6;
  glowRing.lineStyle(3, toColor(color.accent), 0.9);
  glowRing.strokeRoundedRect(-tubeW / 2 - ringPad, -tubeH / 2 - ringPad, tubeW + ringPad * 2, tubeH + ringPad * 2, 36);
  glowRing.setAlpha(0);
  container.add(glowRing);

  // 3. Lớp chất lỏng
  const liquidG = scene.add.graphics().setDepth(z.actor);
  container.add(liquidG);

  // 3b. ART liquid_neon.png — mặt thoáng phát sáng (grayscale → tint theo màu đỉnh).
  //     Ảnh grayscale nên tint được; ADD blend → hoà vào ánh neon.
  let surfaceImg: Phaser.GameObjects.Image | null = null;
  if (scene.textures.exists('liquid_neon')) {
    surfaceImg = scene.add.image(0, 0, 'liquid_neon')
      .setDepth(z.actor + 0.4)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setVisible(false);
    container.add(surfaceImg);
  }

  // 4. Ghost preview (số lát SẼ đổ sang) — trên chất lỏng, dưới kính
  const ghostG = scene.add.graphics().setDepth(z.actor + 0.5);
  container.add(ghostG);

  // 5. Shimmer chậm khi ống đã seal
  const shimmerG = scene.add.graphics().setDepth(z.actor + 1).setBlendMode(Phaser.BlendModes.ADD);
  shimmerG.setAlpha(0);
  container.add(shimmerG);

  // 6. Frost kính khi seal
  const frostG = scene.add.graphics().setDepth(z.actor + 1.5);
  frostG.setAlpha(0);
  container.add(frostG);

  // 7. Thân ống thủy tinh 3D Glass
  const glass = scene.add.graphics().setDepth(z.actor + 2);
  redrawGlassBody(glass, tubeW, tubeH);
  container.add(glass);

  // 7b. ART tube_base.png — ảnh ống thuỷ tinh thật (khúc xạ/độ dày kính) phủ nhẹ
  //     lên thân vector → ống RỖNG cũng "có kính", không còn phẳng tối.
  let glassImg: Phaser.GameObjects.Image | null = null;
  if (scene.textures.exists('tube_base')) {
    glassImg = scene.add.image(0, 0, 'tube_base')
      .setDepth(z.actor + 2.2)
      .setDisplaySize(tubeW * 1.04, tubeH * 1.02)
      .setAlpha(0.34);
    container.add(glassImg);
  }

  // 8. Vòng seal neon (snap shut)
  const sealRing = scene.add.graphics().setDepth(z.actor + 3).setBlendMode(Phaser.BlendModes.ADD);
  sealRing.setAlpha(0);
  container.add(sealRing);

  // 9. Container hiệu ứng hoàn thành ống
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
    glassImg,
    surfaceImg,
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

  // Lớp phủ kính mờ
  glass.fillStyle(toColor('#FFFFFF'), 0.05);
  glass.fillRoundedRect(-halfW, -halfH, tubeW, tubeH, { tl: 4, tr: 4, bl: cornerR, br: cornerR });

  // Đáy dày khúc xạ
  glass.fillStyle(toColor('#FFFFFF'), 0.12);
  glass.fillEllipse(0, halfH - 5, tubeW * 0.7, 10);

  // Viền ngoài
  glass.lineStyle(2, toColor('#FFFFFF'), 0.3);
  glass.strokeRoundedRect(-halfW, -halfH, tubeW, tubeH, { tl: 4, tr: 4, bl: cornerR, br: cornerR });

  // Viền trong tạo độ dày
  glass.lineStyle(1.5, toColor('#FFFFFF'), 0.45);
  glass.strokeRoundedRect(-halfW + 2, -halfH + 2, tubeW - 4, tubeH - 4, { tl: 3, tr: 3, bl: cornerR - 2, br: cornerR - 2 });

  // Miệng ống loe (Lip)
  const lipH = 5;
  const lipOverhang = 3;
  glass.fillStyle(toColor('#FFFFFF'), 0.25);
  glass.fillRoundedRect(-halfW - lipOverhang, -halfH - 2, tubeW + lipOverhang * 2, lipH, 2);
  glass.lineStyle(1.5, toColor('#FFFFFF'), 0.7);
  glass.strokeRoundedRect(-halfW - lipOverhang, -halfH - 2, tubeW + lipOverhang * 2, lipH, 2);

  // Dải phản quang dọc thân bên trái
  glass.fillStyle(toColor('#FFFFFF'), 0.22);
  glass.fillRoundedRect(-halfW + 5, -halfH + 8, Math.max(2.5, tubeW * 0.06), tubeH - 26, 1.5);
  glass.fillStyle(toColor('#FFFFFF'), 0.1);
  glass.fillRoundedRect(-halfW + 10, -halfH + 12, Math.max(1.5, tubeW * 0.03), tubeH - 34, 1);
}

// ============================================================================
// 5. RENDER CHẤT LỎNG NHANH CHUẨN 60 FPS
// ============================================================================
export function renderLiquid(views: TubeViews, contentIn: string[] | undefined | null): void {
  // P0-3: không bao giờ crash nếu số tube UI lệch số tube board (đọc undefined).
  const content = contentIn ?? [];
  views.currentContent = content.slice();
  const { liquidG, ambientGlow, width: tubeW, height: tubeH, capacity } = views;
  liquidG.clear();
  ambientGlow.clear();

  const halfW = tubeW / 2;
  const halfH = tubeH / 2;
  const innerPad = 3.5;
  const liquidW = tubeW - innerPad * 2;
  const usableH = tubeH - innerPad * 2 - 4;
  const layerH = usableH / capacity;
  const cornerR = liquidW * 0.42;

  if (content.length > 0) {
    const topColInfo = getCachedLiquidColor(content[content.length - 1]);
    // AUDIT §B5-2: halo alpha proportional to fill (0.10 + 0.14*fill) — NOT binary.
    const fillRatio = content.length / Math.max(1, capacity);
    const haloAlpha = 0.10 + 0.14 * fillRatio;
    ambientGlow.fillStyle(topColInfo.base, haloAlpha);
    ambientGlow.fillRoundedRect(-halfW - 5, -halfH - 5, tubeW + 10, tubeH + 10, 32);
    ambientGlow.fillStyle(topColInfo.base, 0.22);
    ambientGlow.fillEllipse(0, halfH - 2, tubeW * 0.75, 14);
  } else {
    // AUDIT §B5-2: empty tube never reads flat/dark — faint neutral rim glow (accent ~0.07).
    ambientGlow.fillStyle(toColor(color.accent), 0.07);
    ambientGlow.fillRoundedRect(-halfW - 5, -halfH - 5, tubeW + 10, tubeH + 10, 32);
    ambientGlow.fillStyle(toColor(color.accent), 0.05);
    ambientGlow.fillEllipse(0, halfH - 2, tubeW * 0.6, 10);
  }

  if (content.length === 0) {
    if (views.surfaceImg) views.surfaceImg.setVisible(false);
    return;
  }

  const yBase = halfH - innerPad;

  // ART liquid_neon: mặt thoáng bóng của LÁT TRÊN CÙNG (tint theo màu, ADD blend)
  if (views.surfaceImg) {
    const topInfo = getCachedLiquidColor(content[content.length - 1]);
    const surfaceY = yBase - content.length * layerH;
    views.surfaceImg
      .setVisible(true)
      .setPosition(0, surfaceY + Math.min(layerH * 0.30, 7))
      .setDisplaySize(liquidW * 1.06, Math.max(7, Math.min(layerH * 0.85, 20)))
      .setTint(topInfo.bright)
      .setAlpha(0.5);
  }

  for (let i = 0; i < content.length; i++) {
    const colInfo = getCachedLiquidColor(content[i]);
    const isTop = (i === content.length - 1);
    const isBottom = (i === 0);

    const layerBotY = yBase - i * layerH;
    const layerTopY = layerBotY - layerH;

    liquidG.fillStyle(colInfo.base, 0.95);
    if (isBottom) {
      liquidG.fillRoundedRect(-halfW + innerPad, layerTopY, liquidW, layerH, { tl: 0, tr: 0, bl: cornerR, br: cornerR });
    } else {
      liquidG.fillRect(-halfW + innerPad, layerTopY, liquidW, layerH);
    }

    liquidG.fillStyle(colInfo.bright, 0.35);
    liquidG.fillRoundedRect(-halfW + innerPad + liquidW * 0.15, layerTopY + 2, liquidW * 0.7, layerH - 4, 2);

    if (isTop) {
      liquidG.fillStyle(colInfo.bright, 0.85);
      liquidG.fillEllipse(0, layerTopY, liquidW * 0.9, Math.min(6, layerH * 0.22));

      liquidG.fillStyle(toColor('#FFFFFF'), 0.7);
      liquidG.fillEllipse(-liquidW * 0.15, layerTopY - 1, liquidW * 0.4, Math.min(3, layerH * 0.1));
    }

    if (i < content.length - 1) {
      liquidG.lineStyle(1.5, colInfo.dark, 0.9);
      liquidG.beginPath();
      liquidG.moveTo(-halfW + innerPad + 2, layerTopY);
      liquidG.lineTo(halfW - innerPad - 2, layerTopY);
      liquidG.strokePath();
    }
  }
}

// ============================================================================
// 6. POUR TRANSITION — chuyển chất lỏng MƯỢT nhiều lát (O(1) draw / frame)
//    ratio 0→1: nguồn rút `count` lát, đích dâng `count` lát (đồng bộ 1 tween).
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
  // Mặt thoáng ảnh chỉ dùng cho trạng thái TĨNH — trong lúc rót dùng vector (mượt hơn).
  if (views.surfaceImg) views.surfaceImg.setVisible(false);

  const halfW = tubeW / 2;
  const halfH = tubeH / 2;
  const innerPad = 3.5;
  const liquidW = tubeW - innerPad * 2;
  const usableH = tubeH - innerPad * 2 - 4;
  const layerH = usableH / capacity;
  const cornerR = liquidW * 0.42;
  const yBase = halfH - innerPad;

  // 1. Phần chất lỏng "tĩnh" (không tham gia lần đổ này)
  for (let i = 0; i < baseContent.length; i++) {
    const colInfo = getCachedLiquidColor(baseContent[i]);
    const isBottom = (i === 0);
    const layerTopY = yBase - i * layerH - layerH;

    liquidG.fillStyle(colInfo.base, 0.95);
    if (isBottom) {
      liquidG.fillRoundedRect(-halfW + innerPad, layerTopY, liquidW, layerH, { tl: 0, tr: 0, bl: cornerR, br: cornerR });
    } else {
      liquidG.fillRect(-halfW + innerPad, layerTopY, liquidW, layerH);
    }
    liquidG.fillStyle(colInfo.bright, 0.3);
    liquidG.fillRoundedRect(-halfW + innerPad + liquidW * 0.15, layerTopY + 2, liquidW * 0.7, layerH - 4, 2);
  }

  // 2. Khối đang chuyển: chiều cao = count × layerH × ratio (mượt, không nhảy bậc)
  const maxLayers = Math.max(0, Math.min(count, capacity - baseContent.length));
  const movingH = Math.max(0, Math.min(maxLayers * layerH, maxLayers * layerH * ratio));
  if (movingH > 0.4) {
    const colInfo = getCachedLiquidColor(transitionColor);
    const baseIdx = baseContent.length;
    const isBottom = (baseIdx === 0);
    const blockBotY = yBase - baseIdx * layerH;
    const blockTopY = blockBotY - movingH;

    liquidG.fillStyle(colInfo.base, 0.95);
    if (isBottom) {
      liquidG.fillRoundedRect(-halfW + innerPad, blockTopY, liquidW, movingH, { tl: 0, tr: 0, bl: cornerR, br: cornerR });
    } else {
      liquidG.fillRect(-halfW + innerPad, blockTopY, liquidW, movingH);
    }

    liquidG.fillStyle(colInfo.bright, 0.32);
    liquidG.fillRoundedRect(-halfW + innerPad + liquidW * 0.15, blockTopY + 2, liquidW * 0.7, Math.max(1, movingH - 4), 2);

    // đường ngăn giữa các lát cùng màu (giữ cảm giác "đếm được số lát")
    liquidG.lineStyle(1, colInfo.dark, 0.55);
    for (let k = 1; k < maxLayers; k++) {
      const y = blockBotY - k * layerH;
      if (y <= blockTopY) break;
      liquidG.beginPath();
      liquidG.moveTo(-halfW + innerPad + 2, y);
      liquidG.lineTo(halfW - innerPad - 2, y);
      liquidG.strokePath();
    }

    // mặt thoáng đang dâng/rút
    liquidG.fillStyle(colInfo.bright, 0.85);
    liquidG.fillEllipse(0, blockTopY, liquidW * 0.9, Math.min(6, layerH * 0.22));
    liquidG.fillStyle(toColor('#FFFFFF'), 0.55);
    liquidG.fillEllipse(-liquidW * 0.15, blockTopY - 1, liquidW * 0.36, Math.min(3, layerH * 0.1));
  }
}

// ============================================================================
// 6b. GHOST PREVIEW — hiện ĐÚNG số lát sẽ chuyển sang ống đích (trong suốt)
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
  const innerPad = 3.5;
  const liquidW = tubeW - innerPad * 2;
  const usableH = tubeH - innerPad * 2 - 4;
  const layerH = usableH / capacity;
  const cornerR = liquidW * 0.42;
  const yBase = halfH - innerPad;
  const colInfo = getCachedLiquidColor(colorHex);
  const n = Math.min(count, capacity - contentLength);

  for (let k = 0; k < n; k++) {
    const idx = contentLength + k;
    const layerTopY = yBase - idx * layerH - layerH;
    const isBottom = (idx === 0);

    ghostG.fillStyle(colInfo.base, 0.34);
    if (isBottom) {
      ghostG.fillRoundedRect(-halfW + innerPad, layerTopY, liquidW, layerH, { tl: 0, tr: 0, bl: cornerR, br: cornerR });
    } else {
      ghostG.fillRect(-halfW + innerPad, layerTopY, liquidW, layerH);
    }
    ghostG.lineStyle(1.2, colInfo.bright, 0.6);
    ghostG.strokeRect(-halfW + innerPad, layerTopY, liquidW, layerH);
  }

  // vạch mặt thoáng dự kiến (đỉnh khối ghost)
  const topY = yBase - (contentLength + n) * layerH;
  ghostG.lineStyle(2, toColor(color.accent), 0.85);
  ghostG.beginPath();
  ghostG.moveTo(-halfW + innerPad, topY);
  ghostG.lineTo(halfW - innerPad, topY);
  ghostG.strokePath();
}

/** Bật ghost preview + nhấp nháy nhẹ (khoá vào tween của scene). */
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
    duration: 620,
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
// 6c. SEAL MOMENT — kính đóng băng + vòng neon khép lại + shimmer chậm
//     (âm thanh: synthAudio.playSealNote() — nốt đi lên thang ngũ cung)
// ============================================================================
function drawFrost(g: Phaser.GameObjects.Graphics, tubeW: number, tubeH: number): void {
  g.clear();
  const halfW = tubeW / 2;
  const halfH = tubeH / 2;
  const cornerR = tubeW * 0.44;

  // màn kính mờ (frost) phủ toàn thân
  g.fillStyle(toColor('#FFFFFF'), fx.frostAlpha);
  g.fillRoundedRect(-halfW + 1, -halfH + 1, tubeW - 2, tubeH - 2, { tl: 4, tr: 4, bl: cornerR, br: cornerR });

  // các vân băng mảnh (rẻ, không texture)
  g.fillStyle(toColor('#FFFFFF'), 0.16);
  const bands = 4;
  for (let i = 0; i < bands; i++) {
    const y = -halfH + 10 + (i * (tubeH - 24)) / bands;
    const w = tubeW * (i % 2 === 0 ? 0.52 : 0.34);
    const x = i % 2 === 0 ? -tubeW * 0.22 : tubeW * 0.04;
    g.fillRoundedRect(x, y, w, 2, 1);
  }
  g.fillStyle(toColor(color.accent), 0.1);
  g.fillRoundedRect(-halfW + 1, -halfH + 1, tubeW - 2, tubeH * 0.3, { tl: 4, tr: 4, bl: 2, br: 2 });
}

function drawSealRing(g: Phaser.GameObjects.Graphics, tubeW: number, tubeH: number, hex: string): void {
  g.clear();
  const pad = 5;
  const w = tubeW + pad * 2;
  const h = tubeH + pad * 2;
  const colInfo = getCachedLiquidColor(hex);

  g.lineStyle(5, colInfo.base, 0.35);
  g.strokeRoundedRect(-w / 2, -h / 2, w, h, 34);
  g.lineStyle(2.5, toColor('#FFFFFF'), 0.85);
  g.strokeRoundedRect(-w / 2, -h / 2, w, h, 34);

  // "chốt" niêm phong ở miệng ống
  g.fillStyle(colInfo.bright, 0.9);
  g.fillRoundedRect(-tubeW * 0.34, -tubeH / 2 - 7, tubeW * 0.68, 6, 3);
  g.lineStyle(1.2, toColor('#FFFFFF'), 0.9);
  g.strokeRoundedRect(-tubeW * 0.34, -tubeH / 2 - 7, tubeW * 0.68, 6, 3);
}

function drawShimmerBand(g: Phaser.GameObjects.Graphics, tubeW: number, hex: string): void {
  g.clear();
  const colInfo = getCachedLiquidColor(hex);
  const w = tubeW - 8;
  g.fillStyle(colInfo.bright, 0.16);
  g.fillRoundedRect(-w / 2, -7, w, 14, 6);
  g.fillStyle(toColor('#FFFFFF'), 0.1);
  g.fillRoundedRect(-w / 2, -2.5, w, 5, 2.5);
}

/**
 * SEAL một ống: frost kính, vòng neon snap-shut, shimmer chậm trên chất lỏng.
 * `instant` = true khi phục hồi trạng thái (resize/undo) → không animate, không kêu.
 */
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
    // kính "đóng băng" dần
    views.frostG.setAlpha(0);
    scene.tweens.add({ targets: views.frostG, alpha: 1, duration: dur.slow, ease: 'quad.out' });

    // vòng neon KHÉP LẠI (snap shut) rồi giữ mờ
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

  // shimmer chậm chạy lên xuống — "chất lỏng còn sống" sau khi seal
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

/** Bỏ seal (undo làm ống không còn 1 màu / restart / re-layout). */
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
// 6d. NEON PARTICLE BURST (level clear / seal) — vẽ bằng shape, 0 KB asset
// ============================================================================
export function spawnNeonBurst(
  scene: Phaser.Scene,
  x: number,
  y: number,
  palette: readonly string[],
  count = 28,
  spread = 200,
  depth: number = z.tutorial,
): void {
  for (let i = 0; i < count; i++) {
    const hex = palette[Math.floor(Math.random() * palette.length)];
    const size = Phaser.Math.Between(3, 6);
    const isSpark = i % 3 === 0;
    const p = isSpark
      ? scene.add.rectangle(x, y, size * 0.7, size * 2.4, toColor(hex), 1)
      : scene.add.circle(x, y, size / 2, toColor(hex), 1);
    p.setDepth(depth).setBlendMode(Phaser.BlendModes.ADD);

    const angle = Math.random() * Math.PI * 2;
    const dist = Phaser.Math.Between(spread * 0.35, spread);
    scene.tweens.add({
      targets: p,
      x: x + Math.cos(angle) * dist,
      y: y + Math.sin(angle) * dist + Phaser.Math.Between(20, 90),
      alpha: 0,
      angle: Phaser.Math.Between(-360, 360),
      scale: 0.4,
      duration: Phaser.Math.Between(520, 980),
      ease: 'cubic.out',
      onComplete: () => p.destroy(),
    });
  }
}

// ============================================================================
// 7. DÒNG CHẢY RÓT NƯỚC NHẸ
// ============================================================================
export function drawPourStream(
  graphics: Phaser.GameObjects.Graphics,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  colorHex: string,
  thickness = 5,
): void {
  graphics.clear();
  const colInfo = getCachedLiquidColor(colorHex);

  const midX = (fromX + toX) / 2;
  const arcH = Math.max(20, Math.abs(toX - fromX) * 0.2);
  const midY = Math.min(fromY, toY) - arcH;

  graphics.lineStyle(thickness + 4, colInfo.base, 0.4);
  graphics.beginPath();
  graphics.moveTo(fromX, fromY);
  graphics.lineTo(midX, midY);
  graphics.lineTo(toX, toY);
  graphics.strokePath();

  graphics.lineStyle(thickness, colInfo.base, 0.95);
  graphics.beginPath();
  graphics.moveTo(fromX, fromY);
  graphics.lineTo(midX, midY);
  graphics.lineTo(toX, toY);
  graphics.strokePath();

  graphics.lineStyle(Math.max(2, thickness * 0.4), colInfo.bright, 0.9);
  graphics.beginPath();
  graphics.moveTo(fromX, fromY);
  graphics.lineTo(midX, midY);
  graphics.lineTo(toX, toY);
  graphics.strokePath();
}

// ============================================================================
// 8. ĐƯỜNG GỢI Ý NƯỚC ĐI
// ============================================================================
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

  graphics.lineStyle(2.5, toColor('#FFFFFF'), 0.95 * alpha);
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
// 9. CYBER GLASSMORPHISM BUTTONS & ICONS
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
  size = 32,
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

// ============================================================================
// 8b. VECTOR ICONS — thay emoji (🔊/🔇, ⤵, ★, ⚡) render đồng nhất mọi OS/WebView.
//     AUDIT §B5-3/B5-6: drop emoji from HUD/panel strings; draw vector equivalents.
// ============================================================================
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
  // speaker box (left)
  g.fillRoundedRect(-bodyW - s * 0.06, -bodyH / 2, bodyW * 0.5, bodyH, 2);
  // cone flare (right)
  g.fillTriangle(-bodyW * 0.5, -bodyH * 0.42, -bodyW * 0.5, bodyH * 0.42, bodyW * 0.14, 0);

  if (muted) {
    // X over the speaker
    g.lineStyle(lw, col, 1);
    const bx = bodyW * 0.14;
    g.beginPath();
    g.moveTo(bx + s * 0.02, -bodyH * 0.22);
    g.lineTo(bx + s * 0.34, bodyH * 0.22);
    g.moveTo(bx + s * 0.34, -bodyH * 0.22);
    g.lineTo(bx + s * 0.02, bodyH * 0.22);
    g.strokePath();
  } else {
    // two sound arcs
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

  // gentle down-left curve
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

  // arrowhead pointing down-left
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

export interface ButtonOptions {
  width?: number;
  height?: number;
  variant?: 'primary' | 'ghost' | 'glass';
  testid?: string;
  textType?: { size: string; weight: string; lh: number };
  icon?: 'undo' | 'restart' | 'hint' | null;
  glowColor?: string;
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
  const textType = opts.textType ?? type.display;
  const useIcon = opts.icon === 'undo' || opts.icon === 'restart' || opts.icon === 'hint';
  const glowHex = opts.glowColor ?? (variant === 'primary' ? color.primary : color.accent);

  const container = scene.add.container(x, y).setSize(width, height).setDepth(z.panel);
  const g = scene.add.graphics();
  const radiusVal = Math.min(height / 2, radius.lg);

  g.fillStyle(toColor(glowHex), 0.2);
  g.fillRoundedRect(-width / 2 - 3, -height / 2 - 3, width + 6, height + 6, radiusVal + 3);

  if (variant === 'primary') {
    // AUDIT §B5-3: remove the "2010 glossy gel" slab; use 1px inner top highlight +
    // subtle vertical gradient + real neon glow (postFX blur 24) + 2px primaryDark border.
    g.fillStyle(toColor(color.primaryDark), 1);
    g.fillRoundedRect(-width / 2, -height / 2, width, height, radiusVal);

    g.fillStyle(toColor(color.primary), 1);
    g.fillRoundedRect(-width / 2, -height / 2, width, height - 3, radiusVal);

    // subtle vertical gradient · top lit (primaryGrad, low alpha — NOT a gel slab)
    g.fillStyle(toColor(color.primaryGrad), 0.26);
    g.fillRoundedRect(-width / 2 + 6, -height / 2 + 6, width - 12, (height - 3) * 0.4, radiusVal - 4);

    // 1px inner top highlight
    g.fillStyle(toColor('#FFFFFF'), 0.14);
    g.fillRoundedRect(-width / 2 + 9, -height / 2 + 4, width - 18, 2, 1);

    // 2px primaryDark bottom border (spec §3.5)
    g.lineStyle(2, toColor(color.primaryDark), 1);
    g.lineBetween(-width / 2 + 6, -height / 2 + height - 2, width / 2 - 6, -height / 2 + height - 2);

    // fine neon hairline outline
    g.lineStyle(1.5, toColor('#FFFFFF'), 0.26);
    g.strokeRoundedRect(-width / 2, -height / 2, width, height - 3, radiusVal);

    // REAL neon glow — postFX blur 24 (glow.primary). WebGL only, no-op on Canvas.
    const isWebGL = scene.game.renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer;
    if (container.postFX && isWebGL) {
      container.postFX.addGlow(toColor(glowHex), 0.55, 0, false, 0.15, glow.primary.blur);
    }
  } else if (variant === 'ghost') {
    g.fillStyle(toColor('#120D2C'), 0.85);
    g.fillRoundedRect(-width / 2, -height / 2, width, height, radiusVal);
    g.fillStyle(toColor(color.primary), 0.15);
    g.fillRoundedRect(-width / 2, -height / 2, width, height, radiusVal);

    g.lineStyle(2.5, toColor(color.primary), 0.95);
    g.strokeRoundedRect(-width / 2, -height / 2, width, height, radiusVal);
  } else {
    g.fillStyle(toColor('#FFFFFF'), 0.1);
    g.fillRoundedRect(-width / 2, -height / 2, width, height, radiusVal);
    g.lineStyle(2, toColor(color.accent), 0.7);
    g.strokeRoundedRect(-width / 2, -height / 2, width, height, radiusVal);
  }

  container.add(g);

  const txtColor = variant === 'primary' ? color.textOnPrimary : color.surface;
  const t = scene.add.text(0, 0, useIcon ? '' : text, fontStyle(textType, txtColor)).setOrigin(0.5);
  if (variant === 'primary') {
    t.setShadow(0, 2, 'rgba(0,0,0,0.4)', 3, false, true);
  }
  container.add(t);

  let iconG: Phaser.GameObjects.Graphics | null = null;
  if (useIcon && opts.icon) {
    const iconColor = variant === 'primary' ? toColor('#FFFFFF') : toColor(color.accent);
    iconG = drawToolbarIcon(scene, opts.icon, iconColor, Math.min(32, height - 20));
    iconG.setPosition(0, 0);
    container.add(iconG);
  }

  if (opts.testid) {
    g.setData('testid', opts.testid);
    t.setData('testid', opts.testid);
    container.setData('testid', opts.testid);
    if (iconG) iconG.setData('testid', opts.testid);
  }

  container.setInteractive({ useHandCursor: true });
  container.on('pointerover', () => {
    scene.tweens.add({ targets: container, scale: 1.05, duration: dur.hover, ease: 'quad.out' });
  });
  container.on('pointerout', () => {
    scene.tweens.add({ targets: container, scale: 1.0, duration: dur.hover, ease: 'quad.out' });
  });
  container.on('pointerdown', () => {
    synthAudio.playClick();
    scene.tweens.add({ targets: container, scale: 0.94, duration: dur.fast, ease: 'quad.in' });
  });
  container.on('pointerup', () => {
    scene.tweens.add({ targets: container, scale: 1.05, duration: dur.hover, ease: 'quad.out' });
  });

  return { container, textObj: t };
}

// ============================================================================
// 10. HUD CAPSULE / BADGES
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

  g.fillStyle(toColor(color.shadow), 0.4);
  g.fillRoundedRect(x - width / 2, y - height / 2 + 3, width, height, r);

  g.fillStyle(toColor('#0E0A28'), 0.88);
  g.fillRoundedRect(x - width / 2, y - height / 2, width, height, r);

  g.fillStyle(toColor('#FFFFFF'), 0.15);
  g.fillRoundedRect(x - width / 2 + 4, y - height / 2 + 2, width - 8, height * 0.4, r - 2);

  g.lineStyle(2, toColor(borderColorHex), 0.9);
  g.strokeRoundedRect(x - width / 2, y - height / 2, width, height, r);

  return g;
}

// ============================================================================
// 11. FROSTED GLASS PANEL
//     Dùng ART ui_chrome.png (khung kính neon) qua NineSlice nếu có texture →
//     góc bo KHÔNG bị kéo méo; thiếu texture thì fallback 100% vector như cũ.
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

  g.fillStyle(toColor(color.shadow), 0.6);
  g.fillRoundedRect(x - width / 2, y - height / 2 + shadow.panel.dy, width, height, r);

  g.fillStyle(toColor(color.primary), 0.15);
  g.fillRoundedRect(x - width / 2 - 6, y - height / 2 - 6, width + 12, height + 12, r + 4);

  const hasChrome = scene.textures.exists('ui_chrome');
  if (!hasChrome) {
    g.fillStyle(toColor('#120E2E'), 0.95);
    g.fillRoundedRect(x - width / 2, y - height / 2, width, height, r);
  }

  g.fillStyle(toColor('#FFFFFF'), 0.1);
  g.fillRoundedRect(x - width / 2 + 6, y - height / 2 + 4, width - 12, height * 0.25, r - 4);

  if (!hasChrome) {
    g.lineStyle(3, toColor(color.primary), 0.9);
    g.strokeRoundedRect(x - width / 2, y - height / 2, width, height, r);
  }
  g.lineStyle(1, toColor(color.accent), 0.4);
  g.strokeRoundedRect(x - width / 2 + 3, y - height / 2 + 3, width - 6, height - 6, r - 2);

  if (hasChrome) {
    // ui_chrome.png = panel kính tối + viền neon gradient. NineSlice 46 px góc.
    const chrome = scene.add.nineslice(x, y, 'ui_chrome', undefined, width, height, 46, 46, 40, 40)
      .setAlpha(0.97);
    root.add(chrome);
  }
  root.add(g);
  return root;
}

export { synthAudio };
export { color, type, sp, radius, shadow, z, dur, glow, fx, fontStyle, toColor, lighten, darken, liquidPalette };
