import { describe, it, expect } from 'vitest';
import { pickPieces } from '../logic/shapes';

describe('Shapes', () => {
  it('picks 3 pieces', () => {
    const pieces = pickPieces(() => 0.5);
    expect(pieces).toHaveLength(3);
  });
});