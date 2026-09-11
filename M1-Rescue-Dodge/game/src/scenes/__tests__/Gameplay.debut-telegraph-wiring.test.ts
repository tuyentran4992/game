// TDD-B wiring DebutBeat (P1a) → GameplayScene telegraph — UPG2-P1b (t_ec2e1a6c).
// Scene CHỈ VẼ từ dữ liệu typed của tầng A: engine.debutAt(at) → DebutWindow|null;
// cửa sổ/cụm thưa tính ở logic/ (P1a), scene không tự tính (CONTRACT K0 §6).
// Swarm debut → message "CH3 · NIGHT RAID" tái dùng chapter popup (0 asset mới).
// Test dựng scene Phaser thật (headless jsdom) + bước spawn thủ công deterministic.
// @vitest-environment jsdom
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';

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
import { readFileSync } from 'fs';
import { GameplayScene } from '../Gameplay';
import { MECHANICS } from '../../logic/mechanics';
import type { DebutWindow } from '../../logic/types';

const CANVAS = document.createElement('canvas');
// jsdom có native rAF nhưng KHÔNG BAO GIỜ bắn (pretendToBeVisual off) → loop Phaser
// đóng băng, scene không boot. Phải GHI ĐÈ luôn bằng rAF setTimeout-based.
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
let scene: GameplayScene;

function bootScene(): Promise<void> {
  return new Promise((resolve, reject) => {
    // jsdom không cài window.focus — Phaser/SDK có thể gọi
    (window as unknown as { focus: () => void }).focus = () => {};
    game = new Phaser.Game({
      // CANVAS renderer (không HEADLESS): generateTexture/bake texture cần renderer thật;
      // canvas 2D đã được stub ở vi.hoisted nên không cần WebGL/canvas native.
      type: Phaser.CANVAS,
      parent: document.body,
      width: 390,
      height: 720,
      banner: false,
      audio: { noAudio: true },
      scene: [],
    });
    scene = new GameplayScene();
    game.scene.add('GameplayScene', scene, true, { resume: false });
    const iv = setInterval(() => {
      if (scene.scene && scene.scene.isActive() && scene.runningView && scene.getDirector()) {
        clearInterval(iv);
        resolve();
      }
    }, 10);
    const giveUp = setTimeout(() => {
      clearInterval(iv);
      reject(new Error('scene boot timeout — running flag chưa bật sau 15s'));
    }, 15000);
    giveUp.unref?.();
  });
}

beforeAll(async () => { await bootScene(); });
afterAll(() => { game?.destroy(true); });

const SRC = readFileSync('src/scenes/Gameplay.ts', 'utf8');

/** Đọc object game theo testid (scene setData('testid', ...) — QA bấm/soi y hệt). */
function getTestObj(id: string): Phaser.GameObjects.GameObject | null {
  const direct = scene.children.list.find((o) => o.getData && o.getData('testid') === id);
  if (direct) return direct;
  // object nằm trong container (vd text trong banner swarm) — quét 1 cấp container
  for (const c of scene.children.list) {
    const cont = c as unknown as { list?: Phaser.GameObjects.GameObject[] };
    if (cont.list) {
      const inner = cont.list.find((o) => o.getData && o.getData('testid') === id);
      if (inner) return inner;
    }
  }
  return null;
}
function telegraphText(): Phaser.GameObjects.Text {
  return getTestObj('debut-telegraph') as Phaser.GameObjects.Text;
}
function levelPopupText(): Phaser.GameObjects.Text {
  return getTestObj('level-popup') as Phaser.GameObjects.Text;
}
type SceneWithDebut = { showDebutTelegraph: (w: DebutWindow) => void };
function sceneAsDebut(): GameplayScene & SceneWithDebut {
  return scene as unknown as GameplayScene & SceneWithDebut;
}

// ---------- (1) Dữ liệu tầng A đủ sàn telegraph — PB-3b / QA BLOCK DEBUT-TELEGRAPH ----------
describe('UPG2-P1b — dữ liệu debut từ tầng A (cfg là sàn telegraph, scene không tự bịa)', () => {
  it('debutSparseSec ≥ debutTelegraphMinSec ≥ 1.2 (cửa sổ dữ liệu phải chứa đủ telegraph ≥1.2s)', () => {
    expect(MECHANICS.debutSparseSec).toBeGreaterThanOrEqual(MECHANICS.debutTelegraphMinSec);
    expect(MECHANICS.debutTelegraphMinSec).toBeGreaterThanOrEqual(1.2);
  });
});

