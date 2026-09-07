/**
 * M7 Skip King — FoamFx (FUN2-C2, Tầng B): foam TRẮNG nổ tại mỗi điểm chạm nước
 * (bounce + splash) — THÊM LỚP đè lên ripple hiện có; đường gọi RippleFx GIỮ NGUYÊN
 * (test neo ripple wiring không được vỡ — foam thêm lớp chứ không thay).
 * Pool tái dùng (không new/destroy mỗi frame — ROLE-RULES perf); alpha 0.25–0.5,
 * KHÔNG màu mới (kỷ luật palette ux-ui). Renderer chỉ đọc metadata event đã có.
 */
import * as Phaser from 'phaser';
import { FX, SKIM } from './layout';

const FOAM_TEX = 'skim_foam';
const FOAM_PX = 80;
import { SKIM_ALPHA_MIN, SKIM_ALPHA_MAX } from './WakeTrail';
const TESTID_FOAM = 'skim-foam';

interface FoamItem {
  img: Phaser.GameObjects.Image;
  baseScale: number;
  t: number; // 0..1 tuổi thọ
  active: boolean;
}

export class FoamFx {
  private pool: FoamItem[] = [];

  constructor(scene: Phaser.Scene, private depth = 5) {
    // Fallback texture: vòng trắng dày (foam) — đậm hơn wake, đọc rõ trên nước.
    const g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xffffff, 1);
    g.fillCircle(FOAM_PX / 2, FOAM_PX / 2, FOAM_PX / 2 - 6);
    g.fillStyle(0x14506e, 1); // lỗ giữa màu nước — foam vành đai, không đục kín mặt
    g.fillCircle(FOAM_PX / 2, FOAM_PX / 2, FOAM_PX / 2 - 20);
    g.generateTexture(FOAM_TEX, FOAM_PX, FOAM_PX);
    g.destroy();
    for (let i = 0; i < FX.foamPool; i++) {
      const img = scene.add
        .image(-100, -100, FOAM_TEX)
        .setDepth(this.depth)
        .setVisible(false)
        .setActive(false)
        .setAlpha(0)
        .setData('testid', TESTID_FOAM); // pattern TEST-FIELDS — QA soi qua testid
      this.pool.push({ img, baseScale: 1, t: 1, active: false });
    }
  }

  /** Spawn 1 cụm foam tại điểm màn hình; impactScale = hệ số điểm chạm (0.7–1.3). */
  spawn(screenX: number, screenY: number, baseRadiusPx: number, impactScale: number, scaleZ: number): void {
    const item = this.pool.find((f) => !f.active) ?? this.pool[0];
    item.active = true;
    item.t = 0;
    item.baseScale =
      (baseRadiusPx * 2 / FOAM_PX) * Math.max(0.7, Math.min(1.3, impactScale)) *
      Math.max(0.4, Math.min(1, scaleZ));
    item.img.setPosition(screenX, screenY).setVisible(true).setActive(true).setAlpha(SKIM_ALPHA_MAX);
  }

  /** Tiến foam — gọi mỗi frame với delta render (ms). Trong hitstop delta=0 → giữ hình. */
  update(deltaMs: number): void {
    const step = deltaMs / SKIM.foamLifeMs;
    for (const f of this.pool) {
      if (!f.active) continue;
      f.t = Math.min(1, f.t + step);
      if (f.t >= 1) {
        f.active = false;
        f.img.setVisible(false).setActive(false).setAlpha(0);
        continue;
      }
      // Nở ra + mờ dần trong dải trắng mờ (0.25–0.5 — không lóe sáng gắt).
      f.img.setScale(f.baseScale * (1 + f.t * 0.6));
      f.img.setAlpha(SKIM_ALPHA_MAX - (SKIM_ALPHA_MAX - SKIM_ALPHA_MIN) * f.t);
    }
  }

  // ---- mirror test (wiring Fun2Skim — không lộ logic mới) ----
  poolSizeForTest(): number {
    return this.pool.length;
  }
  visibleCountForTest(): number {
    return this.pool.filter((f) => f.active).length;
  }
}
