// Banh Mi Master — entry: Phaser config 720×1280 Scale.FIT + pause/mute obey
// (visibilitychange tai document — an lei M8 C-24: doi tab = pause match, quay lai = hoi)
import Phaser from 'phaser'
import { BootScene } from './scenes/BootScene.ts'
import { TitleScene } from './scenes/TitleScene.ts'
import { GameScene } from './scenes/GameScene.ts'
import { HudScene } from './scenes/HudScene.ts'
import { bridge } from './bridge.ts'
import { VIEW_H, VIEW_W } from './data/shift.ts'
import { ctx } from './context.ts'
import { registerTestid } from './ui/testids.ts'

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: VIEW_W,
  height: VIEW_H,
  backgroundColor: '#17131c',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [BootScene, TitleScene, GameScene, HudScene]
})

// Pause nen tang: match tick dung (update Phaser dung => engine khong chay nua).
// Resume VO DIEU KIEN khi tab hien lai — tick WIN/LOSE von la no-op, guard theo phase
// se keo scene nam trong trang thai pause vinh vien (review MAJOR fix).
document.addEventListener('visibilitychange', () => {
  if (document.hidden) game.scene.pause('GameScene')
  else game.scene.resume('GameScene')
})
bridge.onPause(() => game.scene.pause('GameScene'))
bridge.onResume(() => game.scene.resume('GameScene'))

if (new URLSearchParams(location.search).has('debug')) {
  registerTestid('debug-seed', 0, 1240, 200, 40)
  game.events.once('ready', () => {
    window.setTimeout(() => console.log('[m10] seed =', ctx.match?.state.seed), 500)
  })
}
