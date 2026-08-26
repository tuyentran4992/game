import { describe, it, expect } from 'vitest';
import {
  createEmptyGrid,
  canPlace,
  placeShape,
  clearLines,
  canPlaceAny,
  getValidPositions,
  GRID_SIZE,
} from '../logic/board';
import { pickPieces, rotateShape } from '../logic/shapes';
import { calculatePoints } from '../logic/scoring';

describe('Board', () => {
  it('creates empty 8x8 grid', () => {
    const grid = createEmptyGrid();
    expect(grid.length).toBe(GRID_SIZE);
    expect(grid[0].length).toBe(GRID_SIZE);
    expect(grid.every(row => row.every(cell => cell === null))).toBe(true);
  });

  it('can place a 1x1 block', () => {
    const grid = createEmptyGrid();
    const shape = { cells: [[1]], color: 0 };
    expect(canPlace(grid, shape, { row: 0, col: 0 })).toBe(true);
  });

  it('rejects out-of-bounds placement', () => {
    const grid = createEmptyGrid();
    const shape = { cells: [[1]], color: 0 };
    expect(canPlace(grid, shape, { row: 8, col: 8 })).toBe(false);
  });

  it('rejects overlapping placement', () => {
    const grid = createEmptyGrid();
    grid[0][0] = 0;
    const shape = { cells: [[1]], color: 1 };
    expect(canPlace(grid, shape, { row: 0, col: 0 })).toBe(false);
  });

  it('places a shape on the grid', () => {
    const grid = createEmptyGrid();
    const shape = { cells: [[1, 1], [1, 1]], color: 0 };
    const result = placeShape(grid, shape, { row: 0, col: 0 });
    expect(result[0][0]).toBe(0);
    expect(result[0][1]).toBe(0);
    expect(result[1][0]).toBe(0);
    expect(result[1][1]).toBe(0);
    expect(grid[0][0]).toBe(null); // original unchanged
  });

  it('clears a full row', () => {
    const grid = createEmptyGrid();
    for (let c = 0; c < GRID_SIZE; c++) grid[0][c] = 0;
    const result = clearLines(grid);
    expect(result.clearedRows).toHaveLength(1);
    expect(result.clearedRows[0]).toBe(0);
    expect(result.grid[0].every(c => c === null)).toBe(true);
  });

  it('clears a full column', () => {
    const grid = createEmptyGrid();
    for (let r = 0; r < GRID_SIZE; r++) grid[r][0] = 0;
    const result = clearLines(grid);
    expect(result.clearedCols).toHaveLength(1);
    expect(result.clearedCols[0]).toBe(0);
  });

  it('detects game over', () => {
    const grid = createEmptyGrid();
    for (let r = 0; r < GRID_SIZE; r++)
      for (let c = 0; c < GRID_SIZE; c++) grid[r][c] = 0;
    expect(canPlaceAny(grid, [{ cells: [[1]], color: 0 }])).toBe(false);
  });

  it('finds valid positions', () => {
    const grid = createEmptyGrid();
    const shape = { cells: [[1, 1], [1, 1]], color: 0 };
    expect(getValidPositions(grid, shape)).toHaveLength(49);
  });
});

describe('Shapes', () => {
  it('picks 3 pieces', () => {
    const pieces = pickPieces(() => 0.5);
    expect(pieces).toHaveLength(3);
    pieces.forEach(p => {
      expect(p.cells.length).toBeGreaterThan(0);
      expect(p.color).toBeGreaterThanOrEqual(0);
    });
  });

  it('rotates shape 90 degrees', () => {
    expect(rotateShape([[1, 0], [1, 1]])).toEqual([[1, 1], [0, 1]]);
  });
});

describe('Scoring', () => {
  it('calculates score for 1 line', () => {
    expect(calculatePoints(1, 0, false)).toBe(100);
  });

  it('applies combo multiplier', () => {
    expect(calculatePoints(2, 1, false)).toBe(300);
  });
});