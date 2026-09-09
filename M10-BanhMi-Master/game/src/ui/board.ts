// src/ui/board.ts — khach hang + vung lap sandwich (stack, squash, nap banh).
// GameScene mong: chi goi cac ham nay + doc MatchState.
import Phaser from 'phaser'
import { layerKey } from '../data/assets.ts'
import { CUST, STACK, stackLayerY } from './layout.ts'
import { registerTestid } from './testids.ts'

export interface Board {
  showCustomer(artIdx: number): void
  addLayer(ingId: string): void
  popLastLayer(): void
  clearStack(): void
  serveLid(): void
  setAngry(on: boolean): void
}

export function buildBoard(scene: Phaser.Scene): Board {
  // bread_bottom co dinh giua man (SPEC §2)
  scene.add
    .image(STACK.cx, STACK.bottomY, 'bread_bottom')
    .setDisplaySize(STACK.breadW, STACK.breadW * 0.5)
    .setDepth(8)
  registerTestid('stack-zone', STACK.cx - 150, stackLayerY(5) - 30, 300, 320)

  // khach
  const cust = scene.add.image(CUST.doorX, CUST.feetY, 'cust_1').setOrigin(0.5, 1).setDepth(10)
  cust.setDisplaySize(CUST.w, CUST.w * 1.25)
  registerTestid('customer-sprite', CUST.x - 120, CUST.feetY - 360, 240, 360)
  scene.tweens.add({ targets: cust, y: CUST.feetY - 5, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.InOut' }) // idle bob
  const angry = scene.add.image(cust.x, cust.y - 330, 'fx_angry').setDisplaySize(110, 110).setDepth(31).setVisible(false)

  const lid = scene.add.image(STACK.cx, 240, 'bread_top').setDisplaySize(STACK.breadW, STACK.breadW * 0.42).setDepth(9).setVisible(false)

  let layers: Phaser.GameObjects.Image[] = []

  return {
    showCustomer(artIdx: number): void {
      angry.setVisible(false)
      cust.setTint(0xffffff)
      cust.setTexture(`cust_${artIdx + 1}`)
      cust.x = CUST.doorX
      scene.tweens.add({ targets: cust, x: CUST.x, duration: 600, ease: 'Cubic.Out' }) // walk-in 600ms
    },
    addLayer(ingId: string): void {
      const i = layers.length
      const sp = scene.add.image(STACK.cx, stackLayerY(i), layerKey(ingId)).setDepth(9).setDisplaySize(STACK.layerW, 50)
      // squash dap xuong: 1.12×0.88 → 1 (90ms) theo §5
      const s = sp.scale
      sp.setScale(s * 0.3)
      scene.tweens.add({ targets: sp, scaleX: s * 1.12, scaleY: s * 0.88, duration: 90, onComplete: () => scene.tweens.add({ targets: sp, scale: s, duration: 90 }) })
      layers.push(sp)
    },
    popLastLayer(): void {
      const sp = layers.pop()
      if (!sp) return
      scene.tweens.add({ targets: sp, y: sp.y - 60, alpha: 0, duration: 140, onComplete: () => sp.destroy() })
    },
    clearStack(): void {
      for (const sp of layers) sp.destroy()
      layers = []
      lid.setVisible(false)
      lid.y = 240
    },
    serveLid(): void {
      const topY = stackLayerY(Math.max(0, layers.length - 1)) - 34
      lid.setVisible(true)
      lid.y = topY - 260
      scene.tweens.add({
        targets: lid,
        y: topY,
        scaleY: { from: lid.scaleY * 1.2, to: lid.scaleY },
        duration: 400,
        ease: 'Bounce.Out'
      })
    },
    setAngry(on: boolean): void {
      angry.setVisible(on)
      cust.setTint(on ? 0xff9d9d : 0xffffff)
    }
  }
}
