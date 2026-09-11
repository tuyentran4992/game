// src/ui/effects.ts — juice tweens (DESIGN-SPEC §5): coin/sao bay, popup, shake,
// vignette, reveal ✅/❌ tung layer. Moi thu programmatic + asset fx_*.
import Phaser from 'phaser'
import { COLOR_WARNING, REVEAL_PER_LAYER_MS } from '../data/shift.ts'
import { HUD, STACK } from './layout.ts'
import type { RevealLayer } from '../core/types.ts'
import { text } from './widgets.ts'

const flyToHud = (scene: Phaser.Scene, x: number, y: number, key: string, tx: number): void => {
  const s = scene.add.image(x, y, key).setDepth(60).setScale(0.8)
  scene.tweens.add({
    targets: s,
    x: tx,
    y: HUD.tipsY - 4,
    ease: 'Cubic.In',
    duration: 650,
    onComplete: () => s.destroy()
  })
}

/** coin + float "+$XX" bay ve HUD 💰 */
export function tipFly(scene: Phaser.Scene, tip: number): void {
  const x = STACK.cx, y = STACK.bottomY - 120
  for (let i = 0; i < Math.min(4, Math.max(2, Math.round(tip / 12))); i++) {
    scene.time.delayedCall(i * 110, () => flyToHud(scene, x + (i - 1) * 26, y, 'fx_coin', HUD.tipsX + 34))
  }
  floatText(scene, x, y - 40, `+$${tip}`, '#B8860B')
}

export function starFly(scene: Phaser.Scene, stars: number): void {
  for (let i = 0; i < stars; i++) {
    scene.time.delayedCall(i * 90, () =>
      flyToHud(scene, STACK.cx + (i - 1) * 40, STACK.bottomY - 150, 'fx_star', HUD.starsX + (i - stars / 2) * 26)
    )
  }
}

export function floatText(scene: Phaser.Scene, x: number, y: number, str: string, color: string, size = 34): void {
  const t = text(scene, x, y, str, size, color).setDepth(70)
  scene.tweens.add({ targets: t, y: y - 70, alpha: 0, scale: 1.15, duration: 900, onComplete: () => t.destroy() })
}

export function comboPopup(scene: Phaser.Scene, mult: number): void {
  const t = text(scene, STACK.cx, STACK.bottomY - 210, `COMBO ×${mult.toFixed(2)}!`, 36, COLOR_WARNING).setDepth(70).setRotation(-0.06)
  scene.tweens.add({ targets: t, scale: { from: 0.4, to: 1.1 }, duration: 220, yoyo: true, onComplete: () => t.destroy() })
}

export function fastBadge(scene: Phaser.Scene): void {
  const t = text(scene, STACK.cx + 150, STACK.bottomY - 170, 'FAST!', 40, '#FFD700').setDepth(70)
  scene.tweens.add({ targets: t, x: t.x + 30, y: t.y - 90, alpha: 0, duration: 800, onComplete: () => t.destroy() })
}

export function strikeFx(scene: Phaser.Scene): void {
  scene.cameras.main.shake(300, 0.012) // ~8px 300ms
  const vg = scene.add.graphics().setDepth(90)
  vg.fillStyle(0xe74c3c, 0.22).fillRoundedRect(0, 0, 720, 1280, 60) // vignette đỏ 120ms
  vg.setBlendMode(Phaser.BlendModes.MULTIPLY)
  scene.tweens.add({ targets: vg, alpha: 0, duration: 420, onComplete: () => vg.destroy() })
}

/** REVEAL: ✅/❌ tung layer 500ms/layer (SPEC §7). layer i o StackLayerY(i). */
export function revealTicks(scene: Phaser.Scene, revealed: RevealLayer[], onDone: () => void): void {
  const start = REVEAL_PER_LAYER_MS + 400 // sau nap banh 400ms
  revealed.forEach((r, i) => {
    scene.time.delayedCall(start + i * REVEAL_PER_LAYER_MS, () => {
      const y = STACK.bottomY - 46 - i * STACK.layerH
      const g = scene.add.graphics().setDepth(80)
      const color = r.ok ? 0x2e9e5b : 0xe74c3c
      g.fillStyle(color, 1).fillCircle(STACK.cx + 150, y, 22)
      g.lineStyle(6, 0xffffff, 1)
      if (r.ok) {
        g.beginPath(); g.moveTo(STACK.cx + 140, y); g.lineTo(STACK.cx + 148, y + 9); g.lineTo(STACK.cx + 162, y - 9); g.strokePath()
      } else {
        g.beginPath(); g.moveTo(STACK.cx + 141, y - 9); g.lineTo(STACK.cx + 159, y + 9); g.moveTo(STACK.cx + 159, y - 9); g.lineTo(STACK.cx + 141, y + 9); g.strokePath()
        // rung nhe 6px neu co layer tu choi dung o do
        scene.cameras.main.shake(120, 0.004)
      }
      scene.time.delayedCall(REVEAL_PER_LAYER_MS + 350, () => g.destroy())
      if (i === revealed.length - 1) scene.time.delayedCall(REVEAL_PER_LAYER_MS, onDone)
    })
  })
}
