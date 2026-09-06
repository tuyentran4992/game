/**
 * M7 Skip King — onboarding (TẦNG A thuần thời gian — CONTRACT 3.1): beats B0–B4.
 * Scene (tầng B) CHỈ DIỄN — mọi thời điểm/cú demo/banner qua public interface này.
 * Cú demo lấy NGUYÊN BẢN từ ScriptedFlickProvider (cùng schema sim, KHÔNG qua assist Đ2).
 * Demo CHỈ chạy lần đầu session — sk_done qua storage inject (test được, không đụng DOM).
 * 0 import Phaser/DOM.
 */
import type { FlickInput } from './types';
import { BEST_KEY_DEFAULT } from './runLifecycle';

/** Key localStorage demo-once (CONTRACT 3.1: demo marker `sk_done`). */
export const DEMO_DONE_KEY = 'sk_done';

export type OnboardingBeat = 'B0' | 'B1' | 'B2' | 'B3' | 'B4';

export interface DemoFlickSource {
  /** Cú demo nguyên bản cho 1 beat (B1/B2/B3 — schema FlickInput K4×V1). */
  flickForBeat(beat: 'B1' | 'B2' | 'B3'): FlickInput;
}

export interface DemoUpdate {
  beat: OnboardingBeat;
  /** Cú demo cần ném ở mốc thời gian này — null = không có cú mới. */
  flick: FlickInput | null;
  /** Text banner cần hiện — null = giữ nguyên/không banner. */
  banner: string | null;
  /** Sweet-zone highlight (U2) — CHỈ true trong demo. */
  sweetZone: boolean;
  /** Slow-mo 0.4× (CONTRACT §2) — true khi bước vào B3. */
  slowmo: boolean;
  /** Demo kết thúc (hết 12s hoặc skip-on-touch). */
  done: boolean;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Demo đã xem trong session này chưa (đọc storage inject). */
export function isDemoDone(storage: StorageLike): boolean {
  return storage.getItem(DEMO_DONE_KEY) !== null;
}

/** Mốc thời gian beat (s — CONTRACT 3.1 bảng beat). */
const T_B1_S = 1.5;
const T_B2_S = 4.0;
const T_B3_S = 8.0;
const T_B4_S = 11.0;
const T_DONE_S = 12.0;
/** Cú B1 bắn sớm hơn biên beat 0.5s để plop ĐẦU (nảy đầu B1 ≤0.4s) chạm trong ≤3s session. */
const T_B1_FLICK_S = 2.0;
const T_B2_FLICK_1_S = 4.0;
const T_B2_FLICK_2_S = 6.0;
const T_B3_FLICK_S = 8.0;

export const ONBOARDING_TOTAL_S = T_DONE_S;

export class OnboardingDirector {
  private t = 0;
  private idxB2 = 0;
  private fired = { b1: false, b2: 0, b3: false };
  private doneFlag: boolean;

  constructor(
    private demo: DemoFlickSource,
    private storage: StorageLike,
  ) {
    this.doneFlag = isDemoDone(storage);
  }

  get done(): boolean {
    return this.doneFlag;
  }

  /** Skip-on-touch — cắt NGAY (CONTRACT 3.1), storage (constructor) ghi sk_done. */
  skip(): void {
    this.doneFlag = true;
    this.markDone();
  }

  /**
   * Bước thời gian demo — trả trạng thái beat hiện tại cho scene diễn.
   * tNow = thời gian session TUYỆT ĐỐI (s — scene truyền time.now/1000; monotonic).
   * Storage demo-once lấy từ constructor — ĐÚNG 1 nguồn (scene/director không lan truyền flag).
   */
  update(tNow: number): DemoUpdate {
    this.t = Math.max(this.t, tNow);
    if (this.doneFlag) {
      return { beat: 'B4', flick: null, banner: null, sweetZone: false, slowmo: false, done: true };
    }
    if (this.t >= T_DONE_S) {
      this.doneFlag = true;
      this.markDone();
      return { beat: 'B4', flick: null, banner: null, sweetZone: false, slowmo: false, done: true };
    }
    return this.stateFor(this.t);
  }
  private stateFor(t: number): DemoUpdate {
    // Mỗi beat trả đúng 1 trạng thái; cú demo bắn đúng 1 lần tại mốc (fired flags).
    if (t < T_B1_S) {
      return { beat: 'B0', flick: null, banner: 'SKIP KING / FLICK TO SKIP', sweetZone: false, slowmo: false, done: false };
    }
    if (t < T_B2_S) {
      return {
        beat: 'B1',
        flick: !this.fired.b1 && t >= T_B1_FLICK_S ? this.take('B1', 'b1') : null,
        banner: null,
        sweetZone: this.fired.b1, // highlight sweet zone CHỈ demo (U2) — bật sau cú B1
        slowmo: false,
        done: false,
      };
    }
    if (t < T_B3_S) {
      const due = (t >= T_B2_FLICK_1_S && this.fired.b2 === 0) || (t >= T_B2_FLICK_2_S && this.fired.b2 === 1);
      return {
        beat: 'B2',
        flick: due ? this.take('B2', 'b2') : null,
        banner: null,
        sweetZone: false,
        slowmo: false,
        done: false,
      };
    }
    if (t < T_B4_S) {
      return {
        beat: 'B3',
        flick: !this.fired.b3 ? this.take('B3', 'b3') : null,
        banner: null, // banner 2 dòng do scene hiện khi combo PERFECT — beat chỉ báo slow-mo
        sweetZone: true,
        slowmo: true,
        done: false,
      };
    }
    return { beat: 'B4', flick: null, banner: 'YOUR TURN', sweetZone: false, slowmo: false, done: false };
  }

  private take(beat: 'B1' | 'B2' | 'B3', slot: 'b1' | 'b2' | 'b3'): FlickInput {
    if (slot === 'b1') this.fired.b1 = true;
    else if (slot === 'b2') this.fired.b2++;
    else this.fired.b3 = true;
    return { ...this.demo.flickForBeat(beat) }; // NGUYÊN BẢN — không assist (CONTRACT §3)
  }

  private markDone(): void {
    this.storage.setItem(DEMO_DONE_KEY, '1');
  }
}

/** Re-export để scene/test 1 nguồn key best — không hardcode chuỗi 'sk_best' nơi khác. */
export { BEST_KEY_DEFAULT };
