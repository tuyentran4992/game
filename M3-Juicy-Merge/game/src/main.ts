// M3 Juicy Merge — main / boot
import Phaser, { Scale, AUTO } from 'phaser';
import { sdk } from './sdk-instance';
import { ctx } from './context';
import { dur } from './tokens';
import { applyMute } from './ui';
import { FRUIT_KEYS, AUDIO_KEYS } from './assets';
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
    // 12 fruit sprites (gen'd PNGs, transparent) + the static images that were
    // generated. logo/ui_icons/danger_line are NOT gen'd (image API refused) ->
    // code fallback (text/graphics), so they are intentionally not loaded here
    // (avoids loaderror noise + keeps the asset manifest 0-warn). bucket/bg use
    // literal file strings so the asset-manifest check can verify them.
    for (const key of FRUIT_KEYS) this.load.image(key, `${key}.png`);
    this.load.image('bucket', 'bucket.png');
    this.load.image('bg_gradient', 'bg_gradient.png');
    // Audio (6 mp3 in raw/: sfx_drop/merge/merge_big/danger/gameover +
    // bgm_main, step 14). Loaded unconditionally; playSfx/startBgm no-op when a
    // cache entry is missing, so a failed/absent file stays silent (no crash).
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

// Obey the Playables SDK audio toggle from the very first frame: if the host
// reports audio disabled, Phaser's global SoundManager is muted so every sfx
// AND the looping BGM stay silent until the user unmutes (onAudioEnabledChange
// keeps it in sync thereafter). applyMute also folds the in-canvas mute button
// (ui.drawMuteButton) so the player and the host never fight over audio.
applyMute(game, sdk.isAudioEnabled());

// Playables SDK pause/resume (M3-10, UI-12). On host pause: freeze the Matter
// world (fruits stop mid-fall) AND mute audio immediately. On resume: restore
// audio (honoring the player's mute choice) and resume physics — but only when
// the game is in active play; if game-over already paused Gameplay (the GameOver
// overlay sits on top), do NOT resume physics or the frozen pile would unfreeze
// under the panel. isGameOver() is the guard for exactly that.
sdk.onPause(() => {
  const gp = game.scene.getScene('GameplayScene') as GameplayScene | undefined;
  if (gp && gp.scene.isActive()) {
    gp.matter.world.pause();
    gp.scene.pause();
  }
  game.sound.mute = true;
});
sdk.onResume(() => {
  applyMute(game, sdk.isAudioEnabled());
  const gp = game.scene.getScene('GameplayScene') as GameplayScene | undefined;
  if (gp && !gp.isGameOver()) {
    gp.matter.world.resume();
    gp.scene.resume();
  }
});
sdk.onAudioEnabledChange((enabled: boolean) => { applyMute(game, enabled); });

sdk.gameReady();
