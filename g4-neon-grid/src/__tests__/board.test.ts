import { describe, it, expect } from 'vitest';
import { createEmptyGrid, GRID_SIZE } from '../logic/board';

describe('Board', () => {
  it('creates empty 8x8 grid', () => {
    const grid = createEmptyGrid();
    expect(grid.length).toBe(GRID_SIZE);
    expect(grid[0].length).toBe(GRID_SIZE);
  });
});