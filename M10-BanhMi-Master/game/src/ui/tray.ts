// src/ui/tray.ts — khay 12 o (4×3), tap-only, data-testid `tray-slot-{ingId}`.
import Phaser from 'phaser'
import { INGREDIENTS } from '../data/ingredients.ts'
import { iconKey } from '../data/assets.ts'
import { TRAY, trayCx, trayCy } from './layout.ts'
import { registerTestid } from './testids.ts'
import { text } from './widgets.ts'

export interface TrayView {
  group: Phaser.GameObjects.Container
  slotById: Map<string, Phaser.GameObjects.Container>
  setDim(dim: boolean): void
  glow(ingId: string | null): void
}

export function buildTray(
  scene: Phaser.Scene,
  onTap: (ingId: string) => void
): TrayView {
  const root = scene.add.container(0, 0)
  const slotById = new Map<string, Phaser.GameObjects.Container>()
  const glowG = scene.add.graphics()
  root.add(glowG)

  INGREDIENTS.filter((i) => i.category !== 'base').forEach((ing, idx) => {
    const col = idx % TRAY.cols
    const row = Math.floor(idx / TRAY.cols)
    const cx = trayCx(col)
    const cy = trayCy(row)
    const slot = scene.add.container(cx, cy)
    const g = scene.add.graphics()
    g.fillStyle(0xffffff, 0.92).fillRoundedRect(-TRAY.cellW / 2 + 4, -TRAY.cellH / 2 + 4, TRAY.cellW - 8, TRAY.cellH - 8, 14)
    g.lineStyle(3, 0x00000022, 1).strokeRoundedRect(-TRAY.cellW / 2 + 4, -TRAY.cellH / 2 + 4, TRAY.cellW - 8, TRAY.cellH - 8, 14)
    slot.add(g)
    const icon = scene.add.image(0, -12, iconKey(ing.id)).setDisplaySize(88, 88)
    slot.add(icon)
    // BUGFIX-1 (09/09): ten Vi ≥24px — 17px tren Scale.FIT ~11px la khong doc duoc.
    slot.add(text(scene, 0, 46, ing.vi, 24, '#3A2E39', { stroke: '#00000000', strokeThickness: 0 }))
    slot.setSize(TRAY.cellW, TRAY.cellH)
    slot.setInteractive({ hitArea: new Phaser.Geom.Rectangle(-TRAY.cellW / 2, -TRAY.cellH / 2, TRAY.cellW, TRAY.cellH), hitAreaCallback: Phaser.Geom.Rectangle.Contains, useHandCursor: true })
    slot.on('pointerdown', () => onTap(ing.id))
    root.add(slot)
    slotById.set(ing.id, slot)
    registerTestid(`tray-slot-${ing.id}`, cx - TRAY.cellW / 2, cy - TRAY.cellH / 2, TRAY.cellW, TRAY.cellH)
  })
  root.setDepth(5)

  return {
    group: root,
    slotById,
    setDim(dim) {
      root.setAlpha(dim ? 0.8 : 1) // FLASH: moi UI duoi mo 20% nhung VAN nhin thay (DESIGN-SPEC §2)
    },
    glow(ingId) {
      glowG.clear()
      if (!ingId) return
      const s = slotById.get(ingId)
      if (!s) return
      glowG.lineStyle(6, 0xffd23f, 0.95)
      glowG.strokeRoundedRect(s.x - TRAY.cellW / 2 + 2, s.y - TRAY.cellH / 2 + 2, TRAY.cellW - 4, TRAY.cellH - 4, 14)
    }
  }
}
