// T1f — wiring FxRenderer → GameplayScene — CONTRACT K0 §6 (card t_b574542f).
// Tầng B (TDD-B): hạt va chạm/fever/speed-lines tách khỏi god-file Gameplay.ts thành
// scenes/render/FxRenderer.ts. MỌI spawn hạt đi qua FxPool/RingPool của PERF3
// (systems/FxPool.ts) — reuse, KHÔNG tự viết pool mới, KHÔNG new/destroy GameObject
// mỗi frame (ROLE-RULES perf). Scene chỉ orchestrate (gọi renderer), renderer gọi pool.
// N3 (bộ testid giữ nguyên) nghiệm riêng bằng grep diff trước/sau dán vào [REVIEW].
// Suite grep-cấp nguồn: chạy RED trước khi FxRenderer tồn tại (mô hình T1e — helper
// tầng A/game object cần cho GREEN nằm cùng commit GREEN).
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';

const SRC = readFileSync('src/scenes/Gameplay.ts', 'utf8');
const FX_PATH = 'src/scenes/render/FxRenderer.ts';
const FXPOOL_PATH = 'src/systems/FxPool.ts';

describe('T1f — FxRenderer tồn tại + Gameplay orchestrate-only (grep-cấp source)', () => {
  it('scenes/render/FxRenderer.ts tồn tại + <400 dòng (CONTRACT K0)', () => {
    expect(existsSync(FX_PATH), 'thiếu scenes/render/FxRenderer.ts').toBe(true);
    const lines = readFileSync(FX_PATH, 'utf8').split('\n').length;
    expect(lines, `FxRenderer.ts ${lines}d vượt trần <400d`).toBeLessThan(400);
  });

  it('FxRenderer dùng FxPool/RingPool có sẵn của PERF3 — reuse, không tự viết pool mới', () => {
    const src = readFileSync(FX_PATH, 'utf8');
    expect(src, 'FxRenderer phải import FxPool từ systems/FxPool').toContain('from \'../../systems/FxPool\'');
    expect(src).toMatch(/new FxPool\(/);
    expect(src).toMatch(/new RingPool\(/);
    // Cấm định nghĩa class pool trùng (FxPool/RingPool phải là import, không phải khai báo lại)
    expect(src, 'FxRenderer KHÔNG được tự khai báo class FxPool').not.toMatch(/class FxPool/);
    expect(src, 'FxRenderer KHÔNG được tự khai báo class RingPool').not.toMatch(/class RingPool/);
    expect(src, 'FxRenderer KHÔNG được tự khai báo class Pool').not.toMatch(/export class Pool/);
  });

  it('FxRenderer KHÔNG new/destroy GameObject trong đường nóng (pool-only, ROLE-RULES perf)', () => {
    const src = existsSync(FX_PATH) ? readFileSync(FX_PATH, 'utf8') : '';
    // Cấm sinh-hủy GameObject theo frame: scene.add.* chỉ hợp lệ trong constructor/build pool ban đầu
    const addImageCalls = [...src.matchAll(/scene\.add\.(image|container|circle|text|tileSprite)\(/g)].length;
    expect(addImageCalls, 'scene.add.* chỉ hợp lệ lúc dựng pool/flow ban đầu (2 TileSprite + 12 streak)').toBeLessThanOrEqual(14);
    // Cấm add.circle / tweens sinh-hủy mỗi burst (bệnh cũ PERF-FIX B đã sửa)
    expect(src, 'cấm add.circle sinh-hủy').not.toMatch(/add\.circle\(/);
    expect(src, 'cấm tween per-particle').not.toMatch(/tweens\.add\(/);
    // Đường nóng (spawn/step/updateFlow) KHÔNG được destroy/add gì cả — destroy chỉ trong
    // lifecycle (destroyFlowObjects/destroy) khi rebuild/shutdown theo chủ sở hữu.
    const hotMethods = ['spawnDust', 'spawnSparkles', 'spawnShockwave', 'spawnBeeExplosion', 'spawnRunningPuff', 'spawnBeeTrail', 'step(', 'updateFlow'];
    for (const name of hotMethods) {
      const body = methodBody(src, name);
      expect(body, `${name} không được destroy GameObject trong đường nóng`).not.toContain('.destroy(');
      expect(body, `${name} không được add GameObject mới trong đường nóng`).not.toMatch(/scene\.add\./);
    }
  });

  /** Cắt body 1 method (từ dấu tên method tới `\n  }` đóng ở indent method). */
  function methodBody(src: string, name: string): string {
    const start = src.indexOf(name + '(');
    if (start < 0) return '';
    const end = src.indexOf('\n  }', start);
    return end < 0 ? src.slice(start) : src.slice(start, end);
  }

  it('Gameplay.ts dời khối spawn hạt sang renderer — gọi qua this.fx (scene chỉ orchestrate)', () => {
    expect(SRC).toContain('this.fx = new FxRenderer(');
    expect(SRC).toContain('this.fx.spawnDust(');
    expect(SRC).toContain('this.fx.spawnSparkles(');
    expect(SRC).toContain('this.fx.spawnShockwave(');
    expect(SRC).toContain('this.fx.spawnBeeExplosion(');
    expect(SRC).toContain('this.fx.spawnRunningPuff(');
    expect(SRC).toContain('this.fx.spawnBeeTrail(');
    // Step + lifecycle qua renderer (shutdown dùng optional-chaining như hud/roadside)
    expect(SRC).toContain('this.fx.step(');
    expect(SRC).toContain('this.fx?.destroy()');
    // Không còn field pool trực tiếp trong scene
    expect(SRC).not.toContain('private fxDots!');
    expect(SRC).not.toContain('private fxDust!');
    expect(SRC).not.toContain('private fxTrail!');
    expect(SRC).not.toContain('private fxRing!');
    // Không còn method spawn hạt cũ trong scene
    expect(SRC).not.toContain('private spawnDust(');
    expect(SRC).not.toContain('private spawnSparkles(');
    expect(SRC).not.toContain('private spawnShockwave(');
    expect(SRC).not.toContain('private spawnBeeExplosion(');
    expect(SRC).not.toContain('private spawnRunningPuff(');
    expect(SRC).not.toContain('private stepFx(');
  });

  it('FxRenderer KHÔNG đọc engine/state gameplay — chỉ nhận tham số vẽ thuần (CONTRACT §2 ranh giới)', () => {
    const src = existsSync(FX_PATH) ? readFileSync(FX_PATH, 'utf8') : '';
    expect(src, 'FxRenderer không import ctx (engine singleton) — hạt nhận tham số thuần')
      .not.toMatch(/from ['"].*context['"]/);
    expect(src, 'FxRenderer không gọi method engine').not.toMatch(/engine\.\w+\s*\(/);
    expect(src, 'FxRenderer không spawn/collision/HUD (T1c/d/e)').not.toMatch(/SpawnDirector|CollisionSystem|HudRenderer|RoadsideRenderer/);
  });
});

// ---------- Runtime regression 0/30/60s: renderer sống qua frame thật trong jsdom ----------
// Boot Phaser CANVAS thật (mô hình hud-roadside-wiring.test) — update loop chạy 0s/30s/60s:
// FxRenderer KHÔNG ném lỗi, pool sống qua step() mỗi frame, burst va chạm/near-miss hoạt động.
import { beforeAll, afterAll, vi } from 'vitest';
import { readFileSync as rf } from 'fs';

// Stub canvas 2D cho Phaser module-init trong jsdom (mô hình hud-roadside-wiring.test)
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

describe('T1f runtime — FxRenderer sống qua regression 0/30/60s (update loop thật)', () => {
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
      expect(scene.roadside).toBeDefined();
      expect(scene.fx).toBeDefined();
    }, { timeout: 15000, interval: 50 });
    (globalThis as any).__nativeRafRestore = NATIVE_RAF;
  }, 20000);

  afterAll(() => {
    if ((globalThis as any).__nativeRafRestore) {
      globalThis.requestAnimationFrame = (globalThis as any).__nativeRafRestore;
    }
    game?.destroy(true);
  });

  /** Bơm thời gian: chạy update(deltaMs) đủ số frame để đạt elapsed mục tiêu. */
  function runGameplaySeconds(seconds: number) {
    const frameMs = 16;
    const totalFrames = Math.ceil((seconds * 1000) / frameMs);
    for (let i = 0; i < totalFrames; i++) {
      scene.update(performance.now(), frameMs);
    }
  }

  /**
   * Cô lập renderer khỏi gameplay thật (mô hình T1e): stub director không spawn.
   */
  function isolateRendererFromSpawns() {
    const sceneAny = scene as unknown as { spawnDirector: { update: (...a: unknown[]) => unknown } };
    vi.spyOn(sceneAny.spawnDirector, 'update').mockReturnValue({
      spawnInterval: 1.35, spawned: [], doubleSpawn: null, lastSpawnReset: false, swarmTriggered: false,
    });
  }

  it('0s: FxRenderer đã được scene khởi tạo sau boot', () => {
    expect(scene.scene.isActive('GameplayScene')).toBe(true);
    expect(scene.fx).toBeDefined();
  });

  it('30s: update loop + fx.step chạy liên tục không ném lỗi, burst va chạm sống sót', () => {
    const engine = scene.getEngineForTest();
    engine.startNewGame();
    isolateRendererFromSpawns();
    const spyStep = vi.spyOn(scene.fx, 'step');
    // Burst thật từ scene (đường orchestrate mới): hút bụi + sparkles + shockwave
    expect(() => {
      scene.fx.spawnRunningPuff(195, 400);
      scene.fx.spawnSparkles(195, 380, 0xFFEE55);
      scene.fx.spawnShockwave(195, 400, 0x00F0FF);
      scene.fx.spawnBeeExplosion(195, 300);
      scene.fx.spawnDust(195, 420);
    }).not.toThrow();
    expect(() => runGameplaySeconds(30)).not.toThrow();
    // step() được orchestrate mỗi frame từ scene.update
    expect(spyStep.mock.calls.length).toBeGreaterThan(500);
    spyStep.mockRestore();
  });

  it('60s: tiếp tục sống; flush step > max life → pool về 0 slot sống (không rò GameObject); cap giữ nguyên PERF3', () => {
    isolateRendererFromSpawns();
    expect(() => runGameplaySeconds(30)).not.toThrow(); // 30→60s
    // Hạt cuối có thể còn sống sát mốc dừng (life ≤ 420ms) — flush thêm > 1 max life
    // bằng step thuần (KHÔNG spawn mới) rồi mọi slot phải rảnh: pool tự trả slot theo life.
    for (let i = 0; i < 30; i++) scene.fx.step(16); // 480ms > 420ms
    expect(scene.fx.activeCount).toBe(0);
    // Cap pool giữ nguyên PERF3: không phình to theo burst
    expect(scene.fx.dotsCap).toBe(96);
    expect(scene.fx.dustCap).toBe(32);
    expect(scene.fx.trailCap).toBe(40);
    expect(scene.fx.ringCap).toBe(6);
    expect(scene.scene.isActive('GameplayScene')).toBe(true);
  });
});
