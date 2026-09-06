// T5 TDD-B wiring — EndCard (CONTRACT 3.5 + mục 4 testid `end-card`):
// overlay run end "N BOUNCES" to nhất + best-gap (NEW BEST! (was N) / N AWAY FROM BEST M)
// + 0 nảy → "SPLASH!" (thay headline fail) + nút "THROW AGAIN" ≥44px nửa dưới (thumb reach).
// Demo stage (B2 hụt) KHÔNG end-card (CONTRACT 3.1 Đ3 — demo = không gian an toàn).
// Demo-once: sk_done ghi ĐÚNG 1 LẦN mỗi đường (natural end / skip-on-touch) — guard double-write.
// Cú 0 nảy deterministic: flick 2+ power 0 (không assist — config: 4.5+jitter ±0.4 < 5.2 luôn chìm).
// jsdom boot Phaser thật — mô hình wiring test T4.
// @vitest-environment jsdom
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { readFileSync } from 'node:fs';

// Stub 2D + FakeImage — nguyên văn mô hình T3/T4 wiring (checkInverseAlpha + ready gate).
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
import { OnboardingPlayScene } from '../../scenes/OnboardingPlayScene';
import { MECHANICS } from '../../config/mechanics';
import { ScriptedFlickProvider } from '../../logic/flickProvider';
import { EndCard } from '../EndCard'; // module MỚI T5 — RED: chưa tồn tại lúc viết test

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
  window.localStorage.clear();
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
      reject(new Error('scene boot timeout sau 15s'));
    }, ms);
    giveUp.unref?.();
  });
}

/** Thêm 1 scene MỚI (key duy nhất) — start=true → create() chạy NGAY theo storage hiện tại. */
function addScene(start: boolean): OnboardingPlayScene {
  const s = new OnboardingPlayScene(`OnboardingPlayScene#${++sceneSeq}`);
  game!.scene.add(s.sys.settings.key, s, start, { resume: false });
  return s;
}

/** Boot scene sạch: pause scene cũ → seed storage → boot mới. */
async function bootFresh(opts: { best: number | null; demoDone: boolean }): Promise<OnboardingPlayScene> {
  try { scene?.scene.pause(); } catch { /* scene đầu — chưa có gì để pause */ }
  window.localStorage.clear();
  if (opts.best !== null) window.localStorage.setItem('sk_best', String(opts.best));
  if (opts.demoDone) window.localStorage.setItem('sk_done', '1');
  const s = addScene(true);
  await waitBooted(s);
  scene = s;
  return s;
}

/** Duyệt display list 1 cấp (container con nằm trong .list). */
function allObjects(s: Phaser.Scene): Phaser.GameObjects.GameObject[] {
  const out: Phaser.GameObjects.GameObject[] = [];
  for (const o of s.children.list) {
    out.push(o);
    const list = (o as unknown as { list?: Phaser.GameObjects.GameObject[] }).list;
    if (Array.isArray(list)) out.push(...list);
  }
  return out;
}

function withTestid(s: Phaser.Scene, id: string): Phaser.GameObjects.GameObject[] {
  return allObjects(s).filter(
    (o) =>
      typeof (o as Phaser.GameObjects.GameObject & { getData?: (k: string) => unknown }).getData ===
        'function' &&
      (o as unknown as { getData: (k: string) => unknown }).getData('testid') === id,
  );
}

function endCardTexts(s: Phaser.Scene): Phaser.GameObjects.Text[] {
  return withTestid(s, 'end-card').filter(
    (o) => typeof (o as Phaser.GameObjects.Text).text === 'string',
  ) as Phaser.GameObjects.Text[];
}

/** Đuổi run hiện tại tới terminal + frame kế (applyRun + end-card render). */
function runToEnd(s: OnboardingPlayScene, t0: number): number {
  let f = 0;
  while (!s.getEngineForTest()!.finished && f < 7200) {
    s.updateForTest(t0 + f * 16, 16);
    f++;
  }
  s.updateForTest(t0 + f * 16 + 16, 16);
  return f;
}

/** Bắt mọi setItem (Storage.prototype — jsdom instance mất binding khi gán thẳng). */
function spySetItem(): { calls: string[]; restore: () => void } {
  const calls: string[] = [];
  const orig = Storage.prototype.setItem;
  const spy = vi
    .spyOn(Storage.prototype, 'setItem')
    .mockImplementation(function (this: Storage, k: string, v: string) {
      calls.push(k);
      orig.call(this, k, v);
    });
  return { calls, restore: () => spy.mockRestore() };
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
  await bootFresh({ best: 15, demoDone: true }); // scene nền — mỗi test bootFresh riêng
});

afterAll(() => {
  game?.destroy(true);
});

