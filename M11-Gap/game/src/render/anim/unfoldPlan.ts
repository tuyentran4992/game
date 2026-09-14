// Pattern: Data Table (pure planner)
// TRÁCH NHIỆM: mọi DỮ LIỆU ĐIỀU PHỐI của một vòng chơi ở MỘT chỗ — mở bung từng lớp (DS:120),
//   pop lỗ (DS:121), vệt giải thích (DS:122), nếp "thở" hint (DS:124), gate input theo pha
//   animate + bộ giữ cú bấm (PC-05), bảng mờ / scale chạm (DS:94-96, DS:127) và phần thưởng
//   lúc chốt lượt (PC-09/PC-13). Scene chỉ VIỆC ĐỌC bảng rồi đặt tween (A2: PlayScene không
//   ôm luật).
// RÀNG BUỘC: module THUẦN — không import phaser, không đồng hồ, không ngẫu nhiên (3 test
//   view-b3a chạy trong node và phải tái lập sau 3 lần reload — PC-B-04). Số ms không được
//   khai lại ở nơi khác (E2/A9).
// HỢP ĐỒNG SỐ: tests/logic/view-b3a-timing.test.ts (lịch + gate) và
//   tests/logic/view-b3a-geometry.test.ts (bố cục hình học + token màu) là chân lý.

import { resultOf, type LevelPhase, type LevelResult, type LevelState } from '../../logic/levelState';
import { LAYER_LADDER, MAX_HOLES } from '../holeView';

/** Token ease của Phaser (DS:120 ghi rõ ease-out) — không phải chuỗi hiển thị. */
export type EaseName = 'easeOut';

const EASE_OUT: EaseName = 'easeOut';

type DurTable = {
  head: number;
  layerStep: number;
  holeStagger: number;
  pop: number;
  sweep: number;
  blend: number;
  fast: number;
};

/** Nhịp ms nguyên văn DS:120-122; `fast` = trần phản hồi chạm 150ms (PC-U-06). */
export const DUR: Readonly<DurTable> = {
  head: 140, layerStep: 110, holeStagger: 60, pop: 250, sweep: 500, blend: 200, fast: 120,
};

/** Một dòng lịch lớp: mốc TUYỆT ĐỐI tính sẵn để scene không cộng dồn trong vòng vẽ. */
export type UnfoldLayer = {
  readonly index: number;
  readonly startMs: number;
  readonly endMs: number;
  readonly ease: EaseName;
  readonly layerDelayMs: number;
  readonly layerDurMs: number;
  readonly holeStaggerMs: number;
  readonly totalMs: number;
};

/** Một dòng lịch lỗ: scale 0 -> 1 trong `durMs`, bắt đầu ở `startMs` (DS:121). */
export type HolePop = {
  readonly index: number;
  readonly startMs: number;
  readonly durMs: number;
  readonly endMs: number;
};

/** 6 số của hơi thở hint (DS:124) — `teachOnly` do logic quyết, view chỉ đọc cờ. */
export type BreathPlan = {
  readonly scaleFrom: number;
  readonly scaleTo: number;
  readonly yoyoMs: number;
  readonly repeat: number;
  readonly idleGateMs: number;
  readonly teachOnly: boolean;
};

const BREATH: BreathPlan = Object.freeze({
  scaleFrom: 1, scaleTo: 1.02, yoyoMs: 1200, repeat: 2, idleGateMs: 5000, teachOnly: true,
});

export const breathPlan = (): BreathPlan => BREATH;

/** Đường chờ lớp: lớp cuối bắt đầu ở (n-1)*layerStep rồi chạy thêm head ms. */
const layerWait = (layers: number): number => (layers - 1) * DUR.layerStep + DUR.head;

/**
 * Số lớp của một tờ giấy LUÔN là luỹ thừa 2 (mỗi nếp gập đôi tờ). Input lẻ (5, 6, 7) không
 * phải một đề thật ⇒ làm tròn XUỐNG theo luỹ thừa 2 gần nhất, nhờ đó `totalMs` của N dòng đầu
 * không đổi khi người gọi hỏi một lịch dài hơn (history của một prefix lớp là ổn định).
 */
const layersOf = (layers: number): number => {
  let pow = 1;
  while (pow * 2 <= layers) pow *= 2;
  return pow;
};

