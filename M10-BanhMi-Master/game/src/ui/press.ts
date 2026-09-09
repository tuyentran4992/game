// src/ui/press.ts — press-state helper thuan tuy (BUGFIX-1: nut PHAI lún khi chạm).
// Tach khoi widgets.ts de unit test node (vitest env=node) goi duoc — 0 import Phaser.

/** Ty le scale khi tay cham con nam tren nut (lenh 09/09: 0.94). */
export const PRESS_SCALE = 0.94

export interface Scalable {
  setScale(v: number): unknown
}

/** pointerdown: nut lun tuc thi (truoc khi scene.start/transition chay). */
export function pressDown(t: Scalable): void {
  t.setScale(PRESS_SCALE)
}

/** pointerup / pointerout / pointerupoutside: tra ve kich thuoc ngu. */
export function pressUp(t: Scalable): void {
  t.setScale(1)
}

/**
 * Vung nhan pointer KHOP voi vung ve cua `button()`: mat tren ve tu -h/2-3
 * (offset -3px so voi day -h/2 trong widgets.ts), nen hitArea phai vuot len theo.
 */
export function buttonHitRect(w: number, h: number): { x: number; y: number; w: number; h: number } {
  return { x: -w / 2, y: -h / 2 - 3, w, h: h + 3 }
}
