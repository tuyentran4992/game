import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('Button Hit Area — Phaser Container coordinate normalization', () => {
  const padX = 12;
  const padY = 10;
  const width = 280;
  const height = 64;

  const rectContains = (rect: { x: number; y: number; width: number; height: number }, px: number, py: number) => {
    return px >= rect.x && px <= rect.x + rect.width && py >= rect.y && py <= rect.y + rect.height;
  };

  it('correct hitRect is symmetric and covers left, center, right with padding', () => {
    // In Phaser 3, Container has displayOriginX = width * 0.5, displayOriginY = height * 0.5.
    // pointWithinHitArea adds displayOrigin to local container coords:
    // normX = localX + width * 0.5
    // normY = localY + height * 0.5
    const hitRect = {
      x: -padX,
      y: -padY,
      width: width + padX * 2,
      height: height + padY * 2,
    };

    const isHit = (localX: number, localY: number) => {
      const normX = localX + width * 0.5;
      const normY = localY + height * 0.5;
      return rectContains(hitRect, normX, normY);
    };

    // Center click
    expect(isHit(0, 0)).toBe(true);

    // Left edge and right edge
    expect(isHit(-width / 2, 0)).toBe(true);
    expect(isHit(width / 2, 0)).toBe(true);

    // Left half and right half
    expect(isHit(-width / 4, 0)).toBe(true);
    expect(isHit(width / 4, 0)).toBe(true);

    // Padded boundaries
    expect(isHit(-width / 2 - padX, 0)).toBe(true);
    expect(isHit(width / 2 + padX, 0)).toBe(true);

    // Outside padded boundaries
    expect(isHit(-width / 2 - padX - 1, 0)).toBe(false);
    expect(isHit(width / 2 + padX + 1, 0)).toBe(false);
  });

  it('old buggy hitRect failed on right half clicks', () => {
    const oldBuggyHitRect = {
      x: -width / 2 - padX,
      y: -height / 2 - padY,
      width: width + padX * 2,
      height: height + padY * 2,
    };

    const isHitOld = (localX: number, localY: number) => {
      const normX = localX + width * 0.5;
      const normY = localY + height * 0.5;
      return rectContains(oldBuggyHitRect, normX, normY);
    };

    // Left half worked
    expect(isHitOld(-width / 4, 0)).toBe(true);

    // Right half FAILED in old code because normX > oldBuggyHitRect.right (width/2 + padX)
    expect(isHitOld(width / 4, 0)).toBe(false);
    expect(isHitOld(width / 2, 0)).toBe(false);
  });

  it('ui.ts source code uses -padX, -padY instead of -width / 2', () => {
    const src = readFileSync('src/ui.ts', 'utf8');
    expect(src).toMatch(/const hitRect = new Phaser\.Geom\.Rectangle\(\s*-padX,\s*-padY/);
    expect(src).not.toMatch(/-width \/ 2 - padX/);
  });

  it('StageClearModal does not override nextBtn.container hitArea with negative offset', () => {
    const src = readFileSync('src/ui/StageClearModal.ts', 'utf8');
    expect(src).not.toMatch(/nextBtn\.container\.setInteractive\(\s*new Phaser\.Geom\.Rectangle\(-btnW \/ 2/);
  });
});
