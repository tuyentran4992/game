// ============================================================================
// tests/logic/helpers/dom-shim.ts — B3a (C2): cho phép test NODE dựng được scene
// Phaser thật (PlayScene/TitleScene) mà không cần jsdom/happy-dom (không có trong
// devDependencies, cấm cài thêm). File test phải import nó TRƯỚC khi import scene —
// ESM bảo đảm thứ tự evaluate, nên lúc phaser đọc `window`/`navigator` thì hai global
// đó đã tồn tại.
//
// PHẠM VI: đúng những gì module-init của phaser + một Scene KHÔNG có Game cần. Không
// có renderer, không canvas thật ⇒ test đo MÃNH CỦA SCENE (đăng ký rect QA, gate input,
// buffer cú bấm, lịch vẽ) với host giả dựng riêng cho từng it().
// ============================================================================

type Any = Record<string, unknown>

/** 2D context giả: mọi phép vẽ là no-op, số đo trả về giá trị trung tính. */
function ctx(): Any {
  const store: Any = {
    canvas: { width: 800, height: 600 },
    measureText: () => ({ width: 0 }),
    getImageData: (x: number, y: number, w: number, h: number) =>
      ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h, x, y }),
    createLinearGradient: () => ({ addColorStop: () => {} }),
    createRadialGradient: () => ({ addColorStop: () => {} }),
    createPattern: () => null,
    isPointInPath: () => false,
  }
  return new Proxy(store, {
    get: (t, k) => (k in t ? t[k as string] : () => {}),
    set: (t, k, v) => { t[k as string] = v; return true },
  })
}

/** Một "phần tử" giả: mọi getter DOM phổ biến đều có, mọi hàm đều no-op. */
export function fakeElement(): Any {
  const store: Any = {
    style: {},
    className: '',
    nodeType: 1,
    tagName: 'CANVAS',
    parentNode: null,
    parentElement: null,
    firstChild: null,
    lastChild: null,
    nextSibling: null,
    previousSibling: null,
    dataset: {},
    src: '',
    complete: true,
    naturalWidth: 800,
    naturalHeight: 600,
    // Phaser TextureSource đọc `source.compressed` để quyết định giữ image; Proxy ở dưới
    // trả HÀM cho mọi khoá lạ ⇒ 'compressed' thành truthy, image bị null, CanvasTexture nổ.
    compressed: false,
    width: 800,
    height: 600,
    children: [],
    appendChild: (c: unknown) => c,
    removeChild: (c: unknown) => c,
    insertBefore: (c: unknown) => c,
    setAttribute: () => {},
    getAttribute: () => null,
    removeAttribute: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
    querySelector: () => null,
    querySelectorAll: () => [],
    getBoundingClientRect: () => ({
      x: 0, y: 0, top: 0, left: 0, width: 800, height: 600, right: 800, bottom: 600,
    }),
    toDataURL: () => 'data:image/png;base64,',
    getContext: () => ctx(),
    focus: () => {},
    contains: () => false,
  }
  return new Proxy(store, {
    get: (t, k) => (k in t ? t[k as string] : () => {}),
    set: (t, k, v) => { t[k as string] = v; return true },
  })
}

/**
 * `new Image()` của Phaser: TextureManager.addBase64 gán `onload` RỒI mới gán `src`, và
 * `_pending` chỉ giảm khi onload chạy ⇒ ảnh giả PHẢI báo 'load' (vi diệu, sau một microtask)
 * nếu không thì `Game` boot mãi không xong.
 */
export class FakeImage {
  width = 8;
  height = 8;
  naturalWidth = 8;
  naturalHeight = 8;
  complete = true;
  onload: ((ev: { type: string; target: unknown }) => void) | null = null;
  onerror: ((ev: { type: string; target: unknown }) => void) | null = null;
  private readonly listeners = new Map<string, (ev: unknown) => void>();
  private source = '';

  set src(value: string) {
    this.source = value;
    queueMicrotask(() => {
      const done = { type: 'load', target: this };
      const handler = this.onload;
      if (handler) handler.call(this, done);
      const added = this.listeners.get('load');
      if (added) added(done);
    });
  }

  get src(): string { return this.source }

  addEventListener(type: string, cb: (ev: unknown) => void): void { this.listeners.set(type, cb) }

  removeEventListener(type: string): void { this.listeners.delete(type) }
}

const doc: Any = {
  documentElement: fakeElement(),
  head: fakeElement(),
  body: fakeElement(),
  readyState: 'complete',
  createElement: () => fakeElement(),
  createElementNS: () => fakeElement(),
  createTextNode: (t: string) => ({ nodeType: 3, textContent: t }),
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener: () => {},
  removeEventListener: () => {},
  hasFocus: () => true,
  visibilityState: 'visible',
  hidden: false,
}

const nav: Any = {
  userAgent: 'node-dom-shim',
  appVersion: '5.0',
  platform: 'node',
  language: 'en-US',
  languages: ['en-US'],
  vendor: '',
  standalone: false,
  onLine: true,
  maxTouchPoints: 0,
}

const win: Any = {
  document: doc,
  navigator: nav,
  location: { href: 'http://localhost/', search: '', hash: '', protocol: 'http:', host: 'localhost', pathname: '/' },
  devicePixelRatio: 1,
  innerWidth: 1280,
  innerHeight: 720,
  outerWidth: 1280,
  outerHeight: 720,
  screen: {
    width: 1280, height: 720, availWidth: 1280, availHeight: 720, colorDepth: 24,
    orientation: { type: 'landscape-primary', angle: 0, lock: () => Promise.resolve(false), addEventListener: () => {}, removeEventListener: () => {} },
  },
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => true,
  requestAnimationFrame: () => 0,
  cancelAnimationFrame: () => {},
  matchMedia: () => ({
    matches: false, addListener: () => {}, removeListener: () => {},
    addEventListener: () => {}, removeEventListener: () => {},
  }),
  getComputedStyle: () => ({ getPropertyValue: () => '' }),
  performance: (globalThis as Any).performance,
  Image: FakeImage,
}

const g = globalThis as unknown as Any
if (!g.window) g.window = win
if (!g.document) g.document = doc
if (!g.navigator) g.navigator = nav
if (!g.self) g.self = win
if (!g.screen) g.screen = win.screen
if (!g.location) g.location = win.location
if (!g.devicePixelRatio) g.devicePixelRatio = 1
if (!g.innerWidth) g.innerWidth = win.innerWidth
if (!g.innerHeight) g.innerHeight = win.innerHeight
if (!g.addEventListener) g.addEventListener = () => {}
if (!g.removeEventListener) g.removeEventListener = () => {}
if (!g.HTMLElement) g.HTMLElement = function FakeHTMLElement() { return fakeElement() }
if (!g.HTMLCanvasElement) g.HTMLCanvasElement = function FakeCanvas() { return fakeElement() }
// `Image` PHẢI là FakeImage (báo 'load' trên microtask) — TextureManager đếm _pending qua
// onload của ảnh base64, thiếu là Game không bao giờ READY.
g.Image = FakeImage
g.window = win
if (!g.document) g.document = doc
if (!g.requestAnimationFrame) g.requestAnimationFrame = win.requestAnimationFrame
if (!g.cancelAnimationFrame) g.cancelAnimationFrame = win.cancelAnimationFrame
if (!g.matchMedia) g.matchMedia = win.matchMedia
if (!g.performance) g.performance = win.performance

export {}
