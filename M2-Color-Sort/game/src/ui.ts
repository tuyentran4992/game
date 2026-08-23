// UI helpers M2 Neon Galaxy — vẽ nền deep-space + sao + ống thủy tinh + chất lỏng neon.
// Canvas Phaser Graphics, KHÔNG DOM. Tham chiếu DESIGN-SPEC §3.
import Phaser from 'phaser';
import { color, type, sp, radius, shadow, z, dur, glow, fontStyle, toColor, lighten, darken } from './tokens';

// ---------- Nền deep-space gradient + sao nhấp nháy (DESIGN-SPEC §1.1) ----------
export function drawGalaxyBg(scene: Phaser.Scene): { g: Phaser.GameObjects.Graphics; stars: Phaser.GameObjects.Arc[] } {
  const { width, height } = scene.scale;
  const g = scene.add.graphics().setDepth(z.bg);
  // gradient 3 điểm: top (#0B0B1E) → mid (#16123B) → bottom (#2A1668)
  const steps = 32;
  const topC = Phaser.Display.Color.HexStringToColor(color.bg.top);
  const midC = Phaser.Display.Color.HexStringToColor(color.bg.mid);
  const botC = Phaser.Display.Color.HexStringToColor(color.bg.bottom);
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    const c = t < 0.5
      ? Phaser.Display.Color.Interpolate.ColorWithColor(topC, midC, steps, i)
      : Phaser.Display.Color.Interpolate.ColorWithColor(midC, botC, steps, i);
    g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
    g.fillRect(0, (height * i) / steps, width, height / steps + 1);
  }
  // tinh vân mờ (oval alpha thấp giữa) — DESIGN-SPEC §1.1
  g.fillStyle(toColor(color.primary), 0.05);
  g.fillEllipse(width / 2, height * 0.45, width * 0.6, height * 0.25);
  // sao nhỏ phân bố ngẫu nhiên vùng trên (y < 60% height) — DESIGN-SPEC §1.1
  const stars: Phaser.GameObjects.Arc[] = [];
  const starCount = Math.max(28, Math.floor((width * height) / 32000));
  for (let i = 0; i < starCount; i++) {
    const sx = Phaser.Math.Between(0, width);
    const sy = Phaser.Math.Between(0, Math.floor(height * 0.6));
    const r = Phaser.Math.FloatBetween(0.5, 1.5);
    const a = Phaser.Math.FloatBetween(0.2, 0.6);
    const star = scene.add.circle(sx, sy, r, toColor('#FFFFFF'), a).setDepth(z.bg + 0.1);
    stars.push(star);
    // nhấp nháy sine phase lệch (dur.slow)
    scene.tweens.add({
      targets: star, alpha: { from: a, to: a * 0.3 },
      duration: dur.slow * 2, yoyo: true, repeat: -1, ease: 'sine.inout',
      delay: Phaser.Math.FloatBetween(0, dur.slow * 2),
    });
  }
  return { g, stars };
}

// ---------- Ống thủy tinh + chất lỏng (DESIGN-SPEC §3.1, §3.2) ----------
// tubeW/tubeH kích thước ống; content = mảng màu từ đáy (index 0) → đỉnh.
export interface TubeViews {
  container: Phaser.GameObjects.Container;
  glass: Phaser.GameObjects.Graphics;
  liquidG: Phaser.GameObjects.Graphics;
  glowRing: Phaser.GameObjects.Graphics;
  ambientGlow: Phaser.GameObjects.Graphics;
  width: number; height: number; capacity: number;
}

