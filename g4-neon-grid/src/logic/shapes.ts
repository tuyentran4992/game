/**
 * Neon Grid — Block Shapes
 *
 * 12 block shapes (tetromino-style + smaller pieces).
 * Each shape is a 2D matrix (1=filled, 0=empty).
 * Max size: 3×3 (small enough for 8×8 grid).
 */

export interface ShapeDef {
  cells: number[][];
  name: string;
}

// All 12 shapes (tetrominoes + smaller)
const ALL_SHAPES: ShapeDef[] = [
  // Single cell
  { cells: [[1]], name: 'mono' },

  // 2-cell
  { cells: [[1, 1]], name: 'domino_h' },
  { cells: [[1], [1]], name: 'domino_v' },

  // 3-cell L-shapes
  { cells: [[1, 0], [1, 1]], name: 'l_bent' },
  { cells: [[0, 1], [1, 1]], name: 'l_reverse' },
  { cells: [[1, 1, 1]], name: 'triple_h' },
  { cells: [[1], [1], [1]], name: 'triple_v' },

  // 4-cell (tetrominoes)
  { cells: [[1, 1], [1, 1]], name: 'o' },
  { cells: [[1, 1, 1], [0, 1, 0]], name: 't' },
  { cells: [[1, 1, 1], [1, 0, 0]], name: 'l' },
  { cells: [[1, 1, 1], [0, 0, 1]], name: 'j' },
  { cells: [[1, 1, 1, 1]], name: 'i_h' },
  { cells: [[1], [1], [1], [1]], name: 'i_v' },
];

const NEON_COLORS = [0, 1, 2, 3, 4, 5, 6]; // indices into theme palette

/** Pick 3 random pieces for the player's hand */
export function pickPieces(rng: () => number = Math.random): { cells: number[][]; color: number }[] {
  const pieces: { cells: number[][]; color: number }[] = [];
  const usedIndices = new Set<number>();

  for (let i = 0; i < 3; i++) {
    // Pick a unique shape
    let idx: number;
    do {
      idx = Math.floor(rng() * ALL_SHAPES.length);
    } while (usedIndices.has(idx) && usedIndices.size < ALL_SHAPES.length);
    usedIndices.add(idx);

    // Pick a random color
    const color = NEON_COLORS[Math.floor(rng() * NEON_COLORS.length)];

    pieces.push({
      cells: ALL_SHAPES[idx].cells.map(row => [...row]),
      color,
    });
  }

  return pieces;
}

/** Rotate a shape 90 degrees clockwise */
export function rotateShape(cells: number[][]): number[][] {
  const rows = cells.length;
  const cols = cells[0].length;
  const rotated: number[][] = Array.from({ length: cols }, () => Array(rows).fill(0));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      rotated[c][rows - 1 - r] = cells[r][c];
    }
  }
  return rotated;
}

/** Get all unique shape definitions */
export function getAllShapes(): ShapeDef[] {
  return ALL_SHAPES;
}