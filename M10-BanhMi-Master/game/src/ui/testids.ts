// data-testid registry (DESIGN-SPEC §6). Phaser khong co DOM node cho tung element →
// dang ky {testid: {x,y,w,h}} len window de QA/browser tuong lai doc duoc + gan
// data-testid="game-canvas" cho canvas. (Boss lenh 09/09: KHONG browser test — chi can registry.)
import Phaser from 'phaser'

export const TESTIDS: Record<string, { x: number; y: number; w: number; h: number }> = {}

export function registerTestid(id: string, x: number, y: number, w: number, h: number): void {
  TESTIDS[id] = { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) }
}

export function markCanvas(game: Phaser.Game): void {
  game.canvas?.setAttribute('data-testid', 'game-canvas')
  ;(window as unknown as Record<string, unknown>).__banhmiTestids = TESTIDS
}