export function drawTube(
  scene: Phaser.Scene,
  tubeW: number, tubeH: number, capacity: number,
): TubeViews {
  const container = scene.add.container(0, 0).setDepth(z.actor);
  // ambient neon glow quanh viền ống (DESIGN-SPEC §1.4 nz.glow — phụ trợ phát sáng trên nền tối)
  // vẽ dưới tất cả, blend ADD; màu cập nhật trong renderLiquid theo chất lỏng đỉnh / trắng neon.
  const ambientGlow = scene.add.graphics().setDepth(z.actor - 1).setBlendMode(Phaser.BlendModes.ADD);
  container.add(ambientGlow);

  // glow ring ngoài (ẩn mặc định, hiện khi selected — DESIGN-SPEC §3.1 selected)
  const glowRing = scene.add.graphics().setDepth(z.actor + 0);
  glowRing.lineStyle(3, toColor(glow.tube.color), glow.tube.alpha);
  glowRing.strokeRoundedRect(-tubeW / 2 - 6, -tubeH / 2 - 6, tubeW + 12, tubeH + 12, 40);
  glowRing.setAlpha(0);
  container.add(glowRing);

  // chất lỏng (vẽ dưới, từ đáy lên) — DESIGN-SPEC §3.2
  const liquidG = scene.add.graphics().setDepth(z.actor + 1);
  container.add(liquidG);

  // thân thủy tinh (vẽ trên chất lỏng) — DESIGN-SPEC §3.1
  const glass = scene.add.graphics().setDepth(z.actor + 2);
  // fill gradient xám-alpha (trong suốt)
  const halfW = tubeW / 2, halfH = tubeH / 2;
  const innerPad = 3; // khe 3px giữa chất lỏng và thành (§3.2)
  // thân: fill nhẹ alpha 0.10 toàn ống
  glass.fillStyle(toColor('#FFFFFF'), 0.06);
  glass.fillRoundedRect(-halfW, -halfH, tubeW, tubeH, 40);
  // 2 sọc dọc sáng phản chiếu kính (bên trái) alpha 0.30
  glass.fillStyle(toColor('#FFFFFF'), 0.18);
  glass.fillRect(-halfW + 6, -halfH + 12, 4, tubeH - 24);
  glass.fillStyle(toColor('#FFFFFF'), 0.10);
  glass.fillRect(-halfW + 14, -halfH + 16, 2, tubeH - 32);
  // viền 2 nét: ngoài 2px trắng alpha 0.20, trong 1.5px trắng alpha 0.40
  glass.lineStyle(2, toColor('#FFFFFF'), 0.20);
  glass.strokeRoundedRect(-halfW, -halfH, tubeW, tubeH, 40);
  glass.lineStyle(1.5, toColor('#FFFFFF'), 0.40);
  glass.strokeRoundedRect(-halfW + 1.5, -halfH + 1.5, tubeW - 3, tubeH - 3, 38);
  // miệng ống (viền trên 2px trắng alpha 0.35, loe nhẹ)
  glass.lineStyle(2, toColor('#FFFFFF'), 0.35);
  glass.beginPath();
  glass.moveTo(-halfW, -halfH);
  glass.lineTo(halfW, -halfH);
  glass.strokePath();
  // đáy ellipse trắng alpha 0.25 (đế đứng)
  glass.fillStyle(toColor('#FFFFFF'), 0.15);
  glass.fillEllipse(0, halfH - 4, tubeW * 0.7, 10);
  container.add(glass);

  return { container, glass, liquidG, glowRing, ambientGlow, width: tubeW, height: tubeH, capacity };
}

// Vẽ lại chất lỏng trong ống theo content (mảng màu từ đáy). DESIGN-SPEC §3.2 glow 3 lớp.
export function renderLiquid(
  views: TubeViews,
  content: string[],
): void {
  const { liquidG, ambientGlow, width: tubeW, height: tubeH, capacity } = views;
  liquidG.clear();
  // Ambient neon glow quanh viền ống (DESIGN-SPEC §1.4 + §3.2 glow) — màu theo chất lỏng đỉnh,
  // trắng neon nếu ống trống. Multi-stroke mở rộng dần, alpha giảm → giả blur halo (blend ADD).
  // Giữ alpha thấp để chất lỏng/ống không bị chói quá (§3.2).
  const glowHex = content.length > 0 ? content[content.length - 1] : '#FFFFFF';
  const glowC = toColor(glowHex);
  ambientGlow.clear();
  const halfWG = tubeW / 2, halfHG = tubeH / 2;
  const haloLayers = 4;
  for (let l = 0; l < haloLayers; l++) {
    const pad = 2 + l * 4;
    const a = 0.18 - l * 0.04;   // 0.18 → 0.14 → 0.10 → 0.06
    ambientGlow.lineStyle(3, glowC, a);
    ambientGlow.strokeRoundedRect(-halfWG - pad, -halfHG - pad, tubeW + pad * 2, tubeH + pad * 2, 40 + pad);
  }
  if (content.length === 0) return;
  const innerPad = 3; // khe 3px giữa chất lỏng và thành (§3.2)
  const layerH = (tubeH - innerPad * 2) / capacity;
  const halfW = tubeW / 2, halfH = tubeH / 2;
  const liquidW = tubeW - innerPad * 2;
  for (let i = 0; i < content.length; i++) {
    const hex = content[i];
    const yTop = halfH - innerPad - (i + 1) * layerH; // y đỉnh lớp (local, - = lên)
    const yBot = halfH - innerPad - i * layerH;
    // LỚP 1 — gradient dọc: từ hex (đáy) → lighten hex (đỉnh lớp)
    const topHex = lighten(hex, 0.25);
    const steps = 6;
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const c = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.HexStringToColor(hex),
        Phaser.Display.Color.HexStringToColor(topHex), steps, s);
      liquidG.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
      liquidG.fillRect(-halfW + innerPad, yTop + (layerH * s / steps), liquidW, layerH / steps + 0.5);
    }
    // LỚP 2 — glow ngoài (halo) alpha 0.55 — chỉ vẽ nhẹ viền 2 bên + đáy
    liquidG.lineStyle(2, toColor(hex), 0.55);
    liquidG.strokeRect(-halfW + innerPad, yTop, liquidW, layerH);
    // LỚP 3 — đỉnh highlight trắng alpha 0.35 dày 2px (mặt thoáng lớp trên cùng)
    if (i === content.length - 1) {
      liquidG.fillStyle(toColor('#FFFFFF'), 0.35);
      liquidG.fillRect(-halfW + innerPad, yTop, liquidW, 2);
    }
    // đường ngăn 1px tone tối hơn 20% giữa 2 lớp (§3.2) — nếu còn lớp dưới
    if (i < content.length - 1) {
      liquidG.lineStyle(1, toColor(darken(hex, 0.20)), 1);
      liquidG.beginPath();
      liquidG.moveTo(-halfW + innerPad, yTop);
      liquidG.lineTo(halfW - innerPad, yTop);
      liquidG.strokePath();
    }
  }
}

