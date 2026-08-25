// ============================================================================
// AUDIT P-3 — BGM started ONCE globally (looping), resume/suspend qua audio bus.
// Trước đây Gameplay play('bgm_main') MỖI level → nhiều instance chồng volume.
// Cờ + guard autoplay (phải có user gesture) → gọi an toàn ở PLAY tap / Gameplay.
// ============================================================================
import Phaser from 'phaser';

let started = false;

/** Start BGM (loop) chính xác 1 lần. An toàn khi gọi nhiều lần (cờ). */
export function startBgmOnce(game: Phaser.Game): void {
  if (started) return;
  if (!game || !game.sound || !game.cache?.audio) return;
  try {
    if (game.cache.audio.exists('bgm_main') && typeof game.sound.play === 'function') {
      game.sound.play('bgm_main', { loop: true, volume: 0.3 });
      started = true;
    }
  } catch {
    /* autoplay bị chặn trước user gesture → lần gọi sau sẽ start lại */
  }
}

export function isBgmStarted(): boolean {
  return started;
}
