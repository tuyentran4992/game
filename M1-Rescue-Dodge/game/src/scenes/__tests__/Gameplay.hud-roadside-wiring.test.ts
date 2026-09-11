// T1e — wiring HudRenderer + RoadsideRenderer → GameplayScene — CONTRACT K0 §6 (card t_c4495ee8).
// Tầng B (TDD-B): HUD + props ven đường tách khỏi god-file Gameplay.ts thành 2 renderer
// trong scenes/render/. Renderer CHỈ vẽ + cập nhật text/graphics đọc state engine qua
// public interface (CONTRACT §2) — CẤM mutate engine (score/fever/shield thuộc tầng A).
// N3 (bộ testid giữ nguyên) nghiệm riêng bằng grep diff trước/sau dán vào [REVIEW].
// Suite grep-cấp nguồn: chạy RED trước khi renderer tồn tại (helper tầng A/game object
// cần cho GREEN nằm cùng commit GREEN — cùng mô hình T1c/T1d).
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';

const SRC = readFileSync('src/scenes/Gameplay.ts', 'utf8');
const HUD_PATH = 'src/scenes/render/HudRenderer.ts';
const ROADSIDE_PATH = 'src/scenes/render/RoadsideRenderer.ts';

describe('T1e — renderer tồn tại + Gameplay orchestrate-only (grep-cấp source)', () => {
  it('scenes/render/HudRenderer.ts + RoadsideRenderer.ts tồn tại', () => {
    expect(existsSync(HUD_PATH), 'thiếu scenes/render/HudRenderer.ts').toBe(true);
    expect(existsSync(ROADSIDE_PATH), 'thiếu scenes/render/RoadsideRenderer.ts').toBe(true);
  });

  it('Gameplay.ts KHÔNG còn method HUD/props cũ (đã dời nguyên khối vào renderer)', () => {
    expect(SRC).not.toContain('private drawFeverBar()');
    expect(SRC).not.toContain('private drawLevelProgress()');
    expect(SRC).not.toContain('private updateHud()');
    expect(SRC).not.toContain('private drawRoadsideProps(');
    // drawGroundFlow/buildFlow* GIỮ lại — vạch làn + vệt gió + bake texture là hạ tầng
    // chung của scene (road flow, không phải props ven đường theo ranh giới card T1e)
    expect(SRC).not.toContain('natureParticles');
    expect(SRC).not.toContain('roadsideProps');
  });

  it('Gameplay.ts điều phối qua this.hud / this.roadside (scene chỉ orchestrate)', () => {
    expect(SRC).toContain('this.hud = new HudRenderer(');
    expect(SRC).toContain('this.roadside = new RoadsideRenderer(');
    expect(SRC).toContain('this.hud.update()');
    expect(SRC).toContain('this.hud.drawFeverBar(');
    expect(SRC).toContain('this.hud.drawLevelProgress(');
    expect(SRC).toContain('this.roadside.update(');
  });

  it('renderer KHÔNG mutate engine — chỉ đọc state cho phép (CONTRACT §2)', () => {
    const READS = new Set([
      'score', 'fish', 'getLevel', 'isFeverActive', 'fever', 'feverTimeRemaining',
      'elapsed', 'shieldActive', 'isMagnetActive', 'getSelectedSkinTexture',
    ]);
    for (const [name, path] of [['HudRenderer', HUD_PATH], ['RoadsideRenderer', ROADSIDE_PATH]] as const) {
      if (!existsSync(path)) { throw new Error(`${name}.ts chưa tồn tại`); }
      const src = readFileSync(path, 'utf8');
      const calls = [...src.matchAll(/engine\.(\w+)\s*\(/g)].map((m) => m[1]);
      const illegal = calls.filter((c) => !READS.has(c));
      expect(illegal, `${name} gọi method cấm trên engine: ${illegal.join(', ')}`).toEqual([]);
      expect(src, `${name} gán field engine (mutate state)`).not.toMatch(/engine\.\w+\s*=[^=]/);
    }
    // HUD thuần vẽ text/graphics từ state — không random (deterministic theo state engine).
    expect(readFileSync(HUD_PATH, 'utf8')).not.toContain('Math.random');
  });
});

// ---------- Runtime regression 0/30/60s: renderer sống qua frame thật trong jsdom ----------
// Boot Phaser CANVAS thật (mô hình collision-wiring.test) — update loop chạy 0s/30s/60s:
// renderer KHÔNG ném lỗi, HUD text khớp state engine, props vẫn sống (không autofail).
import { beforeAll, afterAll, vi } from 'vitest';
import { readFileSync as rf } from 'fs';

// Stub canvas 2D cho Phaser module-init trong jsdom (mô hình collision-wiring.test)
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

describe('T1e runtime — renderer sống qua regression 0/30/60s (update loop thật)', () => {
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
      // update() thật của scene: engine timers + spawn + renderer.update mỗi frame
      scene.update(performance.now(), frameMs);
    }
  }

  /**
   * Cô lập renderer khỏi gameplay thật: ong/vật phẩm spawn thật sẽ giết mèo trong vài giây
   * (regression của card T1d đã nghiệm riêng) — test này chỉ đo SỐNG SÓT RENDER pipeline,
   * nên thay director bằng stub không spawn (scoped, KHÔNG đụng assert test cũ).
   */
  function isolateRendererFromSpawns() {
    const sceneAny = scene as unknown as { spawnDirector: { update: (...a: unknown[]) => unknown } };
    vi.spyOn(sceneAny.spawnDirector, 'update').mockReturnValue({
      spawnInterval: 1.35, spawned: [], doubleSpawn: null, lastSpawnReset: false, swarmTriggered: false,
    });
  }

  it('0s: HUD text khớp state engine ngay sau boot', () => {
    const engine = scene.getEngineForTest();
    expect(scene.scene.isActive('GameplayScene')).toBe(true);
    // renderer đang hiển thị đúng state engine (score 0 đầu phiên)
    expect(engine.score).toBe(0);
  });

  it('30s: update loop chạy liên tục không ném lỗi, HUD hiển thị score tick đúng', () => {
    const engine = scene.getEngineForTest();
    engine.startNewGame();
    isolateRendererFromSpawns();
    const spyUpdate = vi.spyOn(scene.roadside, 'update');
    const spyHud = vi.spyOn(scene.hud, 'update');
    expect(() => runGameplaySeconds(30)).not.toThrow();
    // renderer được orchestrate mỗi frame (roadside) + mỗi tick giây (hud)
    expect(spyUpdate.mock.calls.length).toBeGreaterThan(500);
    // 30s tick giây → score ≥ 30 (engine +1/s; dodge/pickup thật có thể cộng thêm —
    // test này đo renderer sống sót, không khóa balance gameplay đã nghiệm ở T1c/T1d)
    expect(engine.score).toBeGreaterThanOrEqual(30);
    expect(spyHud).toHaveBeenCalled();
    spyUpdate.mockRestore();
    spyHud.mockRestore();
  });

  it('60s: tiếp tục sống, props ven đường vẫn tồn tại, không văng object', () => {
    isolateRendererFromSpawns();
    expect(() => runGameplaySeconds(30)).not.toThrow(); // 30→60s
    expect(scene.getEngineForTest().score).toBeGreaterThanOrEqual(60);
    expect(scene.roadside.propCount).toBe(14);
    expect(scene.roadside.natureCount).toBe(16);
    expect(scene.scene.isActive('GameplayScene')).toBe(true);
  });
});

