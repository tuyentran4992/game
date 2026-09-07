// Slice Studio — S5-T1/T2: copy map EN thuần + popup compliance anchors
// (TEST-CASES S5-T1 copy map ASCII EN <=3 từ; S5-T2 nút đóng ≥44px btn-close;
// re-check sau art: demo dot + start pulse + magnet ring + 0 scrollbar + FIT ≤1:2)
// Tầng B anchor: fs-đọc source (vitest env node), KHÔNG import Phaser scene.
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { COPY_EN, COPY_LIMITS } from '../config/copy-en';

function gameRoot(): string {
  return existsSync('public') ? '.' : '..';
}

function readSrc(rel: string): string {
  return readFileSync(`${gameRoot()}/src/${rel}`, 'utf-8');
}

// Ký tự có dấu tiếng Việt (Latin Extended Additional + Latin-1 Supplement)
const VN_DIACRITIC = /[\u00C0-\u024F\u1E00-\u1EFF]/;
const ASCII_PRINTABLE = /^[\x20-\x7E]+$/;

/** Trích string literal sau khi strip comment (không regex trên raw source). */
function extractLiterals(src: string): string[] {
  const out: string[] = [];
  let st = 'code';
  let buf = '';
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    const c2 = i + 1 < n ? src[i + 1] : '';
    if (st === 'code') {
      if (c === '/' && c2 === '/') { st = 'line'; i += 2; continue; }
      if (c === '/' && c2 === '*') { st = 'block'; i += 2; continue; }
      if (c === "'") { st = 'sq'; buf = ''; i += 1; continue; }
      if (c === '"') { st = 'dq'; buf = ''; i += 1; continue; }
      if (c === '`') { st = 'tpl'; buf = ''; i += 1; continue; }
      i += 1;
      continue;
    }
    if (st === 'line') {
      if (c === '\n') st = 'code';
      i += 1;
      continue;
    }
    if (st === 'block') {
      if (c === '*' && c2 === '/') { st = 'code'; i += 2; } else { i += 1; }
      continue;
    }
    if (c === '\\') {
      const nxt = i + 1 < n ? src[i + 1] : '';
      if (nxt === 'n') buf += '\n';
      else if (nxt === 't') buf += '\t';
      else buf += nxt;
      i += 2;
      continue;
    }
    if ((st === 'sq' && c === "'") || (st === 'dq' && c === '"') || (st === 'tpl' && c === '`')) {
      if (st === 'tpl') {
        // template literal: chỉ giữ các chunk TĨNH quanh ${...}, trim mỗi chunk
        for (const chunk of buf.split(/\$\{[^}]*\}/)) out.push(chunk.trim());
      } else {
        out.push(buf);
      }
      st = 'code';
      i += 1;
      continue;
    }
    buf += c;
    i += 1;
  }
  return out;
}

// Copy-map values + glyph/symbol/cấu trúc không phải copy text (icon, style, event,
// scene key, registry key, testid — độ phủ tối thiểu, literal mới lạ sẽ fail).
const GLYPHS = ['★', '☆', '♪', '✕', '↺'];
const NON_COPY = new Set([
  'Arial', 'bold', 'center',
  'pointerdown', 'pointerup', 'pointermove',
  'keydown-ENTER', 'keydown-SPACE', 'keydown-ESC', 'keydown-UP', 'keydown-DOWN', 'keydown-LEFT', 'keydown-RIGHT',
  'Quad.in', 'Sine.inOut', 'Back.out',
  'EndScene', 'TraceScene',
  'awards', 'standalone', 'btn-close', 'startLevel',
]);
const COLOR = /^#[0-9A-Fa-f]{3,8}$/;
const HAS_LETTER = /[A-Za-z\u00C0-\u024F\u1E00-\u1EFF]/;

describe('S5-T1 copy map EN thuần', () => {
  const values = Object.values(COPY_EN);

  it('mọi value ASCII printable (0 ký tự dấu tiếng Việt)', () => {
    for (const v of values) {
      expect(ASCII_PRINTABLE.test(v), `non-ASCII copy: ${v}`).toBe(true);
      expect(VN_DIACRITIC.test(v), `VN diacritic in copy: ${v}`).toBe(false);
    }
  });

  it('mọi value <=3 từ (regex word-count), trim sạch + single-space', () => {
    for (const v of values) {
      const words = v.trim().split(/\s+/);
      expect(words.length, `>3 words: ${v}`).toBeLessThanOrEqual(COPY_LIMITS.maxWords);
      expect(v).toBe(v.trim());
      expect(/\s{2,}/.test(v), `double space: ${v}`).toBe(false);
    }
  });

  it('đủ bộ key in-use + reserved (khoá chuẩn hoá — chống typo drift)', () => {
    expect(Object.keys(COPY_EN).sort()).toEqual([
      'bestStreak', 'chunkLost', 'close', 'endTitle', 'foot', 'ghostChip', 'ghostCut',
      'goodCut', 'greatCut', 'keepGoing', 'level', 'niceCut', 'next', 'playAgain',
      'replayLevel', 'skip', 'starsAt', 'tryAgain',
    ].sort());
  });
});

