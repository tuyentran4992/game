import Phaser from 'phaser';
import { GRID_SIZE, type Grid, type Shape, type Position } from '../logic/board';
import { theme, getBlockColor, getActiveSkinPalette } from '../ui/theme';

const CELL = 66;        // px per cell
const PAD = 5;          // px gap between cells
const GRID_PX = CELL * GRID_SIZE + PAD * (GRID_SIZE - 1);
const BORDER_R = 8;     // cell corner radius

export class GridRenderer {
  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;
  private x: number;
  private y: number;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.graphics = scene.add.graphics();
  }

  /** Static helper to draw a single 3D glossy neon block */
  static drawSingleBlock(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    size: number,
    colorIndex: number,
    alpha: number = 1.0,
    radius: number = BORDER_R
  ): void {
    const color = getBlockColor(colorIndex);

    // 1. Soft Outer Glow
    g.fillStyle(color.glow, 0.35 * alpha);
    g.fillRoundedRect(x - 4, y - 4, size + 8, size + 8, radius + 3);

    // 2. Base Darker Block Fill (Depth & 3D bevel shadow)
    g.fillStyle(color.dark, 0.95 * alpha);
    g.fillRoundedRect(x, y, size, size, radius);

    // 3. Main Block Gradient/Color Body
    g.fillStyle(color.fill, 0.95 * alpha);
    g.fillRoundedRect(x + 1.5, y + 1.5, size - 3, size - 4, radius - 1);

    // 4. Glossy Specular Bevel (Top half glass shine)
    g.fillStyle(color.light, 0.5 * alpha);
    g.fillRoundedRect(x + 3, y + 2.5, size - 6, (size / 2) - 2, {
      tl: Math.max(2, radius - 2),
      tr: Math.max(2, radius - 2),
      bl: 0,
      br: 0,
    });

    // 5. White Top Edge Reflection (Crisp cyber specular)
    g.fillStyle(0xffffff, 0.65 * alpha);
    g.fillRoundedRect(x + 5, y + 3, size - 10, 3, 2);

    // 6. Crisp Neon Border
    g.lineStyle(1.8, color.light, 0.9 * alpha);
    g.strokeRoundedRect(x + 0.5, y + 0.5, size - 1, size - 1, radius);

    // 7. Center Neon Core Accent Dot
    g.fillStyle(0xffffff, 0.45 * alpha);
    g.fillCircle(x + size / 2, y + size / 2, 2.5);
  }

  /** Draw full grid background and slot placeholders with high-tech neon styling */
  drawBackground(): void {
    const g = this.graphics;
    const w = GRID_PX;
    const h = GRID_PX;
    const palette = getActiveSkinPalette();

    // Outer Backplate Shadow
    g.fillStyle(0x04040c, 0.8);
    g.fillRoundedRect(this.x - 12, this.y - 12, w + 24, h + 24, 18);

    // Grid Container Panel
    g.fillStyle(palette.gridBg, 0.95);
    g.fillRoundedRect(this.x - 6, this.y - 6, w + 12, h + 12, 14);

    // Outer Glowing Border
    g.lineStyle(2, palette.gridColor, 0.9);
    g.strokeRoundedRect(this.x - 6, this.y - 6, w + 12, h + 12, 14);
    g.lineStyle(1.5, palette.gridColor, 0.35);
    g.strokeRoundedRect(this.x - 8, this.y - 8, w + 16, h + 16, 16);

    // Empty Cell Slots
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const cx = this.x + c * (CELL + PAD);
        const cy = this.y + r * (CELL + PAD);

        // Cell slot well
        g.fillStyle(theme.gridCellEmpty, 0.65);
        g.fillRoundedRect(cx, cy, CELL, CELL, BORDER_R);

        // Subtle slot border
        g.lineStyle(1, theme.gridLine, 0.6);
        g.strokeRoundedRect(cx, cy, CELL, CELL, BORDER_R);

        // Tech Corner Accents / Dot
        g.fillStyle(palette.gridColor, 0.15);
        g.fillCircle(cx + CELL / 2, cy + CELL / 2, 2.5);
      }
    }
  }

  /** Draw the active placed grid blocks */
  drawGrid(grid: Grid): void {
    const g = this.graphics;
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const val = grid[r][c];
        if (val === null) continue;

        const cx = this.x + c * (CELL + PAD);
        const cy = this.y + r * (CELL + PAD);
        GridRenderer.drawSingleBlock(g, cx, cy, CELL, val, 1.0, BORDER_R);
      }
    }
  }

  /** Draw snap ghost preview with neon pulse */
  drawGhost(shape: Shape, pos: Position, grid: Grid, isValid: boolean = true, pulseAlpha: number = 1.0): void {
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

        if (isValid) {
          // Valid ghost placement: bright glowing outline + soft fill
          g.fillStyle(color.glow, 0.32 * pulseAlpha);
          g.fillRoundedRect(cx, cy, CELL, CELL, BORDER_R);

          g.lineStyle(2.5, color.light, 0.95 * pulseAlpha);
          g.strokeRoundedRect(cx, cy, CELL, CELL, BORDER_R);

          // Center crosshair / diamond preview
          g.fillStyle(0xffffff, 0.6 * pulseAlpha);
          g.fillCircle(cx + CELL / 2, cy + CELL / 2, 4);
        } else {
          // Invalid ghost preview: red tint
          g.fillStyle(0xff2244, 0.25 * pulseAlpha);
          g.fillRoundedRect(cx, cy, CELL, CELL, BORDER_R);
          g.lineStyle(2, 0xff2244, 0.7 * pulseAlpha);
          g.strokeRoundedRect(cx, cy, CELL, CELL, BORDER_R);
        }
      }
    }
  }

  /** Draw high-energy laser beam clear animation */
  drawClearHighlight(rows: number[], cols: number[], progress: number): void {
    const g = this.graphics;
    const alpha = Math.sin((1 - progress) * Math.PI); // Smooth in-out bell curve

    // Draw Laser Sweeps for Rows
    for (const r of rows) {
      const cy = this.y + r * (CELL + PAD);
      
      // Wide soft glow beam
      g.fillStyle(0x00f5ff, alpha * 0.4);
      g.fillRoundedRect(this.x - 10, cy - 2, GRID_PX + 20, CELL + 4, 6);

      // Intense core beam
      g.fillStyle(0xffffff, alpha * 0.9);
      g.fillRoundedRect(this.x - 4, cy + (CELL / 2) - 6, GRID_PX + 8, 12, 4);
    }

    // Draw Laser Sweeps for Columns
    for (const c of cols) {
      const cx = this.x + c * (CELL + PAD);

      // Wide soft glow beam
      g.fillStyle(0xff00ff, alpha * 0.4);
      g.fillRoundedRect(cx - 2, this.y - 10, CELL + 4, GRID_PX + 20, 6);

      // Intense core beam
      g.fillStyle(0xffffff, alpha * 0.9);
      g.fillRoundedRect(cx + (CELL / 2) - 6, this.y - 4, 12, GRID_PX + 8, 4);
    }
  }

  /** Convert screen coordinates to grid position */
  screenToGrid(screenX: number, screenY: number): Position | null {
    const col = Math.floor((screenX - this.x) / (CELL + PAD));
    const row = Math.floor((screenY - this.y) / (CELL + PAD));
    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return null;
    return { row, col };
  }

  /** Get exact center pixel position for a grid cell */
  gridToPixel(row: number, col: number): { x: number; y: number } {
    return {
      x: this.x + col * (CELL + PAD) + CELL / 2,
      y: this.y + row * (CELL + PAD) + CELL / 2,
    };
  }

  clear(): void {
    this.graphics.clear();
  }

  destroy(): void {
    this.graphics.destroy();
  }
}

export { CELL, PAD, GRID_PX, BORDER_R };