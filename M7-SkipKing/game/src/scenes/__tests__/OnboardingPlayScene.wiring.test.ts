// T4 TDD-B wiring — OnboardingPlayScene extends PlayScene: stage demo + demo-once + banner
// + slow-mo + sweet-zone CHỈ demo + plopSynth/resume (jsdom boot Phaser thật — mô hình T1e M1).
// Scene CHỈ diễn: beat/flick/highlight từ OnboardingDirector tầng A qua public interface.
// @vitest-environment jsdom
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { readFileSync } from 'node:fs';

// Stub 2D + FakeImage — NHƯỰNG chuộng nguyên văn mô hình T3 wiring (checkInverseAlpha + ready gate).
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
  if (proto) {
    proto.getContext = function getContext() { return ctx2dStub; };
  }
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
import { PlayScene } from '../PlayScene';
import { OnboardingPlayScene } from '../OnboardingPlayScene';
import { MECHANICS } from '../../config/mechanics';

const CANVAS = document.createElement('canvas');
const NATIVE_RAF = globalThis.requestAnimationFrame;
const NATIVE_CAF = globalThis.cancelAnimationFrame;

beforeAll(() => {
  document.body.appendChild(CANVAS);
  // (sk_done QUẢN LÝ trong beforeAll boot bên dưới — boot DEMO là kịch bản chính)
  (globalThis as Record<string, unknown>).requestAnimationFrame = (cb: (t: number) => void) =>
    setTimeout(() => cb(performance.now()), 16);
  (globalThis as Record<string, unknown>).cancelAnimationFrame = (id: number) => clearTimeout(id);
});
afterAll(() => {
  CANVAS.remove();
  window.localStorage.removeItem('sk_done');
  globalThis.requestAnimationFrame = NATIVE_RAF;
  globalThis.cancelAnimationFrame = NATIVE_CAF;
});

let game: Phaser.Game | null = null;
let scene: OnboardingPlayScene;
let sceneSeq = 0;

function waitBooted(s: OnboardingPlayScene, ms = 15000): Promise<void> {
  return new Promise((resolve, reject) => {
    const iv = setInterval(() => {
      if (s.scene && s.scene.isActive() && s.bootedForTest()) {
        clearInterval(iv);
        resolve();
      }
    }, 10);
    const giveUp = setTimeout(() => {
      clearInterval(iv);
      reject(new Error('OnboardingPlayScene boot timeout sau 15s'));
    }, ms);
    giveUp.unref?.();
  });
}

/** Thêm 1 scene MỚI vào game (key duy nhất) — start=true → create() chạy NGAY theo storage hiện tại. */
function addScene(start: boolean): OnboardingPlayScene {
  const s = new OnboardingPlayScene(`OnboardingPlayScene#${++sceneSeq}`);
  game!.scene.add(s.sys.settings.key, s, start, { resume: false });
  return s;
}

beforeAll(async () => {
  (window as unknown as { focus: () => void }).focus = () => {};
  game = new Phaser.Game({
    type: Phaser.CANVAS,
    parent: document.body,
    width: MECHANICS.canvas.width,
    height: MECHANICS.canvas.height,
    banner: false,
    audio: { noAudio: true },
    scene: [],
  });
  window.localStorage.removeItem('sk_done'); // boot DEMO — wiring test này chính là lần demo đầu
  scene = addScene(true);
  await waitBooted(scene);
});
afterAll(() => { game?.destroy(true); });