/** Lịch mở bung từng lớp; index 0 = lớp NGOÀI CÙNG (mở trước). layers<=0 => rỗng. */
export function unfoldPlan(layers: number): UnfoldLayer[] {
  const totalMs = layers > 0 ? layerWait(layersOf(layers)) : 0;
  const rows: UnfoldLayer[] = [];
  for (let i = 0; i < layers; i += 1) {
    const startMs = i * DUR.layerStep;
    rows.push({
      index: i,
      startMs,
      endMs: startMs + DUR.head,
      ease: EASE_OUT,
      layerDelayMs: DUR.layerStep,
      layerDurMs: DUR.head,
      holeStaggerMs: DUR.holeStagger,
      totalMs,
    });
  }
  return rows;
}

/** Lịch pop lỗ; 1 lỗ thì không có so le nhưng vẫn pop đủ `pop` ms (DS:121). */
export function holePlan(holeCount: number): HolePop[] {
  const rows: HolePop[] = [];
  for (let i = 0; i < holeCount; i += 1) {
    const startMs = i * DUR.holeStagger;
    rows.push({ index: i, startMs, durMs: DUR.pop, endMs: startMs + DUR.pop });
  }
  return rows;
}

/**
 * Dải hợp lệ của lịch — DẪN XUẤT từ trần hình học của logic, KHÔNG khai tay số lớp:
 *   · mỗi đề có ≥1 nếp (chainTable guard `foldCount.min = 1`) => tối thiểu MIN_LAYERS lớp;
 *   · nhiều nhất MAX_CHAIN_LEN nếp (chainTable.ts) => tối đa 2^MAX_CHAIN_LEN lớp = MAX_LAYERS.
 * Thêm trần cho logic là TỰ ĐỘNG thêm bậc thang ở đây — không sửa PlayScene (A15).
 * Chủ của các con số này là render/holeView (review F1); file lịch chỉ dùng lại và giữ nguyên
 * CỬA NHẬP cũ cho scene + test (`unfoldPlan.ts` vẫn là chỗ duy nhất tầng chơi import timing).
 */
export { holeBudget, LAYER_LADDER, MAX_HOLES, MAX_LAYERS, MIN_LAYERS, type HoleBudget } from '../holeView';

const legalTimeline = (layers: number, holes: number): boolean =>
  LAYER_LADDER.includes(layers) && Number.isInteger(holes) && holes >= 1 && holes <= MAX_HOLES;

export type UnfoldOpts = {
  readonly layers: number;
  readonly holes: number;
  readonly wrong: boolean;
};

/** Echo input + các mốc ms, không chứa hàm phụ (test so JSON nguyên khối). */
export type UnfoldPlan = {
  readonly layers: number;
  readonly holes: number;
  readonly wrong: boolean;
  readonly layerWaitMs: number;
  readonly holesStaggerMs: number;
  readonly popMs: number;
  readonly explainMs: number;
  readonly totalMs: number;
};

/** Bản ĐÚNG: chờ lớp + nhịp pop lỗ cuối. Bản GIẢI THÍCH: chờ lớp + vệt 500 + blend 200. */
export function unfoldTimeline(opts: UnfoldOpts): UnfoldPlan | null {
  if (!legalTimeline(opts.layers, opts.holes)) return null;
  const explainMs = opts.wrong ? DUR.sweep + DUR.blend : 0;
  const layerWaitMs = layerWait(opts.layers);
  const tailMs = opts.wrong ? explainMs : (opts.holes - 1) * DUR.holeStagger + DUR.pop;
  return {
    layers: opts.layers,
    holes: opts.holes,
    wrong: opts.wrong,
    layerWaitMs,
    holesStaggerMs: DUR.holeStagger,
    popMs: DUR.pop,
    explainMs,
    totalMs: layerWaitMs + tailMs,
  };
}

/** 4 pha VẼ (khác 6 pha của levelState): view chỉ cần biết đang animate hay đã chốt. */
export type RenderPhase = 'ready' | 'unfolding' | 'correct' | 'wrong';

/** Máy 6 pha -> 4 pha vẽ. MỘT bảng cho cả scene lẫn test (A15: thêm pha là thêm 1 dòng). */
export const RENDER_BY_PHASE: Readonly<Record<LevelPhase, RenderPhase>> = Object.freeze({
  loading: 'unfolding', ready: 'ready', answered: 'unfolding',
  correct: 'correct', wrong: 'wrong', next: 'correct',
});

export type OptionGate = {
  readonly enabled: boolean;
  readonly alpha: number;
  readonly buffer: number;
};

/** Số của DS:94-96 + DS:127; `pressScale` 0,96 là nhát lún lúc nhấn (pack B3a §5). */
export const TOUCH: Readonly<{
  alphaUnchosen: number;
  alphaDisabled: number;
  tapScale: number;
  pressScale: number;
  shakeMaxPx: number;
}> = { alphaUnchosen: 0.45, alphaDisabled: 0.6, tapScale: 1.03, pressScale: 0.96, shakeMaxPx: 4 };

