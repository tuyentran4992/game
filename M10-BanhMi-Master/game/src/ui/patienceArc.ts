// src/ui/patienceArc.ts — vong cung quanh dau khach (r=64, stroke 10), 3 mau semantic,
// nhap nhay 1Hz khi <30% (DATA-MODEL §8). Ve bang Graphics — khong asset.
import Phaser from 'phaser'
import { COLOR_DANGER, COLOR_SUCCESS, COLOR_WARNING, PATIENCE_WARN_FRAC } from '../data/shift.ts'
import { hexToNum } from './widgets.ts'

export const PATIENCE_R = 64

export function arcColor(frac: number): string {
  if (frac > 0.6) return COLOR_SUCCESS
  if (frac >= PATIENCE_WARN_FRAC) return COLOR_WARNING
  return COLOR_DANGER
}

export class PatienceArc {
  readonly g: Phaser.GameObjects.Graphics
  constructor(scene: Phaser.Scene) {
    this.g = scene.add.graphics().setDepth(38)
  }

  setVisible(v: boolean): void {
    this.g.setVisible(v)
  }

  draw(x: number, y: number, frac: number, nowMs: number): void {
    const g = this.g
    g.clear()
    if (frac <= 0) return
    const blink = frac < PATIENCE_WARN_FRAC && Math.floor(nowMs / 500) % 2 === 0
    if (blink) return // 1Hz nhap nhay = toan vong cung tat bat
    g.lineStyle(10, 0x00000030, 1)
    g.strokeCircle(x, y, PATIENCE_R)
    g.lineStyle(10, hexToNum(arcColor(frac)), 1)
    g.beginPath()
    g.arc(x, y, PATIENCE_R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, frac), false)
    g.strokePath()
  }
}
