// src/ui/bubble.ts — bong bong FLASH order (mini stack duoi→tren + dong ho vong tron
// mem bong bong) + ghost bubble (chi hinh dang mo, KHONG noi dung — UX checklist).
// Cache theo signature: show() moi frame KHONG rebuild rows/ring (chỉ dong ho ve lai),
// ring blink giu nguyen 1 tween (review fix).
import Phaser from 'phaser'
import { iconKey } from '../data/assets.ts'
import { INGREDIENT_BY_ID } from '../data/ingredients.ts'
import { COLOR_ACCENT, COLOR_DANGER, COLOR_INK, COLOR_SUCCESS, COLOR_WARNING, PATIENCE_ARC_TOP } from '../data/shift.ts'
import { BUBBLE, bubbleH } from './layout.ts'
import { registerTestid } from './testids.ts'
import { text, hexToNum } from './widgets.ts'

export interface BubbleOpts {
  flashFrac?: number // 1..0 vong den dem flash
  highlight?: number // tutorial khach #1: soi layer thu i
  waitIdx?: number // WAIT!: nhan vang nhap nhay layer bi doi
}

export class OrderBubble {
  private readonly c: Phaser.GameObjects.Container
  private readonly g: Phaser.GameObjects.Graphics
  private timerG?: Phaser.GameObjects.Graphics
  private rows: Phaser.GameObjects.GameObject[] = []
  private sig = ''
  private builtH = 0

  constructor(private readonly scene: Phaser.Scene) {
    this.c = scene.add.container(0, 0).setDepth(40).setVisible(false)
    this.g = scene.add.graphics()
    this.c.add(this.g)
  }

  show(order: string[], opts: BubbleOpts = {}): void {
    const mode = opts.waitIdx !== undefined ? 'wait' : opts.highlight !== undefined ? 'hl' : 'flash'
    const sig = `${mode}|${order.join(',')}|${opts.highlight ?? -1}|${opts.waitIdx ?? -1}`
    if (sig !== this.sig) {
      this.sig = sig
      this.rebuild(order, opts)
    }
    if (mode === 'flash') this.drawTimer(opts.flashFrac ?? 1)
    else this.timerG?.setVisible(false)
    this.c.setVisible(true)
  }

  hide(): void {
    if (!this.c.visible) return
    this.c.setVisible(false)
  }

  private rebuild(order: string[], opts: BubbleOpts): void {
    for (const r of this.rows) r.destroy()
    this.rows = []
    this.g.clear()
    const n = order.length
    const w = BUBBLE.w
    const h = bubbleH(n) + 40
    this.builtH = h
    const cx = BUBBLE.cx
    const cy = BUBBLE.top + h / 2
    const left = cx - w / 2
    const top = cy - h / 2

    this.g.fillStyle(0x000000, 0.18).fillRoundedRect(left + 5, top + 10, w, h, 26)
    this.g.fillStyle(0xffffff, 0.97).fillRoundedRect(left, top, w, h, 26)
    this.g.lineStyle(5, hexToNum(COLOR_ACCENT), 1).strokeRoundedRect(left, top, w, h, 26)
    this.g.fillTriangle(left + 34, top + h - 2, left + 86, top + h - 2, left + 30, top + h + 38)

    // BUGFIX-1 (09/09): chu must doc duoc sau Scale.FIT ve ~390px → 34/30px + ten Vi.
    this.rows.push(text(this.scene, cx, top + 28, 'ORDER!', 34, COLOR_INK, { strokeThickness: 0 }))
    for (let i = 0; i < n; i++) {
      const y = this.rowY(n, i)
      this.rows.push(this.scene.add.image(left + 44, y, iconKey(order[i]!)).setDisplaySize(38, 38))
      this.rows.push(text(this.scene, left + 74, y, INGREDIENT_BY_ID[order[i]!]!.vi, 30, COLOR_INK, { strokeThickness: 0 }).setOrigin(0, 0.5))
    }
    const baseY = top + h - 18
    this.rows.push(this.scene.add.image(left + 44, baseY, 'bread_bottom').setDisplaySize(38, 24))
    this.rows.push(text(this.scene, left + 74, baseY, INGREDIENT_BY_ID['ing-base']!.vi, 30, '#8a8079', { strokeThickness: 0 }).setOrigin(0, 0.5))

    // vong highlight/nhan vang — ONE tween giu nguyen khi sig khong doi
    const hi = opts.highlight ?? opts.waitIdx
    if (hi !== undefined && hi < n) {
      const gold = opts.waitIdx !== undefined
      const ring = this.scene.add.graphics()
        .lineStyle(6, gold ? hexToNum(COLOR_WARNING) : 0xffd23f, 1)
        .strokeRoundedRect(left + 14, this.rowY(n, hi) - 24, w - 28, 48, 14)
      this.rows.push(ring)
      if (gold) this.scene.tweens.add({ targets: ring, alpha: { from: 1, to: 0.15 }, duration: 500, yoyo: true, repeat: -1 })
    }
    registerTestid('order-bubble', left, top, w, h)
  }

  private rowY(n: number, i: number): number {
    return BUBBLE.top + (this.builtH || bubbleH(n) + 40) - 26 - (n - i) * BUBBLE.rowH + 10
  }

  private drawTimer(frac: number): void {
    if (!this.timerG) {
      this.timerG = this.scene.add.graphics()
      this.c.add(this.timerG)
    }
    const g = this.timerG
    g.setVisible(true)
      .clear()
      .lineStyle(7, 0x00000020, 1)
      .strokeCircle(BUBBLE.cx + BUBBLE.w / 2 - 12, BUBBLE.top + 26, BUBBLE.timerR * 2 - 6)
    g.lineStyle(7, frac > PATIENCE_ARC_TOP ? hexToNum(COLOR_SUCCESS) : frac > 0.3 ? hexToNum(COLOR_WARNING) : hexToNum(COLOR_DANGER), 1)
    g.beginPath()
    g.arc(BUBBLE.cx + BUBBLE.w / 2 - 12, BUBBLE.top + 26, BUBBLE.timerR * 2 - 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, frac), false)
    g.strokePath()
    registerTestid('flash-timer', BUBBLE.cx + BUBBLE.w / 2 - 38, BUBBLE.top, 52, 52)
  }
}

/** Ghost bubble: chi hinh dang mo 30% — cam hien lai noi dung (SPEC §5 + checklist). */
export function drawGhostBubble(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics().setDepth(41).setVisible(false)
  g.fillStyle(0xffffff, 0.3).fillRoundedRect(-70, -46, 140, 92, 18)
  g.lineStyle(4, 0xffffff, 0.35).strokeRoundedRect(-70, -46, 140, 92, 18)
  for (let i = 0; i < 3; i++) g.fillStyle(0xffffff, 0.28).fillRoundedRect(-52, -30 + i * 24, 104, 12, 6)
  g.setPosition(x, y)
  registerTestid('wait-bubble', x - 70, y - 46, 140, 92)
  return g
}
