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

// Boot scene — preload asset
class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'BootScene' }); }
  preload() {
    this.load.baseURL = './raw/';
    this.load.image('tube_base', 'tube_base.png');
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
  scale: { mode: Scale.RESIZE, width: '100%', height: '100%' },
  backgroundColor: '#070512',
  scene: [BootScene, StartScene, GameplayScene, LevelClearScene],
  render: { antialias: true, roundPixels: true },
};

const game = new Phaser.Game(config);

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

sdk.gameReady();
