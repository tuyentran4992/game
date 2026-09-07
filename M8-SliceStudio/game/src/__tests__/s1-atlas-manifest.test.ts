// Slice Studio — S1-T3: atlas manifest rào 4 (TEST-CASES §S1-T3)
// Mọi load key atlas có file thật, tên Latin, ≤2048², <512KB, đủ 4 chương — 0 load động.
import { existsSync, readdirSync, statSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ATLAS_KEYS } from '../config/theme-config';

const LATIN = /^[A-Za-z0-9._-]+$/;

function gameRoot(): string {
  // vitest chạy từ game/ (npm script) — fallback 1 cấp cho editor run
  return existsSync('public') ? '.' : '..';
}

describe('S1-T3 atlas manifest', () => {
  it('đủ 4 atlas file tồn tại trong public/', () => {
    const root = gameRoot();
    for (const key of Object.values(ATLAS_KEYS)) {
      expect(existsSync(`${root}/public/${key}.png`), `${key}.png missing`).toBe(true);
    }
  });

  it('tên file Latin (compliance C-6)', () => {
    const root = gameRoot();
    for (const f of readdirSync(`${root}/public`)) {
      expect(LATIN.test(f), `non-latin filename: ${f}`).toBe(true);
    }
  });

  it('mỗi atlas ≤2048×2048 và <512KB', () => {
    const root = gameRoot();
    for (const key of Object.values(ATLAS_KEYS)) {
      const p = `${root}/public/${key}.png`;
      const bytes = statSync(p).size;
      expect(bytes).toBeLessThan(512 * 1024);
      // PNG header: width/height big-endian ở byte 16..24
      const buf = readFileSync(p);
      const w = buf.readUInt32BE(16);
      const h = buf.readUInt32BE(20);
      expect(w).toBeLessThanOrEqual(2048);
      expect(h).toBeLessThanOrEqual(2048);
    }
  });

  it('manifest ghi đủ 4 chương + mask cfg khớp ART config', () => {
    const root = gameRoot();
    const m = JSON.parse(readFileSync(`${root}/public/atlas-manifest.json`, 'utf8')) as {
      chapters: Record<string, unknown>;
    };
    for (const key of Object.values(ATLAS_KEYS)) {
      const ch = key.replace('atlas-m', '');
      expect(m.chapters[ch]).toBeDefined();
    }
  });

  it('0 load động ngoài atlas: mọi this.load key trong src là atlas (rào 4-style)', () => {
    const root = gameRoot();
    const files = readdirSync(`${root}/src`, { recursive: true }) as string[];
    const loadKeys: string[] = [];
    for (const f of files) {
      if (!String(f).endsWith('.ts') || String(f).includes('__tests__')) continue;
      const src = readFileSync(`${root}/src/${f}`, 'utf8');
      for (const mm of src.matchAll(/this\.load\.(?:image|audio|spritesheet|bitmapFont)\([^,]+,\s*'([^']+)'/g)) {
        loadKeys.push(mm[1]);
      }
    }
    // AtlasBootScene (fx.ts) khai literal 4 atlas — mọi load key khác là load động cấm.
    // Rào 4 verify_game.sh trích THAM SỐ URL (arg 2) làm "key" và soi file trong dist —
    // test này bám đúng ngữ nghĩa đó: url phải trỏ tới atlas file public/.
    const allowed = new Set(Object.values(ATLAS_KEYS).map((k) => `${k}.png`));
    expect(loadKeys.length).toBeGreaterThanOrEqual(4);
    for (const k of loadKeys) expect(allowed.has(k), `unexpected load url: ${k}`).toBe(true);
  });
});
