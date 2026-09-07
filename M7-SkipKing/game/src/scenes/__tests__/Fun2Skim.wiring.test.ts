// FUN2-C2 TDD-B wiring — skim feel: WakeTrail (vệt lướt liên tục) + FoamFx (foam nổ tại điểm
// chạm, THÊM LỚP trên ripple — đường gọi RippleFx giữ nguyên) + spin đá theo tốc độ bay thật
// (đọc Stone tầng A, bỏ rotation cứng 0.004 rad/ms) + hitstop DIỄN ở scene qua
// hitstopMsFor(impact) tầng A với time-scale pathway RIÊNG (hitstopScale) — slowmoScale giữ
// ĐỘC QUYỀN PERFECT (invariant tie-A/tie-B), KHÔNG bẻ fixed-step accumulator/MAX_STEPS/fixedDt.
// Scene dựng Phaser thật headless jsdom (mô hình Fun2Audio/PlayScene wiring test).
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
import { PlayScene } from '../PlayScene';
import { MECHANICS } from '../../config/mechanics';
import { FX, SKIM } from '../../render/layout';
import type { EngineEvent } from '../../logic/types';

const CANVAS = document.createElement('canvas');
const NATIVE_RAF = globalThis.requestAnimationFrame;
const NATIVE_CAF = globalThis.cancelAnimationFrame;

beforeAll(() => {
  document.body.appendChild(CANVAS);
  window.localStorage.setItem('sk_done', '1'); // thẳng stage local — không demo
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
      reject(new Error('Fun2Skim boot timeout sau 15s'));
    }, 15000);
    giveUp.unref?.();
  });
}

beforeAll(async () => { await bootScene(); });
afterAll(() => { game?.destroy(true); });

/** Đếm object skim theo testid trong scene (pattern TEST-FIELDS). */
function countByTestid(id: string): number {
  return scene.children.list.filter((o) => o.getData && o.getData('testid') === id).length;
}
function visibleByTestid(id: string): Phaser.GameObjects.GameObject[] {
  return scene.children.list.filter(
    (o) => o.getData && o.getData('testid') === id && (o as Phaser.GameObjects.Image).visible,
  );
}

afterEach(() => {
  // đảm bảo không cú dở rỉ sang test khác (mô hình Fun2Audio)
  let frames = 0;
  while ((scene.pendingCountForTest() > 0 || !scene.getEngineForTest().finished) && frames < 7200) {
    scene.updateForTest(200000 + frames * 16, 16);
    frames++;
  }
});

describe('FUN2-C2 — WakeTrail: vệt lướt LIÊN TỤC theo đá bay (pool, không new/destroy)', () => {
  it('đá bay → trail hiện dần (spawn liên tục); nghỉ 900ms → mờ dần hết; pool tái dùng (không phình)', () => {
    const wake = scene.wakeTrailForTest();
    expect(wake.poolSizeForTest()).toBe(FX.wakePool); // cap pool theo config
    expect(wake.visibleCountForTest()).toBe(0); // chưa ném — 0 vệt
    const createdBefore = countByTestid('skim-wake');
    scene.dispatchFlickForTest({ dirX: 0, dirZ: -1, power: 0.9 }); // cú mạnh — bay đủ lâu
    for (let f = 0; f < 20; f++) scene.updateForTest(1000 + f * 16, 16);
    expect(scene.getEngineForTest().stone).not.toBeNull(); // đang bay
    expect(scene.wakeTrailForTest().visibleCountForTest()).toBeGreaterThanOrEqual(1); // RED: chưa có trail
    // 200 frame — pool KHÔNG phình (tái dùng, không new mỗi frame — ROLE-RULES perf)
    for (let f = 0; f < 200; f++) scene.updateForTest(2000 + f * 16, 16);
    expect(countByTestid('skim-wake')).toBeLessThanOrEqual(FX.wakePool);
    // Nghỉ 900ms (> wakeLifeMs) — mọi hạt mờ dần hết rồi ẩn (tái sử dụng được)
    scene.advanceSkimTimeScaleForTest(900);
    expect(scene.wakeTrailForTest().visibleCountForTest()).toBe(0);
    // Đuổi run tới đích — sạch cho test sau
    let frames = 0;
    while (!scene.getEngineForTest().finished && frames < 7200) {
      scene.updateForTest(30000 + frames * 16, 16);
      frames++;
    }
    expect(scene.getEngineForTest().finished).toBe(true);
    void createdBefore;
  });

  it('alpha hạt hiển thị nằm dải 0.25–0.5 (trắng mờ — KHÔNG màu mới, kỷ luật palette ux-ui)', () => {
    scene.dispatchFlickForTest({ dirX: 0, dirZ: -1, power: 0.85 });
    for (let f = 0; f < 10; f++) scene.updateForTest(50000 + f * 16, 16);
    const vis = visibleByTestid('skim-wake') as Phaser.GameObjects.Image[];
    expect(vis.length).toBeGreaterThanOrEqual(1);
    for (const img of vis) {
      expect(img.alpha).toBeGreaterThanOrEqual(0.25 - 1e-6);
      expect(img.alpha).toBeLessThanOrEqual(0.5 + 1e-6);
    }
    let frames = 0;
    while (!scene.getEngineForTest().finished && frames < 7200) {
      scene.updateForTest(51000 + frames * 16, 16);
      frames++;
    }
  });
});

