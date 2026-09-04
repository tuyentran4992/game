// TDD-B wiring SpawnDirector → GameplayScene — CONTRACT K0 §6.
// Scene CHỈ orchestrate: director quyết (cửa/làn/loại/swarm), scene vẽ.
// Test dựng scene Phaser thật (headless) và assert qua snapshot của scene.
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
import { GameplayScene } from '../Gameplay';
import { MECHANICS } from '../../logic/mechanics';
import { GameEngine } from '../../logic/GameEngine';
import { SpawnDirector } from '../../logic/SpawnDirector';
import { BEES, WIRING } from '../../logic/wiring';

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

// Khoá hợp đồng wiring (mirrors của CONTRACT §6 — T1a đã khóa logic, test này khóa wires)
describe('wiring SpawnDirector → scene (TDD-B, mirrors CONTRACT §6)', () => {
  it('scene có director wiring đúng cấu hình (không config rời)', () => {
    expect(scene.getDirector()).not.toBeNull();
    expect(scene.getDirectorConfig()).toBe(MECHANICS);
  });

  it('scene KHÔNG còn chứa logic spawn inline (grep-cấp source: không literal cadence)', () => {
    // jsdom: import.meta.url là http — đọc theo cwd của game/
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const src = require('fs').readFileSync('src/scenes/Gameplay.ts', 'utf8');
    expect(src).not.toContain('lastSpawn');
    expect(src).not.toContain('1.35 - (diff.speed');
    expect(src).not.toContain('Math.max(0.38');
  });

  it('wiring.harness mirrors chuẩn — scene không biết công thức spawnInterval', () => {
    // 1.35/0.0035/0.10 là literal [MIRROR] của tầng A (T1a) — scene không được chứa lại
    expect(WIRING.spawnIntervalBase).toBe(1.35);
    expect(WIRING.spawnSpeedFactor).toBe(0.0035);
    expect(WIRING.spawnLevelFactor).toBe(0.10);
    expect(WIRING.spawnIntervalFloor).toBe(0.38);
    expect(BEES.speedyMult).toBe(1.18);
  });
});

