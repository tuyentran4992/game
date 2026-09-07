// FUN2-C3 TDD-B wiring — juice/HUD: spray scale theo impact (bỏ ngưỡng cứng
// SPRAY_IMPACT_MIN — MỌI bounce bung spray, số hạt theo công thức SKIM), splash crown
// (vòm cung foam TRẮNG tái dùng pool FoamFx — KHÔNG pool mới, KHÔNG màu mới, alpha
// 0.25–0.5), HUD pop (score nhảy scale-only <150ms — KHÔNG đổi chữ/alpha/vị trí,
// contrast AA T6 giữ nguyên). Scene dựng Phaser thật headless jsdom (mô hình Fun2Skim —
// boot sk_done=1 stage local: KHÔNG đi đường director-ratchet của các test flake).
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
import { FX, SKIM } from '../../render/layout';

const CANVAS = document.createElement('canvas');
const NATIVE_RAF = globalThis.requestAnimationFrame;
const NATIVE_CAF = globalThis.cancelAnimationFrame;

beforeAll(() => {
  document.body.appendChild(CANVAS);
  window.localStorage.setItem('sk_done', '1'); // thẳng stage local — không demo (mô hình Fun2Skim)
  (globalThis as Record<string, unknown>).requestAnimationFrame = (cb: (t: number) => void) =>
    setTimeout(() => cb(performance.now()), 16);
  (globalThis as Record<string, unknown>).cancelAnimationFrame = (id: number) => clearTimeout(id);
});
afterAll(() => {
  CANVAS.remove();
  window.localStorage.removeItem('sk_done');
  window.localStorage.removeItem('sk_best');
  globalThis.requestAnimationFrame = NATIVE_RAF;
  globalThis.cancelAnimationFrame = NATIVE_CAF;
});

let game: Phaser.Game | null = null;
let scene: OnboardingPlayScene;

function bootScene(): Promise<void> {
  return new Promise((resolve, reject) => {
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
    scene = new OnboardingPlayScene();
    game.scene.add('OnboardingPlayScene', scene, true, { resume: false });
    const iv = setInterval(() => {
      if (scene.scene && scene.scene.isActive() && scene.bootedForTest()) {
        clearInterval(iv);
        resolve();
      }
    }, 10);
    const giveUp = setTimeout(() => {
      clearInterval(iv);
      reject(new Error('Fun2Juice boot timeout sau 15s'));
    }, 15000);
    giveUp.unref?.();
  });
}

beforeAll(async () => { await bootScene(); });
afterAll(() => { game?.destroy(true); });

/** Đếm object theo testid (pattern TEST-FIELDS — QA soi cùng đường). */
function countByTestid(id: string): number {
  return scene.children.list.filter((o) => o.getData && o.getData('testid') === id).length;
}
function visibleByTestid(id: string): Phaser.GameObjects.GameObject[] {
  return scene.children.list.filter(
    (o) => o.getData && o.getData('testid') === id && (o as Phaser.GameObjects.Image).visible,
  );
}

/** Công thức spray khóa trong test (số sống ở SKIM — test khóa công thức, án lệ M1FIX). */
function sprayCountFor(impact: number): number {
  const c = Math.min(1, Math.max(0, impact));
  return SKIM.sprayCountMin + Math.round(c * (SKIM.sprayCountMax - SKIM.sprayCountMin));
}

/** Dọn FX sống (spray/foam/wake/hitstop/pop) giữa các it — advance qua mirror C2. */
function drainFx(): void {
  scene.advanceSkimTimeScaleForTest(1200); // > mọi life (spray ~500ms, foam 850ms, wake 900ms, pop 120ms)
}

afterEach(() => {
  drainFx();
  // đảm bảo không cú dở rỉ sang test khác (mô hình Fun2Audio/Fun2Skim)
  let frames = 0;
  while ((scene.pendingCountForTest() > 0 || !scene.getEngineForTest().finished) && frames < 7200) {
    scene.updateForTest(200000 + frames * 16, 16);
    frames++;
  }
});

