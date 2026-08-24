import Phaser from 'phaser';
import { Scale, AUTO } from 'phaser';
import { sdk } from './sdk-instance';
import { StartScene } from './scenes/Start';
import { TutorialScene } from './scenes/Tutorial';
import { GameplayScene } from './scenes/Gameplay';
import { GameOverScene } from './scenes/GameOver';
import { ctx } from './context';
import { color, dur } from './tokens';

const GAME_TITLE = 'Cuu Meo - Bee Dodge';
const GAME_NAME = 'cuu-meo';

// Boot scene — preload asset placeholder từ assets/raw/ (BR-08: nền tĩnh + tween)
class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'BootScene' }); }
  preload() {
    // base path để chạy khi đóng gói zip (BR-05, không mạng ngoài)
    this.load.baseURL = './raw/';
    this.load.image('cat_idle', 'cat_idle.png');
    this.load.image('cat_tuxedo', 'cat_tuxedo.png');
    this.load.image('cat_royal', 'cat_royal.png');
    this.load.image('cat_astro', 'cat_astro.png');
    this.load.image('bee_wasp', 'bee_wasp.png');
    this.load.image('fish_item', 'fish_item.png');
    this.load.image('fish_coin', 'fish_coin.png');
    this.load.image('bg_day', 'bg_day.jpg');
    this.load.image('bg_sunset', 'bg_sunset.jpg');
    this.load.image('bg_night', 'bg_night.jpg');
    this.load.image('bg_gradient', 'bg_gradient.png');
    // F9 (ĐỢT 8): gắn âm thanh THẬT.
    // LƯU Ý: file mp3 thật trong assets/raw/ KHÔNG có đuôi .mp3 (bản có đuôi .mp3
    // là placeholder 417B rỗng → EncodingError). Phaser decode theo nội dung bytes,
    // không phụ thuộc đuôi → load đúng tên file thật (không đuôi) để boot không fail.
    this.load.audio('bgm_main', 'bgm_main.mp3');
    this.load.audio('sfx_dodge', 'sfx_dodge.mp3');
    this.load.audio('sfx_score', 'sfx_score.mp3');
    this.load.audio('sfx_combo', 'sfx_combo.mp3');
    this.load.audio('sfx_hit', 'sfx_hit.mp3');
    this.load.audio('sfx_levelup', 'sfx_levelup.mp3');
    this.load.audio('sfx_click', 'sfx_click.mp3');
    this.load.audio('sfx_gameover', 'sfx_gameover.mp3');
  }
  create() {
    // gán data-testid lên canvas DOM (game-canvas — SPEC 4.2)
    const canvas = this.game.canvas;
    if (canvas) canvas.setAttribute('data-testid', 'game-canvas');
    // tải best score từ SDK (BR-11) trước khi vào Start
    ctx.loadBest().finally(() => {
      this.cameras.main.fadeOut(dur.scene, 0, 0, 0);
      this.time.delayedCall(dur.scene, () => this.scene.start('StartScene'));
    });
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: AUTO,
  parent: 'game',
  // BR-05: responsive mọi aspect, RESIZE tự co, giữ state
  scale: {
    mode: Scale.RESIZE,
    width: '100%',
    height: '100%',
  },
  backgroundColor: color.bg.top,
  scene: [BootScene, StartScene, TutorialScene, GameplayScene, GameOverScene],
  render: {
    antialias: true,
    antialiasGL: true,
    mipmapFilter: 'LINEAR_MIPMAP_LINEAR',
    roundPixels: false,
    pixelArt: false,
  },
};

const game = new Phaser.Game(config);

// BR-04: obey pause/resume/mute ngay lập tức
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

// Fire gameReady khi đã sẵn sàng tương tác (BR/SPEC §7)
sdk.gameReady();

export { GAME_TITLE, GAME_NAME };