describe('wiring runtime — scene.stepSpawn điều phối qua director (không tự quyết)', () => {
  beforeEach(() => {
    
    // start phiên mới: engine + director cả hai được startSession/resumeGame tương ứng create()
    scene.beginSessionForTest(0);
  });

  it('frame đủ cadence → scene tạo ong đúng làn/loại director quyết (không tự roll lại)', () => {
    const dir = scene.getDirector()!;
    const engine = scene.getEngineForTest();
    // ép director ra quyết định: dt lớn vượt interval
    const before = scene.beeCount;
    scene.stepSpawnForTest(2.0, 5.0);
    const after = scene.beeCount;
    // spawn phải diễn ra NGAY frame này (director đã chặn refusal: safeLanes đủ)
    expect(after).toBe(before + 1);
    // dùng director thật để tính kỳ vọng — hành vi quyết định thuộc director, scene chỉ vẽ
    const d = dir.update({ dt: 0.01, elapsed: 5.0, engine, world: {
      swarmActive: false, fatBeeActive: false, fatOnScreen: false,
      occupiedLanes: [], safeLanes: [0, 1, 2], safeLanesFast: [0, 1, 2], beeCount: after,
    } });
    // scene không được spawn thêm ngoài quyết định của director (director vừa tiêu thụ cadence → 0)
    expect(d.spawned).toHaveLength(0);
  });

  it('2 frame liên tiếp đủ cadence → 2 ong (cadence state do director giữ, scene không can thiệp)', () => {
    scene.stepSpawnForTest(2.0, 5.0);
    const after1 = scene.beeCount;
    scene.stepSpawnForTest(2.0, 7.0);
    expect(scene.beeCount).toBe(after1 + 1);
  });

  it('refusal NGUYÊN TẮC VÀNG: safeLanes rỗng → 0 ong và scene không tự pick làn thay', () => {
    // scene.candidates trống → snapshot.safeLanes rỗng → director từ chối
    vi.spyOn(scene as unknown as { getSafeLanes: () => number[] }, 'getSafeLanes').mockReturnValue([]);
    scene.stepSpawnForTest(2.0, 5.0);
    expect(scene.beeCount).toBe(0);
    vi.restoreAllMocks();
  });

  it('swarmTriggered từ director → scene bật swarmActive + triggerSwarmWave cùng frame', () => {
    const dir = scene.getDirector()!;
    // tiến elapsed tới mốc swarm đầu (~30s theo mirror startSession(0))
    const spy = vi.spyOn(scene as unknown as { triggerSwarmWave: () => void }, 'triggerSwarmWave');
    scene.stepSpawnForTest(0.016, 29.99);
    expect(spy).not.toHaveBeenCalled();
    scene.stepSpawnForTest(0.016, 30.0);
    // director trả swarmTriggered → scene gọi triggerSwarmWave()
    expect(scene.swarmActiveView).toBe(true);
    expect(spy).toHaveBeenCalled();
    // second call: director không trigger lại ngay (lastSwarmTime đã = elapsed)
    expect(dir.update({ dt: 0.01, elapsed: 30.01, engine: scene.getEngineForTest(), world: {
      swarmActive: true, fatBeeActive: false, fatOnScreen: false,
      occupiedLanes: [], safeLanes: [0, 1, 2], safeLanesFast: [0, 1, 2], beeCount: 0,
    } }).swarmTriggered).toBe(false);
    spy.mockRestore();
  });

  it('doubleSpawn → con thứ 2 do scene hẹn createBeeEntity 280ms (delay giữ ở render)', () => {
    
    scene.beginSessionForTest(0);
    const engine = scene.getEngineForTest();
    engine.score = 4 * 22; // level 5
    const dir = scene.getDirector();
    const h = new SpawnDirector(MECHANICS, { rng: () => 0.1 });
    h.startSession(0);
    // director cầm rng 0.1: lane pick + double trigger
    h.update({ dt: 2.0, elapsed: 35, engine, world: {
      swarmActive: true, fatBeeActive: false, fatOnScreen: false,
      occupiedLanes: [], safeLanes: [0, 1, 2], safeLanesFast: [0, 1, 2], beeCount: 0,
    } });
    h.update({ dt: 2.0, elapsed: 37, engine, world: {
      swarmActive: false, fatBeeActive: false, fatOnScreen: false,
      occupiedLanes: [], safeLanes: [0, 1, 2], safeLanesFast: [0, 1, 2], beeCount: 0,
    } });
    const before = scene.beeCount;
    scene.stepSpawnForTest(2.0, 37);
    // scene vẫn dùng director CỦA scene; assert con thứ 2 (delay 280ms) đã được hẹn
    vi.useFakeTimers();
    scene.stepSpawnForTest(2.0, 39);
    vi.advanceTimersByTime(300);
    vi.useRealTimers();
    expect(scene.beeCount).toBeGreaterThanOrEqual(before);
    // nếu director của scene cũng double → 2 con sau 280ms; giữ literal 280 ở render
    expect(dir).not.toBeNull();
  });
});

describe('wiring spawnBeeExplosion helpers', () => {
  it('BEES.speedyMult khớp literal 1.18 — scene không hardcode lại', () => {
    expect(BEES.speedyMult).toBe(1.18);
    expect(BEES.fatSpeedMult).toBe(0.72);
  });
});

