// Pattern: State machine
// TRÁCH NHIỆM: máy trạng thái MỘT MÀN — 6 phase, transition THUẦN, state bất biến (pack B1b §2).
// RÀNG BUỘC: không import progression/stars/generator/foldRules/Phaser/DOM — chỉ types.ts (+ rational.ts
//   cho pointKey khi tính missing/extra holes); không Math.random/Date.now (thời gian do caller truyền);
//   chỉ ĐỌC spec, không mutate LevelSpec đầu vào (F-4); mọi bảng chuyển pha/chính sách là DỮ LIỆU
//   (TRANSITIONS, ACTIONS, TAP_POLICY, EXPLAIN_BY_SUBJECT) — thêm transition = thêm dòng (A4).
import type { FoldKind, LevelSpec, Rat } from './types';
import { pointKey, toPoints } from './rational';

export type LevelPhase = 'loading' | 'ready' | 'answered' | 'correct' | 'wrong' | 'next';

/** Bảng 6 phase — KHÔNG có phase win-screen (PC-05/09): màn là breakpoint, next là điểm cuối. */
export const LEVEL_PHASES: readonly LevelPhase[] = ['loading', 'ready', 'answered', 'correct', 'wrong', 'next'];

/** ĐỒ THỊ CHUYỂN PHASE (cạnh hợp lệ) — dữ liệu để tầng UI/B2 biết còn đi được đâu. */
export const TRANSITIONS: Readonly<Record<LevelPhase, readonly LevelPhase[]>> = {
  loading: ['ready'], ready: ['answered'], answered: ['correct', 'wrong'], correct: ['next'], wrong: ['ready'], next: [],
};

/** Khoá bảng ACTIONS; tên cũng là nội dung thông báo lỗi (test bắt regex theo tên transition). */
type ActionName = 'markReady' | 'tap' | 'resolve' | 'retry' | 'nextLevel' | 'useHint' | 'useUndo' | 'advanceClock';

type ActionRule = { readonly from: readonly LevelPhase[]; readonly to: readonly LevelPhase[] };

/** Phase nguồn hợp lệ + phase đích của từng transition (to rỗng nghĩa là không đổi phase). */
const ACTIONS: Readonly<Record<ActionName, ActionRule>> = {
  markReady: { from: ['loading'], to: ['ready'] },
  tap: { from: ['ready'], to: ['answered'] },
  resolve: { from: ['answered'], to: ['correct', 'wrong'] },
  retry: { from: ['wrong'], to: ['ready'] },
  nextLevel: { from: ['correct'], to: ['next'] },
  useHint: { from: ['ready'], to: [] },
  useUndo: { from: ['wrong'], to: ['ready'] },
  advanceClock: { from: LEVEL_PHASES, to: [] },
};

/** Chính sách tap theo phase: advance = tính lượt, buffer = trả nguyên trạng (TC-SES-03 / ERR-06). */
const TAP_POLICY: Readonly<Record<LevelPhase, 'advance' | 'buffer'>> = {
  loading: 'buffer', ready: 'advance', answered: 'buffer', correct: 'buffer', wrong: 'buffer', next: 'buffer',
};

/** Phase mà resultOf được phép đọc kết quả. */
const RESULT_PHASES: readonly LevelPhase[] = ['correct', 'next'];

/** ID giải thích (PC-19): token kebab nội bộ, KHÔNG phải chuỗi hiển thị — i18n map ở tầng UI. */
export type ExplainKey = 'fold-axis-swapped' | 'fold-layer-count' | 'punch-on-crease' | 'cut-corner-shape';

type ExplainSubject = FoldKind | 'cut' | 'none';

/** BẢNG TRA explainKey: khoá = chủ đề đang được nhắc (kind của nếp được hint, hoặc nhát cắt). */
const EXPLAIN_BY_SUBJECT: Readonly<Record<ExplainSubject, ExplainKey>> = {
  H: 'fold-axis-swapped', V: 'fold-layer-count', D: 'punch-on-crease', cut: 'cut-corner-shape', none: 'fold-layer-count',
};

/** Chữ ký sai của một lượt bấm — dữ liệu cho feedback (pack §2 dòng 23). */
export type WrongInfo = {
  readonly chosenIndex: number;
  readonly missingHoles: number;
  readonly extraHoles: number;
  readonly explainKey: string;
};

