// ============================================================================
// fakes.ts — ĐỒ GIẢ RIÊNG của tests/platform (pack B2 §8: không đụng tests/logic/helpers).
// KHÔNG PHẢI suite test (tên không khớp *.test.ts ⇒ vitest không thu).
//
// Vì sao tồn tại:
//  (1) PC-15 phải kiểm được ở cả ĐƯỜNG RUNTIME, không chỉ text ⇒ cần globalThis.fetch giả
//      GHI LẠI mọi lời gọi. Test không bao giờ gọi mạng thật (pack §7).
//  (2) vitest environment 'node' (pack §8): không window/document/Phaser ⇒ "vòng lặp màn" phải
//      dựng tay bằng đúng vài API adapter (storage.get/set, ads.show*).
//
// HỢP ĐỒNG KHÔNG BAO GIỜ ĐƯỢC KHAI LẠI Ở ĐÂY (A9 + A14): mọi tên kiểu — placement, outcome,
//   AdCallResult, ba mặt tiền adapter, hai từ vựng bridge, các khoá KV — đều NHẬP THẲNG từ
//   src/platform. Đổi `src/platform/types.ts` mà đồ giả không theo kịp là TSC ĐỎ, không phải
//   "test vẫn xanh rồiProduction lệch lúc nào không hay". Bề mặt hàm của adapter cũng DẪN XUẤT
//   từ đúng ba interface đó (SURFACE + SURFACE_COMPLETE) ⇒ không còn danh sách tự chế.
// RÀNG BUỘC: 0 import src/logic (không lấy luật/oracle), 0 SDK thật, 0 mạng (PC-15),
//   0 window/document (vitest environment node) — bridge chỉ là object thường, muốn chứng minh
//   adapter đọc global LAZY thì cài lên globalThis bằng installPlatformGlobal.
// ============================================================================

import type {
  AdOutcome,
  AdPlacement,
  PlatformAdapter,
  PlatformAds,
  PlatformLifecycle,
  PlatformStorage,
  RewardedPlacement,
} from '../../../src/platform/types';
import { SAVE_STORAGE_KEYS } from '../../../src/platform/types';
import type {
  PlaygamaAdEvent,
  PlaygamaInterstitialEvent,
} from '../../../src/platform/playgamaAdapter';
import type {
  YtgameAdEvent,
  YtgameInterstitialEvent,
} from '../../../src/platform/ytgameAdapter';

/** Khoá save chính (DATA-MODEL §1.2) — dòng ĐẦU của bảng khoá thật trong src/platform (A9). */
export const SAVE_KEY = SAVE_STORAGE_KEYS[0];

/** Từ vựng bridge — NHẬP từ file adapter sở hữu nó, không khai lại (A9). */
export type { PlaygamaAdEvent, PlaygamaInterstitialEvent, YtgameAdEvent, YtgameInterstitialEvent };

/**
 * Vòng lặp màn dùng lại HÌNH ADAPTER + placement ở PHẦN B2 NỬA ĐẦU phía dưới (AnyAdapter ·
 * REWARDED_PLACEMENTS · PortAds) — một hợp đồng duy nhất cho cả tests/platform, không khai
 * song song hai kiểu adapter. 4 placement: DATA-MODEL §5.1; khoá storage: DATA-MODEL §1.2.
 */

/** Máy ghi lời gọi fetch + hàm trả lại global thật. */
export type FetchRecorder = {
  readonly called: string[];
  restore(): void;
};

/**
 * Thay globalThis.fetch bằng hàm GHI LẠI rồi NÉM (ghi im lặng sẽ cho luồng chạy tiếp mà
 * không ai thấy). Không giữ đường ra mạng thật.
 */
export function installFetchRecorder(): FetchRecorder {
  const host = globalThis as { fetch?: unknown };
  const original = host.fetch;
  const called: string[] = [];
  host.fetch = (input: unknown): never => {
    called.push(String(input));
    throw new Error('PC-15: game offline, cam goi fetch luc chay');
  };
  return {
    called,
    restore(): void {
      host.fetch = original;
    },
  };
}

