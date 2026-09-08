// Slice Studio — G8b: Bridge wiring anchors (card t_b96ddee2, gap B6 REPACK gate G8b)
// Tầng A fs-anchor (style S5F): bundle nộp Playgama PHẢI
//  (1) dist/index.html nạp Playgama Bridge SDK v2 qua script tag (y nguyên dòng M1),
//  (2) dist/playgama-bridge-config.json tồn tại CẠNH index.html (Bridge load config từ đó),
//  (3) config đúng quyết định đã chốt: platforms youtube-only (PB-0), advertisement như M1,
//  (4) script tag nằm TRƯỚC module script trong <head> (bridge phải có trước khi game boot).
// RED-first trên main @32120f0: dist/index.html thiếu script tag + dist thiếu config json
// → trên Playgama thật window.bridge không tồn tại → SDK rơi Mock → game_ready không gửi.
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function gameRoot(): string {
  return existsSync('dist') && existsSync('src') ? '.' : '..';
}

const BRIDGE_SCRIPT = 'bridge.playgama.com/v2/stable/playgama-bridge.js';

describe('G8b bridge wiring (dist anchors sau build)', () => {
  const root = gameRoot();

  it('dist/index.html nạp Playgama Bridge SDK v2 (script tag y nguyên M1)', () => {
    const distIndex = readFileSync(`${root}/dist/index.html`, 'utf-8');
    expect(distIndex).toContain(BRIDGE_SCRIPT);
  });

  it('dist/playgama-bridge-config.json tồn tại cạnh index.html', () => {
    expect(existsSync(`${root}/dist/playgama-bridge-config.json`)).toBe(true);
  });

  it('config dist: platforms youtube-only (PB-0, bỏ crazy_games), advertisement như M1', () => {
    const cfg = JSON.parse(
      readFileSync(`${root}/dist/playgama-bridge-config.json`, 'utf-8'),
    ) as {
      platforms: Record<string, unknown>;
      advertisement: {
        minimumDelayBetweenInterstitial: number;
        interstitial: { placements: { id: string }[] };
        rewarded: { placements: { id: string }[] };
      };
    };
    expect(Object.keys(cfg.platforms)).toEqual(['youtube']);
    expect(cfg.advertisement.minimumDelayBetweenInterstitial).toBe(60);
    expect(cfg.advertisement.interstitial.placements[0]?.id).toBe('game_over');
    expect(cfg.advertisement.rewarded.placements[0]?.id).toBe('continue');
  });

  it('script tag Bridge nằm TRƯỚC module script trong dist/index.html', () => {
    const distIndex = readFileSync(`${root}/dist/index.html`, 'utf-8');
    const bridgeAt = distIndex.indexOf(BRIDGE_SCRIPT);
    const moduleAt = distIndex.indexOf('type="module"');
    expect(bridgeAt).toBeGreaterThan(-1);
    expect(moduleAt).toBeGreaterThan(-1);
    expect(bridgeAt).toBeLessThan(moduleAt);
  });
});
