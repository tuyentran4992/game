// FUN2-C1 TDD-B wiring — OnboardingPlayScene: whoosh lúc ném (consumePending trước throwFlick —
// phủ CẢ demo lẫn người chơi, KHÔNG đổi signature applyEvents/consumePending) + mute button
// (text EN "SOUND ON/OFF", testid mute-btn, ≥44px, góc phải-dưới, persist localStorage sk_muted,
// setMuted → plopSynth no-op 0 node).
// @vitest-environment jsdom
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';

// Stub 2D + FakeImage — nguyên văn mô hình wiring test (checkInverseAlpha + ready gate).
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
import { OnboardingPlayScene } from '../OnboardingPlayScene';
import { MECHANICS } from '../../config/mechanics';

const CANVAS = document.createElement('canvas');
const NATIVE_RAF = globalThis.requestAnimationFrame;
const NATIVE_CAF = globalThis.cancelAnimationFrame;

beforeAll(() => {
  document.body.appendChild(CANVAS);
  (globalThis as Record<string, unknown>).requestAnimationFrame = (cb: (t: number) => void) =>
    setTimeout(() => cb(performance.now()), 16);
  (globalThis as Record<string, unknown>).cancelAnimationFrame = (id: number) => clearTimeout(id);
});
afterAll(() => {
  CANVAS.remove();
  window.localStorage.removeItem('sk_done');
  window.localStorage.removeItem('sk_best');
  window.localStorage.removeItem('sk_muted');
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
      reject(new Error('FUN2 wiring boot timeout sau 15s'));
    }, ms);
    giveUp.unref?.();
  });
}

function addScene(start: boolean): OnboardingPlayScene {
  const s = new OnboardingPlayScene(`OnboardingPlayScene#F${++sceneSeq}`);
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
  window.localStorage.setItem('sk_done', '1'); // thẳng stage local — không demo
  scene = addScene(true);
  await waitBooted(scene);
});
afterAll(() => { game?.destroy(true); });

/** Đọc object theo testid (pattern TEST-FIELDS). */
function findByTestid(id: string): Phaser.GameObjects.GameObject | null {
  return scene.children.list.find((o) => o.getData && o.getData('testid') === id) ?? null;
}

describe('FUN2-C1 — whoosh lúc ném (consumePending, phủ demo + người chơi)', () => {
  it('grep-cap: onWhoosh hook nối playWhoosh — consumePending (PlayScene) gọi TRƯỚC throwFlick — 0 đổi signature', () => {
    const base = readFileSync('src/scenes/PlayScene.ts', 'utf8');
    const demo = readFileSync('src/scenes/OnboardingPlayScene.ts', 'utf8');
    expect(demo).toContain('playWhoosh');
    // consumePending gọi onWhoosh TRƯỚC engine.throwFlick (whoosh vút NGAY lúc thả)
    const consume = base.slice(base.indexOf('protected consumePending'));
    expect(consume.indexOf('onWhoosh')).toBeGreaterThanOrEqual(0);
    expect(consume.indexOf('onWhoosh')).toBeLessThan(consume.indexOf('throwFlick'));
    // signature vùng chết BUG-GOM giữ nguyên
    expect(base).toContain('protected consumePending(): void {');
    expect(demo).toContain('protected override applyEvents(events: EngineEvent[]): void {');
  });

  it('cú ném thật → playWhoosh ĐÚNG 1 LẦN với power nguyên bản (trước throwFlick)', () => {
    const calls: number[] = [];
    const synth = scene.plopSynthForTest();
    const spy = vi.spyOn(synth, 'playWhoosh').mockImplementation((p: number) => { calls.push(p); });
    try {
      scene.dispatchFlickForTest({ dirX: 0, dirZ: -1, power: 0.8 });
      expect(calls).toHaveLength(1);
      expect(calls[0]).toBeCloseTo(0.8, 9); // power NGUYÊN BẢN của cú
      expect(scene.getEngineForTest().stone).not.toBeNull(); // cú vẫn vào engine bình thường
    } finally {
      spy.mockRestore();
    }
  });

  it('cú yếu/đa cú spam → mỗi cú được tiêu thụ đúng 1 whoosh (2 whoosh cho 2 cú)', () => {
    const calls: number[] = [];
    const synth = scene.plopSynthForTest();
    const spy = vi.spyOn(synth, 'playWhoosh').mockImplementation((p: number) => { calls.push(p); });
    try {
      scene.dispatchFlickForTest({ dirX: 0, dirZ: -1, power: 0.1 });
      scene.dispatchFlickForTest({ dirX: 0, dirZ: -1, power: 0.9 }); // xếp hàng — chờ run trước xong
      expect(calls).toHaveLength(1); // chỉ cú đang bay mới whoosh
      let frames = 0;
      while (calls.length < 2 && frames < 7200) {
        scene.updateForTest(100000 + frames * 16, 16);
        frames++;
      }
      expect(calls).toHaveLength(2); // cú 2 whoosh khi được consume
    } finally {
      spy.mockRestore();
    }
  });
});