describe('FUN2-C3 — Spray scale theo impact: MỌI bounce bung, số hạt theo công thức (bỏ ngưỡng cứng)', () => {
  it('cú micro (impact 0.1) vẫn bung ĐÚNG công thức hạt — không im lặng như ngưỡng cứng cũ', () => {
    drainFx();
    scene.applyEventsForTest([{ type: 'bounce', stoneX: 0, stoneZ: 4, impact: 0.1 }]);
    expect(visibleByTestid('skim-spray').length).toBe(sprayCountFor(0.1)); // RED: gate cũ chặn (< SPRAY_IMPACT_MIN)
  });

  it('cú mạnh (impact 0.9) bung nhiều hơn + biên 0→min / 1→max — spray phản ánh lực chạm', () => {
    drainFx();
    scene.applyEventsForTest([{ type: 'bounce', stoneX: 0, stoneZ: 4, impact: 0.9 }]);
    const strong = visibleByTestid('skim-spray').length;
    drainFx();
    scene.applyEventsForTest([{ type: 'bounce', stoneX: 0, stoneZ: 4, impact: 0 }]);
    const micro = visibleByTestid('skim-spray').length;
    drainFx();
    scene.applyEventsForTest([{ type: 'bounce', stoneX: 0, stoneZ: 4, impact: 1 }]);
    const max = visibleByTestid('skim-spray').length;
    expect(strong).toBe(sprayCountFor(0.9));
    expect(micro).toBe(SKIM.sprayCountMin); // biên dưới — bounce yếu nhất vẫn bung [PLACEHOLDER]
    expect(max).toBe(SKIM.sprayCountMax); // biên trên
    expect(strong).toBeGreaterThan(micro); // scale theo lực — không đếm cứng một số
  });

  it('spam 30 bounce impact 1 → pool KHÔNG phình (cap config, tái dùng — ROLE-RULES perf)', () => {
    drainFx();
    for (let i = 0; i < 30; i++) {
      scene.applyEventsForTest([{ type: 'bounce', stoneX: 0, stoneZ: 2 + (i % 20), impact: 1 }]);
    }
    expect(countByTestid('skim-spray')).toBe(FX.sprayPool); // pool dựng 1 lần đúng cap
    drainFx();
    expect(visibleByTestid('skim-spray')).toHaveLength(0); // hết đời → tắt hết, tái sử dụng được
  });

  it('grep-cap: ngưỡng cứng SPRAY_IMPACT_MIN đã biến mất khỏi scene', () => {
    const src = readFileSync('src/scenes/OnboardingPlayScene.ts', 'utf8');
    expect(src).not.toContain('SPRAY_IMPACT_MIN'); // RED: const còn tồn tại
    expect(src).not.toMatch(/impact\s*>=\s*0\.72/); // không gates ngầm theo số
  });
});

describe('FUN2-C3 — Splash crown: vòm cung foam TRẮNG tại điểm chìm (tái dùng FoamFx — không pool mới)', () => {
  it('splash → foam visible ≥ crownPuffs (1 foam chìm + vòm cung) — cung dựng từ pool FoamFx', () => {
    drainFx();
    const foamPoolBefore = countByTestid('skim-foam'); // không tạo object mới ngoài pool C2
    scene.applyEventsForTest([{ type: 'splash', stoneX: 1, stoneZ: 10 }]);
    expect(visibleByTestid('skim-foam').length).toBeGreaterThanOrEqual(SKIM.crownPuffs); // RED: chỉ 1 foam cũ
    expect(countByTestid('skim-foam')).toBe(foamPoolBefore); // KHÔNG pool mới — đúng trần cũ
  });

  it('puffs crown nằm dải alpha trắng mờ 0.25–0.5 (kỷ luật palette ux-ui — KHÔNG màu mới)', () => {
    drainFx();
    scene.applyEventsForTest([{ type: 'splash', stoneX: -1, stoneZ: 8 }]);
    const vis = visibleByTestid('skim-foam') as Phaser.GameObjects.Image[];
    expect(vis.length).toBeGreaterThanOrEqual(SKIM.crownPuffs);
    for (const img of vis) {
      expect(img.alpha).toBeGreaterThanOrEqual(0.25 - 1e-6);
      expect(img.alpha).toBeLessThanOrEqual(0.5 + 1e-6);
    }
  });
});