// ---------- Icon glyphs cho nút toolbar (DESIGN-SPEC §3.4 — vẽ bằng Graphics, KHÔNG sprite) ----------
// undo = mũi tên cong quay ngược; restart = vòng tròn + mũi tên.
function drawArcArrow(
  g: Phaser.GameObjects.Graphics,
  r: number, startAngle: number, endAngle: number, anticlockwise: boolean,
  col: number, lineWidth: number, arrowAt: 'start' | 'end', ah: number, aw: number,
): void {
  // Tính sweep (góc quét thực tế)
  let sweep = endAngle - startAngle;
  if (!anticlockwise) {
    // clockwise = góc tăng; nếu end ≤ start thì cộng 2π
    if (sweep <= 0) sweep += Math.PI * 2;
  } else {
    // counter-clockwise = góc giảm; nếu end ≥ start thì trừ 2π
    if (sweep >= 0) sweep -= Math.PI * 2;
  }
  // Vẽ cung bằng nhiều đoạn thẳng (lineTo) — đáng tin cậy hơn arc() trong Phaser Graphics
  const segs = 40;
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
  // Mũi tên tại đầu hoặc cuối cung
  const ang = arrowAt === 'start' ? startAngle : endAngle;
  const px = Math.cos(ang) * r, py = Math.sin(ang) * r;
  const dir = anticlockwise ? -1 : 1;   // +1 = clockwise (tăng góc), -1 = anticlockwise
  const tdx = -Math.sin(ang) * dir, tdy = Math.cos(ang) * dir;
  const tipx = px, tipy = py;
  const bcx = px - tdx * ah, bcy = py - tdy * ah;
  const nx = -tdy, ny = tdx;
  g.fillStyle(col, 1);
  g.fillTriangle(tipx, tipy, bcx + nx * aw, bcy + ny * aw, bcx - nx * aw, bcy - ny * aw);
}

export function drawToolbarIcon(
  scene: Phaser.Scene,
  kind: 'undo' | 'restart',
  col: number,
  size = 30,
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  const r = size * 0.45;
  const lw = Math.max(2.5, size * 0.11);
  const ah = size * 0.32;   // chiều dài mũi tên
  const aw = size * 0.22;   // nửa rộng đáy mũi tên
  if (kind === 'undo') {
    // mũi tên cong quay ngược: cung 270°, hở đáy (90°), mũi tên ở đầu (lower-left) chỉ chéo lên-trái
    const start = Phaser.Math.DegToRad(135);
    const end = Phaser.Math.DegToRad(45);   // clockwise → Phaser cộng 2π, vẽ đường dài qua đỉnh
    drawArcArrow(g, r, start, end, false, col, lw, 'start', ah, aw);
  } else {
    // restart: cung 300°, hở 60° góc trên-phải, mũi tên ở cuối (upper-right) chỉ tiếp tuyến
    const start = Phaser.Math.DegToRad(30);
    const end = Phaser.Math.DegToRad(330);   // clockwise 30→90→180→270→330 = 300°
    drawArcArrow(g, r, start, end, false, col, lw, 'end', ah, aw);
  }
  return g;
}

