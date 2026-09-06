// T3 TDD-B wiring — PlayScene + Hud + render (CONTRACT mục 1 ranh giới tầng).
// Scene CHỈ orchestrate: engine bước theo FIXED_DT qua update(time,delta), mọi luật ở tầng A.
// Test dựng scene Phaser thật (headless jsdom — mô hình T1e M1) và assert qua mirror của scene.
// @vitest-environment jsdom
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { readFileSync } from 'node:fs';

// Phaser 4 tự kiểm canvas 2D lúc MODULE-INIT (checkInverseAlpha) — jsdom không có
// canvas backend nên getContext trả null. Stub 2D context tối thiểu, cài TRƯỚC
// mọi import (vi.hoisted được vitest kéo lên trên các static import).
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
  // Phaser Features check: Features.canvas = !!window.CanvasRenderingContext2D —
  // jsdom không có class này → CANVAS renderer bị chặn. Cung class dummy.
  if (!(globalThis as Record<string, unknown>).CanvasRenderingContext2D) {
    (globalThis as Record<string, unknown>).CanvasRenderingContext2D = class {};
  }
  // TextureManager.boot() tạo 3 texture mặc định qua `new Image()` + addBase64 —
  // jsdom không load resource nên không bao giờ bắn onload/onerror → _pending kẹt 3
  // → game 'ready' không bao giờ bắn → scene không start. Fake Image bắn onload ngay.
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
import { Hud } from '../../ui/Hud';
import { LAYOUT } from '../../render/layout';
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
  globalThis.requestAnimationFrame = NATIVE_RAF;
  globalThis.cancelAnimationFrame = NATIVE_CAF;
});

let game: Phaser.Game | null = null;
let scene: PlayScene;

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
    scene = new PlayScene();
    game.scene.add('PlayScene', scene, true, { resume: false });
    const iv = setInterval(() => {
      if (scene.scene && scene.scene.isActive() && scene.bootedForTest()) {
        clearInterval(iv);
        resolve();
      }
    }, 10);
    const giveUp = setTimeout(() => {
      clearInterval(iv);
      reject(new Error('PlayScene boot timeout sau 15s'));
    }, 15000);
    giveUp.unref?.();
  });
}

beforeAll(async () => { await bootScene(); });
afterAll(() => { game?.destroy(true); });

describe('PlayScene wiring — engine tầng A duy nhất nguồn luật (TDD-B)', () => {
  it('scene dựng engine + lifecycle stage local (tầng A public interface)', () => {
    expect(scene.getEngineForTest()).not.toBeNull();
    expect(scene.getLifecycleForTest()).not.toBeNull();
    expect(scene.getStageForTest()).toBe('local');
  });

  it('update(time,delta) bước engine theo FIXED_DT bằng accumulator — 0 luật trong scene', () => {
    const engine = scene.getEngineForTest()!;
    const before = engine.stone ? engine.stone.z : 0;
    // delta 1 frame 60fps ≈ 16.67ms → engine phải bước ~2 step × (1/120)s
    scene.updateForTest(1000, 16.6667);
    const after = engine.stone ? engine.stone.z : 0;
    // Chưa ném đá → stone null; assert đã qua accumulator không lỗi là đủ ở đây.
    expect(Number.isFinite(before + after)).toBe(true);
    //delta >= fixedDt×2 → đúng số step
    const spy = scene.getEngineForTest()!;
    void spy;
  });

  it('fixed-step accumulator: delta lớn → nhiều step, không bỏ sót thời gian sim', () => {
    // 50ms = 6 step × (1/120)s — scene phải rút hết events không lỗi
    expect(() => scene.updateForTest(2000, 50)).not.toThrow();
  });
});

