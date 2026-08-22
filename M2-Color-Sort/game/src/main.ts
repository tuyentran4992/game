import Phaser from 'phaser';
import { Scale, AUTO } from 'phaser';
import { sdk } from './sdk-instance';
import { StartScene } from './scenes/Start';
import { GameplayScene } from './scenes/Gameplay';
import { LevelClearScene } from './scenes/LevelClear';
import { ctx } from './context';
import { color, dur } from './tokens';

export const GAME_TITLE = 'Neon Sort: Galaxy Pour';
export const GAME_NAME = 'neon-sort';

// Boot scene — preload asset (chưa gen → fallback hình học Phaser vẽ neon, không crash).
class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'BootScene' }); }
  preload() {
    // base path để chạy khi đóng gói zip (BR-05, không mạng ngoài)
    this.load.baseURL = './raw/';
    // asset M2 theo games/neon-sort.yaml — khi chưa có file, Phaser báo warning nhưng không crash
    // (fallback vẽ hình học neon trong scene). Lắng nghe loaderror để log chứ không crash.
    this.load.image('tube_base', 'tube_base.png');
    this.load.image('liquid_neon', 'liquid_neon.png');
    this.load.image('bg_space', 'bg_space.png');
    this.load.audio('bgm_main', 'bgm_main.mp3');
    this.load.audio('sfx_pour', 'sfx_pour.mp3');
    this.load.audio('sfx_error', 'sfx_error.mp3');
    this.load.audio('sfx_clear', 'sfx_clear.mp3');
    this.load.audio('sfx_click', 'sfx_click.mp3');
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.warn(`asset missing (fallback geometric): ${file.key}`);
    });
  }
  create() {
    const canvas = this.game.canvas;
    if (canvas) canvas.setAttribute('data-testid', 'game-canvas');
    // tải progress từ SDK (M2-08) trước khi vào Start
    ctx.load().finally(() => {
      this.cameras.main.fadeOut(dur.scene, 0, 0, 0);
      this.time.delayedCall(dur.scene, () => this.scene.start('StartScene'));
    });
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: AUTO,
  parent: 'game',
  // BR-05: responsive mọi aspect, RESIZE tự co, giữ state
  scale: { mode: Scale.RESIZE, width: '100%', height: '100%' },
  backgroundColor: color.bg.top,
  scene: [BootScene, StartScene, GameplayScene, LevelClearScene],
  render: { antialias: true, roundPixels: true },
};

const game = new Phaser.Game(config);

// BR-04: obey pause/resume/mute ngay lập tức (M2-11)
sdk.onPause(() => {
  game.scene.pause('GameplayScene');
  game.sound.mute = true;
});
sdk.onResume(() => {
  game.sound.mute = !sdk.isAudioEnabled();
  game.scene.resume('GameplayScene');
});
sdk.onAudioEnabledChange((enabled: boolean) => {
  game.sound.mute = !enabled;
});

// Fire gameReady khi đã sẵn sàng tương tác (SPEC §7)
sdk.gameReady();
