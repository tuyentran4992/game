/**
 * BUG-GOM-02 (card t_077be174) — TDD RED-first: sk_best KHÔNG bị demo ghi (TEST-FIELDS mục 6).
 *
 * Bệnh (QA-GOM t_570777d1 — FIX-ROUND-1 BUG-02): finishDemo() flip stage→local + tạo RunLifecycle
 * local MỚI, NHƯNG cú demo còn trong hàng đợi `pendingFlicks` (và run demo đang bay lúc flip)
 * tiếp tục được consumePending()/applyRun xử lý Ở STAGE LOCAL → lifecycle.applyRun() ghi best
 * theo cú demo → sk_best bẩn TRƯỚC cú đầu người chơi. 2 đường rỉ bị test chặn:
 *   Đ1 skip-on-touch với pendingFlicks demo còn lại (B2/B3) → KHÔNG được thả ở local.
 *   Đ2 demo 12s tự nhiên: B3 nổ t=8.0 (slow-mo 0.4×) → run demo kết thúc SAU flip (t=12)
 *      → applyRun run demo không được chạm lifecycle local (run demo score 16 > best 0 → sẽ ghi).
 * Invariant (TEST-FIELDS.md mục 6): "sk_best không bị demo ghi" — bất kể đường thoát demo.
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
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

const CANVAS = document.createElement('canvas');
const NATIVE_RAF = globalThis.requestAnimationFrame;
const NATIVE_CAF = globalThis.cancelAnimationFrame;

/** Đồng hồ giả DÙNG CHUNG cho rAF-loop của Phaser và pump() — test SỞ HỮU thời gian
 * (real-loop giữa các await nhận delta 0, không thể nhảy beat demo ngoài kiểm soát). */
let fakeNow = 0;

beforeAll(() => {
  document.body.appendChild(CANVAS);
  (globalThis as Record<string, unknown>).requestAnimationFrame = (cb: (t: number) => void) =>
    setTimeout(() => cb(fakeNow), 16);
  (globalThis as Record<string, unknown>).cancelAnimationFrame = (id: number) => clearTimeout(id);
});
afterAll(() => {
  CANVAS.remove();
  window.localStorage.removeItem('sk_done');
  window.localStorage.removeItem('sk_best'); // không để best rỉ sang file test khác
  globalThis.requestAnimationFrame = NATIVE_RAF;
  globalThis.cancelAnimationFrame = NATIVE_CAF;
});

let game: Phaser.Game | null = null;
let scene: OnboardingPlayScene;
let sceneSeq = 0;

function waitBooted(s: OnboardingPlayScene, ms = 15000): Promise<void> {
  return new Promise((resolve, reject) => {
    const iv = setInterval(() => {
      if (s.scene && s.scene.isActive() && s.bootedForTest()) {
        clearInterval(iv);
        resolve();
      }
    }, 10);
    const giveUp = setTimeout(() => {
      clearInterval(iv);
      reject(new Error('OnboardingPlayScene boot timeout sau 15s'));
    }, ms);
    giveUp.unref?.();
  });
}

/** Thêm 1 scene MỚI vào game (key duy nhất) — start=true → create() chạy NGAY theo storage hiện tại. */
function addScene(start: boolean): OnboardingPlayScene {
  const s = new OnboardingPlayScene(`OnboardingPlayScene#${++sceneSeq}`);
  game!.scene.add(s.sys.settings.key, s, start, { resume: false });
  return s;
}

beforeAll(async () => {
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
  window.localStorage.removeItem('sk_done'); // boot DEMO — kịch bản chính
  scene = addScene(true);
  await waitBooted(scene);
});
afterAll(() => { game?.destroy(true); });

/** Nhịp updateForTest 60fps trên ĐỒNG HỒ GIẢ — trả time (ms) kế.
 * fromMs/toMs TUYỆT ĐỐI theo đồng hồ test (mốc beat demo 2/4/6/8/12s quy chiếu ở đây). */
function pump(s: OnboardingPlayScene, fromMs: number, toMs: number, stepMs = 16): number {
  let t = fromMs;
  while (t < toMs) {
    fakeNow = t;
    t += stepMs;
    s.updateForTest(t, stepMs);
  }
  return t;
}

