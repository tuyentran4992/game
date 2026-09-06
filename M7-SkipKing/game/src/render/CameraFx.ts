/**
 * M7 Skip King — CameraFx (T3 Tầng B): punch/shake API — T4 gọi khi PERFECT/splash.
 * Đọc số từ config tầng A khi có (camera effects không phải luật chơi — juice).
 * API sẵn sàng từ T3: punch(strength) + shake(durationMs).
 */
import * as Phaser from 'phaser';

export class CameraFx {
  constructor(private camera: Phaser.Cameras.Scene2D.Camera) {}

  /** Punch zoom nhẹ (juice khi nảy mạnh / PERFECT — CONTRACT §6). */
  punch(strength = 0.02): void {
    const z = this.camera.zoom;
    this.camera.setZoom(z + strength);
    this.camera.scene.tweens.add({
      targets: this.camera,
      zoom: z,
      duration: 140, // ms — hồi nhanh, [PLACEHOLDER] feel-tune T4
      ease: 'Sine.easeOut',
    });
  }

  /** Rung camera (splash chìm — CONTRACT §6). */
  shake(durationMs = 120): void {
    this.camera.shake(durationMs, 0.004);
  }
}