describe('T5 — EndCard overlay run end (CONTRACT 3.5, testid end-card)', () => {
  it('run 0 nảy chìm ngay: SPLASH! + 0 BOUNCES + gap AWAY FROM BEST + THROW AGAIN ≥44px nửa dưới', async () => {
    const s = await bootFresh({ best: 15, demoDone: true });
    // cú 1 (được assist Đ2) — run nào đó, kết thúc để mở khoá cú KHÔNG assist
    s.dispatchFlickForTest({ dirX: 0, dirZ: -1, power: 0.1 });
    runToEnd(s, 1000);
    // cú 2 power 0 — không assist, speed 4.5±0.4 < minSkipSpeed 5.2 → CHẮC CHÌM 0 nảy (config)
    s.dispatchFlickForTest({ dirX: 0, dirZ: -1, power: 0 });
    runToEnd(s, 4000);
    expect(s.getEngineForTest()!.bounces).toBe(0);
    const card = s.getEndCardForTest();
    expect(card).not.toBeNull();
    expect(card!.shown).toBe(true);
    // headline SPLASH! — 0 chữ FAIL-anywhere trong file (grep-cap test riêng)
    expect(card!.headlineText).toBe('SPLASH!');
    // stat "0 BOUNCES" vẫn hiện (0 nảy vẫn + SPLASH top)
    const texts = endCardTexts(s);
    expect(texts.length).toBeGreaterThanOrEqual(3); // headline + stat/gap + button
    const joined = texts.map((t) => t.text).join(' | ');
    expect(joined).toContain('0 BOUNCES');
    // best cũ 15 — gap theo điểm run: 15 − 0 = 15
    expect(joined).toContain('15 AWAY FROM BEST 15');
    // nút THROW AGAIN — text + target chạm ≥44px (touchTargetPx) + nửa dưới màn (thumb reach)
    expect(card!.buttonText).toBe('THROW AGAIN');
    expect(card!.buttonMinSidePx).toBeGreaterThanOrEqual(MECHANICS.touchTargetPx);
    expect(card!.buttonCenterY).toBeGreaterThanOrEqual(MECHANICS.canvas.height / 2);
    // testid end-card gắn trên mọi thành phần card (QA soi qua setData)
    expect(withTestid(s, 'end-card').length).toBeGreaterThanOrEqual(3);
  });

  it('phá kỷ lục: NEW BEST! (was M) + sk_best lưu đúng; run 0 nảy → AWAY FROM BEST; card ẨN khi thả cú mới', async () => {
    const s = await bootFresh({ best: 2, demoDone: true });
    // run 1: cú đầu (assist 0.6) — vài nảy, điểm > 2 → NEW BEST (was 2)
    s.dispatchFlickForTest({ dirX: 0, dirZ: -1, power: 0.1 });
    runToEnd(s, 1000);
    const n1 = s.getEngineForTest()!.bounces;
    const score1 = s.getLifecycleForTest().score;
    expect(n1).toBeGreaterThan(2); // assist 0.6 → nhiều hơn 2 nảy (speed ~10 >> 5.2)
    const card1 = s.getEndCardForTest()!;
    expect(card1.shown).toBe(true);
    expect(card1.headlineText).toBe(`${n1} BOUNCES`); // "N BOUNCES" to nhất — số khớp engine
    expect(endCardTexts(s).map((t) => t.text).join(' | ')).toContain(`NEW BEST! (was 2)`);
    expect(window.localStorage.getItem('sk_best')).toBe(String(score1)); // tầng A là chủ best
    // run 2: cú 2 power 0 → 0 nảy → SPLASH + gap AWAY (best giờ là score1)
    s.dispatchFlickForTest({ dirX: 0, dirZ: -1, power: 0 });
    expect(s.getEndCardForTest()!.shown).toBe(false); // thả cú mới → card tắt ngay
    runToEnd(s, 4000);
    expect(s.getEngineForTest()!.bounces).toBe(0);
    const card2 = s.getEndCardForTest()!;
    expect(card2.headlineText).toBe('SPLASH!');
    expect(endCardTexts(s).map((t) => t.text).join(' | ')).toContain(`${score1} AWAY FROM BEST ${score1}`);
    // run 3: cú B3 scripted (đúng đường judge tầng A) — PERFECT, phá lại kỷ lục
    const b3 = new ScriptedFlickProvider(MECHANICS).flickForBeat('B3');
    s.dispatchFlickForTest(b3);
    runToEnd(s, 8000);
    const engine = s.getEngineForTest()!;
    const lc = s.getLifecycleForTest();
    expect(lc.score).toBeGreaterThan(score1); // đã phá lại
    const card3 = s.getEndCardForTest()!;
    expect(card3.shown).toBe(true);
    expect(card3.headlineText).toBe(`${engine.bounces} BOUNCES`);
    expect(endCardTexts(s).map((t) => t.text).join(' | ')).toContain(`NEW BEST! (was ${score1})`);
    // best bền qua storage — runLifecycle là chủ (lifecycle CỘNG DỒN score qua run — best là max)
    expect(window.localStorage.getItem('sk_best')).toBe(String(lc.best));
    // HUD best cập nhật theo lifecycle
    const hudBest = withTestid(s, 'hud-best')[0] as Phaser.GameObjects.Text;
    expect(hudBest.text).toBe(`BEST ${lc.best}`);
  });

  it('edge lần đầu (không best cũ): run ĐẦU ĐỜI KHÔNG dòng gap; từ run 2 best đã tồn tại → gap theo best đó', async () => {
    const s = await bootFresh({ best: null, demoDone: true });
    s.dispatchFlickForTest({ dirX: 0, dirZ: -1, power: 0.1 });
    runToEnd(s, 1000);
    const n1 = s.getEngineForTest()!.bounces;
    const score1 = s.getLifecycleForTest().score;
    let joined = endCardTexts(s).map((t) => t.text).join(' | ');
    expect(joined).toContain(`${n1} BOUNCES`); // headline N BOUNCES (không SPLASH — có nảy)
    expect(joined).not.toContain('AWAY FROM BEST');
    expect(joined).not.toContain('NEW BEST');
    // run 2: best đã được run 1 chốt (tầng A) — KHÔNG còn edge; 0 nảy → SPLASH + gap theo best mới
    s.dispatchFlickForTest({ dirX: 0, dirZ: -1, power: 0 });
    runToEnd(s, 4000);
    joined = endCardTexts(s).map((t) => t.text).join(' | ');
    expect(joined).toContain('0 BOUNCES');
    expect(joined).toContain(`${score1} AWAY FROM BEST ${score1}`);
  });

  it('demo stage (B1/B2 hụt chìm) KHÔNG end-card — demo là không gian an toàn (CONTRACT 3.1 Đ3); sk_best không bẩn', async () => {
    const s = await bootFresh({ best: 5, demoDone: false }); // boot DEMO — lần đầu session
    expect(s.getStageForTest()).toBe('demo');
    // diễn tới 10.9s (trước B4 11s): B1 (2.0s) + B2 2 cú (4.0/6.0s) đã ném & kết thúc
    for (let t = 16; t / 1000 <= 10.9; t += 16) s.updateForTest(t, 16);
    expect(s.getEndCardForTest().shown).toBe(false);
    for (const o of withTestid(s, 'end-card')) {
      expect((o as Phaser.GameObjects.GameObject & { visible?: boolean }).visible).not.toBe(true);
    }
    expect(window.localStorage.getItem('sk_best')).toBe('5'); // demo không bẩn best
  });
});

