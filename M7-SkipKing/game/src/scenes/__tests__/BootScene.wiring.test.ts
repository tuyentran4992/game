// BUG-L2-01 TDD regression — BootScene.create() PHẢI handoff scene.start('PlayScene').
// Bệnh án: QA boot browser thật (outbox/t_04b1d13a/FIX-ROUND-1.md) — unit T3/T6 xanh nhưng
// màn đen tuyệt đối vì 0 lệnh scene.start trong toàn bộ src: BootScene:ACTIVE children=0
// mãi, PlayScene:idle mãi. Test này boot Phaser thật (headless jsdom — mô hình T1e M1),
// đăng ký PlayScene STUB (autoStart=false — CHỈ active khi BootScene handoff), rồi assert
// PlayScene trở nên ACTIVE TỰ ĐỘNG sau preload.
// @vitest-environment jsdom
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

// ---- Stub môi trường jsdom cho Phaser 4 (cài TRƯỚC mọi import — vi.hoisted) ----
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
  // Phaser Features check: jsdom không có class này → CANVAS renderer bị chặn.
  if (!(globalThis as Record<string, unknown>).CanvasRenderingContext2D) {
    (globalThis as Record<string, unknown>).CanvasRenderingContext2D = class {};
  }
  // TextureManager.boot() + ImageFile.onProcess tạo texture qua `new Image()` —
  // jsdom không load resource nên không bao giờ bắn onload. FakeImage bắn ngay.
  class FakeImage {
    onload: () => void = () => {};
    onerror: () => void = () => {};
    width = 2; height = 2; naturalWidth = 2; naturalHeight = 2; complete = true;
    private _src = '';
    set src(v: string) { this._src = v; queueMicrotask(() => this.onload()); }
    get src() { return this._src; }
  }
  (globalThis as Record<string, unknown>).Image = FakeImage;
  // Phaser FileLoader tải image qua XHR — jsdom không server → ECONNREFUSED kẹt loader.
  // Fake XHR trả 200 kèm event.target (File.onLoad đọc event.target.status).
  class FakeXHR {
    status = 200; readyState = 4;
    response = new Blob(['fake']); responseText = '';
    onload: ((e?: unknown) => void) | null = null; onerror: (() => void) | null = null;
    onabort: (() => void) | null = null; ontimeout: (() => void) | null = null;
    onprogress: (() => void) | null = null;
    open() {} setRequestHeader() {} getAllResponseHeaders() { return ''; } abort() {}
    send() { setTimeout(() => this.onload?.({ target: this } as unknown as Event), 0); }
    addEventListener(_t: string, fn: (e?: unknown) => void) { this.onload = fn; }
  }
  (globalThis as Record<string, unknown>).XMLHttpRequest = FakeXHR;
  // jsdom có URL nhưng KHÔNG có createObjectURL — Phaser File.createObjectURL gọi nó
  // khi nạp blob → TypeError trong ImageFile.onProcess → loader kẹt (lỗi này NGẦM:
  // không fail test mà khiến create() không bao giờ chạy — đã bắt qua probe).
  const U = globalThis.URL as unknown as { createObjectURL?: () => string; revokeObjectURL?: () => void };
  if (!U.createObjectURL) { U.createObjectURL = () => 'blob:fake'; U.revokeObjectURL = () => {}; }
});

import Phaser from 'phaser';
import { BootScene } from '../BootScene';

const CANVAS = document.createElement('canvas');
const NATIVE_RAF = globalThis.requestAnimationFrame;
const NATIVE_CAF = globalThis.cancelAnimationFrame;

beforeAll(() => {
  document.body.appendChild(CANVAS);
  (window as unknown as { focus: () => void }).focus = () => {};
  (globalThis as Record<string, unknown>).requestAnimationFrame = (cb: (t: number) => void) =>
    setTimeout(() => cb(performance.now()), 16);
  (globalThis as Record<string, unknown>).cancelAnimationFrame = (id: number) => clearTimeout(id);
});
afterAll(() => {
  CANVAS.remove();
  globalThis.requestAnimationFrame = NATIVE_RAF;
  globalThis.cancelAnimationFrame = NATIVE_CAF;
});

function waitFor(cond: () => boolean, label: string, ms = 12000): Promise<void> {
  return new Promise((resolve, reject) => {
    const iv = setInterval(() => {
      if (cond()) { clearInterval(iv); clearTimeout(to); resolve(); }
    }, 10);
    const to = setTimeout(() => {
      clearInterval(iv);
      reject(new Error(`timeout ${ms}ms: ${label}`));
    }, ms);
    to.unref?.();
  });
}

let game: Phaser.Game | null = null;
let startSpy: ReturnType<typeof vi.spyOn>;

beforeAll(async () => {
  // Spy TRƯỚC khi tạo game — bắt mọi lệnh start trên ScenePlugin.prototype.
  // Trong test này CHỈ BootScene có thể gọi start('PlayScene') (stub PlayScene trơ).
  startSpy = vi.spyOn(Phaser.Scenes.ScenePlugin.prototype, 'start');
  game = new Phaser.Game({
    type: Phaser.CANVAS,
    parent: document.body,
    width: 720,
    height: 1280,
    banner: false,
    audio: { noAudio: true },
    scene: [],
  });
  game.scene.add('BootScene', new BootScene(), true);
  game.scene.add('PlayScene', new Phaser.Scene('PlayScene'), false);
  await waitFor(
    () => !!game && game.scene.isActive('PlayScene'),
    'PlayScene không bao giờ ACTIVE — BootScene không handoff scene.start (BUG-L2-01 tái hiện: màn đen)',
  );
}, 20000);

afterAll(() => { game?.destroy(true); vi.restoreAllMocks(); });

describe('BootScene handoff — create() chuyển PlayScene (BUG-L2-01 regression)', () => {
  it('preload chạy xong đủ 4 texture của T6', () => {
    expect(game!.textures.exists('stone')).toBe(true);
    expect(game!.textures.exists('splash')).toBe(true);
    expect(game!.textures.exists('ripple')).toBe(true);
    expect(game!.textures.exists('sunset_bg')).toBe(true);
  });

  it('create() gọi scene.start("PlayScene") — đúng 1 lệnh handoff', () => {
    const playStarts = startSpy.mock.calls.filter((args) => args[0] === 'PlayScene');
    expect(playStarts.length).toBe(1);
  });

  it('PlayScene ACTIVE tự động sau preload + BootScene dừng sau khi handoff', () => {
    expect(game!.scene.isActive('PlayScene')).toBe(true);
    expect(game!.scene.isActive('BootScene')).toBe(false);
  });
});