// ---------- (2) Scene có element telegraph + chỉ ĐỌC dữ liệu tầng A ----------
describe('UPG2-P1b — scene vẽ telegraph debut (P1a xuất DebutWindow, tầng B vẽ)', () => {
  beforeEach(() => { scene.beginSessionForTest(0); });

  it('scene có element telegraph gắn testid "debut-telegraph" (testid cũ giữ nguyên — N3)', () => {
    expect(getTestObj('debut-telegraph')).not.toBeNull();
  });

  it('scene KHÔNG tự tính cửa sổ — chỉ đọc engine.debutAt() (nguồn dữ liệu duy nhất)', () => {
    expect(SRC).toMatch(/debutAt\(/);
    // literal công thức cửa sổ (firstSeen + sparseSec) thuộc tầng A — scene không được lặp lại
    expect(SRC).not.toContain('debutSparseSec +');
    expect(SRC).not.toContain('+ MECHANICS.debutSparseSec');
  });
});

// ---------- (3) Hành vi runtime deterministic: hiện đúng cửa sổ, biến mất khi đóng ----------
describe('UPG2-P1b — telegraph hiển thị theo DebutWindow (probe deterministic)', () => {
  beforeEach(() => { scene.beginSessionForTest(0); });

  it('noteDebut ngoài runtime → telegraph hiện trong cửa sổ rồi ẩn khi cửa sổ đóng', () => {
    const engine = scene.getEngineForTest();
    engine.noteDebut('speedy', 5);
    const showSpy = vi.spyOn(sceneAsDebut(), 'showDebutTelegraph');
    // giữa cửa sổ [5, 7): scene phải VẼ telegraph
    scene.stepSpawnForTest(0.016, 6);
    expect(showSpy).toHaveBeenCalledTimes(1);
    expect(telegraphText().visible).toBe(true);
    expect(telegraphText().text).toContain('FAST BEE');
    // quá hạn cửa sổ (7.1 ≥ 5 + 2.0): telegraph ẩn
    scene.stepSpawnForTest(0.016, 7.1);
    expect(telegraphText().visible).toBe(false);
    showSpy.mockRestore();
  });

  it('chưa có debut nào → telegraph ẩn (không hiện khi cửa sổ đóng)', () => {
    scene.stepSpawnForTest(0.016, 2);
    expect(telegraphText().visible).toBe(false);
  });

  it('phiên mới: telegraph ẩn + cửa sổ ván cũ KHÔNG trôi (mirror resetJuiceState)', () => {
    scene.getEngineForTest().noteDebut('speedy', 5);
    scene.stepSpawnForTest(0.016, 6);
    expect(telegraphText().visible).toBe(true);
    scene.beginSessionForTest(0);
    expect(telegraphText().visible).toBe(false);
    expect(scene.getEngineForTest().debutAt(6)).toBeNull();
  });
});

// ---------- (4) Swarm debut message "CH3 · NIGHT RAID" — tái dùng banner warning (0 asset) ----------
describe('UPG2-P1b — swarm debut message "CH3 · NIGHT RAID" (0 asset mới, text EN — PB-5)', () => {
  beforeEach(() => { scene.beginSessionForTest(0); });

  function swarmText(): Phaser.GameObjects.Text {
    return getTestObj('swarm-warning-text') as Phaser.GameObjects.Text;
  }

  it('lần trigger swarm ĐẦU trong phiên → banner hiện đúng "CH3 · NIGHT RAID" (đường runtime director)', () => {
    // mốc swarm đầu ~52s (startSession(0): lastSwarmTime=8 + swarmIntervalSec 44 —
    // re-anchor theo curve B1 8df43fd..561f807 merge; y hệt wiring test spawn hiện hữu)
    scene.stepSpawnForTest(0.016, 52.0);
    expect(scene.swarmActiveView).toBe(true);
    expect(swarmText().text).toBe('CH3 · NIGHT RAID');
  });

  it('swarm KHÔNG debut (lần sau) → giữ warning generic, không lặp message chương', () => {
    (sceneAsDebut() as unknown as { triggerSwarmWave: (d?: boolean) => void }).triggerSwarmWave(false);
    expect(swarmText().text).toBe('⚠️ SWARM INCOMING! ⚠️');
  });

  it('text "CH3 · NIGHT RAID" nằm trong source — chuẩn copy EN (PB-5)', () => {
    expect(SRC).toContain('CH3 · NIGHT RAID');
  });
});