/**
 * Chạy `times` lượt vòng lặp màn trên adapter: đọc save → xin rewarded ad → cất save →
 * interstitial ranh giới. KHÔNG viết nhánh "if (co ads)" — Null Object tự trả unavailable.
 */
export async function runScreenLoops(adapter: AnyAdapter, times: number): Promise<void> {
  for (let i = 0; i < times; i += 1) {
    const before = adapter.storage.get(SAVE_KEY);
    await adapter.ads.showRewarded(REWARDED_PLACEMENTS[i % REWARDED_PLACEMENTS.length]);
    adapter.storage.set(SAVE_KEY, before === null ? '' : before);
    await adapter.ads.showInterstitial();
  }
}

// ============================================================================
// PHẦN B2 NỬA ĐẦU (adapter + Null Object) — fake bridge 2 nền tảng + máy ghi THỨ TỰ
// lời gọi + driver phiên 5 màn. Tên ở đây KHÔNG trùng các khai báo phía trên.
// RÀNG BUỘC: 0 import src/logic (không lấy luật/oracle), 0 SDK thật, 0 mạng (PC-15),
//   0 window/document (vitest environment node) — bridge chỉ là object thường, muốn
//   chứng minh adapter đọc global LAZY thì cài lên globalThis bằng installPlatformGlobal.
// Nguồn tên: pack B2 §1 (khoá storage DATA-MODEL §1.2, placement rewarded §5.1),
//   §4 (adapter ghi lại mọi lời gọi theo thứ tự), §8 (đọc global lúc gọi).
// ============================================================================

export type BridgeCall = { readonly method: string; readonly args: readonly string[] };

/**
 * Placement · outcome · kết quả ad · hình adapter: NHẬP THẲNG từ src/platform (A9 — "một sự
 * thật một nơi"). Đổi types.ts là TSC đỏ ở đây, không phải im lặng chạy tiếp bằng bản copy.
 * REWARDED_PLACEMENTS là DỮ LIỆU test (bảng 4 điểm để lặp), KIỂU phần tử lấy từ src.
 */
export type { AdCallResult, AdOutcome, AdPlacement, RewardedPlacement } from '../../../src/platform/types';
export { PLATFORM_STORAGE_KEYS, SAVE_STORAGE_KEYS } from '../../../src/platform/types';

export const REWARDED_PLACEMENTS: readonly RewardedPlacement[] = ['undo', 'hint', 'continue', 'ink_x2'];

export type PlatformGlobalName = 'Playgama' | 'ytgame';
export type LifecycleSignal = 'pause' | 'resume' | 'audio_enabled';

/** Ba mặt tiền + adapter: đúng MỘT kiểu duy nhất, là kiểu mà src/platform đã export (A9). */
export type PortStorage = PlatformStorage;
export type PortAds = PlatformAds;
export type PortLifecycle = PlatformLifecycle;
export type AnyAdapter = PlatformAdapter;

/**
 * BỀ MẶT HÀM DẪN XUẤT (A14) — không còn danh sách ai tự chép tay:
 *  · `SURFACE` liệt kê tên hàm THEO TỪNG mặt tiền; mọi chữ phải là hàm của interface thật
 *    (FunctionKeys) ⇒ xoá/đổi tên hàm trong src mà không sửa đây là TSC ĐỎ.
 *  · `SURFACE_COMPLETE` kiểm CHIỀU NGƯỢC: interface CÓ thêm hàm mà danh sách chưa có ⇒ TSC ĐỎ
 *    (cái mà bản cũ so-by-string không bao giờ bắt được).
 *  · adapterSurface() so danh sách này với CHÍNH object adapter lúc chạy ⇒ adapter thừa/thiếu
 *    method là ĐỎ, kể cả khi nó qua được kiểm tra kiểu (host tiêm object lạ).
 */
type FunctionKeys<T> = {
  [K in keyof T]-?: T[K] extends (...args: never[]) => unknown ? K : never;
}[keyof T];

