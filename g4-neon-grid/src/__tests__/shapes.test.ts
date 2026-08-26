import { describe, it, expect } from 'vitest';
import { pickPieces, rotateShape, getAllShapes } from '../logic/shapes';

describe('Shapes', () => {
  it('picks 3 pieces', () => {
    const pieces = pickPieces(() => 0.5);
    expect(pieces).toHaveLength(3);
  });

  it('has shapes', () => {
    expect(getAllShapes().length).toBeGreaterThan(0);
  });

  it('rotates', () => {
    expect(rotateShape([[1, 0], [1, 1]])).toEqual([[1, 1], [0, 1]]);
  });
});