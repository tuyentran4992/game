// M3 Juicy Merge — main / boot
import Phaser, { Scale, AUTO } from 'phaser';
import { sdk } from './sdk-instance';
import { ctx } from './context';
import { dur } from './tokens';
import { FRUIT_KEYS, IMAGE_KEYS, AUDIO_KEYS } from './assets';
import { StartScene } from './scenes/Start';
import { GameplayScene } from './scenes/Gameplay';
import { GameOverScene } from './scenes/GameOver';

// Boot scene — preload every asset key declared in `games/juicy-merge.yaml`
// §assets (baseURL `./raw/`). Raw files are generated in Phase C (steps 13-14);
// until then `loaderror` logs a warning and scenes fall back to geometric shapes
// (pattern M2) so the game never crashes on a missing asset.
class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'BootScene' }); }

  preload(): void {
    this.load.baseURL = './raw/';
    for (const key of FRUIT_KEYS) this.load.image(key, `${key}.png`);
    for (const key of IMAGE_KEYS) this.load.image(key, `${key}.png`);
    for (const key of AUDIO_KEYS) this.load.audio(key, `${key}.mp3`);
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.warn(`asset missing (fallback geometric): ${file.key}`);
    });
  }

  create(): void {
    const canvas = this.game.canvas;
    if (canvas) canvas.setAttribute('data-testid', 'game-canvas');
    // Load persisted best score before play (M3-08), then enter Start.
    ctx.load().finally(() => {
      this.cameras.main.fadeOut(dur.scene, 0, 0, 0);
      this.time.delayedCall(dur.scene, () => this.scene.start('StartScene'));
    });
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: AUTO,
  parent: 'game',
  // Mobile-first portrait world (9:16); desktop pillarboxes via FIT + center.
  scale: {
    mode: Scale.FIT,
    autoCenter: Scale.CENTER_BOTH,
    width: 720,
    height: 1280,
  },
  backgroundColor: '#FFF8E7',
  // Matter physics (SPEC §4): restitution/friction/sleep from CONFIG. Gravity
  // is applied in Gameplay via world.setGravity(x, y, scale) because the config
  // type only allows {x,y} (no scale) and a gravity object without scale makes
  // Matter forces NaN. enableSleeping powers the settle check (step 11).
  physics: {
    default: 'matter',
    matter: {
      enableSleeping: true,
      debug: false,
    },
  },
  scene: [BootScene, StartScene, GameplayScene, GameOverScene],
  render: { antialias: true, roundPixels: true },
};

const game = new Phaser.Game(config);

// Playables SDK: pause/resume + mute obey (step 15 wires scene logic fully).
sdk.onPause(() => { game.scene.pause('GameplayScene'); game.sound.mute = true; });
sdk.onResume(() => { game.sound.mute = !sdk.isAudioEnabled(); game.scene.resume('GameplayScene'); });
sdk.onAudioEnabledChange((enabled: boolean) => { game.sound.mute = !enabled; });

sdk.gameReady();
