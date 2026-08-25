import Phaser from 'phaser';
import { Scale, AUTO } from 'phaser';
import { sdk } from './sdk-instance';
import { StartScene } from './scenes/Start';
import { GameplayScene } from './scenes/Gameplay';
import { ctx } from './context';
import { inputGate } from './input-gate';
import { synthAudio } from './audio';
import { color, dur, fontStyle, toColor, type, z } from './tokens';
import { setBootProgress } from './boot-ui';
import { L } from './lang';

export const GAME_TITLE = 'Neon Sort: Galaxy Pour';
export const GAME_NAME = 'neon-sort';

// ============================================================================
// P0-5 — LOADING STATE + THỨ TỰ BÁO SẴN SÀNG (KHÔNG gọi gameReady quá sớm)
//   1. overlay HTML (#boot-overlay) hiện NGAY, trước cả khi Phaser boot
//   2. BootScene.preload() tải asset → cập nhật progress bar (HTML + canvas)
//   3. asset xong + ctx.load() xong → StartScene
//   4. StartScene render khung đầu tiên → ytgame.game.firstFrameReady()
//   5. StartScene nhận input (nút PLAY) → ytgame.game.gameReady()  ← chỉ ở đây
// ============================================================================
// Boot scene — preload asset + loading bar trong canvas
class BootScene extends Phaser.Scene {
  constructor() { super({ key: 'BootScene' }); }

  preload() {
    const { width, height } = this.scale;

    // Loading UI trong canvas (khi overlay HTML đã mờ dần / bị chặn CSS)
    const barW = Math.min(260, width * 0.62);
    const barX = (width - barW) / 2;
    const barY = height * 0.5;
    const label = this.add.text(width / 2, barY - 36, L('loading'), fontStyle(type.small, color.accent))
      .setOrigin(0.5).setDepth(z.hud);
    const g = this.add.graphics().setDepth(z.hud);
    const drawBar = (p: number) => {
      g.clear();
      g.fillStyle(toColor('#FFFFFF'), 0.12);
      g.fillRoundedRect(barX, barY, barW, 8, 4);
      g.fillStyle(toColor(color.primary), 1);
      g.fillRoundedRect(barX, barY, Math.max(8, barW * p), 8, 4);
    };
    drawBar(0);

    this.load.on('progress', (p: number) => {
      drawBar(p);
      setBootProgress(p);
    });
    this.load.once('complete', () => {
      label.destroy();
      g.destroy();
    });

    this.load.baseURL = './raw/';
    this.load.image('bg_space', 'bg_space.png');
    this.load.image('tube_base', 'tube_base.png');
    this.load.image('liquid_neon', 'liquid_neon.png');
    this.load.image('ui_chrome', 'ui_chrome.png');
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
    setBootProgress(1);

    // Asset ĐÃ tải xong ở đây. Nạp save (M2-08) rồi mới vào Start.
    ctx.load().finally(() => {
      // Áp dụng mute đã lưu + trạng thái audio của platform (M2-11).
      synthAudio.setMuted(ctx.muted || !sdk.isAudioEnabled());
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
  scene: [BootScene, StartScene, GameplayScene],
  render: { antialias: true, roundPixels: false },
};

const game = new Phaser.Game(config);

// i18n (AUDIT §B6): đồng bộ phụ đề overlay HTML (#boot-sub) theo backend đang chạy.
try {
  const sub = document.getElementById('boot-sub');
  if (sub) sub.textContent = L('loading');
} catch { /* no-op */ }

// MỘT AUDIO BUS DUY NHẤT: synth WebAudio + sfx file của Phaser cùng đi qua đây.
// → mọi callback pause/mute của SDK chỉ cần MỘT DÒNG để im toàn bộ game.
synthAudio.attachSoundManager(game.sound);
synthAudio.setMuted(!sdk.isAudioEnabled());

// ---- pause / mute pass-through tới ytgame.system.* (M2-11) ----
const PAUSABLE = ['GameplayScene', 'StartScene'];

// ---- B2 PRE-ROLL GATE: KHÔNG nhận tap trước khi game sẵn sàng / khi đang ad ----
// Đóng cổng NGAY từ boot (màn loading + pre-roll của platform không ăn tap nào),
// mở khi StartScene báo interactable (inputGate.markReady() sau gameReady()) và
// platform không đang pause. Không có SDK (dev) → mở ngay khi Start sẵn sàng.
if (game.input) game.input.enabled = false;
inputGate.onChange((enabled) => {
  if (game.input) game.input.enabled = enabled;
});
// Chốt an toàn: nếu POST_RENDER/gameReady vì lý do nào đó không tới, KHÔNG bao giờ
// để người chơi ngồi trước 1 game không nhận input.
setTimeout(() => inputGate.markReady(), 8000);

sdk.onPause(() => {
  inputGate.setPaused(true);                             // pre-roll / interstitial / tab ẩn
  synthAudio.suspend();                                  // ← 1 dòng: im toàn bộ audio
  for (const key of PAUSABLE) {
    if (game.scene.isActive(key)) game.scene.pause(key);
  }
  void ctx.saveNow();                                    // P0-2: flush trước khi rời game
});

sdk.onResume(() => {
  inputGate.setPaused(false);                            // platform báo resume → mở cổng
  synthAudio.resume(!ctx.muted && sdk.isAudioEnabled()); // ← 1 dòng: mở lại đúng trạng thái
  for (const key of PAUSABLE) {
    if (game.scene.isPaused(key)) game.scene.resume(key);
  }
});

sdk.onAudioEnabledChange((enabled: boolean) => {
  synthAudio.setMuted(!enabled || ctx.muted);            // ← 1 dòng
});

// KHÔNG gọi sdk.gameReady() ở đây (P0-5): asset chưa tải, màn Start chưa tương tác
// được. firstFrameReady()/gameReady() được phát trong StartScene.signalReady().