/** levelIndex màn kế -> LevelSpec (hoặc null); gọi ĐÚNG 1 lần, chỉ khi trả lời ĐÚNG (TC-SES-04). */
export type NextLevel = (levelIndex: number) => LevelSpec | null;

export type LevelState = {
  readonly phase: LevelPhase;
  readonly spec: LevelSpec;
  readonly nextSpec: LevelSpec | null;
  /** số lượt CHỌN được tính — bấm lúc khoá không đếm (TC-SES-03). */
  readonly taps: number;
  /** số lần chọn sai còn hiệu lực (undo trừ 1). */
  readonly misses: number;
  readonly hintUsed: boolean;
  readonly undoUsed: boolean;
  readonly elapsedMs: number;
  /** index ô bấm sai gần nhất (null = chưa sai); bản đầy đủ nằm ở wrongInfo. */
  readonly lastWrong: number | null;
  readonly wrongInfo: WrongInfo | null;
  /** ID giải thích của hint đang bật; null khi chưa dùng hint. */
  readonly explainKey: ExplainKey | null;
  /** ô đang chờ resolve ở phase answered — máy dùng nội bộ, không phải dữ liệu hiển thị. */
  readonly picked: number | null;
};

/** Bản ghi kết quả một màn (STRUCTURE §4) — inkEarned luôn 0 ở B1b (economy = B1c). */
export type LevelResult = {
  readonly level: number;
  readonly correct: boolean;
  readonly usedHint: boolean;
  readonly firstTry: boolean;
  readonly ms: number;
  readonly inkEarned: number;
};

/** Bản sao state với vài field đè lên — mọi transition đi qua đây, không ai mutate input. */
function at(state: LevelState, over: Partial<LevelState>): LevelState {
  return { ...state, ...over };
}

function guard(name: ActionName, state: LevelState): void {
  const rule = ACTIONS[name];
  if (rule.from.includes(state.phase)) return;
  throw new Error(name + ': không chạy được ở phase ' + state.phase + ' — cần ' + rule.from.join(' | '));
}

const holeSet = (holes: readonly Rat[]): Set<string> => new Set(toPoints(holes).map(pointKey));

/** Số lỗ của A mà B không có, sau khi dedupe theo pointKey (quy ước FLAT Rat[], AMBIGUITY-01). */
function holeDiff(a: readonly Rat[], b: readonly Rat[]): number {
  const seen = holeSet(b);
  let n = 0;
  for (const k of holeSet(a)) if (!seen.has(k)) n += 1;
  return n;
}

/** nếp được nhắc = nếp CUỐI chuỗi (lớp gấp dày nhất, dễ sai nhất, pack §2 dòng 36). */
function hintFoldIndex(state: LevelState): number | null {
  const n = state.spec.folds.length;
  return n === 0 ? null : n - 1;
}

function explainSubject(state: LevelState): ExplainSubject {
  if (state.spec.action.kind === 'cut') return 'cut';
  const i = hintFoldIndex(state);
  return i === null ? 'none' : state.spec.folds[i];
}

const explainOf = (state: LevelState): ExplainKey => EXPLAIN_BY_SUBJECT[explainSubject(state)];

function wrongInfoOf(state: LevelState, chosenIndex: number): WrongInfo {
  const chosen = state.spec.options[chosenIndex]?.holes ?? [];
  return {
    chosenIndex,
    missingHoles: holeDiff(state.spec.answerHoles, chosen),
    extraHoles: holeDiff(chosen, state.spec.answerHoles),
    explainKey: explainOf(state),
  };
}

/** State khởi điểm loading — caller đã có LevelSpec trong tay (logic không sinh đề). */
export function initialLevelState(spec: LevelSpec): LevelState {
  return {
    phase: 'loading', spec, nextSpec: null, taps: 0, misses: 0,
    hintUsed: false, undoUsed: false, elapsedMs: 0, lastWrong: null, wrongInfo: null,
    explainKey: null, picked: null,
  };
}

/** loading -> ready: đề đã hiển thị đủ để bấm. */
export function markReady(state: LevelState): LevelState {
  guard('markReady', state);
  return at(state, { phase: 'ready' });
}