// ---------- btn-primary (DESIGN-SPEC §3.5) + btn-ghost toolbar (§3.4) ----------
export function drawButton(
  scene: Phaser.Scene,
  x: number, y: number, text: string,
  opts: { width?: number; variant?: 'primary' | 'ghost'; testid?: string; textType?: { size: string; weight: string; lh: number }; icon?: 'undo' | 'restart' | null } = {},
): { container: Phaser.GameObjects.Container; textObj: Phaser.GameObjects.Text } {
  const width = opts.width ?? 280;
  const height = 72;
  const variant = opts.variant ?? 'primary';
  const textType = opts.textType ?? type.display;
  const useIcon = opts.icon === 'undo' || opts.icon === 'restart';
  const g = scene.add.graphics();
  const fill = variant === 'primary' ? color.primary : color.surface;
  const txtColor = variant === 'primary' ? color.textOnAccent : color.textOnPrimary;
  // shadow trước
  g.fillStyle(toColor(color.shadow), shadow.btn.alpha);
  g.fillRoundedRect(-width / 2, -height / 2 + shadow.btn.dy, width, height, radius.lg);
  // fill
  g.fillStyle(toColor(fill), 1);
  g.fillRoundedRect(-width / 2, -height / 2, width, height, radius.lg);
  if (variant === 'ghost') {
    // btn-ghost Neon Galaxy (§3.4): nền trắng alpha 0.08, viền 4px primary, text trắng
    g.fillStyle(toColor('#FFFFFF'), 0.08);
    g.fillRoundedRect(-width / 2, -height / 2, width, height, radius.lg);
    g.lineStyle(4, toColor(color.primary), 1);
    g.strokeRoundedRect(-width / 2, -height / 2, width, height, radius.lg);
  } else {
    // btn-primary neon: glow primary (DESIGN-SPEC §1.4)
    g.fillStyle(toColor(glow.primary.color), glow.primary.alpha * 0.4);
    g.fillRoundedRect(-width / 2 - 4, -height / 2 - 4, width + 8, height + 8, radius.lg + 4);
    g.fillStyle(toColor(fill), 1);
    g.fillRoundedRect(-width / 2, -height / 2, width, height, radius.lg);
    // viền dưới primary.dark 6px
    g.fillStyle(toColor(color.primaryDark), 1);
    g.fillRect(-width / 2, height / 2 - 6, width, 6);
  }
  g.setDepth(z.panel);
  const t = scene.add.text(0, 0, useIcon ? '' : text, fontStyle(textType, txtColor)).setOrigin(0.5).setDepth(z.panel + 1);
  const children: Phaser.GameObjects.GameObject[] = [g, t];
  // icon glyph thay text cho undo/restart (DESIGN-SPEC §3.4 — vẽ Graphics)
  let iconG: Phaser.GameObjects.Graphics | null = null;
  if (useIcon) {
    iconG = drawToolbarIcon(scene, opts.icon as 'undo' | 'restart', (variant === 'ghost' ? toColor(color.primary) : toColor(txtColor)), Math.min(30, height - 24));
    iconG.setPosition(0, 0).setDepth(z.panel + 1);
    children.push(iconG);
  }
  const container = scene.add.container(x, y, children).setSize(width, height).setDepth(z.panel);
  if (opts.testid) {
    g.setData('testid', opts.testid);
    t.setData('testid', opts.testid);
    container.setData('testid', opts.testid);
    if (iconG) iconG.setData('testid', opts.testid);
  }
  container.setInteractive({ useHandCursor: true });
  const playClick = () => {
    if (scene.cache.audio.exists('sfx_click')) scene.sound.play('sfx_click', { volume: 0.35 });
  };
  container.on('pointerover', () => scene.tweens.add({ targets: container, scale: 1.03, duration: dur.hover, ease: 'quad.out' }));
  container.on('pointerout', () => scene.tweens.add({ targets: container, scale: 1, duration: dur.hover, ease: 'quad.out' }));
  container.on('pointerdown', () => { playClick(); scene.tweens.add({ targets: container, scale: 0.96, duration: dur.fast, ease: 'quad.in' }); });
  container.on('pointerup', () => scene.tweens.add({ targets: container, scale: 1.03, duration: dur.hover, ease: 'quad.out' }));
  return { container, textObj: t };
}

// ---------- Panel (Level Clear — DESIGN-SPEC §3.5) ----------
export function drawPanel(scene: Phaser.Scene, x: number, y: number, width: number, height: number): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(toColor(color.shadow), shadow.panel.alpha);
  g.fillRoundedRect(x - width / 2, y - height / 2 + shadow.panel.dy, width, height, radius.lg);
  // fill surface alpha 0.92 (§3.5 — thấy xuyên chút galaxy)
  g.fillStyle(toColor(color.surface), 0.92);
  g.fillRoundedRect(x - width / 2, y - height / 2, width, height, radius.lg);
  g.lineStyle(4, toColor(color.primary), 1);
  g.strokeRoundedRect(x - width / 2, y - height / 2, width, height, radius.lg);
  g.setDepth(z.panel);
  return g;
}

export { color, type, sp, radius, shadow, z, dur, glow, fontStyle, toColor, lighten, darken };