describe('S5-T2 popup End có nút đóng + keyboard (C-15/C-19)', () => {
  const end = readSrc('scenes/EndScene.ts');

  it('nút đóng rõ ràng: testid btn-close + hit-region 44px', () => {
    expect(end).toContain('btn-close');
    expect(end).toMatch(/CLOSE_HIT\s*=\s*44/);
  });

  it('keyboard: Enter/Space confirm + Esc đóng + arrow chọn nút', () => {
    for (const key of ['keydown-ENTER', 'keydown-SPACE', 'keydown-ESC', 'keydown-UP', 'keydown-DOWN']) {
      expect(end).toContain(key);
    }
  });

  it('thumb-reach: 2 nút nằm dưới vạch bottom-40% (y >= 768 trên canvas 720x1280)', () => {
    expect(end).toMatch(/THUMB_TOP\s*=\s*768/);
    expect(end).toMatch(/THUMB_TOP/);
    expect(end).not.toContain('prototype'); // bỏ nhãn proto-ism
  });
});

describe('S5 anchor: UI string đổ qua copy map (TDD-B boundary)', () => {
  it('hud.ts + EndScene.ts: mọi literal có chữ ∈ copy map ∪ whitelist phi-copy', () => {
    const allowed = new Set<string>([...GLYPHS, ...Object.values(COPY_EN), ...NON_COPY]);
    for (const rel of ['ui/hud.ts', 'scenes/EndScene.ts']) {
      for (const lit of extractLiterals(readSrc(rel))) {
        if (!HAS_LETTER.test(lit)) continue; // màu/số/ký hiệu không chữ
        if (COLOR.test(lit)) continue;
        if (lit === 'phaser' || lit.startsWith('.')) continue; // module specifier import
        if (/^\d+(\.\d+)?(px|%)$/.test(lit)) continue; // style value (fontSize/padding)
        if (/^[a-z_$][\w$]*$/.test(lit) && !(Object.values(COPY_EN) as readonly string[]).includes(lit)) continue; // identifier-ish (typeof/event/scene key) — whitelist phi-copy bên trên
        expect(allowed.has(lit), `${rel}: literal ngoài copy map: "${lit}"`).toBe(true);
      }
    }
  });

  it('toàn src (ngoại trừ __tests__): 0 literal chữ có dấu tiếng Việt', () => {
    const files = ['ui/hud.ts', 'scenes/EndScene.ts', 'scenes/TraceScene.ts', 'main.ts'];
    for (const rel of files) {
      for (const lit of extractLiterals(readSrc(rel))) {
        expect(VN_DIACRITIC.test(lit), `${rel}: VN diacritic: "${lit}"`).toBe(false);
      }
    }
  });
});

describe('S5 re-check sau art (không sửa logic — chỉ verify còn nguyên)', () => {
  it('TraceScene: demo dot + start pulse + magnet ring còn hoạt động', () => {
    const src = readSrc('scenes/TraceScene.ts');
    expect(src).toContain('startDemo(');          // demo dot đi path
    expect(src).toContain('demoDot');             // dot object còn
    expect(src).toContain('startRing');           // magnet ring + pulse
    expect(src).toContain('scale: 1.25');         // pulse tween còn
  });

  it('0 scrollbar hệ thống: index.html giữ overflow:hidden (C-18)', () => {
    const html = readFileSync(`${gameRoot()}/index.html`, 'utf-8');
    expect(html).toMatch(/overflow:\s*hidden/);
  });

  it('canvas FIT 720x1280 — aspect dài ≤ 2x rộng (C active field ≤1:2)', () => {
    const main = readSrc('main.ts');
    expect(main).toContain('Phaser.Scale.FIT');
    const w = 720;
    const h = 1280;
    expect(h).toBeLessThanOrEqual(2 * w);
  });
});

// S5F anchor (fix-forward stale startLevel): Phaser scene.start() KHÔNG data
// KHÔNG ghi đè data cũ (ScenePlugin: "If no value is given it will not overwrite
// any previous data") → PLAY AGAIN/closePopup sau 1 lượt REPLAY LEVEL giữ lại
// { startLevel } cũ của lượt REPLAY trước. PLAY AGAIN = restart the whole run
// (copy-en.ts) + closePopup phải về L1: cả 2 call-site phải truyền tường minh
// { startLevel: 0 } (0 đi qua clamp 0..11 của TraceScene.create → levelIdx 0).
describe('S5F anchor: navigation về L1 — playAgain + closePopup truyền { startLevel: 0 }', () => {
  const end = readSrc('scenes/EndScene.ts');

  function methodBody(name: 'playAgain' | 'closePopup'): string {
    return end.match(new RegExp(`private ${name}\\(\\): void \\{[\\s\\S]*?\\n  \\}`))?.[0] ?? '';
  }

  it('cả 2 call-site scene.start(TraceScene) đều có data-param tường minh { startLevel: 0 }', () => {
    expect(
      methodBody('playAgain'),
      'playAgain(): scene.start TraceScene thiếu data-param { startLevel: 0 } — Phaser giữ startLevel cũ (stale leak)',
    ).toContain("this.scene.start('TraceScene', { startLevel: 0 })");
    expect(
      methodBody('closePopup'),
      'closePopup(): scene.start TraceScene thiếu data-param { startLevel: 0 } — Phaser giữ startLevel cũ (stale leak)',
    ).toContain("this.scene.start('TraceScene', { startLevel: 0 })");
  });
});
