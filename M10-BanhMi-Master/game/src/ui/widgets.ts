// src/ui/widgets.ts — chrome ve programmatic theo design-system (DESIGN-SPEC §3: chi
// sprite/nen/icon moi la asset; nut/panel/bong/arc = Graphics).
import Phaser from 'phaser'
import { COLOR_INK, COLOR_ON_PRIMARY, COLOR_PRIMARY, COLOR_PRIMARY_DARK, RADIUS_MD } from '../data/shift.ts'
import { registerTestid } from './testids.ts'
import { buttonHitRect, pressDown, pressUp } from './press.ts'

const FONT = 'sans-serif'

export const hexToNum = (hex: string): number => parseInt(hex.replace('#', ''), 16)

export function text(
  scene: Phaser.Scene,
  x: number,
  y: number,
  str: string,
  size: number,
  color = COLOR_INK,
  opts: Phaser.Types.GameObjects.Text.TextStyle = {}
): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, str, {
      fontFamily: FONT,
      fontSize: `${size}px`,
      color,
      stroke: '#FFFFFF',
      strokeThickness: size > 34 ? 4 : 2,
      fontStyle: '900',
      ...opts
    })
    .setOrigin(0.5)
}

/** btn-primary (§3.1): day den ben duoi, mat bo sang, chu trang 900, bo cung radius.md */
export function button(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  opts: { color?: string; dark?: string; testid?: string; size?: number; disabled?: boolean } = {}
): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y)
  const g = scene.add.graphics()
  const a = opts.disabled ? 0.45 : 1
  g.fillStyle(0x000000, 0.22).fillRoundedRect(-w / 2, -h / 2 + 6, w, h, RADIUS_MD) // shadow.btn 6px
  g.fillStyle(hexToNum(opts.dark ?? COLOR_PRIMARY_DARK), a).fillRoundedRect(-w / 2, -h / 2, w, h, RADIUS_MD)
  g.fillStyle(hexToNum(opts.color ?? COLOR_PRIMARY), a).fillRoundedRect(-w / 2, -h / 2 - 3, w, h - 6, RADIUS_MD)
  g.lineStyle(3, 0xffffff, 0.35).strokeRoundedRect(-w / 2, -h / 2 - 3, w, h - 6, RADIUS_MD)
  c.add(g)
  c.add(text(scene, 0, -2, label, opts.size ?? Math.max(19, Math.round(h / 3.3)), COLOR_ON_PRIMARY))
  c.setSize(w, h)
  // BUGFIX-1: hitArea khop vung ve (mat tren offset -3px) + press state tuc thi —
  // nguoi dung luon thay nut lun khi cham, ke ca khi GameScene.create con busy.
  const hit = buttonHitRect(w, h)
  c.setInteractive({ hitArea: new Phaser.Geom.Rectangle(hit.x, hit.y, hit.w, hit.h), hitAreaCallback: Phaser.Geom.Rectangle.Contains, useHandCursor: true })
  c.on('pointerdown', () => pressDown(c))
  c.on('pointerup', () => pressUp(c))
  c.on('pointerout', () => pressUp(c))
  c.on('pointerupoutside', () => pressUp(c))
  if (opts.testid) registerTestid(opts.testid, x - w / 2, y - h / 2, w, h)
  return c
}

export function panel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  opts: { fill?: string; alpha?: number; radius?: number; stroke?: string } = {}
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics()
  g.fillStyle(0x000000, 0.28).fillRoundedRect(x - w / 2 + 5, y - h / 2 + 10, w, h, opts.radius ?? RADIUS_MD) // shadow.panel
  g.fillStyle(hexToNum(opts.fill ?? '#FFFFFF'), opts.alpha ?? 0.95)
  g.fillRoundedRect(x - w / 2, y - h / 2, w, h, opts.radius ?? RADIUS_MD)
  if (opts.stroke) g.lineStyle(4, hexToNum(opts.stroke), 1).strokeRoundedRect(x - w / 2, y - h / 2, w, h, opts.radius ?? RADIUS_MD)
  return g
}