const SURFACE = {
  storage: ['get', 'set'],
  ads: ['showRewarded', 'showInterstitial'],
  lifecycle: ['onPause', 'onResume', 'onMute', 'mute', 'isMuted'],
} as const satisfies {
  [P in keyof PlatformAdapter]: readonly FunctionKeys<PlatformAdapter[P]>[];
};

/** Ba mặt tiền của PlatformAdapter — đúng ba khoá của interface, không tự thêm tên. */
const SURFACE_PARTS = ['storage', 'ads', 'lifecycle'] as const satisfies readonly (keyof PlatformAdapter)[];

/** never nếu danh sách phủ ĐỦ interface; lỗi gán true ⇔ types.ts vừa có thêm hàm. */
type SurfaceGaps = {
  [P in keyof PlatformAdapter]: Exclude<FunctionKeys<PlatformAdapter[P]>, (typeof SURFACE)[P][number]>;
};
export const SURFACE_COMPLETE: { [P in keyof SurfaceGaps]: [SurfaceGaps[P]] extends [never] ? true : never } = {
  storage: true,
  ads: true,
  lifecycle: true,
};

/** 'storage.get' · 'ads.showRewarded' · … — dẫn xuất từ SURFACE, không phải chữ tự gõ. */
export const ADAPTER_METHODS: readonly string[] = SURFACE_PARTS
  .flatMap((part) => SURFACE[part].map((name) => part + '.' + name))
  .sort();

/** Đếm MỌI hàm trên ba mặt tiền của một adapter lúc chạy (property dữ liệu như `faults` không tính). */
export function adapterSurface(adapter: AnyAdapter): string[] {
  const out: string[] = [];
  for (const part of SURFACE_PARTS) {
    const group = adapter[part] as unknown as Record<string, unknown>;
    for (const fn of Object.keys(group)) {
      if (typeof group[fn] === 'function') out.push(part + '.' + fn);
    }
  }
  return out.sort();
}

/**
 * Promise ad phải settle trong microtask — KHÔNG hẹn giờ, KHÔNG treo (TC-SAO-01, TC-AD-07).
 * Trả đúng giá trị hoặc 'PENDING' nếu sang tới macrotask mà chưa settle.
 */
export async function settlesImmediately<T>(promise: Promise<T>): Promise<T | 'PENDING'> {
  const marker = new Promise<'PENDING'>((resolve) => {
    setTimeout(() => resolve('PENDING'), 0);
  });
  return Promise.race([promise, marker]);
}

export function installPlatformGlobal(name: PlatformGlobalName, value: unknown): void {
  (globalThis as Record<string, unknown>)[name] = value;
}
export function clearPlatformGlobal(name: PlatformGlobalName): void {
  delete (globalThis as Record<string, unknown>)[name];
}

type HandlerLists = Map<LifecycleSignal, Array<(payload: boolean) => void>>;

function makeFakeInternals() {
  const calls: BridgeCall[] = [];
  const store = new Map<string, string>();
  const emitted: string[] = [];
  const throwOnWrite = new Set<string>();
  const handlers: HandlerLists = new Map<LifecycleSignal, Array<(payload: boolean) => void>>();
  const record = (method: string, args: readonly string[]): void => {
    calls.push({ method, args });
  };
  // Callback lưu theo kiểu (payload: boolean) => void: onPause/onResume () => void vẫn gán được
  // (ít tham số hơn), còn listener audio_enabled nhận đúng boolean từ emit() bên dưới.
  const subscribe = (signal: LifecycleSignal, method: string, cb: (payload: boolean) => void): void => {
    record(method, []);
    const list = handlers.get(signal) ?? [];
    list.push(cb);
    handlers.set(signal, list);
  };
  const emit = (signal: LifecycleSignal, payload?: unknown): void => {
    emitted.push(signal);
    for (const cb of handlers.get(signal) ?? []) cb(payload as boolean);
  };
  const read = (key: string): string | null => (store.has(key) ? (store.get(key) as string) : null);
  return { calls, store, emitted, throwOnWrite, record, subscribe, emit, read };
}

function methodsWith(calls: BridgeCall[], prefix: string): string[] {
  return calls.filter((c) => c.method.startsWith(prefix)).map((c) => c.method);
}
function argsOf(calls: BridgeCall[], prefix: string): string[][] {
  return calls.filter((c) => c.method.startsWith(prefix)).map((c) => [...c.args]);
}

