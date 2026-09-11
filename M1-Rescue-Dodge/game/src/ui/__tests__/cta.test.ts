// UT R5 (t_a562b030) — CTA Play Again nổi nhất màn + probe E2E.
// Tầng B: config token + wiring — đọc qua text source vì scene cần canvas thật.
// N3: testid cũ giữ nguyên diff-rỗng; scope cấm: ad placement (I1) không đụng.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dur } from '../../tokens';

const readSrc = (rel: string) => readFileSync(rel, 'utf8');
const uiSrc = () => readSrc('src/ui.ts');
const gameOverSrc = () => readSrc('src/scenes/GameOver.ts');

describe('R5 CTA Play Again — config tokens', () => {
  it('dur.ctaPulse tồn tại — nhịp pulse nút CTA chính [PLACEHOLDER 900ms]', () => {
    expect(dur.ctaPulse).toBe(900);
  });
});

describe('R5 CTA Play Again — drawButton hỗ trợ glow/pulse (tầng B)', () => {
  it('opts có glow?: boolean và pulseMs?: number', () => {
    const src = uiSrc();
    expect(src).toMatch(/glow\?\s*:\s*boolean/);
    expect(src).toMatch(/pulseMs\?\s*:\s*number/);
  });

  it('tầng B thuần: ui.ts KHÔNG import logic/', () => {
    expect(uiSrc()).not.toMatch(/from\s+'\.\.\/logic\//);
  });
});

describe('R5 CTA Play Again — boot probe main.ts (E2E entry)', () => {
  it('window.__game expose Phaser.Game cho QA E2E (tầng B, không ảnh hưởng runtime)', () => {
    expect(readSrc('src/main.ts')).toMatch(/__game\s*=/);
  });
});

describe('R5 CTA Play Again — wiring GameOver.ts', () => {
  it('retry-btn vẽ primary có glow + pulse theo token dur.ctaPulse', () => {
    const src = gameOverSrc();
    expect(src).toMatch(/testid:\s*'retry-btn'/);
    expect(src).toMatch(/glow:\s*true/);
    expect(src).toMatch(/pulseMs:\s*dur\.ctaPulse/);
  });

  it('probe __gameoverCta {taps,x,y} trên window cho QA E2E (vị trí retry-btn + tap-count)', () => {
    const src = gameOverSrc();
    expect(src).toMatch(/__gameoverCta[^;]*taps:\s*0,\s*x:\s*this\.root\.x\s*\+\s*retryBtn\.container\.x/);
  });

  it('probe __gameplaySpawned qua events.once(create) của GameplayScene (không đụng Gameplay.ts)', () => {
    expect(gameOverSrc()).toMatch(/__gameplaySpawned/);
    expect(gameOverSrc()).toMatch(/events\.once\('create'/);
  });

  it('N3 giữ nguyên: testid cũ trong GameOver không bị xoá', () => {
    const src = gameOverSrc();
    for (const tid of ['final-score', 'best-score', 'retry-btn', 'continue-btn', 'menu-btn']) {
      expect(src).toContain(`'${tid}'`);
    }
  });

  it('scope guard: ad placement vẫn ở GameOver (I1 card POST riêng — R5 không đụng)', () => {
    expect(gameOverSrc()).toContain('requestInterstitialAd');
    expect(gameOverSrc()).toContain('shouldShowInterstitial');
  });
});