describe('T5 — demo-once sk_done guard double-write (scene qua public interface logic/)', () => {
  it('sk_done sẵn từ trước → boot thẳng local, 0 lần ghi sk_done', async () => {
    const s = await bootFresh({ best: null, demoDone: true });
    const { calls, restore } = spySetItem();
    try {
      for (let i = 1; i <= 10; i++) s.updateForTest(i * 16, 16);
      expect(s.getStageForTest()).toBe('local');
      expect(calls.filter((k) => k === 'sk_done')).toHaveLength(0);
    } finally {
      restore();
    }
  });

  it('demo kết thúc tự nhiên 12s → sk_done ghi ĐÚNG 1 LẦN (director markDone + scene không double-write)', async () => {
    const s = await bootFresh({ best: null, demoDone: false });
    expect(s.getStageForTest()).toBe('demo');
    const { calls, restore } = spySetItem();
    try {
      for (let t = 16; t / 1000 <= 12.5; t += 16) s.updateForTest(t, 16);
      expect(s.getStageForTest()).toBe('local'); // đã trao tay
      expect(calls.filter((k) => k === 'sk_done')).toHaveLength(1);
    } finally {
      restore();
    }
  });

  it('skip-on-touch → sk_done vẫn ghi ĐÚNG 1 LẦN (finishDemo là chủ ghi đường skip)', async () => {
    const s = await bootFresh({ best: null, demoDone: false });
    expect(s.getStageForTest()).toBe('demo');
    const { calls, restore } = spySetItem();
    try {
      s.skipDemoForTest(); // chạm bất kỳ — cắt demo NGAY (CONTRACT 3.1)
      expect(s.getStageForTest()).toBe('local');
      expect(window.localStorage.getItem('sk_done')).toBe('1');
      expect(calls.filter((k) => k === 'sk_done')).toHaveLength(1);
    } finally {
      restore();
    }
  });
});

describe('T5 — nguồn text + ràng buộc PB-5 (grep-cap)', () => {
  it('wording từ MECHANICS.endCard (nguồn duy nhất — 0 hardcode rải); string literal 100% EN (PB-5)', () => {
    expect(MECHANICS.endCard.splash).toBe('SPLASH!');
    expect(MECHANICS.endCard.button).toBe('THROW AGAIN');
    expect(MECHANICS.endCard.splash).toMatch(/^[A-Z !]+$/);
    expect(MECHANICS.endCard.button).toMatch(/^[A-Z !]+$/);
    const src = readFileSync('src/ui/EndCard.ts', 'utf8');
    expect(src).toContain('MECHANICS.endCard');
    // PB-5 soi phần SHIP (string literal — comment tài liệu nội bộ không ship):
    const shipped = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(shipped).not.toContain('FAILED'); // headline fail bị thay — chữ không được tồn tại
    expect(shipped).not.toMatch(/[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i);
  });

  it('PlayScene chỉ show end-card khi stage local (grep-cap guard demo)', () => {
    const base = readFileSync('src/scenes/PlayScene.ts', 'utf8');
    expect(base).toContain('endCard.show');
    expect(base).toContain("this.stage !== 'local'");
  });
});
