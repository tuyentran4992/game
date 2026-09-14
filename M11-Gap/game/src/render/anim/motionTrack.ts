// Pattern: Data Table + pure sampler (TIẾN TRÌNH của hoạt cảnh giấy)
// TRÁCH NHIỆM: trả lời "ở mili-giây thứ t, tờ giấy đang ở tư thế nào" ra MỘT bản giá trị
//   (MotionFrame) để tầng vẽ tô lại từ đầu. Lý do KHÔNG dùng tween của Phaser: đo thật bằng
//   test headless (20 khung hình -> plain.v vẫn 1, onComplete 0 lần, trong khi UPDATE/TimerEvents
//   ăn đủ 20 nhịp) cho thấy TweenManager của bản Phaser này không chạy theo nhịp vòng lặp.
//   Hệ quả đúng như Playwright ghi: state đã nhảy tới đích, hình đứng im (0 px đổi suốt 1,2s).
//   Ở đây giá trị là HÀM THUẦN CỦA t nên mỗi khung là một tư thế khác nhau — nội suy thật.
// MỘT NGUỒN SỐ: mọi mốc ms lấy từ anim/unfoldPlan (foldInPlan / unfoldPlan / holePlan / DUR),
//   file này không khai lại con số ms nào (E2).
// RÀNG BUỘC: module THUẦN — không import phaser, không đồng hồ, không ngẫu nhiên (PC-B-04:
//   cùng (script, ms) là cùng frame); không phán quyết đúng/sai, không sinh điểm.

import { DUR, foldInPlan, holePlan, unfoldPlan } from './unfoldPlan';

/**Token cong thời gian — thêm token là thêm một dòng bảng, không thêm if. */
type EaseKind = 'linear' | 'easeOut';

const EASES: Readonly<Record<EaseKind, (t: number) => number>> = {
  linear: (t) => t,
  easeOut: (t) => 1 - (1 - t) * (1 - t) * (1 - t),
};

/** Đường cong ease-out chung — ai cần một giá trị nội suy riêng (trượt màn) dùng lại cái này. */
export const easeOut: (t: number) => number = EASES.easeOut;


/**Một bậc đổi giá trị: từ `from` tới `to`, bắt đầu ở `atMs`, dài `durMs` (0 = snap). */
type Leg = {
  readonly atMs: number;
  readonly durMs: number;
  readonly from: number;
  readonly to: number;
  readonly ease: EaseKind;
};

const mkLeg = (atMs: number, durMs: number, from: number, to: number, ease: EaseKind = 'easeOut'): Leg =>
  ({ atMs, durMs, from, to, ease });

/**Tư thế của cả tờ giấy tại một thời điểm — tầng vẽ ĐỌC Y, không suy ra từ đâu khác. */
export type MotionFrame = {
  /**Tiến trình mở của từng lớp: 0 = chồng khít lên gói giấy, 1 = mở hẳn. */
  layers: number[];
  /**Tiến trình hiện của từng lỗ: 0 = chưa thò, 1 = lỗ đầy đủ. */
  holes: number[];
  /**0 = mũi đục chưa xuống; 1 = lỗ + vết cắt hiện đủ. */
  reveal: number;
  /**Vệt giải thích: -1 = ẩn, 0..1 = vị trí quét ngang tờ giấy. */
  band: number;
  /**Alpha của nháy hoà lẫn lúc kết thúc bản giải thích. */
  flash: number;
};

type Writer = (frame: MotionFrame, value: number) => void;

export function blankFrame(layers: number, holes: number): MotionFrame {
  return {
    layers: new Array<number>(layers).fill(0),
    holes: new Array<number>(holes).fill(0),
    reveal: 0,
    band: -1,
    flash: 0,
  };
}

const layerWriter = (i: number): Writer => (f, v) => { f.layers[i] = v; };
const holeWriter = (j: number): Writer => (f, v) => { f.holes[j] = v; };
const revealWriter: Writer = (f, v) => { f.reveal = v; };
const bandWriter: Writer = (f, v) => { f.band = v; };
const flashWriter: Writer = (f, v) => { f.flash = v; };

/**Một kênh của frame: biết ghi đúng ô của nó + phần đổi giá trị theo thời gian. */
type Chan = { readonly write: Writer; readonly from: number; readonly legs: readonly Leg[] };

const chan = (write: Writer, from: number, legs: readonly Leg[]): Chan => ({ write, from, legs });

/**Một nhịp của hoạt cảnh: tổng thời lượng + các kênh giá trị của nó. */
export type MotionTrack = { readonly totalMs: number; readonly chans: readonly Chan[] };

const endOfLegs = (legs: readonly Leg[]): number => legs.reduce((m, l) => Math.max(m, l.atMs + l.durMs), 0);

