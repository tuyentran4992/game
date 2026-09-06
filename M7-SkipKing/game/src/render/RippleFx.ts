/**
 * M7 Skip King — RippleFx (T3 Tầng B): vòng sóng lan tại điểm nảy/splash.
 * Pool tái dùng FX.ripplePool objects — không new/destroy mỗi frame (ROLE-RULES perf).
 * Sprite 'ripple' (T6) nếu có, fallback ring tự generate.
 */
import * as Phaser from 'phaser';
import { FX } from './layout';

const RIPPLE_TEX = 'ripple';
const RIPPLE_FB_KEY = 'ripple_fb';
const RIPPLE_FB_PX = 64;

interface RippleItem {
  img: Phaser.GameObjects.Image;
  baseScale: number;
  t: number; // 0..1 tuổi thọ
  active: boolean;
}

export class RippleFx {
  private pool: RippleItem[] = [];

  constructor(scene: Phaser.Scene, private depth = 6) {
    if (!scene.textures.exists(RIPPLE_TEX)) {
      const g = scene.make.graphics({ x: 0, y: 0 });
      g.lineStyle(3, 0xdfe9ff, 1);
      g.strokeCircle(RIPPLE_FB_PX / 2, RIPPLE_FB_PX / 2, RIPPLE_FB_PX / 2 - 3);
      g.generateTexture(RIPPLE_FB_KEY, RIPPLE_FB_PX, RIPPLE_FB_PX);
      g.destroy();
    }
    const key = scene.textures.exists(RIPPLE_TEX) ? RIPPLE_TEX : RIPPLE_FB_KEY;
    for (let i = 0; i < FX.ripplePool; i++) {
      const img = scene.add
        .image(-100, -100, key)
        .setDepth(this.depth)
        .setVisible(false)
        .setActive(false);
      this.pool.push({ img, baseScale: 1, t: 1, active: false });
    }
  }

  /** Spawn 1 vòng ripple tại điểm màn hình; scale = độ mạnh chạm (0..1+). */
  spawn(screenX: number, screenY: number, scale: number): void {
    const item = this.pool.find((r) => !r.active) ?? this.pool[0]; // pool đầy → tái dùng cũ nhất
    item.active = true;
    item.t = 0;
    item.baseScale = Math.max(0.4, Math.min(1.6, scale));
    item.img.setPosition(screenX, screenY).setVisible(true).setActive(true).setAlpha(0.95);
  }

  /** Tiến vòng ripple — gọi mỗi frame với delta (ms). */
  update(deltaMs: number): void {
    const step = deltaMs / 620; // ~0.6s vòng lan hết rồi tắt — [PLACEHOLDER] feel-tune T4
    for (const r of this.pool) {
      if (!r.active) continue;
      r.t = Math.min(1, r.t + step);
      r.img.setScale(r.baseScale * (0.5 + r.t * 1.6));
      r.img.setAlpha(0.95 * (1 - r.t));
      if (r.t >= 1) {
        r.active = false;
        r.img.setVisible(false).setActive(false);
      }
    }
  }
}
