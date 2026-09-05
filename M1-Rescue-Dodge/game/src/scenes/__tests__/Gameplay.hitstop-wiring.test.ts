// [UPG2-J1] t_cc6c390d — hit-stop 60–120ms khi va chạm/chết + camera punch theo lực va.
// Tầng B (TDD-B, CONTRACT §6): dữ liệu tuning về MechanicsConfig (tầng A đã test công
// thức config) — scene đọc QUA MECHANICS, không literal. Freeze = dt 0 cho world (bee/
// item/timers/score/elapsed) trong khi fx.step + tweens + input giữ realtime (UX#63:
// KHÔNG băng HUD tween/input buffer — cấm this.tweens.timeScale / this.time.timeScale
// / this.time.paused). Camera punch: zoom out-then-in trong lúc world đóng băng.
// Deterministic: mọi bước đều qua applyJuiceForOutcome(outcome) — 1 nguồn cho runtime
// branch (update loop) và applyBeeHitForTest (UT mirror); Date/không rng mới — J1
// không thêm random (rng injectable rule: code mới KHÔNG dùng Math.random thô).
// @vitest-environment jsdom
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';

// Phaser 4 tự kiểm canvas 2D lúc MODULE-INIT (checkInverseAlpha) — jsdom không có
// canvas backend. Stub 2D context tối thiểu, cài TRƯỚC mọi import (như collision-wiring).
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
import type { BeeHitOutcome } from '../../logic/CollisionSystem';

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
    game.scene.add('GameOverScene', new Phaser.Scene('GameOverScene'));
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

beforeAll(async () => { await bootScene(); }, 20000);
afterAll(() => { game?.destroy(true); });

const SRC = readFileSync('src/scenes/Gameplay.ts', 'utf8');

// ---------- (1) Số juice về MechanicsConfig — khóa công thức, [PLACEHOLDER] ----------
describe('UPG2-J1 — MechanicsConfig sở hữu nhóm juice (hit-stop + camera punch)', () => {
  it('hitStopShieldMs = 60 (lực va nhỏ nhất — cửa dưới khung 60–120ms)', () => {
    expect(MECHANICS.hitStopShieldMs).toBe(60);
  });

  it('hitStopHitMs = 90 (va chạm chết hụt — giữa khung 60–120ms)', () => {
    expect(MECHANICS.hitStopHitMs).toBe(90);
  });

  it('hitStopDeathMs = 110 (chết — ≤120ms theo điều kiện UX#63)', () => {
    expect(MECHANICS.hitStopDeathMs).toBe(110);
    expect(MECHANICS.hitStopDeathMs).toBeLessThanOrEqual(120);
  });

  it('punchHitZoom = 0.04 / punchDeathZoom = 0.07 (cường độ punch theo lực va — chết mạnh hơn)', () => {
    expect(MECHANICS.punchHitZoom).toBe(0.04);
    expect(MECHANICS.punchDeathZoom).toBe(0.07);
  });

  it('punchHoldMs = 70 (điểm đáy zoom — nằm trong khoảng hit-stop)', () => {
    expect(MECHANICS.punchHoldMs).toBe(70);
  });
});

