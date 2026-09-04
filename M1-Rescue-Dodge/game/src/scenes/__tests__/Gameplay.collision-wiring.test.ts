// TDD-B wiring CollisionSystem → GameplayScene — CONTRACT K0 §6 (card t_5cf8840b).
// Scene CHỈ orchestrate va chạm: CollisionSystem (tầng A, đã test đỏ tại T1b) quyết
// "chạm hay không", scene map entity → mutation engine + vẽ fx. KHÔNG đổi cảm giác:
// threshold giữ nguyên giá trị cũ qua DEFAULT_TUNING (param hoá, không inline literal).
//
// Mệnh đề "không logic inline" ràng buộc ở MỨC NGUỒN (source text) — tương tự test
// grep-cấp của T1c: test trên source bắt mọi biến thể runtime mà không phải dựng
// thế giới vật lý từng px trong jsdom (thrust của card này là "xoá literal cũ",
// không phải tái lập địa lý — địa lý đã được T1b test riêng trên tầng A).
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

import { readFileSync } from 'fs';
import Phaser from 'phaser';
import { GameplayScene } from '../Gameplay';
import { MECHANICS } from '../../logic/mechanics';
import { CollisionSystem, DEFAULT_TUNING, roadMetrics } from '../../logic/CollisionSystem';
import type { CollisionTuning } from '../../logic/CollisionSystem';
import type { GameEngine } from '../../logic/GameEngine';

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
let scene: GameplayScene;