/**
 * Đồ giả của bridge Playgama. Từ vựng sự kiện là của src/platform/playgamaAdapter (A9) và
 * BRIDGE_LOCK bên dưới bắt PlaygamaFake khớp ĐÚNG hình PlaygamaBridge — khai thiếu một cửa là
 * TSC đỏ, không cần chờ chạy test.
 */
export type PlaygamaFake = {
  readonly calls: BridgeCall[];
  readonly store: Map<string, string>;
  readonly emitted: string[];
  throwOnWrite: Set<string>;
  methodsWith(prefix: string): string[];
  callsWith(prefix: string): string[][];
  emit(signal: LifecycleSignal, payload?: unknown): void;
  readonly storage: {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
  };
  readonly ads: {
    showRewardedVideo(place: string, cb: (event: PlaygamaAdEvent) => void): void;
    showInterstitial(cb: (event: PlaygamaInterstitialEvent) => void): void;
  };
  readonly lifecycle: {
    onPause(cb: () => void): void;
    onResume(cb: () => void): void;
    onAudioEnabledChange(cb: (enabled: boolean) => void): void;
    setAudioEnabled(on: boolean): void;
  };
};

export function fakePlaygamaBridge(options: { readonly rewardedEvent?: PlaygamaAdEvent } = {}): PlaygamaFake {
  const internals = makeFakeInternals();
  const rewardedEvent = options.rewardedEvent ?? 'rewarded';
  return {
    calls: internals.calls,
    store: internals.store,
    emitted: internals.emitted,
    throwOnWrite: internals.throwOnWrite,
    methodsWith: (prefix) => methodsWith(internals.calls, prefix),
    callsWith: (prefix) => argsOf(internals.calls, prefix),
    emit: internals.emit,
    storage: {
      getItem(key) {
        internals.record('storage.getItem', [key]);
        return internals.read(key);
      },
      setItem(key, value) {
        internals.record('storage.setItem', [key, value]);
        if (internals.throwOnWrite.has(key)) throw new Error('playgama quota exceeded ' + key);
        internals.store.set(key, value);
      },
    },
    ads: {
      showRewardedVideo(place, cb) {
        internals.record('ads.showRewardedVideo', [place]);
        cb(rewardedEvent);
      },
      showInterstitial(cb) {
        internals.record('ads.showInterstitial', []);
        cb('shown');
      },
    },
    lifecycle: {
      onPause: (cb) => internals.subscribe('pause', 'lifecycle.onPause', cb),
      onResume: (cb) => internals.subscribe('resume', 'lifecycle.onResume', cb),
      onAudioEnabledChange: (cb) => internals.subscribe('audio_enabled', 'lifecycle.onAudioEnabledChange', cb),
      setAudioEnabled(on) {
        internals.record('lifecycle.setAudioEnabled', [String(on)]);
      },
    },
  };
}

/** Đồ giả của bridge ytgame — từ vựng sự kiện NHẬP từ src/platform/ytgameAdapter (A9). */
export type YtgameFake = {
  readonly calls: BridgeCall[];
  readonly store: Map<string, string>;
  readonly emitted: string[];
  throwOnWrite: Set<string>;
  methodsWith(prefix: string): string[];
  callsWith(prefix: string): string[][];
  emit(signal: LifecycleSignal, payload?: unknown): void;
  readonly data: {
    loadData(key: string, cb: (value: string | null) => void): void;
    dataSave(key: string, value: string, cb: (ok: boolean) => void): void;
  };
  readonly ad: {
    showRewarded(place: string, cb: (event: YtgameAdEvent) => void): void;
    showInterstitial(cb: (event: 'shown' | 'error') => void): void;
  };
  onPause(cb: () => void): void;
  onResume(cb: () => void): void;
  onAudioEnabledChange(cb: (enabled: boolean) => void): void;
  mute(on: boolean): void;
};