/** ready -> answered. Phase khác = BUFFER nguyên trạng; optionIndex ngoài dải = NÉM (PC-03). */
export function tap(state: LevelState, optionIndex: number): LevelState {
  if (TAP_POLICY[state.phase] === 'buffer') return state;
  const max = state.spec.options.length;
  if (Number.isInteger(optionIndex) && optionIndex >= 0 && optionIndex < max) {
    return at(state, { phase: 'answered', taps: state.taps + 1, picked: optionIndex });
  }
  throw new Error('tap: optionIndex ' + optionIndex + ' ngoài 0..' + (max - 1) + ' — mọi đề có ' + max + ' ô (PC-03)');
}

/** answered -> correct (bật sẵn nextSpec) | wrong (misses+1 + WrongInfo). */
export function resolve(state: LevelState, makeNext?: NextLevel): LevelState {
  guard('resolve', state);
  const picked = state.picked ?? -1;
  if (picked !== state.spec.correctIndex) {
    return at(state, {
      phase: 'wrong', misses: state.misses + 1, lastWrong: picked,
      wrongInfo: wrongInfoOf(state, picked), picked: null,
    });
  }
  const made = makeNext ? makeNext(state.spec.levelIndex + 1) : null;
  return at(state, { phase: 'correct', nextSpec: made ?? state.nextSpec, picked: null });
}

/** wrong -> ready với ĐÚNG cùng LevelSpec + nextSpec, giữ misses/lastWrong (TC-SES-02). */
export function retry(state: LevelState): LevelState {
  guard('retry', state);
  return at(state, { phase: 'ready', picked: null });
}

/** correct -> next — không có màn thắng cuộc, caller tự nạp nextSpec (PC-05). */
export function nextLevel(state: LevelState): LevelState {
  guard('nextLevel', state);
  return at(state, { phase: 'next' });
}

/** ready && !hintUsed -> bật hint; lần 2 là NO-OP nguyên trạng (TC-STR-04, PC-08 tối đa 1 lần/màn). */
export function useHint(state: LevelState): LevelState {
  guard('useHint', state);
  if (state.hintUsed) return state;
  return at(state, { hintUsed: true, explainKey: explainOf(state) });
}

/** Số nguyên 0..folds.length-1, hoặc null khi chưa bật hint — KHÔNG lộ đáp án (TC-STR-06). */
export function peekFold(state: LevelState): number | null {
  return state.hintUsed && state.phase === 'ready' ? hintFoldIndex(state) : null;
}

/** wrong -> ready hoàn lại lượt bấm sai: misses-1, taps-1, xoá lastWrong (TC-STR-07 / ERR-13). */
export function useUndo(state: LevelState): LevelState {
  guard('useUndo', state);
  if (state.undoUsed) throw new Error('useUndo: màn này đã dùng undo — tối đa 1 lần/màn (PC-08)');
  if (state.misses === 0) throw new Error('useUndo: không còn lượt sai để hoàn (misses = 0)');
  return at(state, {
    phase: 'ready', taps: Math.max(0, state.taps - 1), misses: state.misses - 1,
    lastWrong: null, wrongInfo: null, picked: null, undoUsed: true,
  });
}

/** Timer MỀM (TC-SES-05): chỉ cộng elapsedMs — không đổi phase, không bao giờ tự phạt. */
export function advanceClock(state: LevelState, ms: number): LevelState {
  if (!Number.isFinite(ms) || ms < 0) {
    throw new Error('advanceClock: ms phải hữu hạn và không âm, nhận ' + ms + ' (cấm time-travel ngược)');
  }
  return at(state, { elapsedMs: state.elapsedMs + ms });
}

/**
 * Kết quả dẫn xuất (không cộng dồn thưởng — ERR-06). undo KHÔNG khôi phục tư cách 3★
 * (pack §2 dòng 43) nên firstTry = không còn sai hiệu lực VÀ chưa từng undo.
 */
export function resultOf(state: LevelState): LevelResult {
  if (RESULT_PHASES.includes(state.phase)) {
    return {
      level: state.spec.levelIndex,
      correct: true,
      usedHint: state.hintUsed,
      firstTry: state.misses === 0 && !state.undoUsed,
      ms: state.elapsedMs,
      inkEarned: 0,
    };
  }
  throw new Error('resultOf: phase ' + state.phase + ' chưa phải kết quả — cần ' + RESULT_PHASES.join(' | '));
}
