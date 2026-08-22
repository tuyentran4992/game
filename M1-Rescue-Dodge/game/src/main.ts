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
    this.load.image('bee_wasp', 'bee_wasp.png');
    this.load.image('bg_gradient', 'bg_gradient.png');
    // F3: BỎ preload 2 audio placeholder (bgm_main.mp3 + sfx_dodge.mp3 chỉ 417B,
    // không phải mp3 hợp lệ → Phaser EncodingError ở boot).
    // Khi có audio thật, bỏ comment 2 dòng dưới đây:
    // this.load.audio('bgm_main', 'bgm_main.mp3');
    // this.load.audio('sfx_dodge', 'sfx_dodge.mp3');
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
  scale: { mode: Scale.RESIZE, width: '100%', height: '100%' },
  backgroundColor: color.bg.top,
  scene: [BootScene, StartScene, TutorialScene, GameplayScene, GameOverScene],
  render: { antialias: true, roundPixels: true },
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