describe('FUN2-C2 — FoamFx: foam trắng nổ tại điểm chạm (bounce + splash) — THÊM LỚP, ripple giữ nguyên', () => {
  it('bounce → foam nổ; ripple VẪN spawn song song (foam thêm lớp — không thay đường gọi cũ)', () => {
    scene.foamForTest(); // RED: mirror chưa tồn tại
    const ripple = (scene as unknown as { ripple: { pool: { active: boolean }[] } }).ripple;
    const rippleActiveBefore = ripple.pool.filter((r) => r.active).length;
    scene.applyEventsForTest([{ type: 'bounce', stoneX: 0, stoneZ: 4, impact: 0.8 }]);
    expect(scene.foamForTest().visibleCountForTest()).toBeGreaterThanOrEqual(1);
    expect(ripple.pool.filter((r) => r.active).length).toBeGreaterThanOrEqual(rippleActiveBefore + 1);
  });

  it('splash → foam nổ cả ở điểm chìm', () => {
    scene.applyEventsForTest([{ type: 'splash', stoneX: 1, stoneZ: 10 }]);
    expect(scene.foamForTest().visibleCountForTest()).toBeGreaterThanOrEqual(1);
  });

  it('alpha foam trong dải 0.25–0.5; spam 30 điểm chạm → pool cap, không phình object', () => {
    const foam = scene.foamForTest();
    expect(foam.poolSizeForTest()).toBe(FX.foamPool);
    const before = countByTestid('skim-foam');
    for (let i = 0; i < 30; i++) {
      scene.applyEventsForTest([{ type: 'bounce', stoneX: 0, stoneZ: 2 + (i % 20), impact: 0.9 }]);
    }
    expect(countByTestid('skim-foam')).toBeLessThanOrEqual(before + FX.foamPool);
    const vis = visibleByTestid('skim-foam') as Phaser.GameObjects.Image[];
    expect(vis.length).toBeGreaterThanOrEqual(1);
    for (const img of vis) {
      expect(img.alpha).toBeGreaterThanOrEqual(0.25 - 1e-6);
      expect(img.alpha).toBeLessThanOrEqual(0.5 + 1e-6);
    }
    scene.advanceSkimTimeScaleForTest(1000); // nghỉ — foam tắt hết cho test sau
    expect(scene.foamForTest().visibleCountForTest()).toBe(0);
  });
});

