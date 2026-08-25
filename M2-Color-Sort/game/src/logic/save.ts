// ============================================================================
// SAVE SCHEMA v2.1 (P0-2 + B2 ad economy) — pure logic, KHÔNG phụ thuộc Phaser/SDK.
//
//  {
//    schema_version: 2.1,
//    best_level, current_level,
//    best_moves_by_level: { "26": 14 },
//    flags: { tutorial_seen, muted, free_hint_used },   // ← v2.1: free_hint_used
//    ads: { last_interstitial_ts, levels_since_ad },    // ← v2.1: pacing M2-07
//    session: {                      // resume GIỮA level (~80-200 B)
//      level, seed, capacity,
//      tubes: [[0,3,3],[1],[],[2,2,0,1]],   // INDEX màu trong colorsForLevel(level)
//      moves, history: [[from,to,count], …], // undo stack replay được
//      extra_tubes, hint_used, optimal
//    },
//    last_updated_ts
//  }
//
// Session bị HUỶ (trả null) khi: schema cũ, level không khớp, capacity/số ống
// không khớp ramp, index màu sai, hoặc tổng số lát mỗi màu ≠ capacity.
// ============================================================================

import { BoardState, Liquid, Move, isWin, legalMoves } from './color-sort';
import { MechanicsConfig, colorsForLevel, rampForLevel } from './mechanics';
import { AdPacingState, emptyAdPacing, normalizeAdPacing } from './ad-pacing';

/**
 * v2.1 — thêm block `ads` (pacing interstitial) + `flags.free_hint_used`
 * (suất gợi ý onboarding). BACK-COMPAT: save v2 vẫn đọc được NGUYÊN VẸN
 * (session giữ lại, các trường mới lấy mặc định) — xem `SESSION_MIN_VERSION`.
 */
export const SCHEMA_VERSION = 2.1;
/** Session block có từ v2 → save v2 vẫn resume được sau khi nâng lên v2.1. */
export const SESSION_MIN_VERSION = 2;

/** [from, to, count] — nén undo stack còn 3 số / nước đi. */
export type HistoryTuple = [number, number, number];

export interface SessionSave {
  level: number;
  seed: number;
  capacity: number;
  tubes: number[][];
  moves: number;
  history: HistoryTuple[];
  extra_tubes: number;
  /** = hint_used_this_level (đúng 1 gợi ý/level — MECHANICS.reward.hint.hintOncePerLevel) */
  hint_used: boolean;
  /** số bước tối ưu (cho star rating) — tránh phải chạy lại solver khi resume */
  optimal: number;
}

export interface SavedGameV2 {
  schema_version: number;
  best_level: number;
  current_level: number;
  best_moves: number;
  best_moves_by_level: Record<string, number>;
  flags: { tutorial_seen: boolean; muted: boolean; free_hint_used: boolean };
  /** v2.1: pacing quảng cáo xen kẽ (cooldown + số level kể từ ad gần nhất) */
  ads: AdPacingState;
  session: SessionSave | null;
  last_updated_ts: number;
}

// ---------------------------------------------------------------- encode ----
/** BoardState → session block (màu → index để payload nhỏ & bền với đổi palette). */
export function encodeSession(board: BoardState, hintUsed: boolean): SessionSave {
  const idx = new Map<Liquid, number>();
  board.colors.forEach((hex, i) => idx.set(hex, i));
  return {
    level: board.level,
    seed: board.seed,
    capacity: board.capacity,
    tubes: board.tubes.map((t) => t.map((hex) => idx.get(hex) ?? 0)),
    moves: board.moveCount,
    history: board.history.map((m) => [m.from, m.to, m.count] as HistoryTuple),
    extra_tubes: board.extraTubeUsed,
    hint_used: !!hintUsed,
    optimal: board.optimalMoves,
  };
}

// ---------------------------------------------------------------- decode ----
function isIntArray2D(v: unknown): v is number[][] {
  return Array.isArray(v) && v.every((t) => Array.isArray(t) && t.every((n) => Number.isInteger(n)));
}

/**
 * Session block → BoardState. Trả `null` nếu KHÔNG hợp lệ (mọi lý do) → caller
 * sinh board mới. KHÔNG chạy solver → resume tức thì, không freeze.
 */