describe('BUG-GOM-02 — sk_best không bị demo ghi (TEST-FIELDS mục 6)', () => {
  it('grep-cap: finishDemo flush cú demo pending + pend local-hoãn khi flip (chống rỉ cả 2 đường)', () => {
    const src = readFileSync('src/scenes/OnboardingPlayScene.ts', 'utf8');
    expect(src).toContain('pendingFlicks.length = 0'); // flush hàng đợi demo ở flip
    expect(src).toContain('handoffPending'); // trao tay hoãn khi run demo đang bay
    expect(src).toContain("stage === 'demo'"); // guard cú demo chỉ diễn ở stage demo
    expect(src).not.toContain('assistFlick'); // cú demo NGUYÊN BẢN — không qua Đ2
  });

  it('Đ2 RED: demo 12s tự nhiên — run B3 (slow-mo) kết thúc sau flip → sk_best KHÔNG đổi, 0 end-card, pendingFlicks rỗng', () => {
    window.localStorage.removeItem('sk_best'); // phiên đầu — chưa có best cũ
    // Theo beat thật: B1 t=2.0, B2 t=4.0/6.0, B3 t=8.0, done t=12.0 (onboarding.ts).
    // B3 nổ t=8.0 (slow-mo 0.4×) → run demo còn 2.5s engine khi flip — CHỐT nằm sau flip.
    let t = 1900;
    while (t < 12100) {
      t += 16;
      scene.updateForTest(t, 16);
      const h = scene.demoHandoffForTest();
      if (t > 11400 || h.handoffPending || scene.getStageForTest() === 'local') {
      }
    }
    t = pump(scene, t, 20200); // 12.1s→20.2s = đủ 8.1s engine (run 4.14s) chốt sau flip
    expect(scene.getStageForTest()).toBe('local'); // flip đã xảy ra
    expect(scene.pendingCountForTest()).toBe(0); // pendingFlicks demo bị flush ở flip
    expect(scene.demoHandoffForTest()).toEqual({ pendingFlicks: 0, handoffPending: false, demoRunFlying: false });
    t = pump(scene, t, 20200); // 12.1s→20.2s = đủ 8.1s engine (run 4.14s) chốt sau flip
    expect(window.localStorage.getItem('sk_best')).toBeNull(); // DEMO KHÔNG GHI BEST
    expect(scene.getEndCardForTest().shown).toBe(false); // end-card CHỈ stage local (Đ3)
    expect(scene.getLifecycleForTest().best).toBe(0);
    void t;
  });

  it('Đ2 tie-A: phiên đầu sau demo, cú ĐẦU người chơi PERFECT → sk_best = điểm NGƯỜI CHƠI, gap theo spec edge đầu (scenario 4 — KHÔNG dòng gap)', () => {
    // Cú thẳng trúng window (dirZ −1, power 0.8 = giữa window 0.7–0.9) — judge tầng A markPerfect.
    // run nảy/điểm dao động theo rng Date.now (bất định) — invariant: best ghi là của NGƯỜI CHƠI.
    scene.dispatchFlickForTest({ dirX: 0, dirZ: -1, power: 0.8 });
    expect(scene.getEngineForTest().stone).not.toBeNull();
    pump(scene, 20250, 26000);
    expect(scene.getEndCardForTest().shown).toBe(true);
    expect(scene.getEngineForTest().judgedPerfect).toBe(true); // run PERFECT thật (tầng A)
    // sk_best = điểm run người chơi (lifecycle local là chủ storage — tầng A)
    expect(window.localStorage.getItem('sk_best')).toBe(String(scene.getLifecycleForTest().best));
    expect(Number(window.localStorage.getItem('sk_best'))).toBeGreaterThan(0);
    // END-CARD spec scenario 4: best-trước-run 0 (chưa từng có) → CHỈ headline, KHÔNG dòng gap
    expect(scene.getEndCardForTest().gapTextForTest()).toBe('');
  });

  it('Đ2 tie-B: có best cũ (phiên trước) + cú người chơi phá kỷ lục → "NEW BEST! (was N)" đúng END-CARD spec', async () => {
    // Mô phỏng phiên SAU: sk_done=1 → boot thẳng local, lifecycle đọc best cũ từ storage
    window.localStorage.setItem('sk_best', '10');
    const s3 = addScene(true);
    scene.scene.pause();
    scene = s3;
    await waitBooted(scene);
    expect(scene.getStageForTest()).toBe('local');
    scene.updateForTest(500, 16);
    scene.dispatchFlickForTest({ dirX: 0, dirZ: -1, power: 0.8 });
    pump(scene, 550, 7000);
    expect(scene.getEndCardForTest().shown).toBe(true);
    expect(scene.getEngineForTest().judgedPerfect).toBe(true);
    // PERFECT ⇒ ≥ perfectMinBounces nảy ⇒ score ≥ 14 > best cũ 10 → NEW BEST, "was" = best cũ 10
    expect(scene.getEndCardForTest().gapTextForTest()).toBe('NEW BEST! (was 10)');
    expect(window.localStorage.getItem('sk_best')).toBe(String(scene.getLifecycleForTest().best));
    expect(Number(window.localStorage.getItem('sk_best'))).toBeGreaterThan(10);
  });

  it('Đ1: skip-on-touch giữa demo — cú demo còn pending (kẹt hàng đợi) KHÔNG được thả ở local', async () => {
    window.localStorage.removeItem('sk_done'); // lần demo mới cho scene kế
    window.localStorage.removeItem('sk_best');
    const s2 = addScene(true);
    scene.scene.pause(); // dừng scene cũ — update() không tự diễn nữa
    scene = s2;
    await waitBooted(scene);
    // B1 đang bay (precondition bắt buộc — engine busy để cú demo KẸT trong hàng đợi)
    let t = pump(scene, 1000, 2100);
    const eng = scene.getEngineForTest();
    expect(eng.stone).not.toBeNull();
    expect(eng.finished).toBe(false);
    // Cú demo PERFECT "kẹt" hàng đợi (director vừa đẩy chưa consume được — engine đang bay):
    // nếu lọt qua stage local → consumePending ném + markPerfect → sk_best=18 (bug lộ rõ).
    (scene as unknown as { pendingFlicks: { dirX: number; dirZ: number; power: number }[] }).pendingFlicks.push({ dirX: 0, dirZ: -1, power: 0.8 });
    scene.skipDemoForTest(); // skip-on-touch giữa demo
    t = pump(scene, t, 12100); // đủ xa: run B1 chốt → trao tay; pending (nếu còn) sẽ bị consume ở local
    expect(scene.getStageForTest()).toBe('local');
    expect(scene.pendingCountForTest()).toBe(0); // XẢ SẠCH ở flip — không cú demo nào sót
    expect(window.localStorage.getItem('sk_best')).toBeNull(); // cú demo PERFECT kẹt queue KHÔNG ghi best
    expect(scene.getEndCardForTest().shown).toBe(false); // run demo/kẹt không tạo end-card
    void t;
  });
});