describe('FUN2-C2 — Spin theo tốc độ bay thật (đọc Stone tầng A — không rotation cứng theo wall-clock)', () => {
  it('đá bay → rotation TÍCH LŨY ∝ tốc độ ngang thật (công thức SKIM.spinRadPerMsPerSpeed)', () => {
    scene.dispatchFlickForTest({ dirX: 0, dirZ: -1, power: 0.9 });
    const s = scene.getEngineForTest().stone;
    expect(s).not.toBeNull();
    const speed = Math.hypot(s!.vx, s!.vz); // tốc độ ngang tầng A — nguồn spin
    scene.advanceSkimTimeScaleForTest(1000); // 1s sim-time
    const rot1 = scene.stoneForTest().rotation;
    // sprite.rotation = góc tích lũy wrap 2π — so theo modulo (chuẩn quay tròn)
    expect(rot1).toBeCloseTo((SKIM.spinRadPerMsPerSpeed * 1000 * speed) % (Math.PI * 2), 3); // RED: cứng 0.004×t
    scene.advanceSkimTimeScaleForTest(500);
    expect(scene.stoneForTest().rotation).not.toBeCloseTo(rot1, 3); // tích lũy tiếp, không absolute theo time
    let frames = 0;
    while (!scene.getEngineForTest().finished && frames < 7200) {
      scene.updateForTest(60000 + frames * 16, 16);
      frames++;
    }
  });

  it('cú yếu xoay chậm hơn cú mạnh (spin phản ánh tốc độ — khối quang học)', () => {
    scene.dispatchFlickForTest({ dirX: 0, dirZ: -1, power: 0.2 }); // tốc thấp (~6.4 m/s)
    const sLow = scene.getEngineForTest().stone!;
    const speedLow = Math.hypot(sLow.vx, sLow.vz);
    // Đo DELTA góc qua 1 lần advance (renderer rot tích lũy xuyên test — so theo modulo 2π)
    const TAU = Math.PI * 2;
    const norm = (r: number) => ((r % TAU) + TAU) % TAU;
    const rotBeforeLow = scene.stoneForTest().rotation;
    scene.advanceSkimTimeScaleForTest(500);
    const dLow = norm(scene.stoneForTest().rotation - rotBeforeLow);
    let frames = 0;
    while (!scene.getEngineForTest().finished && frames < 7200) {
      scene.updateForTest(70000 + frames * 16, 16);
      frames++;
    }
    scene.dispatchFlickForTest({ dirX: 0, dirZ: -1, power: 1 }); // tốc cao (14 m/s)
    const sHigh = scene.getEngineForTest().stone!;
    const speedHigh = Math.hypot(sHigh.vx, sHigh.vz);
    const rotBeforeHigh = scene.stoneForTest().rotation;
    scene.advanceSkimTimeScaleForTest(500);
    const dHigh = norm(scene.stoneForTest().rotation - rotBeforeHigh);
    expect(speedHigh).toBeGreaterThan(speedLow);
    // cùng 500ms sim-time — delta góc khớp công thức (cú yếu 3.52 rad; cú mạnh wrap 1.42)
    expect(dLow).toBeCloseTo((SKIM.spinRadPerMsPerSpeed * 500 * speedLow) % TAU, 3);
    expect(dHigh).toBeCloseTo((SKIM.spinRadPerMsPerSpeed * 500 * speedHigh) % TAU, 3);
    expect(dHigh).not.toBeCloseTo(dLow, 3); // 2 delta khác nhau — spin phản ánh tốc độ
    frames = 0;
    while (!scene.getEngineForTest().finished && frames < 7200) {
      scene.updateForTest(80000 + frames * 16, 16);
      frames++;
    }
  });

  it('renderIdle về rotation 0 như cũ (đá đợi điểm xuất phát)', () => {
    scene.updateForTest(90000, 16); // engine terminal (chìm từ cú power 1 trước đó) → renderIdle path
    expect(scene.stoneForTest().rotation).toBe(0);
    void scene.getEngineForTest();
  });
});