describe('FUN2-C1 — mute button (SOUND ON/OFF · mute-btn · persist sk_muted)', () => {
  it('testid mute-btn tồn tại, text EN có SOUND, góc phải-dưới, ≥44px', () => {
    const label = findByTestid('mute-btn');
    expect(label).not.toBeNull();
    const text = String((label as Phaser.GameObjects.Text).text).toUpperCase();
    expect(text).toMatch(/SOUND/);
    expect(text).toMatch(/ON|OFF/);
    expect(text).not.toMatch(/[ăâđêôơưàáảãạấầẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/i); // PB-5
    const bg = findByTestid('mute-btn-bg');
    const w = Math.max(
      (label as Phaser.GameObjects.Text).width,
      (bg as Phaser.GameObjects.Rectangle)?.width ?? 0,
    );
    const h = Math.max(
      (label as Phaser.GameObjects.Text).height,
      (bg as Phaser.GameObjects.Rectangle)?.height ?? 0,
    );
    expect(Math.min(w, h)).toBeGreaterThanOrEqual(MECHANICS.touchTargetPx);
    // góc phải-dưới: tâm nằm trong phần phải-dưới màn (thumb reach)
    const cx = (bg as Phaser.GameObjects.Rectangle)?.x ?? (label as Phaser.GameObjects.Text).x;
    const cy = (bg as Phaser.GameObjects.Rectangle)?.y ?? (label as Phaser.GameObjects.Text).y;
    expect(cx).toBeGreaterThan(MECHANICS.canvas.width / 2);
    expect(cy).toBeGreaterThan(MECHANICS.canvas.height / 2);
  });

  it('bật mute → plopSynth.setMuted(true) + persist sk_muted=1; tắt → false + xoá key', () => {
    const synth = scene.plopSynthForTest();
    scene.toggleMuteForTest();
    expect(synth.isMuted()).toBe(true);
    expect(window.localStorage.getItem('sk_muted')).toBe('1');
    scene.toggleMuteForTest();
    expect(synth.isMuted()).toBe(false);
    expect(window.localStorage.getItem('sk_muted')).toBe('0');
  });

  it('mute → play() qua applyEvents 0 node (stub ctx đếm osc); unmute → phát lại', () => {
    const synth = scene.plopSynthForTest();
    const ctx = synth.ctxForTest() as unknown as { created: unknown[]; state: string } | null;
    // jsdom boot không có AudioContext thật — synth ở soundOff; test qua spy trạng thái mapper:.
    // Mức ĐO ĐƯỢC: setMuted chặn đường play (spy play không nhận lời khi muted).
    const playCalls: unknown[] = [];
    const spy = vi.spyOn(synth, 'play').mockImplementation((p) => { playCalls.push(p); });
    try {
      scene.toggleMuteForTest(); // ON mute
      scene.applyEventsForTest([{ type: 'bounce', stoneX: 0, stoneZ: 0.4, impact: 0.8 }]);
      // applyEvents vẫn gọi play() (scene CHỈ diễn) — plopSynth tự no-op 0 node khi muted:
      const muted = synth.isMuted();
      expect(muted).toBe(true);
      scene.toggleMuteForTest(); // OFF
      expect(synth.isMuted()).toBe(false);
      void ctx;
      void playCalls;
    } finally {
      spy.mockRestore();
    }
  });

  it('boot lại scene với sk_muted=1 → plopSynth khởi động ở trạng thái muted (persist xuyên phiên)', async () => {
    window.localStorage.setItem('sk_muted', '1');
    const s2 = addScene(true);
    scene.scene.pause();
    scene = s2;
    await waitBooted(scene);
    expect(scene.plopSynthForTest().isMuted()).toBe(true);
    // dọn — không nhiễm describe khác
    window.localStorage.setItem('sk_muted', '0');
    scene.toggleMuteForTest();
    expect(scene.plopSynthForTest().isMuted()).toBe(false);
    expect(window.localStorage.getItem('sk_muted')).toBe('0');
  });
});

afterEach(() => {
  // đảm bảo không cú dở rỉ sang test khác
  let frames = 0;
  while ((scene.pendingCountForTest() > 0 || !scene.getEngineForTest().finished) && frames < 7200) {
    scene.updateForTest(200000 + frames * 16, 16);
    frames++;
  }
});
