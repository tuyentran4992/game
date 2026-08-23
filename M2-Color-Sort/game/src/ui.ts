// UI helpers M2 Neon Galaxy — Tối ưu hóa siêu hiệu năng 60 FPS (Zero-Garbage, O(1) Draw)
// Canvas Phaser Graphics, KHÔNG DOM. Tham chiếu DESIGN-SPEC §3.
import Phaser from 'phaser';
import { color, type, sp, radius, shadow, z, dur, glow, fontStyle, toColor, lighten, darken, liquidPalette } from './tokens';

// ============================================================================
// 1. WEBAUDIO SYNTHESIZER (Phụ trợ âm thanh mượt mà, không phụ thuộc file ngoài)
// ============================================================================
class WebAudioSynth {
  private ctx: AudioContext | null = null;
  private isMuted = false;

  private getContext(): AudioContext | null {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return this.ctx;
    }
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        return this.ctx;
      }
    } catch {
      // Audio not supported
    }
    return null;
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
  }

  public getMute(): boolean {
    return this.isMuted;
  }

  public playGlug(step = 0) {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800 + step * 120, now);

      const baseFreq = 340 + step * 45;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.4, now + 0.07);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.11);
    } catch {
      // Ignore
    }
  }

  public playTubeComplete() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const notes = [587.33, 739.99, 880.0, 1174.66];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);

        gain.gain.setValueAtTime(0.001, now + idx * 0.05);
        gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.05 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.05 + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.46);
      });
    } catch {
      // Ignore
    }
  }

  public playLevelClear() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const chord = [523.25, 659.25, 783.99, 1046.5];
      chord.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);

        gain.gain.setValueAtTime(0.001, now + idx * 0.07);
        gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.07 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.07 + 0.7);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.75);
      });
    } catch {
      // Ignore
    }
  }

  public playClick() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.04);

      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    } catch {
      // Ignore
    }
  }

  public playHint() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const notes = [659.25, 880.0, 1318.5];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);

        gain.gain.setValueAtTime(0.001, now + idx * 0.06);
        gain.gain.linearRampToValueAtTime(0.15, now + idx * 0.06 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.06 + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.42);
      });
    } catch {
      // Ignore
    }
  }

  public playBuzz() {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(130, now);
      osc.frequency.linearRampToValueAtTime(100, now + 0.1);

      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.13);
    } catch {
      // Ignore
    }
  }
}

