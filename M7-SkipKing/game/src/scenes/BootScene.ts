import * as Phaser from 'phaser';

/**
 * T6 — preload art Skip King (stone/splash/ripple/sunset_bg), sau đó chuyển OnboardingPlayScene (T4).
 * Tầng B mỏng (CONTRACT mục 1): CHỈ load asset — không render, không luật chơi.
 * Key/file viết LITERAL để asset manifest check của verify_game.sh (rào 4) grep được.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  public preload(): void {
    this.load.image('stone', 'assets/stone.png');
    this.load.image('splash', 'assets/splash.png');
    this.load.image('ripple', 'assets/ripple.png');
    this.load.image('sunset_bg', 'assets/sunset_bg.png');
  }

  public create(): void {
    // Preload xong → handoff OnboardingPlayScene (T4: demo-once tự quyết stage demo/local qua
    // OnboardingDirector tầng A — CONTRACT 3.1; BUG-L2-01: create() rỗng khiến game màn đen —
    // dòng glue này giữa T3/T6/T4 do MG hợp nhất khi merge tuần tự).
    this.scene.start('OnboardingPlayScene');
  }
}
