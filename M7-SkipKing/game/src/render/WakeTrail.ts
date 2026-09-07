/**
 * M7 Skip King — WakeTrail (FUN2-C2, Tầng B): vệt lướt LIÊN TỤC theo viên đá đang bay —
 * câu trả lời trực tiếp cho "chưa có cảm giác đá lướt trên mặt nước" (feedback boss 07/09):
 * lướt là chuyển động liên tục, dấu vết phải theo QUỸ ĐẠO chứ không chỉ tại điểm chạm.
 * Pool tái dùng (spawn → mờ dần → tái sử dụng), không new/destroy mỗi frame (ROLE-RULES perf).
 * Trắng mờ alpha 0.25–0.5 — KHÔNG màu mới (kỷ luật palette ux-ui); renderer CHỈ ĐỌC Stone
 * tầng A qua projection (0 tự tính luật — CONTRACT bounds).
 */
import * as Phaser from 'phaser';
import { FX, SKIM } from './layout';

const WAKE_TEX = 'skim_wake';
const WAKE_PX = 44;
/** Dải alpha hiển thị — khóa thống nhất với test (ux-ui: trắng mờ 0.25–0.5). */
export const SKIM_ALPHA_MIN = 0.25;
export const SKIM_ALPHA_MAX = 0.5;
export const TESTID_WAKE = 'skim-wake';

interface WakeItem {
  img: Phaser.GameObjects.Image;
  t: number; // 0..1 tuổi thọ
  active: boolean;
}

export class WakeTrail {
  private pool: WakeItem[] = [];

  constructor(scene: Phaser.Scene, private depth = 4) {
    // Fallback texture: đốm tròn mờ trắng (chưa có art T6 riêng cho wake).
    const g = scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xffffff, 1);
    g.fillCircle(WAKE_PX / 2, WAKE_PX / 2, WAKE_PX / 2 - 4);
    g.generateTexture(WAKE_TEX, WAKE_PX, WAKE_PX);
    g.destroy();
    for (let i = 0; i < FX.wakePool; i++) {
      const img = scene.add
        .image(-100, -100, WAKE_TEX)
        .setDepth(this.depth)
        .setVisible(false)
        .setActive(false)
        .setAlpha(0)
        .setData('testid', TESTID_WAKE); // pattern TEST-FIELDS — QA soi qua testid
      this.pool.push({ img, t: 1, active: false });
    }
  }

  /** Spawn 1 hạt wake tại điểm màn hình — pool đầy → tái dùng cũ nhất (không new). */
  spawn(screenX: number, screenY: number, scaleZ: number): void {
    const item = this.pool.find((w) => !w.active) ?? this.pool[0];
    item.active = true;
    item.t = 0;
    item.img
      .setPosition(screenX, screenY)
      .setScale((SKIM.wakeRadiusPx * 2 / WAKE_PX) * Math.max(0.4, Math.min(1, scaleZ)))
      .setVisible(true)
      .setActive(true)
      .setAlpha(SKIM_ALPHA_MAX);
  }

  /** Tiến hạt wake — gọi mỗi frame với delta thực tế render (ms). */
  update(deltaMs: number): void {
    const step = deltaMs / SKIM.wakeLifeMs;
    for (const w of this.pool) {
      if (!w.active) continue;
      w.t = Math.min(1, w.t + step);
      if (w.t >= 1) {
        w.active = false;
        w.img.setVisible(false).setActive(false).setAlpha(0);
        continue;
      }
      // Mờ dần về 0.25 rồi 0 — luôn trong dải trắng mờ (kỷ luật palette).
      w.img.setAlpha(SKIM_ALPHA_MAX - (SKIM_ALPHA_MAX - SKIM_ALPHA_MIN) * w.t);
    }
  }

  // ---- mirror test (wiring Fun2Skim — không lộ logic mới) ----
  poolSizeForTest(): number {
    return this.pool.length;
  }
  visibleCountForTest(): number {
    return this.pool.filter((w) => w.active).length;
  }
}
