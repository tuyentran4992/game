import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * T6 asset-manifest gate (TDD-B lớp boundary):
 * - 4 file art tồn tại trong public/assets/ đúng kích thước vẽ + <512KB/file (budget zip 1.6MB).
 * - 3 sprite là PNG RGBA (đã khử nền → alpha channel có thật).
 * - BootScene preload this.load.image đủ 4 key (asset manifest check của verify_game.sh rào 4).
 * Path đọc theo cwd (vitest chạy từ game dir) — import.meta.url là http trong jsdom.
 */
const GAME_DIR = process.cwd();
const ASSETS_DIR = join(GAME_DIR, 'public', 'assets');
const BOOT = join(GAME_DIR, 'src', 'scenes', 'BootScene.ts');

/** PNG: đọc width/height/colorType từ IHDR (byte 16..19 = w, 20..23 = h, 25 = colorType). */
function pngInfo(file: string): { w: number; h: number; colorType: number } {
  const buf = readFileSync(file);
  expect(buf.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a'); // PNG signature
  return {
    w: buf.readUInt32BE(16),
    h: buf.readUInt32BE(20),
    colorType: buf.readUInt8(25),
  };
}

const SPRITE_MIN = 128; // splash/ripple 128–256px
const MAX_BYTES = 512 * 1024;

describe('T6 asset manifest (public/assets)', () => {
  it('đủ 4 file art tồn tại', () => {
    for (const f of ['stone.png', 'splash.png', 'ripple.png', 'sunset_bg.png']) {
      expect(existsSync(join(ASSETS_DIR, f)), `missing public/assets/${f}`).toBe(true);
    }
  });

  it('kích thước vẽ đúng: stone/splash/ripple cạnh dài ~256px, cạnh ngắn ≥128 (đá oval dẹt); bg đúng 720×1280', () => {
    for (const f of ['stone.png', 'splash.png', 'ripple.png']) {
      const s = pngInfo(join(ASSETS_DIR, f));
      expect(Math.max(s.w, s.h), `${f} kích thước vẽ ~256px`).toBeGreaterThanOrEqual(256);
      expect(Math.min(s.w, s.h), `${f} đủ nét (min 128px)`).toBeGreaterThanOrEqual(SPRITE_MIN);
    }

    const bg = pngInfo(join(ASSETS_DIR, 'sunset_bg.png'));
    expect(bg.w).toBe(720);
    expect(bg.h).toBe(1280);
  });

  it('3 sprite là PNG RGBA (nền đã khử → alpha channel)', () => {
    for (const f of ['stone.png', 'splash.png', 'ripple.png']) {
      expect(pngInfo(join(ASSETS_DIR, f)).colorType, `${f} phải RGBA(6)`).toBe(6);
    }
  });

  it('mỗi file <512KB (budget zip tổng ≤1.6MB)', () => {
    for (const f of ['stone.png', 'splash.png', 'ripple.png', 'sunset_bg.png']) {
      const size = statSync(join(ASSETS_DIR, f)).size;
      expect(size, `${f} ${size}B`).toBeLessThan(MAX_BYTES);
    }
  });
});

describe('T6 BootScene preload wiring', () => {
  it('this.load.image đủ 4 key trùng tên file', () => {
    const src = readFileSync(BOOT, 'utf8');
    for (const key of ['stone', 'splash', 'ripple', 'sunset_bg']) {
      const re = new RegExp(`this\\.load\\.image\\(\\s*['"]${key}['"]`);
      expect(re.test(src), `BootScene thiếu this.load.image('${key}', ...)`).toBe(true);
    }
  });
});