// ---------- (2) Ràng buộc nguồn: freeze KHÔNG băng HUD/tween/input (UX#63) ----------
describe('UPG2-J1 — ràng buộc nguồn: hit-stop không băng HUD tween/input buffer (UX#63)', () => {
  it('KHÔNG băng toàn cục tweens/time (sẽ treo HUD tween + input buffer — cấm theo UX#63)', () => {
    expect(SRC).not.toContain('this.tweens.timeScale');
    expect(SRC).not.toContain('this.time.timeScale');
    expect(SRC).not.toContain('this.time.paused');
  });

  it('scene đọc số juice QUA MECHANICS (không literal ms/zoom lạ ngoài config)', () => {
    expect(SRC).not.toContain('timeScale: 0');
    expect(SRC).toMatch(/MECHANICS\.hitStopDeathMs/);
    expect(SRC).toMatch(/MECHANICS\.hitStopHitMs/);
    expect(SRC).toMatch(/MECHANICS\.hitStopShieldMs/);
    expect(SRC).toMatch(/MECHANICS\.punchHitZoom/);
    expect(SRC).toMatch(/MECHANICS\.punchDeathZoom/);
  });

  it('duyệt juice đi qua applyJuiceForOutcome — 1 nguồn cho runtime + UT mirror', () => {
    expect(SRC).toMatch(/applyJuiceForOutcome\(outcome: BeeHitOutcome\)/);
    expect((SRC.match(/applyJuiceForOutcome\(/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });
});

// ---------- (3) Runtime probe: hit-stop + punch theo outcome (deterministic) ----------
describe('UPG2-J1 — applyJuiceForOutcome: hit-stop đóng băng world, không băng fx (probe)', () => {
  beforeEach(() => { scene.beginSessionForTest(0); });

  it('game_over: freeze đúng hitStopDeathMs (110ms) — cộng dồn frame 40ms×2 (40+40+30=110)', () => {
    scene.applyJuiceForOutcome('game_over');
    expect(scene.hitStopLeftForTest()).toBe(MECHANICS.hitStopDeathMs);
    scene.stepHitStopForTest(40);
    expect(scene.hitStopLeftForTest()).toBe(70);   // 110-40, vẫn còn đóng băng
    scene.stepHitStopForTest(40);
    expect(scene.hitStopLeftForTest()).toBe(30);   // 110-80, còn 30ms
    scene.stepHitStopForTest(30);
    expect(scene.hitStopLeftForTest()).toBe(0);    // hết freeze
    scene.stepHitStopForTest(100);                 // trôi tự do — không âm, không cộng dồn thêm
    expect(scene.hitStopLeftForTest()).toBe(0);
  });

  it('fever_kill: freeze hitStopHitMs (90ms) + running giữ true (vẫn sống)', () => {
    scene.applyJuiceForOutcome('fever_kill');
    expect(scene.hitStopLeftForTest()).toBe(MECHANICS.hitStopHitMs);
    expect(scene.runningView).toBe(true);
  });

  it('shield_consume: freeze hitStopShieldMs (60ms) — lực va nhỏ nhất', () => {
    scene.applyJuiceForOutcome('shield_consume');
    expect(scene.hitStopLeftForTest()).toBe(MECHANICS.hitStopShieldMs);
  });

  it('camera punch: zoom rơi 1 bước ra điểm đáy rồi hồi về 1 (quỹ đạo out→in, <100ms tới đáy)', () => {
    scene.applyJuiceForOutcome('game_over');
    scene.stepHitStopForTest(MECHANICS.punchHoldMs); // tới điểm đáy zoom (1 cột mốc tween)
    expect(scene.zoomViewForTest()).toBeCloseTo(1 - MECHANICS.punchDeathZoom, 5);
    scene.stepHitStopForTest(500);                   // hết freeze + hồi
    expect(scene.zoomViewForTest()).toBeCloseTo(1, 5);
  });

  it('pass không tạo juice (không freeze, không đổi zoom)', () => {
    scene.applyJuiceForOutcome('pass');
    expect(scene.hitStopLeftForTest()).toBe(0);
    expect(scene.zoomViewForTest()).toBeCloseTo(1, 5);
  });

  it('death freeze KHÔNG trôi qua ván mới: beginSessionForTest xoá hit-stop + zoom về 1', () => {
    scene.applyJuiceForOutcome('game_over');
    expect(scene.hitStopLeftForTest()).toBeGreaterThan(0);
    scene.beginSessionForTest(0);
    expect(scene.hitStopLeftForTest()).toBe(0);
    expect(scene.zoomViewForTest()).toBeCloseTo(1, 5);
  });

  it('frame nhỏ hơn 1ms: freeze không âm (floor = 0)', () => {
    scene.applyJuiceForOutcome('shield_consume');
    scene.stepHitStopForTest(0.5);
    expect(scene.hitStopLeftForTest()).toBeCloseTo(MECHANICS.hitStopShieldMs - 0.5, 5);
  });
});

// ---------- (4) Wiring runtime: nhánh va chạm gọi juice qua 1 nguồn (grep source) ----------
describe('UPG2-J1 — wiring nhánh outcome trong update loop đi qua 1 nguồn juice', () => {
  it('nhánh outcome trong vòng ong áp juice QUA biến outcome (không literal trùng nhánh if)', () => {
    // runtime: 1 nguồn applyJuiceForOutcome(outcome) ngay đầu khối `if (outcome !== 'pass')`
    expect(SRC).toMatch(/if \(outcome !== 'pass'\) \{\s*\n\s*this\.applyJuiceForOutcome\(outcome\);/);
    // nhánh literal duy nhất nằm trong onHit (chết) — applyJuiceForOutcome('game_over')
    expect((SRC.match(/applyJuiceForOutcome\('game_over'\)/g) ?? []).length).toBe(1);
  });

  it('onHit hoãn chuỗi chết khi còn freeze (deathFadeQueued) + stepJuice mở khoá trong update', () => {
    expect(SRC).toMatch(/hitStopLeft > 0/);
    expect(SRC).toMatch(/deathFadeQueued/);
    expect(SRC).toMatch(/private async finishDeathSequence\(\)/);
    expect(SRC).toMatch(/stepJuice\(deltaMs\)/);
  });
});
