/**
 * Neon Grid — Block Puzzle Logic
 *
 * Grid: 8×8, place blocks to clear rows/columns.
 * Game over when no more blocks can be placed.
 *
 * PURE TS — no rendering dependency, fully testable.
 */

export const GRID_SIZE = 8;

export type CellState = number | null; // color index or null

export type Grid = CellState[][];

export interface Position {
  row: number;
  col: number;
}

export interface Shape {
  /** 2D matrix: 1 = filled, 0 = empty */
  cells: number[][];
  /** Color index (0-6, maps to neon palette) */
  color: number;
}

export interface PlacedBlock {
  shape: Shape;
  position: Position;
}

export interface GameState {
  grid: Grid;
  score: number;
  isGameOver: boolean;
  currentPieces: Shape[];
  linesCleared: number;
}

/** Create an empty grid */
export function createEmptyGrid(): Grid {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => null)
  );
}

/** Check if a shape can be placed at position */
export function canPlace(grid: Grid, shape: Shape, pos: Position): boolean {
  for (let r = 0; r < shape.cells.length; r++) {
    for (let c = 0; c < shape.cells[r].length; c++) {
      if (shape.cells[r][c] === 0) continue;
      const gridRow = pos.row + r;
      const gridCol = pos.col + c;
      // Out of bounds
      if (gridRow >= GRID_SIZE || gridCol >= GRID_SIZE) return false;
      // Cell occupied
      if (grid[gridRow][gridCol] !== null) return false;
    }
  }
  return true;
}

/** Place a shape on the grid (mutates grid, returns updated grid) */
export function placeShape(grid: Grid, shape: Shape, pos: Position): Grid {
  const newGrid = grid.map(row => [...row]);
  for (let r = 0; r < shape.cells.length; r++) {
    for (let c = 0; c < shape.cells[r].length; c++) {
      if (shape.cells[r][c] === 1) {
        newGrid[pos.row + r][pos.col + c] = shape.color;
      }
    }
  }
  return newGrid;
}

/** Find and clear completed rows and columns. Returns { grid, clearedLines } */
export function clearLines(grid: Grid): { grid: Grid; clearedRows: number[]; clearedCols: number[] } {
  const clearedRows: number[] = [];
  const clearedCols: number[] = [];

  // Check rows
  for (let r = 0; r < GRID_SIZE; r++) {
    if (grid[r].every(cell => cell !== null)) {
      clearedRows.push(r);
    }
  }

  // Check columns
  for (let c = 0; c < GRID_SIZE; c++) {
    if (grid.every(row => row[c] !== null)) {
      clearedCols.push(c);
    }
  }

  if (clearedRows.length === 0 && clearedCols.length === 0) {
    return { grid, clearedRows: [], clearedCols: [] };
  }

  // Clear cells
  const newGrid = grid.map(row => [...row]);
  for (const r of clearedRows) {
    for (let c = 0; c < GRID_SIZE; c++) {
      newGrid[r][c] = null;
    }
  }
  for (const c of clearedCols) {
    for (let r = 0; r < GRID_SIZE; r++) {
      newGrid[r][c] = null;
    }
  }

  return { grid: newGrid, clearedRows, clearedCols };
}

/** Calculate score for cleared lines */
export function calculateScore(linesCleared: number, combo: number): number {
  const base = linesCleared * 100;
  const comboMultiplier = 1 + (combo * 0.5);
  return Math.floor(base * comboMultiplier);
}

/** Check if any of the current pieces can be placed */
export function canPlaceAny(grid: Grid, pieces: Shape[]): boolean {
  for (const piece of pieces) {
    for (let r = 0; r <= GRID_SIZE - piece.cells.length; r++) {
      for (let c = 0; c <= GRID_SIZE - piece.cells[0].length; c++) {
        if (canPlace(grid, piece, { row: r, col: c })) {
          return true;
        }
      }
    }
  }
  return false;
}

/** Get all valid positions for a shape on the grid */
export function getValidPositions(grid: Grid, shape: Shape): Position[] {
  const positions: Position[] = [];
  for (let r = 0; r <= GRID_SIZE - shape.cells.length; r++) {
    for (let c = 0; c <= GRID_SIZE - shape.cells[0].length; c++) {
      if (canPlace(grid, shape, { row: r, col: c })) {
        positions.push({ row: r, col: c });
      }
    }
  }
  return positions;
}