/**
 * BẢNG GATE duy nhất (PC-05/DS:96): đang animate thì KHOÁ nhưng buffer=1 — không mất lượt.
 * `RENDER_PHASES` liệt kê từ CHÍNH bảng này ⇒ thêm một pha là sửa đúng một dòng (A15).
 */
const GATE_ROWS: readonly (readonly [RenderPhase, OptionGate])[] = [
  ['ready', { enabled: true, alpha: 1, buffer: 0 }],
  ['unfolding', { enabled: false, alpha: TOUCH.alphaDisabled, buffer: 1 }],
  ['correct', { enabled: false, alpha: 1, buffer: 0 }],
  ['wrong', { enabled: false, alpha: 1, buffer: 0 }],
];

export const RENDER_PHASES: readonly RenderPhase[] = GATE_ROWS.map(([phase]) => phase);

export const optionEnabledByState: Readonly<Record<RenderPhase, OptionGate>> = Object.freeze(
  Object.fromEntries(GATE_ROWS) as Record<RenderPhase, OptionGate>,
);

/** Pha mà tờ giấy ĐÃ MỞ (rect gói giấy nhường cho rect lỗ + rect hoạt cảnh — PC-U-04). */
const SHEET_OPEN: readonly RenderPhase[] = ['unfolding', 'correct', 'wrong'];

export const isOpenPhase = (phase: RenderPhase): boolean => SHEET_OPEN.includes(phase);

/**
 * Bộ giữ cú bấm bị khoá (PC-05): máy trả về NGUYÊN STATE khi đang animate thì scene cất index
 * vào đây và ăn lại đúng MỘT lần khi máy về pha trả lời được. Ở module này vì nó là mặt kia
 * của bảng GATE_ROWS — PlayScene không được tự giữ số (A2).
 */
export type InputBuffer = {
  /** Ghi nhớ ô vừa bị khoá; cú sau đè cú trước (người chơi đổi ý là hợp lệ). */
  hold: (index: number) => void;
  /** Lấy cú đang giữ và xoá nó; null khi không có gì chờ. */
  take: () => number | null;
  /** Còn cú bấm nào chờ không — để test/QA đọc, không phải field riêng của scene. */
  pending: () => boolean;
  /** Đổi đề là đổi câu hỏi: bỏ cú bấm cũ của màn trước. */
  reset: () => void;
};

export function createInputBuffer(): InputBuffer {
  let held: number | null = null;
  return {
    hold: (index: number) => { held = index; },
    take: () => {
      const out = held;
      held = null;
      return out;
    },
    pending: () => held !== null,
    reset: () => { held = null; },
  };
}

/** Hành động ở ĐUỐI một hoạt cảnh: tiếng nào, có rung tờ giấy không, có cất kết quả không. */
export type OutcomeRow = {
  readonly fx: string;
  readonly shake: boolean;
  /** Cất kết quả: CHỈ pha đã trả lời đúng (sai thì chưa có gì để cộng sao — TC-SES-02). */
  readonly commit: boolean;
};

type OutcomeSinks = {
  readonly fx: (key: string) => void;
  readonly shake: () => void;
  readonly commit: (result: LevelResult) => void;
};

/** Bảng phần thưởng theo pha MÁY (thêm pha có thưởng = thêm một dòng — không sửa scene).
 *  `next` KHÔNG có dòng nào: phần thưởng đã trả ở `correct`, thêm dòng ở `next` là commit
 *  hai lần cho cùng một màn (PC-13 · TC-SES-02). */
const OUTCOME_BY_PHASE: Readonly<Partial<Record<LevelPhase, OutcomeRow>>> = Object.freeze({
  correct: { fx: 'correct', shake: false, commit: true },
  wrong: { fx: 'wrong', shake: true, commit: false },
});

export const outcomeOf = (phase: LevelPhase): OutcomeRow | undefined => OUTCOME_BY_PHASE[phase];

/** Chơi nốt phần thưởng của một lượt đã chốt. resultOf là của logic, view chỉ chuyển lời gọi. */
export function applyOutcome(state: LevelState, sinks: OutcomeSinks): void {
  const row = outcomeOf(state.phase);
  if (!row) return;
  sinks.fx(row.fx);
  if (row.shake) sinks.shake();
  if (row.commit) sinks.commit(resultOf(state));
}