function bootScene(): Promise<void> {
  return new Promise((resolve, reject) => {
    (window as unknown as { focus: () => void }).focus = () => {};
    game = new Phaser.Game({
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
      if (scene.scene && scene.scene.isActive() && scene.runningView && scene.getEngineForTest()) {
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

// ---------- Mệnh đề nguồn: xoá literal va chạm inline (RED khi còn literal cũ) ----------
const SRC = readFileSync('src/scenes/Gameplay.ts', 'utf8');

describe('wiring CollisionSystem — scene không còn logic va chạm inline (grep-cấp source)', () => {
  it('KHÔNG còn literal threshold hit cũ (hitY 0.52 / hitX 0.45 / fat inset 0.18)', () => {
    expect(SRC).not.toContain('catSize.h * 0.52');
    expect(SRC).not.toContain('catSize.w * 0.45');
    expect(SRC).not.toContain('catSize.w * 0.18');
    expect(SRC).not.toContain('catSize.h * 0.4)');
  });

  it('KHÔNG còn literal pickup window 52 lặp 2 trục', () => {
    expect(SRC).not.toContain('< 52 &&');
  });

  it('KHÔNG còn literal near-miss cũ (cửa sổ 70 + ahead 30)', () => {
    expect(SRC).not.toContain('< 70 &&');
    expect(SRC).not.toContain('catY + 30');
  });

  it('KHÔNG còn tính hitX/hitY/fat-boundary inline (biểu thức đặc trưng của vòng cũ)', () => {
    expect(SRC).not.toContain('const hitY = Math.abs');
    expect(SRC).not.toContain('let hitX = false');
    expect(SRC).not.toContain('rightBoundary -');
    expect(SRC).not.toContain('leftBoundary +');
    expect(SRC).not.toContain("b.lane === this.currentLane || Math.abs(b.container.x");
  });
});

// ---------- Hợp đồng wiring: 1 nguồn số + scene orchestrate qua CollisionSystem ----------
describe('wiring CollisionSystem — hợp đồng nguồn số & system của scene', () => {
  it('scene có CollisionSystem wiring đúng cấu hình (MECHANICS + DEFAULT_TUNING, không tuning rời)', () => {
    expect(scene.getCollision()).toBeInstanceOf(CollisionSystem);
    expect(scene.getCollisionTuning()).toEqual(DEFAULT_TUNING);
    // DEFAULT_TUNING phải giữ NGUYÊN giá trị cảm giác cũ (rủi ro ghi trong card)
    expect(DEFAULT_TUNING).toEqual({
      nearMissWindowY: 70, nearMissAheadY: 30, pickupWindow: 52,
      hitYFactor: 0.52, hitXFactor: 0.45, fatInsetFactor: 0.18,
      dodgeYFactor: 0.4, roadWidthFactor: 0.72,
    } satisfies CollisionTuning);
  });

  it('resolveBeeHit qua scene quyết đúng thứ tự ưu tiên fever > shield > game_over (flags đọc từ engine)', () => {
    const engine: GameEngine = scene.getEngineForTest();
    engine.startNewGame();
    engine.addFever(999); // ép fever bật (addFever không đè fever đang chạy)
    const { leftEdge, laneWidth } = roadMetrics(720, MECHANICS.laneCount);
    const laneX = [leftEdge + laneWidth / 2, leftEdge + laneWidth * 1.5, leftEdge + laneWidth * 2.5];
    const cat = { x: laneX[1], y: 800, w: 100, h: 100, lane: 1 };
    // Ong cùng làn, y chạm hitbox → fever_kill khi fever bật (scene phải đọc isFeverActive)
    expect(scene.resolveBeeHitForTest(
      { id: 1, type: 'normal', lane: 1, x: laneX[1], y: 800 },
      cat, 720,
    )).toBe('fever_kill');
  });
});

// ---------- Runtime: stepCollide điều phối qua system — 4 nhánh outcome ----------
describe('wiring runtime — scene.stepCollide điều phối qua CollisionSystem (không tự quyết)', () => {
  beforeEach(() => {
    scene.beginSessionForTest(0);
  });

  /** Ong thường cùng làn mèo, y trùng tâm mèo → chạm hitbox. */
  function hitBee(engine: GameEngine) {
    const { leftEdge, laneWidth } = roadMetrics(720, MECHANICS.laneCount);
    const laneX = [leftEdge + laneWidth / 2, leftEdge + laneWidth * 1.5, leftEdge + laneWidth * 2.5];
    return { laneX, bee: { id: 1, type: 'normal' as const, lane: 1, x: laneX[1], y: scene.getCatYForTest() } };
  }

  it('không fever/không shield + ong chạm → game_over: registerHit + running=false + scene chuyển GameOverScene', async () => {
    const engine = scene.getEngineForTest();
    const { bee } = hitBee(engine);
    const outcome = scene.resolveBeeHitForTest(bee, { x: 260.8, y: scene.getCatYForTest(), w: 100, h: 100, lane: 1 }, 720);
    expect(outcome).toBe('game_over');
    // qua nhánh orchestrate thật: engine bị mutate đúng (score/streak) + running tắt
    const spyRegisterHit = vi.spyOn(engine, 'registerHit');
    scene.applyBeeHitForTest(bee, outcome);
    expect(spyRegisterHit).toHaveBeenCalledTimes(1);
    expect(scene.runningView).toBe(false);
    // onHit() async: đợi chuyển cảnh GameOverScene (fade + delayedCall)
    await vi.waitFor(() => expect(scene.scene.isActive('GameOverScene')).toBe(true), { timeout: 8000 });
    expect(scene.scene.isActive('GameplayScene')).toBe(false);
  });

  it('fever bật + ong chạm → fever_kill: destroyBeeInFever + ong bị retire (không game over)', () => {
    const engine = scene.getEngineForTest();
    engine.startNewGame();
    engine.addFever(999);
    expect(engine.isFeverActive()).toBe(true);
    const { bee } = hitBee(engine);
    const outcome = scene.resolveBeeHitForTest(bee, { x: 260.8, y: scene.getCatYForTest(), w: 100, h: 100, lane: 1 }, 720);
    expect(outcome).toBe('fever_kill');
    const scoreBefore = engine.score;
    const spyKill = vi.spyOn(engine, 'destroyBeeInFever');
    const before = scene.beeCount;
    scene.applyBeeHitForTest(bee, outcome);
    expect(spyKill).toHaveBeenCalledTimes(1);
    expect(engine.score).toBe(scoreBefore + MECHANICS.feverKillBonus);
    expect(scene.beeCount).toBe(before - 1); // retireBee đã nhả ong
    expect(scene.runningView).toBe(true);    // vẫn sống
  });

  it('shield bật + ong chạm → shield_consume: tryUseShield(true) + ong bị retire (không game over)', () => {
    const engine = scene.getEngineForTest();
    engine.startNewGame();
    engine.activateShield();
    const { bee } = hitBee(engine);
    const outcome = scene.resolveBeeHitForTest(bee, { x: 260.8, y: scene.getCatYForTest(), w: 100, h: 100, lane: 1 }, 720);
    expect(outcome).toBe('shield_consume');
    const spyShield = vi.spyOn(engine, 'tryUseShield');
    const before = scene.beeCount;
    scene.applyBeeHitForTest(bee, outcome);
    expect(spyShield).toHaveBeenCalledTimes(1);
    expect(engine.shieldActive).toBe(false); // khiên đã tiêu
    expect(scene.beeCount).toBe(before - 1);
    expect(scene.runningView).toBe(true);
  });

  it('near-miss: ong chiếm làn cũ chưa né, trong cửa sổ → registerNearMiss + fever có thể trigger', () => {
    const engine = scene.getEngineForTest();
    const { laneX } = hitBee(engine);
    const catY = scene.getCatYForTest();
    // mirror điều kiện cũ: |dy| < 70 && y < catY + 30 — ong cách 20px phía trên
    const outcome = scene.checkNearMissForTest(
      [{ id: 2, type: 'normal', lane: 1, x: laneX[1], y: catY - 20 }],
      1,
    );
    expect(outcome).toBe(true);
    const spyNM = vi.spyOn(engine, 'registerNearMiss');
    scene.applyNearMissForTest(outcome);
    expect(spyNM).toHaveBeenCalledTimes(1);
  });

  it('item trong cửa sổ pickup → collectItem qua checkItemPickup (scene không so sánh 52 inline)', () => {
    const engine = scene.getEngineForTest();
    const catX = scene.getCatXForTest();
    const catY = scene.getCatYForTest();
    expect(scene.checkItemPickupForTest({ x: catX, y: catY })).toBe(true);       // trúng tâm
    expect(scene.checkItemPickupForTest({ x: catX, y: catY - 51 })).toBe(true);  // biên trong
    expect(scene.checkItemPickupForTest({ x: catX, y: catY - 53 })).toBe(false); // ngoài cửa sổ
    expect(engine.score).toBe(0);
  });

  it('canRegisterDodge: ong đã qua mèo + khác làn → đủ điều kiện né (threshold dodgeYFactor 0.4)', () => {
    const engine = scene.getEngineForTest();
    const { laneX } = hitBee(engine);
    const catY = scene.getCatYForTest();
    // ong cách làn, y = catY + 39 (< catH*0.4 = 40) → chưa đủ; y = catY + 41 → đủ
    expect(scene.canRegisterDodgeForTest(
      { id: 3, type: 'normal', lane: 0, x: laneX[0], y: catY + 39 }, { x: laneX[1], y: catY, w: 100, h: 100, lane: 1 },
    )).toBe(false);
    expect(scene.canRegisterDodgeForTest(
      { id: 3, type: 'normal', lane: 0, x: laneX[0], y: catY + 41 }, { x: laneX[1], y: catY, w: 100, h: 100, lane: 1 },
    )).toBe(true);
  });
});
