// UI draw helpers tái dùng (design-system component core)
import Phaser from 'phaser';
import { color, radius, type, toColor } from './tokens';

export interface ButtonOpts {
  testid?: string;
  variant?: 'primary' | 'ghost';
  width?: number;
  textType?: typeof type.display;
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
  const w = opts.width ?? Math.max(280, label.length * (opts.textType?.size ?? type.display.size) * 0.6);
  const h = 72;
  const t = opts.textType ?? type.display;
  const container = scene.add.container(x, y).setDepth(50);

  const g = scene.add.graphics();
  // shadow trước (đặt sau trong z → đổ lên) — vẽ trước để nằm sau fill
  g.fillStyle(toColor(color.shadow), 0.30);
  g.fillRoundedRect(-w / 2, -h / 2 + 6, w, h, radius.lg);
  // nền nút
  if (variant === 'primary') {
    g.fillStyle(toColor(color.primary), 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, radius.lg);
    // viền đậm dưới (nút nổi chibi)
    g.fillStyle(toColor(color.primaryDark), 1);
    g.fillRoundedRect(-w / 2, h / 2 - 8, w, 8, { tl: 0, tr: 0, bl: radius.lg, br: radius.lg });
  } else {
    g.fillStyle(toColor(color.surface), 0.95);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, radius.lg);
    g.lineStyle(4, toColor(color.primary), 1);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, radius.lg);
  }
  container.add(g);

  const textObj = scene.add.text(0, 0, label, {
    fontFamily: 'sans-serif',
    fontSize: `${t.size}px`,
    fontStyle: 'bold',
    color: variant === 'primary' ? color.textOnPrimary : color.textPrimary,
  }).setOrigin(0.5);
  container.add(textObj);

  if (opts.testid) textObj.setData('testid', opts.testid);
  container.setSize(w, h);
  container.setInteractive({ useHandCursor: true });
  return { container, textObj };
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