export const synthAudio = new WebAudioSynth();

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

  // 4. Thân ống thủy tinh 3D Glass
  const glass = scene.add.graphics().setDepth(z.actor + 2);
  redrawGlassBody(glass, tubeW, tubeH);
  container.add(glass);

  // 5. Container hiệu ứng hoàn thành ống
  const completionFx = scene.add.container(0, 0).setDepth(z.actor + 4);
  container.add(completionFx);

  return {
    container,
    glass,
    liquidG,
    glowRing,
    ambientGlow,
    completionFx,
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
export function renderLiquid(views: TubeViews, content: string[]): void {
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
    ambientGlow.fillStyle(topColInfo.base, 0.18);
    ambientGlow.fillRoundedRect(-halfW - 5, -halfH - 5, tubeW + 10, tubeH + 10, 32);
    ambientGlow.fillStyle(topColInfo.base, 0.25);
    ambientGlow.fillEllipse(0, halfH - 2, tubeW * 0.75, 14);
  }

  if (content.length === 0) return;

  const yBase = halfH - innerPad;

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
// 6. RENDER POUR TRANSITION NHẸ (O(1) DRAW)
// ============================================================================
export function renderPourTransition(
  views: TubeViews,
  baseContent: string[],
  transitionColor: string,
  ratio: number,
  _isSource: boolean,
): void {
  const { liquidG, width: tubeW, height: tubeH, capacity } = views;
  liquidG.clear();

  const halfW = tubeW / 2;
  const halfH = tubeH / 2;
  const innerPad = 3.5;
  const liquidW = tubeW - innerPad * 2;
  const usableH = tubeH - innerPad * 2 - 4;
  const layerH = usableH / capacity;
  const cornerR = liquidW * 0.42;
  const yBase = halfH - innerPad;

  for (let i = 0; i < baseContent.length; i++) {
    const colInfo = getCachedLiquidColor(baseContent[i]);
    const isBottom = (i === 0);
    const layerBotY = yBase - i * layerH;
    const layerTopY = layerBotY - layerH;

    liquidG.fillStyle(colInfo.base, 0.95);
    if (isBottom) {
      liquidG.fillRoundedRect(-halfW + innerPad, layerTopY, liquidW, layerH, { tl: 0, tr: 0, bl: cornerR, br: cornerR });
    } else {
      liquidG.fillRect(-halfW + innerPad, layerTopY, liquidW, layerH);
    }
  }

  const currentHeight = Math.max(0, Math.min(layerH, layerH * ratio));
  if (currentHeight > 0.5) {
    const colInfo = getCachedLiquidColor(transitionColor);
    const layerIdx = baseContent.length;
    const isBottom = (layerIdx === 0);
    const layerBotY = yBase - layerIdx * layerH;
    const layerTopY = layerBotY - currentHeight;

    liquidG.fillStyle(colInfo.base, 0.95);
    if (isBottom) {
      liquidG.fillRoundedRect(-halfW + innerPad, layerTopY, liquidW, currentHeight, { tl: 0, tr: 0, bl: cornerR, br: cornerR });
    } else {
      liquidG.fillRect(-halfW + innerPad, layerTopY, liquidW, currentHeight);
    }

    liquidG.fillStyle(colInfo.bright, 0.85);
    liquidG.fillEllipse(0, layerTopY, liquidW * 0.9, Math.min(6, layerH * 0.22));
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
    g.fillStyle(toColor(color.primaryDark), 1);
    g.fillRoundedRect(-width / 2, -height / 2 + 3, width, height, radiusVal);
    g.fillStyle(toColor(color.primary), 1);
    g.fillRoundedRect(-width / 2, -height / 2, width, height - 3, radiusVal);

    g.fillStyle(toColor('#FFFFFF'), 0.25);
    g.fillRoundedRect(-width / 2 + 8, -height / 2 + 2, width - 16, (height - 3) * 0.45, radiusVal - 2);

    g.lineStyle(1.5, toColor('#FFFFFF'), 0.6);
    g.strokeRoundedRect(-width / 2, -height / 2, width, height - 3, radiusVal);
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
// ============================================================================
export function drawPanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  const r = radius.lg;

  g.fillStyle(toColor(color.shadow), 0.6);
  g.fillRoundedRect(x - width / 2, y - height / 2 + shadow.panel.dy, width, height, r);

  g.fillStyle(toColor(color.primary), 0.15);
  g.fillRoundedRect(x - width / 2 - 6, y - height / 2 - 6, width + 12, height + 12, r + 4);

  g.fillStyle(toColor('#120E2E'), 0.95);
  g.fillRoundedRect(x - width / 2, y - height / 2, width, height, r);

  g.fillStyle(toColor('#FFFFFF'), 0.1);
  g.fillRoundedRect(x - width / 2 + 6, y - height / 2 + 4, width - 12, height * 0.25, r - 4);

  g.lineStyle(3, toColor(color.primary), 0.9);
  g.strokeRoundedRect(x - width / 2, y - height / 2, width, height, r);
  g.lineStyle(1, toColor(color.accent), 0.4);
  g.strokeRoundedRect(x - width / 2 + 3, y - height / 2 + 3, width - 6, height - 6, r - 2);

  g.setDepth(z.panel);
  return g;
}

export { color, type, sp, radius, shadow, z, dur, glow, fontStyle, toColor, lighten, darken, liquidPalette };