describe('FUN2-C3 — HUD pop: điểm nhảy scale-only mỗi bounce (<150ms, không vỡ contrast/layout T6)', () => {
  it('bounce → score pop scale >1 rồi về đúng 1 sau 200ms — alpha giữ 1, chữ giữ nguyên', () => {
    drainFx();
    const hud = scene.hudForTest();
    expect(hud.popScaleForTest()).toBe(1); // nghỉ
    const scoreText = (hud as unknown as { scoreText: Phaser.GameObjects.Text }).scoreText;
    const textBefore = scoreText.text;
    scene.applyEventsForTest([{ type: 'bounce', stoneX: 0, stoneZ: 4, impact: 0.5 }]); // RED: chưa có pop
    expect(hud.popScaleForTest()).toBeCloseTo(SKIM.hudPopScaleMax, 6); // pop thấy được (1.25)
    scene.advanceSkimTimeScaleForTest(200); // > pop window (~120ms) + biên
    expect(hud.popScaleForTest()).toBe(1); // về đúng 1 — không kẹt scale (layout nguyên vẹn)
    expect(scoreText.text).toBe(textBefore); // KHÔNG đổi chữ — nguồn số vẫn RunLifecycle
    expect(scoreText.alpha).toBe(1); // scale-only — contrast AA T6 không bị đụng
  });

  it('spam bounce → pop reset tự nhiên, không cộng dồn vỡ layout (decay scalar spam-safe)', () => {
    drainFx();
    const hud = scene.hudForTest();
    for (let i = 0; i < 10; i++) {
      scene.applyEventsForTest([{ type: 'bounce', stoneX: 0, stoneZ: 4, impact: 0.5 }]);
    }
    expect(hud.popScaleForTest()).toBeCloseTo(SKIM.hudPopScaleMax, 6); // reset — không cộng dồn
    scene.advanceSkimTimeScaleForTest(200);
    expect(hud.popScaleForTest()).toBe(1);
  });
});

describe('FUN2-C3 — grep-cap wiring (không lộ logic mới, vùng từng chết giữ nguyên)', () => {
  it('PlayScene: hud.pop qua applyEvents + spray.update qua hook; Onboarding kế thừa sạch gate cứng', () => {
    const base = readFileSync('src/scenes/PlayScene.ts', 'utf8');
    const demo = readFileSync('src/scenes/OnboardingPlayScene.ts', 'utf8');
    expect(base).toContain('updateExtraFx'); // hook FX thêm (mô hình T3 — subclass nối thêm)
    expect(base).toContain('this.spray.update'); // spray tiến tuổi mỗi frame (fix hạt đứng hình)
    expect(base).toContain('this.hud.pop()'); // pop mỗi bounce
    // signature applyEvents/consumePending KHÔNG đổi (vùng BUG-GOM-01/02 — §5.2 anchor)
    expect(base).toMatch(/protected applyEvents\(events: EngineEvent\[\]\): void/);
    expect(base).toMatch(/protected consumePending\(\): void/);
    // hitstop pathway + slow-mo invariant giữ nguyên (grep-cap Fun2Skim không được vỡ)
    expect(base).toContain('hitstopMsFor');
    expect(demo).not.toContain('SPRAY_IMPACT_MIN'); // gate cứng đã biến mất khỏi demo
    expect(demo).toContain('applySlowmoForTest(MECHANICS.slowmoTimescale)');
  });

  it('hằng số mới sống ở layout (SKIM/FX) — cấm hardcode trong scene (ROLE-RULES)', () => {
    expect(SKIM.sprayCountMin).toBeGreaterThanOrEqual(2);
    expect(SKIM.sprayCountMax).toBeLessThanOrEqual(8);
    expect(SKIM.sprayCountMax).toBeGreaterThan(SKIM.sprayCountMin);
    expect(SKIM.crownPuffs).toBeGreaterThanOrEqual(3);
    expect(SKIM.hudPopScaleMax).toBeGreaterThan(1);
    expect(SKIM.hudPopScaleMax).toBeLessThanOrEqual(1.3);
    expect(SKIM.hudPopMs).toBeGreaterThan(0);
    expect(SKIM.hudPopMs).toBeLessThanOrEqual(150); // feedback <100ms mục tiêu — trần 150ms card
    expect(FX.sprayPool).toBeGreaterThanOrEqual(16);
  });
});