describe('OnboardingPlayScene — stage demo + demo-once (CONTRACT 3.1)', () => {
  it('stage qua lifecycle = "demo" — demo không bẩn best người chơi (tầng A)', () => {
    expect(scene.getStageForTest()).toBe('demo'); // boot không marker → stage demo
    // flip demo→local nằm trong source (finishDemo khi hết 12s / skip-on-touch)
    const src = readFileSync('src/scenes/OnboardingPlayScene.ts', 'utf8');
    expect(src).toContain("this.stage = 'local'");
  });

  it('demo-once: skip-on-touch ghi sk_done → boot MỚI thẳng stage local, không cú demo nào', async () => {
    expect(scene.demoDoneForTest()).toBe(false); // đang demo — chưa có marker
    scene.skipDemoForTest(); // chạm bất kỳ — cắt demo NGAY (CONTRACT 3.1)
    expect(window.localStorage.getItem('sk_done')).toBe('1');
    expect(scene.getStageForTest()).toBe('local');
    // Lần sau vào game — scene MỚI boot thẳng local, không auto-flick demo nào
    scene.scene.pause(); // dừng scene demo cũ — update() không tự diễn nữa
    const s2 = addScene(true);
    await waitBooted(s2);
    scene = s2;
    const engine = scene.getEngineForTest()!;
    scene.updateForTest(1000, 16);
    scene.updateForTest(2500, 16);
    scene.updateForTest(4200, 16);
    scene.updateForTest(8200, 16);
    expect(engine.stone).toBeNull(); // không auto-flick demo nào
  });

  it('grep-cap: stage flip demo→local trong source; cú demo chỉ inject khi stage "demo" (0 assist)', () => {
    const src = readFileSync('src/scenes/OnboardingPlayScene.ts', 'utf8');
    expect(src).toContain("stage === 'demo'"); // guard cú demo chỉ chạy ở stage demo
    expect(src).toContain("this.stage = 'local'"); // flip khi demo done
    expect(src).not.toContain('assistFlick'); // cú demo NGUYÊN BẢN — không qua Đ2
  });

  it('combo-banner testid + 2 dòng từ config khi PERFECT; demo-banner testid cho beat titles', () => {
    const combo = scene.comboBannerForTest();
    expect(combo).not.toBeNull();
    const comboHasTestid = combo!.list.some(
      (c) => typeof (c as Phaser.GameObjects.GameObject & { getData?: (k: string) => unknown }).getData === 'function' &&
        (c as unknown as { getData: (k: string) => unknown }).getData('testid') === 'combo-banner',
    );
    expect(comboHasTestid).toBe(true);
    const demo = scene.demoBannerForTest();
    expect(demo).not.toBeNull();
    const demoHasTestid = demo!.list.some(
      (c) => typeof (c as Phaser.GameObjects.GameObject & { getData?: (k: string) => unknown }).getData === 'function' &&
        (c as unknown as { getData: (k: string) => unknown }).getData('testid') === 'demo-banner',
    );
    expect(demoHasTestid).toBe(true);
  });

  it('slow-mo gate 0.4×: applySlowmo scale, clearSlowmo về 1 — không bẻ engine (tầng A giữ luật)', () => {
    expect(scene.slowmoScaleForTest()).toBe(1);
    scene.applySlowmoForTest(MECHANICS.slowmoTimescale);
    expect(scene.slowmoScaleForTest()).toBe(MECHANICS.slowmoTimescale);
    scene.clearSlowmoForTest();
    expect(scene.slowmoScaleForTest()).toBe(1);
  });

  it('PERFECT combo trigger qua markPerfect — engine ghi nhận PERFECT (cùng đường judge tầng A)', () => {
    const engine = scene.getEngineForTest()!;
    scene.triggerComboForTest({ dirX: 0, dirZ: -1, power: 0.8 });
    expect(engine.stone).not.toBeNull(); // cú PERFECT thành stone đang bay
    expect(engine.judgedPerfect).toBe(true); // judge tầng A trúng window
  });
});

describe('T4 — TEST-FIELDS QA hook PlayScene base (plopSynth + resume hook)', () => {
  it('PlayScene chưa register plopSynth (T4 wiring riêng) — grep-cap 2 file wiring đúng ranh giới', () => {
    const base = readFileSync('src/scenes/PlayScene.ts', 'utf8');
    const demo = readFileSync('src/scenes/OnboardingPlayScene.ts', 'utf8');
    expect(demo).toContain('plopSynth');
    expect(base).not.toContain('plopSynth');
  });

  it('updateForTest base PlayScene nguyên vẹn — OnboardingPlayScene kế thừa mirror test T3', () => {
    const scene2 = scene as unknown as PlayScene;
    expect(() => scene2.updateForTest(9000, 16)).not.toThrow();
  });
});
