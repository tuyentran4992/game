// UPG2-CH (card t_0a7ab101) — chip chương trên HUD level-progress (TDD-B).
// Format mới: `CH{paletteIndex+1} · NEXT {into}/{interval}` thay `NEXT LEVEL: {into}/{interval}`
// — paletteIndex đọc qua public interface tầng A (CONTRACT §2: getPaletteIndex/paletteIndex),
// scene/renderer KHÔNG tự tính luật. Testid `level-progress` GIỮ NGUYÊN (N3).
// Mô hình jsdom canvas-stub: tái sử dụng từ Gameplay.hud-roadside-wiring.test.ts (T1e).
// @vitest-environment jsdom
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { readFileSync } from 'fs';

const HUD_PATH = 'src/scenes/render/HudRenderer.ts';

// ---- Grep-cấp nguồn: format text nằm ở renderer, đọc engine qua interface ----
describe('UPG2-CH — format chip chương tại level-progress (grep-cấp nguồn)', () => {
  it('HudRenderer KHÔNG còn format cũ `NEXT LEVEL:` tại drawLevelProgress', () => {
    const src = readFileSync(HUD_PATH, 'utf8');
    expect(src).not.toContain('NEXT LEVEL:');
  });

  it('HudRenderer đọc paletteIndex qua engine (interface tầng A) — không tự tính', () => {
    const src = readFileSync(HUD_PATH, 'utf8');
    expect(src).toMatch(/engine\.(getPaletteIndex\(\)|paletteIndex)/);
    // renderer không tự viết lại luật palette (không literal ngưỡng 10/20 trong drawLevelProgress)
    const fn = src.slice(src.indexOf('drawLevelProgress()'), src.indexOf('drawFeverBar()'));
    expect(fn).not.toMatch(/level\s*<\s*10|level\s*<\s*20/);
  });
});

// ---- Runtime: boot Phaser thật (canvas-stub) → HUD text khớp format mới ----
vi.hoisted(() => {
  const ctx2dStub: Record<string, unknown> = {
    fillStyle: '', strokeStyle: '', lineWidth: 1, font: '', textAlign: '', textBaseline: '',
    globalAlpha: 1, globalCompositeOperation: 'source-over', imageSmoothingEnabled: true,
    fillRect() {}, strokeRect() {}, clearRect() {}, beginPath() {}, closePath() {},
    moveTo() {}, lineTo() {}, arc() {}, fill() {}, stroke() {}, rect() {},
    save() {}, restore() {}, translate() {}, rotate() {}, scale() {}, setTransform() {},
    drawImage() {}, createPattern() { return null; },
    createLinearGradient() { return { addColorStop() {} }; },
    createRadialGradient() { return { addColorStop() {} }; },
    getImageData(_x: number, _y: number, w: number, h: number) {
      return { data: new Uint8ClampedArray(w * h * 4), width: w, height: h };
    },
    putImageData() {},
    measureText(t: string) { return { width: t.length * 7 }; },
    quadraticCurveTo() {}, bezierCurveTo() {}, ellipse() {}, setLineDash() {},
    fillText() {}, strokeText() {}, clip() {}, transform() {},
  };
  const proto = (globalThis as Record<string, any>).HTMLCanvasElement?.prototype;
  if (proto) proto.getContext = function getContext() { return ctx2dStub; };
  if (!(globalThis as Record<string, unknown>).CanvasRenderingContext2D) {
    (globalThis as Record<string, unknown>).CanvasRenderingContext2D = class {};
  }
  class FakeImage {
    onload: () => void = () => {};
    onerror: () => void = () => {};
    width = 2; height = 2; naturalWidth = 2; naturalHeight = 2; complete = true;
    private _src = '';
    set src(v: string) { this._src = v; queueMicrotask(() => this.onload()); }
    get src() { return this._src; }
  }
  (globalThis as Record<string, unknown>).Image = FakeImage;
});

import Phaser from 'phaser';
import { GameplayScene } from '../Gameplay';
import { MECHANICS } from '../../logic/mechanics';

describe('UPG2-CH runtime — HUD level-progress hiển thị chip chương', () => {
  let game: Phaser.Game | null = null;
  let scene: GameplayScene;

  beforeAll(async () => {
    const CANVAS = document.createElement('canvas');
    document.body.appendChild(CANVAS);
    const NATIVE_RAF = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = (cb: (t: number) => void) => setTimeout(() => cb(performance.now()), 16) as unknown as number;
    globalThis.cancelAnimationFrame = (id: number) => clearTimeout(id as unknown as ReturnType<typeof setTimeout>);
    (window as unknown as { focus: () => void }).focus = () => {};
    game = new Phaser.Game({
      type: Phaser.CANVAS, parent: document.body, width: 390, height: 720,
      banner: false, audio: { noAudio: true }, scene: [],
    });
    scene = new GameplayScene();
    game.scene.add('GameplayScene', scene, true, { resume: false });
    game.scene.add('GameOverScene', new Phaser.Scene('GameOverScene'));
    await vi.waitFor(() => {
      expect(scene.scene.isActive()).toBe(true);
      expect(scene.runningView).toBe(true);
      expect(scene.hud).toBeDefined();
    }, { timeout: 15000, interval: 50 });
    (globalThis as any).__nativeRafRestore = NATIVE_RAF;
  }, 20000);

  afterAll(() => {
    if ((globalThis as any).__nativeRafRestore) {
      globalThis.requestAnimationFrame = (globalThis as any).__nativeRafRestore;
    }
    game?.destroy(true);
  });

  function levelProgressText(): string {
    const el = (scene.hud as unknown as { levelProgressLabel: Phaser.GameObjects.Text }).levelProgressLabel;
    expect(el.getData('testid')).toBe('level-progress');
    return el.text;
  }

  function engineOf() {
    // Cửa test public của scene (T1e dùng sẵn) — engine instance thật đang chạy.
    return scene.getEngineForTest();
  }

  it('Score 0 → `CH1 · NEXT 0/{interval}` (chapter = paletteIndex+1, engine bước 1)', () => {
    const engine = engineOf();
    engine.startNewGame();
    expect(engine.paletteIndex).toBe(0);
    scene.hud.drawLevelProgress();
    expect(levelProgressText()).toBe(`CH1 · NEXT 0/${MECHANICS.milestoneInterval}`);
  });

  it('Score 120 (level 2, paletteIndex 0) → `CH1`; score 202 (level 10, paletteIndex 1) → `CH2`', () => {
    const engine = engineOf();
    const s = engine as unknown as { score: number };
    s.score = MECHANICS.milestoneInterval + 20; // 120 → level 2, paletteIndex 0
    scene.hud.drawLevelProgress();
    expect(levelProgressText()).toBe(`CH1 · NEXT 20/${MECHANICS.milestoneInterval}`);
    s.score = 9 * MECHANICS.milestoneInterval + 22; // 202 → level 10 → paletteIndex 1
    scene.hud.drawLevelProgress();
    expect(levelProgressText()).toBe(`CH2 · NEXT 22/${MECHANICS.milestoneInterval}`);
  });

  it('Score 382 (level 20, paletteIndex 2) → `CH3 · NEXT 2/{interval}`', () => {
    const engine = engineOf();
    const s = engine as unknown as { score: number };
    s.score = 19 * MECHANICS.milestoneInterval + 2; // 382 → level 20 → paletteIndex 2
    scene.hud.drawLevelProgress();
    expect(levelProgressText()).toBe(`CH3 · NEXT 2/${MECHANICS.milestoneInterval}`);
  });
});
