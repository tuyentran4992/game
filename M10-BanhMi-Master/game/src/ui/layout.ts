// src/ui/layout.ts — toa do 720×1280 theo DESIGN-SPEC §2 (nguồn vi tri duy nhất).
import { TRAY_COLS, TRAY_ROWS, VIEW_W } from '../data/shift.ts'

export const HUD_H = 88

// Khach hang: vao tu phai, dung trai (SPEC §2)
export const CUST = { x: 190, feetY: 480, w: 330, doorX: VIEW_W + 180 }

// Bong bong order (tren dau khach, mep phai) — BUGFIX-1: rowH/pad phong cho chu Vi 30px
// (nguon kich thuoc DUY NHAT — bubble.ts khong duoc hardcode cho khac).
export const BUBBLE = { cx: 500, top: 108, w: 320, rowH: 52, pad: 20, timerR: 26 }
export const bubbleH = (n: number): number => BUBBLE.pad * 2 + n * BUBBLE.rowH
export const bubbleY = (n: number): number => BUBBLE.top + bubbleH(n) / 2

// Vung lap sandwich (giua man)
export const STACK = {
  cx: VIEW_W / 2,
  bottomY: 706, // tam cua bread_bottom
  layerH: 44,
  breadW: 260,
  layerW: 230
}
export const stackLayerY = (i: number): number => STACK.bottomY - 46 - i * STACK.layerH

// Khay 4×3 — o 150×125 (chạm ≥44px ✓), icon 96 + ten EN duoi
export const TRAY = {
  top: 776,
  cellW: 150,
  cellH: 125,
  gap: 8,
  cols: TRAY_COLS,
  rows: TRAY_ROWS
}
export const trayCx = (c: number): number => (VIEW_W - (TRAY.cols * TRAY.cellW + (TRAY.cols - 1) * TRAY.gap)) / 2 + c * (TRAY.cellW + TRAY.gap) + TRAY.cellW / 2
export const trayCy = (r: number): number => TRAY.top + 12 + r * (TRAY.cellH + TRAY.gap) + TRAY.cellH / 2

// Hang nut UNDO · SERVE · HINT (SPEC §2, y≈1215)
export const BTNS = {
  y: 1218,
  undo: { x: 96, w: 92, h: 84 },
  serve: { x: 360, w: 320, h: 88 },
  hint: { x: 624, w: 92, h: 84 }
}

// HUD corners (DESIGN-SPEC §2)
export const HUD = {
  tipsX: 30,
  tipsY: 44,
  starsX: VIEW_W / 2 + 30,
  starsY: 46,
  strikesX: VIEW_W - 40,
  strikesY: 46,
  ghostX: VIEW_W - 96,
  ghostY: 150
}
