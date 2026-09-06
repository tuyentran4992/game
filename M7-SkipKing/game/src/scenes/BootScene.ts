import * as Phaser from 'phaser';

/**
 * T1 stub — BootScene trống có chủ đích: chỉ đảm bảo game boot không lỗi.
 * Tầng B mỏng (CONTRACT mục 1): preload/wiring thật thuộc T6, PlayScene thuộc T3/T4.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  public preload(): void {
    // T6 — art preload
  }

  public create(): void {
    // T3 — chuyển PlayScene
  }
}