export function fakeYtgameBridge(
  options: { readonly rewardedEvent?: YtgameAdEvent; readonly saveOk?: boolean } = {},
): YtgameFake {
  const internals = makeFakeInternals();
  const rewardedEvent = options.rewardedEvent ?? 'reward';
  const saveOk = options.saveOk ?? true;
  return {
    calls: internals.calls,
    store: internals.store,
    emitted: internals.emitted,
    throwOnWrite: internals.throwOnWrite,
    methodsWith: (prefix) => methodsWith(internals.calls, prefix),
    callsWith: (prefix) => argsOf(internals.calls, prefix),
    emit: internals.emit,
    data: {
      // HỢP ĐỒNG: storage.get của adapter là ĐỒNG BỘ ⇒ bridge phải trả ngay trong lượt gọi
      // (fake mồi callback luôn sync). Adapter không được chờ promise ở đây.
      loadData(key, cb) {
        internals.record('data.loadData', [key]);
        cb(internals.read(key));
      },
      dataSave(key, value, cb) {
        internals.record('data.dataSave', [key, value]);
        if (internals.throwOnWrite.has(key)) throw new Error('ytgame storage unavailable ' + key);
        if (!saveOk) {
          cb(false); // nền tảng từ chối ghi — TC-SAV-07
          return;
        }
        internals.store.set(key, value);
        cb(true);
      },
    },
    ad: {
      showRewarded(place, cb) {
        internals.record('ad.showRewarded', [place]);
        cb(rewardedEvent);
      },
      showInterstitial(cb) {
        internals.record('ad.showInterstitial', []);
        cb('shown');
      },
    },
    onPause: (cb) => internals.subscribe('pause', 'onPause', cb),
    onResume: (cb) => internals.subscribe('resume', 'onResume', cb),
    onAudioEnabledChange: (cb) => internals.subscribe('audio_enabled', 'onAudioEnabledChange', cb),
    mute(on) {
      internals.record('mute', [String(on)]);
    },
  };
}

/** Máy ghi ở CỬA ADAPTER: mọi lời gọi đi qua interface, theo thứ tự (tinh thần MockAds nhóm F). */
export function recordAdapterCalls(base: AnyAdapter): { readonly adapter: AnyAdapter; readonly calls: BridgeCall[] } {
  const calls: BridgeCall[] = [];
  const adapter: AnyAdapter = {
    storage: {
      faults: base.storage.faults,
      get(key) {
        calls.push({ method: 'storage.get', args: [key] });
        return base.storage.get(key);
      },
      set(key, value) {
        calls.push({ method: 'storage.set', args: [key] });
        base.storage.set(key, value);
      },
    },
    ads: {
      showRewarded(place) {
        calls.push({ method: 'ads.showRewarded', args: [place] });
        return base.ads.showRewarded(place);
      },
      showInterstitial() {
        calls.push({ method: 'ads.showInterstitial', args: [] });
        return base.ads.showInterstitial();
      },
    },
    lifecycle: {
      onPause(handler) {
        calls.push({ method: 'lifecycle.onPause', args: [] });
        base.lifecycle.onPause(handler);
      },
      onResume(handler) {
        calls.push({ method: 'lifecycle.onResume', args: [] });
        base.lifecycle.onResume(handler);
      },
      onMute(handler) {
        calls.push({ method: 'lifecycle.onMute', args: [] });
        base.lifecycle.onMute(handler);
      },
      mute(on) {
        calls.push({ method: 'lifecycle.mute', args: [String(on)] });
        base.lifecycle.mute(on);
      },
      isMuted() {
        calls.push({ method: 'lifecycle.isMuted', args: [] });
        return base.lifecycle.isMuted();
      },
    },
  };
  return { adapter, calls };
}

/** Lưu MẤT hẳn (đọc + ghi đều ném) — storage chết giữa phiên, ẩn danh (TC-NET-04/TC-ERR-10). */
export function withDeadStorage(base: AnyAdapter, keys: readonly string[]): AnyAdapter {
  const dead = new Set(keys);
  return {
    ...base,
    storage: {
      faults: base.storage.faults,
      get(key) {
        if (dead.has(key)) throw new Error('storage dead ' + key);
        return base.storage.get(key);
      },
      set(key, value) {
        if (dead.has(key)) throw new Error('storage dead ' + key);
        base.storage.set(key, value);
      },
    },
  };
}