export function track(chans: readonly Chan[]): MotionTrack {
  return { totalMs: chans.reduce((m, c) => Math.max(m, endOfLegs(c.legs)), 0), chans };
}

function valueOf(c: Chan, ms: number): number {
  let cur = c.from;
  for (const l of c.legs) {
    if (ms < l.atMs) break;
    const t = l.durMs <= 0 ? 1 : (ms - l.atMs) / l.durMs;
    cur = t >= 1 ? l.to : l.from + (l.to - l.from) * EASES[l.ease](t);
    if (t < 1) break;
  }
  return cur;
}

/**
 * Bôi một nhịp xuống frame tại `ms`. Kênh nào nhịp đó KHÔNG nói tới thì giữ nguyên giá trị cũ
 * — nhờ vậy một nhịp pop lỗ không kéo tờ giấy về tư thế gập. `ms` âm = chưa bắt đầu.
 */
export function sampleTrack(t: MotionTrack, ms: number, into: MotionFrame): void {
  const at = ms < 0 ? 0 : ms;
  for (const c of t.chans) c.write(into, valueOf(c, at));
}

/**Đỉnh của nháy sáng khi bản giải thích hoà lẫn — DỮ LIỆU, không hardcode trong hàm vẽ. */
const FLASH_PEAK = 0.35;

/**Một bậc lịch: dạng chung mà foldInPlan / unfoldPlan / holePlan đều quy về được. */
type Step = { readonly startMs: number; readonly durMs: number };

const ramps = (steps: readonly Step[], write: (i: number) => Writer, from: number, to: number): Chan[] =>
  steps.map((s, i) => chan(write(i), from, [mkLeg(s.startMs, s.durMs, from, to)]));

/**Các bậc pop lỗ của `holePlan` (DS:121) ở dạng Step. */
const holeSteps = (holes: number): readonly Step[] =>
  holePlan(Math.max(0, holes)).map((r) => ({ startMs: r.startMs, durMs: r.durMs }));

/**Kênh lỗ đi TỪ `from` tới `to` ngay khi nhịp bắt đầu (vết đục biến mất, lỗ hiện đầy đủ). */
const holeSnap = (holes: number, durMs: number, from: number, to: number): Chan[] =>
  ramps(holeSteps(holes).map(() => ({ startMs: 0, durMs })), holeWriter, from, to);

/**
 * VÀO ĐỀ: tờ phẳng gập từng lớp về packet (lớp ngoài cùng gập SAU cùng — ảnh gương của nhịp mở
 * bung), tới `punchStartMs` mũi đục xuống và lỗ pop theo `holePlan`.
 */
export function foldInTrack(layers: number, holes: number): MotionTrack {
  const plan = foldInPlan(layers);
  const steps: readonly Step[] = plan.rows.map((r) => ({ startMs: r.startMs, durMs: r.durMs }));
  const pops: readonly Step[] = holeSteps(holes).map((r) => ({
    startMs: plan.punchStartMs + r.startMs,
    durMs: r.durMs,
  }));
  return track([
    ...ramps(steps, layerWriter, 1, 0),
    chan(revealWriter, 0, [mkLeg(plan.punchStartMs, plan.punchDurMs, 0, 1)]),
    ...ramps(pops, holeWriter, 0, 1),
  ]);
}

/**MỞ BUNG (DS:120): từng lớp 0 -> 1 so le; VẾT ĐỤC CŨ trên gói giấy teo về 0 trong DUR.head. */
export function openTrack(layers: number, holes: number): MotionTrack {
  const steps: readonly Step[] = unfoldPlan(layers).map((r) => ({ startMs: r.startMs, durMs: r.layerDurMs }));
  return track([...ramps(steps, layerWriter, 0, 1), ...holeSnap(holes, DUR.head, 1, 0)]);
}

/**POP LỖ (DS:121): scale 0 -> 1, so le DUR.holeStagger, mỗi lỗ DUR.pop. */
export function popTrack(holes: number): MotionTrack {
  return track(ramps(holeSteps(holes), holeWriter, 0, 1));
}

/**
 * BẢN GIẢI THÍCH (DS:122): bộ lỗ của ô đã chọn hiện ĐẦY ngay khung hình đầu, vệt sáng quét
 * DUR.sweep rồi nháy DUR.blend — tổng đúng 700ms.
 */
export function explainTrack(holes: number): MotionTrack {
  return track([
    ...holeSnap(holes, 0, 1, 1),
    chan(bandWriter, 0, [mkLeg(0, DUR.sweep, 0, 1, 'linear')]),
    chan(flashWriter, 0, [
      mkLeg(DUR.sweep, DUR.blend / 2, 0, FLASH_PEAK),
      mkLeg(DUR.sweep + DUR.blend / 2, DUR.blend / 2, FLASH_PEAK, 0),
    ]),
  ]);
}

