// TitleScene — logo + PLAY + best tips + khach trang tri di bo (DESIGN-SPEC §4).
import Phaser from 'phaser'
import { bridge } from '../bridge.ts'
import { COLOR_INK, COLOR_ON_PRIMARY, VIEW_H, VIEW_W } from '../data/shift.ts'
import { sfx } from '../audio.ts'
import { registerTestid } from '../ui/testids.ts'
import { button, text } from '../ui/widgets.ts'

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene')
  }

  create(): void {
    this.add.image(VIEW_W / 2, VIEW_H / 2, 'bg_street').setDisplaySize(VIEW_W, VIEW_H)
    this.add.rectangle(0, 0, VIEW_W, VIEW_H, 0x000000, 0.15).setOrigin(0)

    // logo: hero + chu go
    const hero = this.add.image(VIEW_W / 2, 330, 'hero_sandwich').setDisplaySize(360, 230).setAngle(-6)
    this.tweens.add({ targets: hero, angle: 6, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.InOut' })
    text(this, VIEW_W / 2, 520, 'BÁNH MÌ', 92, COLOR_INK)
    text(this, VIEW_W / 2, 600, 'MASTER', 60, '#B84316')
    text(this, VIEW_W / 2, 668, 'The order disappears — cook from memory.', 21, COLOR_INK, {
      stroke: '#FFE8B0',
      strokeThickness: 3
    })

    const play = button(this, VIEW_W / 2, 800, 300, 100, 'PLAY', { testid: 'btn-play', size: 40 })
    // BUGFIX-1: press scale 0.94 do button() xu ly tuc thi; o day fade-out 80ms
    // (nao nhan 'da bam') ROI scene.start — GameScene.create busy khong lan bam dau tien.
    // unlock()/chime() non-blocking (audio.ts: void ctx.resume()) — khong doi.
    let starting = false
    play.on('pointerdown', () => {
      if (starting) return
      starting = true
      // Review MINOR-1: schedule transition TRƯỚC — neu AudioContext throw (webview
      // thieu slot) thi fade van chay, khong soft-lock nut PLAY.
      this.cameras.main.fadeOut(80, 0, 0, 0)
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('GameScene')
        this.scene.launch('HudScene')
      })
      try {
        sfx.unlock()
        sfx.chime()
      } catch {
        /* audio la phu — that bai khong duoc chan transition */
      }
    })
    text(this, VIEW_W / 2, 900, `BEST: 💰${bridge.best}`, 30, COLOR_ON_PRIMARY, { stroke: '#3A2E39', strokeThickness: 4 })

    // khach trang tri di bo duoi
    for (let i = 0; i < 4; i++) {
      const sp = this.add.image(VIEW_W + 80 + i * 240, 1120, `cust_${i + 1}`).setDisplaySize(150, 150)
      this.tweens.add({ targets: sp, x: -160, duration: 9000 + i * 2400, repeat: -1, ease: 'Linear' })
    }
    registerTestid('screen-title', 0, 0, VIEW_W, VIEW_H)
  }
}