// ---------------------------------------------------------------- driver phiên 5 màn (TC-SAO-02)
/** Đáp án đúng TỰ CHỐT trong test (không lấy từ src/logic): màn thứ i (0-based) là ô này. */
export const CORRECT_OPTION_BY_LEVEL: readonly number[] = [2, 0, 3, 1, 2];

/** SaveV1 do driver dựng — 1 object JSON duy nhất, không chứa nội dung đề (TC-GEN-03). */
export function buildSaveV1(progressN: number, starsByLevel: Record<string, number>): Record<string, unknown> {
  return {
    version: 1,
    progress: { n: progressN, stars: { ...starsByLevel } },
    ink: progressN * 10,
    ownedSkins: ['plain'],
    activeSkin: 'plain',
    album: [],
    badges: [],
    ghost: {},
    streak: { day: 1 },
    top5: [],
    masterUnlocked: false,
  };
}

export type SessionTrace = {
  states: string[];
  levelsPlayed: number[];
  starsByLevel: Record<string, number>;
  logEvents: string[];
  adRequests: { place: AdPlacement; status: AdOutcome }[];
  saveAttempts: string[];
  errors: string[];
};

/**
 * Kịch bản boot -> màn 1 -> chọn đúng -> next, `levels` màn, CHỈ nói chuyện qua interface adapter.
 * Không có nhánh "if (có ad)" ở đây — Null Object tự trả unavailable (pack §3).
 * Storage ném giữa đường thì phiên vẫn chạy hết và ghi lỗi vào trace (tinh thần TC-NET-04).
 */
export async function runScriptedSession(adapter: AnyAdapter, levels: number): Promise<SessionTrace> {
  const trace: SessionTrace = {
    states: [],
    levelsPlayed: [],
    starsByLevel: {},
    logEvents: [],
    adRequests: [],
    saveAttempts: [],
    errors: [],
  };
  const read = (key: string): string | null => {
    trace.saveAttempts.push('get:' + key);
    try {
      return adapter.storage.get(key);
    } catch (error) {
      trace.errors.push('read ' + key);
      return null;
    }
  };
  const write = (key: string, value: string): void => {
    trace.saveAttempts.push('set:' + key);
    try {
      adapter.storage.set(key, value);
    } catch (error) {
      trace.errors.push('write ' + key);
    }
  };

  trace.states.push('boot');
  read('m11.save');
  write('m11.wardrobe', JSON.stringify({ activeSkin: 'plain', ownedSkins: ['plain'] }));

  const log: string[] = [];
  const logEvent = (name: string): void => {
    log.push(name);
    trace.logEvents.push(name);
    write('m11.log', JSON.stringify(log));
  };
  logEvent('session_start');

  for (let i = 0; i < levels; i += 1) {
    const level = i + 1;
    trace.states.push('ready');
    trace.levelsPlayed.push(level);
    const picked = CORRECT_OPTION_BY_LEVEL[i % CORRECT_OPTION_BY_LEVEL.length];
    trace.states.push('answered');
    trace.states.push(picked === CORRECT_OPTION_BY_LEVEL[i % CORRECT_OPTION_BY_LEVEL.length] ? 'correct' : 'wrong');
    trace.starsByLevel[String(level)] = 3;

    if (level === 2) {
      const result = await adapter.ads.showRewarded('undo');
      trace.adRequests.push({ place: result.place, status: result.status });
      logEvent(result.status === 'granted' ? 'undo_granted' : 'undo_unavailable');
    }

    trace.states.push('next');
    const save = JSON.stringify(buildSaveV1(level, trace.starsByLevel));
    write('m11.save', save);
    write('m11.save.good', save);
    logEvent('level_complete');

    if (i < levels - 1) {
      const inter = await adapter.ads.showInterstitial();
      trace.adRequests.push({ place: inter.place, status: inter.status });
    }
  }
  logEvent('session_end');
  return trace;
}