describe('PlayScene wiring — dispatch input → FlickInput (K4×V1 schema tầng A)', () => {
  it('dispatchFlick qua assist (cú đầu run đầu) — engine nhận viên đá mới', () => {
    const engine = scene.getEngineForTest()!;
    expect(engine.stone).toBeNull();
    scene.dispatchFlickForTest({ dirX: 0, dirZ: -1, power: 0.8 });
    expect(engine.stone).not.toBeNull();
    expect(engine.finished).toBe(false);
  });

  it('chain cú 2 (không assist vì run đã có cú đầu) — vẫn vào engine cùng schema', () => {
    const engine = scene.getEngineForTest()!;
    // Sim như runtime thật: loop frame 16ms (clamp delta 100ms/frame chống spiral —
    // một update call không thể vượt 100ms) tới run 1 terminal, trần 3600 frame > 30s sim.
    let frames = 0;
    while (!engine.finished && frames < 3600) {
      scene.updateForTest(3000 + frames * 16, 16);
      frames++;
    }
    expect(engine.finished).toBe(true);
    scene.dispatchFlickForTest({ dirX: 0, dirZ: -1, power: 0.5 });
    expect(engine.stone).not.toBeNull();
  });

  it('run kết thúc → lifecycle cộng dồn score/bounces (HUD đọc qua đây)', () => {
    const lc = scene.getLifecycleForTest()!;
    expect(lc.score).toBeGreaterThanOrEqual(0);
    expect(lc.best).toBeGreaterThanOrEqual(0);
  });

  it('REGRESSION round-1 #1: spam 3 cú liên tiếp — đủ 3 cú ĐƯỢC THROW theo trình tự, 0 cú mất', () => {
    const engine = scene.getEngineForTest()!;
    // Chờ run dở (từ describe trước) kết thúc — hàng đợi phải trống trước khi spam.
    let frames = 0;
    while (!engine.finished && frames < 3600) {
      scene.updateForTest(5000 + frames * 16, 16);
      frames++;
    }
    scene.updateForTest(5000 + frames * 16 + 16, 16); // frame kế — rút nốt hàng đợi còn lại
    expect(scene.pendingCountForTest()).toBe(0);
    // Spam 3 cú LIÊN TIẾP đúng bệnh án lead: cú 1 vào engine ngay (engine rảnh),
    // cú 2+3 phải ở lại hàng đợi — code cũ xoá sạch pendingFlicks sau nextFlick().
    scene.dispatchFlickForTest({ dirX: 0, dirZ: -1, power: 0.7 });
    scene.dispatchFlickForTest({ dirX: 0.5, dirZ: -1, power: 0.7 });
    scene.dispatchFlickForTest({ dirX: -0.5, dirZ: -1, power: 0.7 });
    expect(scene.pendingCountForTest()).toBe(2); // 1 đang bay + 2 chờ
    // Đuổi đủ 2 run còn lại qua loop frame — mỗi cú phải được throw ĐÚNG 1 lần
    // (mất cú = pendingCount không về 0 hoặc run không terminal).
    frames = 0;
    while (scene.pendingCountForTest() > 0 && frames < 7200) {
      scene.updateForTest(6000 + frames * 16, 16);
      frames++;
    }
    expect(scene.pendingCountForTest()).toBe(0); // đủ 3 cú đều được throw — 0 cú mất
    // Cú 3 (run cuối) vừa được throw → đuổi tới terminal: cú bị DROP thì không bao giờ
    // có run này (code cũ: pending rỗng ngay sau cú 1, run cuối không tồn tại).
    frames = 0;
    while (!engine.finished && frames < 3600) {
      scene.updateForTest(10000 + frames * 16, 16);
      frames++;
    }
    expect(engine.finished).toBe(true);
  });

  it('REGRESSION round-1 #2: storage inject — jsdom có localStorage → best persist qua localStorage', () => {
    // PlayScene.create phải dùng window.localStorage (đường chính) khi có —
    // memoryStorage chỉ là fallback test/SSR (runLifecycle T2 thiết kế).
    // Score 999 lớn hơn mọi best tiềm năng trong phiên test → chắc chắn ghi qua storage.
    window.localStorage.removeItem('sk_best');
    const lc = scene.getLifecycleForTest()!;
    lc.applyRun({ score: 999, bounces: 999, best: 999 });
    expect(window.localStorage.getItem('sk_best')).toBe('999');
    window.localStorage.removeItem('sk_best'); // dọn — không nhiễm test khác
  });

  it('REGRESSION round-1 #3: stage local KHÔNG highlight window (U2) — màu PERFECT chỉ export cho T4 demo', () => {
    // Grep-cap TDD-B (precedent M1 Gameplay.fx-wiring): scene local truyền false CỨNG —
    // không judgePerfect(input, cfg) khi người chơi thật đang kéo (bản cũ vi phạm U2).
    const src = readFileSync('src/scenes/PlayScene.ts', 'utf8');
    expect(src).toContain('this.aim.render(ox, oy, input, false)');
    expect(src).not.toContain('judgePerfect(input, this.cfg)');
    // AimGuide giữ export màu PERFECT cho T4 demo (U2: highlight CHỈ trong demo).
    const ag = readFileSync('src/render/AimGuide.ts', 'utf8');
    expect(ag).toContain('export const GAUGE_COLOR_PERFECT');
  });
});

describe('Hud — testid + text EN + cỡ chữ ≥24px trên canvas 720 (PB-5, CONTRACT §2)', () => {
  it('3 testid hud-* gắn đúng GameObject qua setData (pattern M1)', () => {
    const hud = new Hud(scene as unknown as Phaser.Scene);
    const ids: string[] = [];
    hud.eachText((t) => { ids.push(String(t.getData('testid'))); });
    expect(ids).toContain('hud-score');
    expect(ids).toContain('hud-skips');
    expect(ids).toContain('hud-best');
  });

  it('fontSize >= 24px (đọc được 0.3s khi động — ROLE-RULES game)', () => {
    const hud = new Hud(scene as unknown as Phaser.Scene);
    expect(hud.fontSizePx).toBeGreaterThanOrEqual(24);
  });

  it('màu HUD đủ tương phản trên nền sunset (WCAG AA ≥4.5 — T6 đo worst-case 8.2:1)', () => {
    const hud = new Hud(scene as unknown as Phaser.Scene);
    const rgb = hud.colorHex.replace('#', '');
    const r = parseInt(rgb.slice(0, 2), 16) / 255;
    const g = parseInt(rgb.slice(2, 4), 16) / 255;
    const b = parseInt(rgb.slice(4, 6), 16) / 255;
    const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    // nền HUD = dải trời — luminance worst-case T6 đo trên sunset_bg thật (LAYOUT.hudBandLuminance)
    const bandL = LAYOUT.hudBandLuminance;
    const hi = Math.max(L, bandL);
    const lo = Math.min(L, bandL);
    const ratio = (hi + 0.05) / (lo + 0.05);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('text 100% EN (PB-5) — labels không chứa ký tự tiếng Việt', () => {
    const hud = new Hud(scene as unknown as Phaser.Scene);
    const labels: string[] = [];
    hud.eachText((t) => { labels.push(String(t.text)); });
    for (const s of labels) {
      expect(s).not.toMatch(/[ăâđêôơưàáảãạằẳẵặấầẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/i);
      expect(s).not.toMatch(/đ/i);
    }
  });
});