describe('FUN2-C2 — Hitstop diễn ở scene: hitstopMsFor tầng A + time-scale RIÊNG, không đụng slow-mo', () => {
  it('bounce mạnh (impact 0.9) → cửa sổ hitstop 33–66ms + hitstopScale=0; nảy thường (0.3) → KHÔNG mở/đổi cửa sổ đang mở', () => {
    scene.applyEventsForTest([{ type: 'bounce', stoneX: 0, stoneZ: 4, impact: 0.9 }]);
    const rem = scene.hitstopRemainingForTest();
    expect(rem).toBeGreaterThanOrEqual(33);
    expect(rem).toBeLessThanOrEqual(66);
    expect(scene.hitstopScaleForTest()).toBe(0);
    // Nảy thường (dưới ngưỡng hitstopMsFor=0) KHÔNG được đụng cửa sổ đang mở (không reset dài hơn).
    scene.applyEventsForTest([{ type: 'bounce', stoneX: 0, stoneZ: 4, impact: 0.3 }]);
    expect(scene.hitstopRemainingForTest()).toBe(rem); // giữ nguyên cửa sổ cũ
    expect(scene.hitstopScaleForTest()).toBe(0);
    scene.advanceSkimTimeScaleForTest(1000); // dọn cửa sổ còn lại
    expect(scene.hitstopRemainingForTest()).toBe(0);
    expect(scene.hitstopScaleForTest()).toBe(1);
  });

  it('hitstop HẾT HẠN đúng ms: 20ms đầu còn đứng, trôi thêm 100ms → nhịp 1× trở lại', () => {
    scene.applyEventsForTest([{ type: 'bounce', stoneX: 0, stoneZ: 4, impact: 1 }]);
    expect(scene.hitstopRemainingForTest()).toBeGreaterThan(20);
    scene.advanceSkimTimeScaleForTest(20);
    expect(scene.hitstopRemainingForTest()).toBeGreaterThanOrEqual(1); // vẫn trong cửa sổ
    expect(scene.hitstopScaleForTest()).toBe(0);
    scene.advanceSkimTimeScaleForTest(100);
    expect(scene.hitstopRemainingForTest()).toBe(0);
    expect(scene.hitstopScaleForTest()).toBe(1); // RED: chưa có pathway
  });

  it('hitstop KHÔNG làm mất event: run nảy thật → applyEvents nhận ĐỦ bounce = số nảy engine', () => {
    const engine = scene.getEngineForTest();
    const received: EngineEvent[] = [];
    const hook = scene as unknown as { applyEvents: (evs: EngineEvent[]) => void };
    const orig = hook.applyEvents.bind(scene);
    hook.applyEvents = (evs: EngineEvent[]) => {
      received.push(...evs);
      orig(evs);
    };
    try {
      scene.dispatchFlickForTest({ dirX: 0, dirZ: -1, power: 0.8 }); // nhiều nảy mạnh → hitstop nhiều lần
      let frames = 0;
      while (!engine.finished && frames < 7200) {
        scene.updateForTest(100000 + frames * 16, 16);
        frames++;
      }
      expect(engine.finished).toBe(true);
      expect(engine.bounces).toBeGreaterThanOrEqual(1);
      const bounceEvents = received.filter((e) => e.type === 'bounce');
      expect(bounceEvents.length).toBe(engine.bounces); // 0 event nuốt trong/qua hitstop
    } finally {
      hook.applyEvents = orig;
    }
  });

  it('grep-cap: hitstop đi qua hitstopScale riêng — slowmoScale giữ độc quyền PERFECT (tie-A/tie-B)', () => {
    const base = readFileSync('src/scenes/PlayScene.ts', 'utf8');
    expect(base).toContain('hitstopMsFor'); // hàm tầng A C1 xuất
    expect(base).toContain('hitstopScale'); // pathway riêng
    // CẤM gán lại slowmoScale ngoài init field + mirror test — codeOnly lọc comment + ForTest
    const codeOnly = base
      .split('\n')
      .filter((l) => !l.trim().startsWith('*') && !l.trim().startsWith('//') && !l.includes('ForTest'))
      .join('\n');
    expect(codeOnly).not.toMatch(/slowmoScale\s*=(?![^;\n]*1\s*;)/); // 0 gán ngoài `= 1;`
    expect(codeOnly).not.toContain('this.slowmoScale = 0'); // CẤM zero slow-mo
    const demo = readFileSync('src/scenes/OnboardingPlayScene.ts', 'utf8');
    expect(demo).toContain('applySlowmoForTest(MECHANICS.slowmoTimescale)'); // slow-mo PERFECT nguyên vẹn
  });
});
