/**
 * Neon Grid — Phaser Render Adapter
 *
 * Thin layer: converts game logic state → Phaser objects.
 * All game logic lives in src/logic/ (pure TS, no Phaser).
 */

import Phaser from 'phaser';
import type { GameTheme } from '@game/core';
import { GRID_SIZE, type Grid, type Shape, type Position } from '../logic/board';
import { getBlockColor } from '../ui/theme';

const CELL = 64;        // px per cell
const PAD = 4;          // px gap between cells
const GRID_PX = CELL * GRID_SIZE + PAD * (GRID_SIZE - 1);
const BORDER_R = 6;     // cell corner radius

export class GridRenderer {
  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;
  private x: number;
  private y: number;
  private theme: GameTheme;

  constructor(scene: Phaser.Scene, x: number, y: number, theme: GameTheme) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.theme = theme;
    this.graphics = scene.add.graphics();
  }

  drawBackground(): void {
    const g = this.graphics;
    const w = GRID_PX;
    const h = GRID_PX;
    const t = this.theme;

    g.fillStyle(t.colors.surfaceDark, 0.8);
    g.fillRoundedRect(this.x, this.y, w, h, 8);

    for (let i = 0; i <= GRID_SIZE; i++) {
      const pos = this.x + i * (CELL + PAD);
      g.lineStyle(1, t.colors.textMuted, 0.15);
      g.lineBetween(pos, this.y, pos, this.y + h);
      g.lineBetween(this.x, this.y + i * (CELL + PAD), this.x + w, this.y + i * (CELL + PAD));
    }

    g.lineStyle(2, t.colors.primary, 0.15);
    g.strokeRoundedRect(this.x, this.y, w, h, 8);
  }

  drawGrid(grid: Grid): void {
    const g = this.graphics;
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const val = grid[r][c];
        if (val === null) continue;

        const cx = this.x + c * (CELL + PAD);
        const cy = this.y + r * (CELL + PAD);
        const color = getBlockColor(val);

        g.fillStyle(color.glow, 0.2);
        g.fillRoundedRect(cx - 2, cy - 2, CELL + 4, CELL + 4, BORDER_R + 2);

        g.fillStyle(color.fill, 0.9);
        g.fillRoundedRect(cx, cy, CELL, CELL, BORDER_R);

        g.fillStyle(0xffffff, 0.15);
        g.fillRoundedRect(cx + 3, cy + 2, CELL - 6, CELL / 2, { tl: BORDER_R - 2, tr: BORDER_R - 2, bl: 0, br: 0 });
      }
    }
  }

  drawGhost(shape: Shape, pos: Position, grid: Grid): void {
    const g = this.graphics;
    const color = getBlockColor(shape.color);

    for (let r = 0; r < shape.cells.length; r++) {
      for (let c = 0; c < shape.cells[r].length; c++) {
        if (shape.cells[r][c] === 0) continue;
        const gridRow = pos.row + r;
        const gridCol = pos.col + c;
        if (gridRow >= GRID_SIZE || gridCol >= GRID_SIZE) continue;
        if (grid[gridRow][gridCol] !== null) continue;

        const cx = this.x + gridCol * (CELL + PAD);
        const cy = this.y + gridRow * (CELL + PAD);

        g.fillStyle(color.glow, 0.15);
        g.fillRoundedRect(cx, cy, CELL, CELL, BORDER_R);
        g.lineStyle(2, color.glow, 0.4);
        g.strokeRoundedRect(cx, cy, CELL, CELL, BORDER_R);
      }
    }
  }

  drawClearHighlight(rows: number[], cols: number[], progress: number): void {
    const g = this.graphics;
    const alpha = 1 - progress;
    const color = this.theme.colors.primary;

    for (const r of rows) {
      const cy = this.y + r * (CELL + PAD);
      g.fillStyle(color, alpha * 0.5);
      g.fillRoundedRect(this.x, cy, GRID_PX, CELL, 4);
    }
    for (const c of cols) {
      const cx = this.x + c * (CELL + PAD);
      g.fillStyle(color, alpha * 0.5);
      g.fillRoundedRect(cx, this.y, CELL, GRID_PX, 4);
    }
  }

  screenToGrid(screenX: number, screenY: number): Position | null {
    const col = Math.floor((screenX - this.x) / (CELL + PAD));
    const row = Math.floor((screenY - this.y) / (CELL + PAD));
    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return null;
    return { row, col };
  }

  gridToPixel(row: number, col: number): { x: number; y: number } {
    return {
      x: this.x + col * (CELL + PAD) + CELL / 2,
      y: this.y + row * (CELL + PAD) + CELL / 2,
    };
  }

  clear(): void { this.graphics.clear(); }
  destroy(): void { this.graphics.destroy(); }
}

export { CELL, GRID_PX };