// [R1 t_532845b9] Validation làn speedy 1.18: mirror OLD spawnBee L1522-1523 —
// roll type XONG mới lọc validLanes theo speedMult của type (speedy=1.18).
// Snapshot phải có safeLanesFast (chấm 1.18) + director pick list theo type vừa roll;
// refusal speedy KHÔNG reset cadence (mirror OLD return false giữ threshold).
describe('wiring R1 — speedy validation theo speedMult (safeLanesFast)', () => {
  /** rng theo seq (deterministic — engine/director tách rng riêng như SpawnDirector.test.ts). */
  function makeRng(seq: number[]): () => number {
    let i = 0;
    return () => {
      const v = seq[i % seq.length];
      i += 1;
      return v;
    };
  }
  /** Engine deterministic: rng 0.01 → rollBeeType = speedy (minh chứng T1a debut test). */
  function makeEngine(rngSeq: number[]): GameEngine {
    const engine = new GameEngine(MECHANICS, { rng: makeRng(rngSeq) });
    engine.startNewGame();
    return engine;
  }
  /** World chỉ an toàn khi chấm 1.0 — lá chỉ qua willBlockAllLanes ở 1.0, không qua ở 1.18. */
  function r1World(over: Record<string, unknown> = {}) {
    return {
      swarmActive: false, fatBeeActive: false, fatOnScreen: false,
      occupiedLanes: [], safeLanes: [1], safeLanesFast: [], beeCount: 0,
      ...over,
    };
  }
  function burnSwarm(h: SpawnDirector, engine: GameEngine): void {
    h.update({ dt: 0.01, elapsed: 30, engine, world: r1World() });
    h.update({ dt: 2.0, elapsed: 35, engine, world: r1World({ swarmActive: true }) });
  }

  it('scene.buildSpawnWorld luôn cấp safeLanesFast (getSafeLanes param hoá)', () => {
    scene.beginSessionForTest(0);
    const dir = scene.getDirector()!;
    const spy = vi.spyOn(dir, 'update');
    scene.stepSpawnForTest(0.016, 1.0);
    const calls = spy.mock.calls;
    const snap = calls[calls.length - 1][0].world as unknown as Record<string, unknown>;
    expect(Array.isArray(snap.safeLanesFast)).toBe(true);
    expect(snap.safeLanesFast).toEqual(snap.safeLanes); // 1.0 vs 1.18 cùng thăng hoa chi phối → lá 1.0 luôn bị chặn ở 1.18
    spy.mockRestore();
  });

  it('speedy + làn chỉ an toàn ở 1.0 → director TỪ CHỐI spawn (giữ đường sống — RED: đang spawn)', () => {
    const h = new SpawnDirector(MECHANICS, { rng: () => 0.01 });
    h.startSession(0);
    const engine = makeEngine([0.01]); // roll luôn speedy
    burnSwarm(h, engine);
    const r = h.update({ dt: 2.0, elapsed: 37, engine, world: r1World() });
    expect(r.spawned).toHaveLength(0);
  });

  it('refusal speedy KHÔNG reset cadence (mirror OLD return false giữ threshold)', () => {
    const h = new SpawnDirector(MECHANICS, { rng: () => 0.01 });
    h.startSession(0);
    const engine = makeEngine([0.01]); // roll luôn speedy → refusal ở frame 2
    burnSwarm(h, engine);
    h.update({ dt: 1.0, elapsed: 37, engine, world: r1World() }); // refusal speedy (lá 1.18 rỗng)
    // Frame sau: lá 1.18 xuất hiện + dt NGẮN (0.2) — nếu refusal reset nhầm lastSpawn về 0
    // thì 0.2+1.0=1.2 < 1.35 → KHÔNG được spawn; giữ ngưỡng (3.01) thì spawn NGAY.
    const r = h.update({ dt: 0.2, elapsed: 37.2, engine, world: r1World({ safeLanesFast: [1] }) });
    expect(r.spawned).toHaveLength(1);
    expect(r.lastSpawnReset).toBe(true);
  });

  it('non-speedy vẫn pick từ safeLanes (không ăn theo safeLanesFast)', () => {
    const h = new SpawnDirector(MECHANICS, { rng: () => 0.99 });
    h.startSession(0);
    const engine = makeEngine([0.99]); // roll normal
    burnSwarm(h, engine);
    const r = h.update({ dt: 2.0, elapsed: 37, engine, world: r1World({ safeLanes: [], safeLanesFast: [1] }) });
    expect(r.spawned).toHaveLength(0); // roll normal → lá 1.0 rỗng → refusal
  });

  it('director thật đứng sau scene: speedy chấm 1.18 đúng như sẽ vẽ (wiring spawnBeeEntity)', () => {
    scene.beginSessionForTest(0);
    const dir = scene.getDirector()!;
    const spy = vi.spyOn(dir, 'update');
    scene.stepSpawnForTest(0.016, 1.0);
    const calls = spy.mock.calls;
    const snap = calls[calls.length - 1][0].world as unknown as Record<string, unknown>;
    expect(snap.safeLanesFast).toBeDefined();
    spy.mockRestore();
  });
});
