/**
 * M7 Skip King — WaterRenderer (T3 Tầng B): mặt nước animate + waterline testid.
 * Horizon phát hiện từ art T6 (y=576 — measure_horizon.py) neo trong LAYOUT.horizonY.
 * Nước = các dải sóng co giãn sin theo thời gian + sprite 'sunset_bg' làm trời/nền.
 */
import * as Phaser from 'phaser';
import type { Projection } from './layout';

const WAVE_BANDS = 7;

export class WaterRenderer {
  private bands: { rect: Phaser.GameObjects.Rectangle; baseY: number; amp: number; phase: number }[] =
    [];
  private wavePhase = 0;

  constructor(scene: Phaser.Scene, proj: Projection, canvasWidth: number) {
    // Trời/nền sunset (T6 art) — neo mép trên, phủ tới chân trời.
    if (scene.textures.exists('sunset_bg')) {
      const bg = scene.add.image(0, 0, 'sunset_bg').setOrigin(0, 0).setDepth(0);
      bg.setDisplaySize(canvasWidth, proj.horizonY + 2);
    }
    // Waterline marker: rect testid 'waterline' tại y chân trời (QA soi vị trí đá biến mất).
    scene.add
      .rectangle(canvasWidth / 2, proj.horizonY, canvasWidth, 3, 0xdfe9ff, 0.9)
      .setDepth(5)
      .setData('testid', 'waterline');

    // Dải nước: từ horizon xuống đáy, tối dần về gần (sâu cảm nhận bằng gradient dải).
    for (let i = 0; i < WAVE_BANDS; i++) {
      const t = i / (WAVE_BANDS - 1); // 0 = horizon, 1 = gần
      const baseY = proj.horizonY + (proj.waterlineY - proj.horizonY) * Math.pow(t, 1.35);
      const h = 10 + 60 * t;
      const rect = scene.add
        .rectangle(canvasWidth / 2, baseY + h / 2, canvasWidth, h, 0x14506e, 0.9 - 0.55 * t)
        .setDepth(3);
      this.bands.push({ rect, baseY: baseY + h / 2, amp: 1.5 + 5 * t, phase: i * 1.7 });
    }
  }

  /** Animate mặt nước — gọi mỗi frame với delta (ms). */
  update(deltaMs: number): void {
    this.wavePhase += deltaMs * 0.0035;
    for (const b of this.bands) {
      b.rect.y = b.baseY + Math.sin(this.wavePhase + b.phase) * b.amp;
    }
  }
}