export function decodeSession(
  cfg: MechanicsConfig,
  session: unknown,
  expectLevel: number,
): BoardState | null {
  if (!session || typeof session !== 'object') return null;
  const s = session as Partial<SessionSave>;

  if (!Number.isInteger(s.level) || s.level !== expectLevel) return null;
  if (typeof s.seed !== 'number' || !isFinite(s.seed)) return null;
  if (!isIntArray2D(s.tubes)) return null;
  if (!Number.isInteger(s.capacity)) return null;

  const ramp = rampForLevel(cfg, expectLevel);
  if (s.capacity !== ramp.capacity) return null;

  const maxExtra = cfg.reward.extraTube.maxExtra;
  const extra = Number.isInteger(s.extra_tubes) ? (s.extra_tubes as number) : 0;
  if (extra < 0 || extra > maxExtra) return null;
  // Số ống phải khớp ramp + số ống thưởng đã dùng (P0-3: luôn đồng bộ).
  if (s.tubes.length !== ramp.tubes + extra) return null;

  const palette = colorsForLevel(cfg, expectLevel);
  const colors: Liquid[] = palette.slice(0, ramp.colors).map((c) => c.hex);

  // Nội dung hợp lệ: index màu trong khoảng, không tràn capacity, mỗi màu đủ `capacity` lát.
  const perColor = new Array<number>(colors.length).fill(0);
  const tubes: Liquid[][] = [];
  for (const t of s.tubes) {
    if (t.length > s.capacity) return null;
    const out: Liquid[] = [];
    for (const ci of t) {
      if (ci < 0 || ci >= colors.length) return null;
      perColor[ci]++;
      out.push(colors[ci]);
    }
    tubes.push(out);
  }
  for (const n of perColor) if (n !== s.capacity) return null;

  // Undo stack
  const history: Move[] = [];
  const rawHistory = Array.isArray(s.history) ? s.history : [];
  for (const h of rawHistory) {
    if (!Array.isArray(h) || h.length !== 3) return null;
    const [from, to, count] = h as HistoryTuple;
    if (!Number.isInteger(from) || !Number.isInteger(to) || !Number.isInteger(count)) return null;
    if (from < 0 || to < 0 || from >= tubes.length || to >= tubes.length) return null;
    if (count <= 0 || count > s.capacity) return null;
    history.push({ from, to, layers: count, count });
  }

  const moves = Number.isInteger(s.moves) && (s.moves as number) >= 0 ? (s.moves as number) : history.length;
  const optimal = Number.isInteger(s.optimal) && (s.optimal as number) > 0
    ? (s.optimal as number)
    : Math.max(3, expectLevel * 2 + 1);

  const win = isWin(tubes);
  return {
    level: expectLevel,
    capacity: s.capacity,
    tubes,
    tubeCount: tubes.length,
    colors,
    moveCount: moves,
    history,
    extraTubeUsed: extra,
    win,
    stuck: !win && legalMoves(tubes, s.capacity).length === 0,
    seed: s.seed,
    solutionPath: [],
    optimalMoves: optimal,
  };
}

// ------------------------------------------------------------- migration ----
/** Đọc payload bất kỳ (v1/v2/v2.1/rác) → SavedGameV2 chuẩn hoá. */
export function normalizeSave(raw: unknown): SavedGameV2 {
  const empty: SavedGameV2 = {
    schema_version: SCHEMA_VERSION,
    best_level: 0,
    current_level: 1,
    best_moves: 0,
    best_moves_by_level: {},
    flags: { tutorial_seen: false, muted: false, free_hint_used: false },
    ads: emptyAdPacing(),
    session: null,
    last_updated_ts: 0,
  };
  if (!raw || typeof raw !== 'object') return empty;
  const d = raw as Partial<SavedGameV2> & {
    flags?: { tutorial_seen?: boolean; muted?: boolean; free_hint_used?: boolean };
  };

  const ver = typeof d.schema_version === 'number' ? d.schema_version : 1;
  return {
    schema_version: SCHEMA_VERSION,
    best_level: typeof d.best_level === 'number' ? Math.max(0, d.best_level) : 0,
    current_level: typeof d.current_level === 'number' ? Math.max(1, d.current_level) : 1,
    best_moves: typeof d.best_moves === 'number' ? d.best_moves : 0,
    best_moves_by_level: (d.best_moves_by_level && typeof d.best_moves_by_level === 'object')
      ? (d.best_moves_by_level as Record<string, number>)
      : {},
    flags: {
      tutorial_seen: !!d.flags?.tutorial_seen,
      muted: !!d.flags?.muted,
      free_hint_used: !!d.flags?.free_hint_used,
    },
    ads: normalizeAdPacing(d.ads),
    // Save v1 KHÔNG có session → bỏ. v2 & v2.1 giữ (back-compat: session không đổi shape).
    session: ver >= SESSION_MIN_VERSION && d.session ? (d.session as SessionSave) : null,
    last_updated_ts: typeof d.last_updated_ts === 'number' ? d.last_updated_ts : 0,
  };
}
