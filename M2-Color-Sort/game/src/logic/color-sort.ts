// Color-sort LOGIC THUẦN (KHÔNG phụ thuộc Phaser) — M2 "Neon Sort: Galaxy Pour".
// Tuân luật M2-01..M2-08. Testable độc lập (xem __tests__/color-sort.test.ts).

import { MechanicsConfig, RampStep, rampForLevel, colorsForLevel } from './mechanics';

export type Liquid = string; // hex color string (#RRGGBB)

// ---------- Board state (DATA-MODEL §2) ----------
export interface Move {
  from: number;   // index ống nguồn
  to: number;     // index ống đích
  layers: number; // số lát màu-đỉnh cùng màu liên tiếp ở nguồn
  count: number;  // lát THỰC SỰ đổ sang đích (≤ layers, giới hạn chỗ trống)
}

export interface BoardState {
  level: number;
  capacity: number;
  tubes: Liquid[][];     // mỗi tube = mảng màu, index 0 = ĐÁY, cuối = ĐỈNH
  tubeCount: number;
  colors: Liquid[];
  moveCount: number;
  history: Move[];
  extraTubeUsed: number;
  win: boolean;
  stuck: boolean;
  seed: number;
  solutionPath: Move[];  // hidden path
  optimalMoves: number;  // số bước giải tối ưu (ngắn nhất) cho level này
}

// ---------- Seeded RNG (mulberry32 — deterministic cho test) ----------
export function mulberry32(seedIn: number): () => number {
  let s = seedIn >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- Helpers ----------
// Màu đỉnh (top) của 1 ống; null nếu trống.
export function topColor(tube: Liquid[]): Liquid | null {
  return tube.length === 0 ? null : tube[tube.length - 1];
}

// Chuỗi lát cùng màu đỉnh (từ đỉnh xuống). VD [a,b,b,b] → 3 (số b liên tiếp đỉnh).
export function topRun(tube: Liquid[]): number {
  if (tube.length === 0) return 0;
  const top = tube[tube.length - 1];
  let n = 1;
  for (let i = tube.length - 2; i >= 0; i--) {
    if (tube[i] !== top) break;
    n++;
  }
  return n;
}

// ống "clean" = trống hoặc 1 màu duy nhất (M2-02).
export function isClean(tube: Liquid[]): boolean {
  if (tube.length === 0) return true;
  const c = tube[0];
  for (let i = 1; i < tube.length; i++) if (tube[i] !== c) return false;
  return true;
}

// Win check M2-02: mọi ống clean.
export function isWin(tubes: Liquid[][]): boolean {
  for (const t of tubes) if (!isClean(t)) return false;
  return true;
}

// Thùng còn trống của ống đích.
function space(tube: Liquid[], capacity: number): number {
  return capacity - tube.length;
}

// Kiểm tra 1 nước đi có hợp lệ theo M2-01 (không thay đổi board).
export function isLegal(tubes: Liquid[][], from: number, to: number, capacity: number): boolean {
  if (from === to) return false;
  if (from < 0 || to < 0 || from >= tubes.length || to >= tubes.length) return false;
  if (tubes[from].length === 0) return false;
  const sp = space(tubes[to], capacity);
  if (sp <= 0) return false;
  const srcTop = topColor(tubes[from]);
  if (srcTop === null) return false;
  if (tubes[to].length === 0) return true; // đích trống
  return tubes[to][tubes[to].length - 1] === srcTop; // đỉnh đích cùng màu
}

// Tính count cho 1 move hợp lệ: min(layers, space đích).
export function moveCount(tubes: Liquid[][], from: number, to: number, capacity: number): number {
  if (!isLegal(tubes, from, to, capacity)) return 0;
  const layers = topRun(tubes[from]);
  const sp = space(tubes[to], capacity);
  return Math.min(layers, sp);
}

// Áp dụng 1 move (MUTATE tubes). Giả định move đã hợp lệ.
export function applyMove(tubes: Liquid[][], move: Move): void {
  const src = tubes[move.from];
  const dst = tubes[move.to];
  const take = move.count;
  const moved = src.splice(src.length - take, take); // lấy từ đỉnh
  for (const c of moved) dst.push(c);
}

// Liệt kê toàn bộ nước đi hợp lệ (cho stuck check + solver).
export function legalMoves(tubes: Liquid[][], capacity: number): Move[] {
  const moves: Move[] = [];
  for (let i = 0; i < tubes.length; i++) {
    if (tubes[i].length === 0) continue;
    const top = topColor(tubes[i]);
    if (top === null) continue;
    const layers = topRun(tubes[i]);
    for (let j = 0; j < tubes.length; j++) {
      if (i === j) continue;
      const sp = space(tubes[j], capacity);
      if (sp <= 0) continue;
      const legal = tubes[j].length === 0 || tubes[j][tubes[j].length - 1] === top;
      if (!legal) continue;
      moves.push({ from: i, to: j, layers, count: Math.min(layers, sp) });
    }
  }
  return moves;
}

// ---------- Solver (BFS với Move Ordering & Symmetrical Pruning) ----------

function serialize(tubes: Liquid[][]): string {
  const parts = tubes.map(t => t.join(','));
  parts.sort();
  return parts.join('|');
}

function scoreMoveQuality(t: Liquid[][], m: Move, capacity: number): number {
  const src = t[m.from];
  const dst = t[m.to];
  let score = 0;

  // Hoàn thành trọn 1 ống
  if (dst.length + m.count === capacity && (dst.length === 0 || isClean(dst))) {
    score += 150;
  }
  // Gom các màu giống nhau
  if (dst.length > 0 && dst[dst.length - 1] === src[src.length - 1]) {
    score += 60;
  }
  // Giải phóng tầng màu bên dưới
  if (src.length > m.count && src[src.length - 1 - m.count] !== src[src.length - 1]) {
    score += 40;
  }
  // Làm rỗng hoàn toàn 1 ống
  if (src.length === m.count) {
    score += 30;
  }
  // Tránh chuyển ống đã clean sang ống trống
  if (dst.length === 0 && isClean(src)) {
    score -= 100;
  }

  return score;
}

export function solveBoard(tubes: Liquid[][], capacity: number, maxStates = 40000): Move[] | null {
  if (isWin(tubes)) return [];
  const startKey = serialize(tubes);
  const queue: { t: Liquid[][]; path: Move[] }[] = [{ t: tubes.map(t => t.slice()), path: [] }];
  const visited = new Set<string>([startKey]);
  let head = 0;

  while (head < queue.length) {
    const { t, path } = queue[head++];
    const moves = legalMoves(t, capacity);

    // Ưu tiên các nước đi chất lượng cao trước
    moves.sort((a, b) => scoreMoveQuality(t, b, capacity) - scoreMoveQuality(t, a, capacity));

    let emptyDstCount = 0;
    for (const m of moves) {
      const srcTube = t[m.from];
      const dstTube = t[m.to];

      // Tỉa nhánh đối xứng ống trống
      if (dstTube.length === 0) {
        if (emptyDstCount > 0 && isClean(srcTube)) continue;
        emptyDstCount++;
      }

      const next = t.map(tube => tube.slice());
      applyMove(next, m);
      const key = serialize(next);
      if (visited.has(key)) continue;
      visited.add(key);

      const np = [...path, m];
      if (isWin(next)) return np;
      queue.push({ t: next, path: np });
      if (visited.size >= maxStates) return null;
    }
  }
  return null;
}

// ---------- Level generator (sinh NGƯỢC + BẢO TOÀN KHẢ NĂNG GIẢI) ----------

/**
 * AUDIT §B3 freeze fix: board KHÔNG cần solver BFS tốn 1.5s ở level 30.
 * Scramble ngược là solvable BY CONSTRUCTION (đường đi forward replay hợp lệ
 * → win) — chỉ tốn O(len) để kiểm tra, microseconds thay vì 15000-state BFS.
 * Login cứng (seed khác → board khác) + memoize per (level, seed) + prefetch.
 */

/** Số lần thử scramble (mỗi lần ~0.3ms — cực rẻ so với BFS). */
const GEN_ATTEMPTS = 120;
/** BFS fallback bounded — chỉ cho seed hiếm nơi scramble không replay được. */
const FALLBACK_VERIFY_STATES = 6000;

/** Replay forward path từ board TRỘN → kiểm tra có phải chuỗi nước đi hợp lệ thắng cờ? */
function replayForwardWins(tubes: Liquid[][], forward: Move[], capacity: number): boolean {
  const t = tubes.map((tt) => tt.slice());
  for (const m of forward) {
    if (m.from === m.to || m.from < 0 || m.to < 0) return false;
    if (m.from >= t.length || m.to >= t.length) return false;
    const src = t[m.from];
    const dst = t[m.to];
    if (src.length === 0) return false;
    const sp = capacity - dst.length;
    if (sp <= 0) return false;
    if (dst.length > 0 && dst[dst.length - 1] !== src[src.length - 1]) return false;
    const cnt = Math.min(m.count, sp, topRun(src));
    if (cnt <= 0) return false;
    const moved = src.splice(src.length - cnt, cnt);
    for (const c of moved) dst.push(c);
  }
  return isWin(t);
}

/** Deep-clone board (để cache không bị đột biến khi doMove trên bản trả về). */
function cloneBoard(b: BoardState): BoardState {
  return {
    ...b,
    tubes: b.tubes.map((t) => t.slice()),
    colors: b.colors.slice(),
    history: b.history.map((m) => ({ ...m })),
    solutionPath: b.solutionPath.map((m) => ({ ...m })),
  };
}

// ----- Board memo cache (level, seed) — re-entry / prefetch TỨC THÌ -----
const boardCache = new Map<string, BoardState>();
function cacheKey(level: number, seed: number): string {
  return `${level}:${seed}`;
}
/** Board (deep-clone) đã verified/sinh cho (level,seed) — null nếu chưa có. */
export function getCachedBoard(level: number, seed: number): BoardState | null {
  const c = boardCache.get(cacheKey(level, seed));
  return c ? cloneBoard(c) : null;
}
export function hasCachedBoard(level: number, seed: number): boolean {
  return boardCache.has(cacheKey(level, seed));
}
/** Pre-generate level (seed mặc định) để Gameplay vào level NHẬN board TỨC THÌ. */
export function prefetchBoard(cfg: MechanicsConfig, level: number): BoardState | null {
  const seed = level * 7919 + 13;
  if (boardCache.has(cacheKey(level, seed))) return getCachedBoard(level, seed)!;
  const board = generateBoard(cfg, level, seed, 0);
  boardCache.set(cacheKey(level, seed), cloneBoard(board));
  return board;
}

export function generateBoard(
  cfg: MechanicsConfig,
  level: number,
  seed: number,
  extraTubeCount = 0,
): BoardState {
  const makeBoard = (
    tubes: Liquid[][],
    colors: Liquid[],
    solutionPath: Move[],
    optimalMoves: number,
    usedSeed: number,
  ): BoardState => ({
    level,
    capacity,
    tubes,
    tubeCount: tubes.length,
    colors,
    moveCount: 0,
    history: [],
    extraTubeUsed: 0,
    win: false,
    stuck: false,
    seed: usedSeed,
    solutionPath,
    optimalMoves,
  });

  const ramp = rampForLevel(cfg, level);
  const totalTubes = ramp.tubes + extraTubeCount;
  const emptyTubes = ramp.empty + extraTubeCount;
  const colorCount = ramp.colors;
  const capacity = ramp.capacity;
  const palette = colorsForLevel(cfg, level);

  const maxScramble = ramp.scramble ?? cfg.shuffleBackSteps;

  const scrambleMoves = (tubes: Liquid[][], cap: number): Move[] => {
    const out: Move[] = [];
    for (let i = 0; i < tubes.length; i++) {
      const src = tubes[i];
      if (src.length === 0) continue;
      const top = src[src.length - 1];
      const R = topRun(src);
      const lenI = src.length;
      for (let j = 0; j < tubes.length; j++) {
        if (i === j) continue;
        const dst = tubes[j];
        const sp = cap - dst.length;
        if (sp <= 0) continue;
        const dstTop = dst.length === 0 ? null : dst[dst.length - 1];
        if (dstTop === top) continue; // cùng màu → bỏ
        let maxCount = Math.min(R, sp);
        if (maxCount <= 0) continue;
        if (maxCount === R && lenI > R) {
          maxCount = R - 1;
          if (maxCount <= 0) continue;
        }
        out.push({ from: i, to: j, layers: R, count: maxCount });
      }
    }
    return out;
  };

  /** Một lần scramble: solved → trộn → {tubes, forward(path giải)}. */
  const scrambleOnce = (rng: () => number): { tubes: Liquid[][]; forward: Move[] } | null => {
    const tubes: Liquid[][] = [];
    const colors: Liquid[] = palette.slice(0, colorCount).map((c) => c.hex);
    for (let c = 0; c < colorCount; c++) {
      const arr: Liquid[] = [];
      for (let k = 0; k < capacity; k++) arr.push(colors[c]);
      tubes.push(arr);
    }
    for (let e = 0; e < emptyTubes; e++) tubes.push([]);
    while (tubes.length < totalTubes) tubes.push([]);

    const solutionPath: Move[] = [];
    let lastMove: Move | null = null;
    for (let step_i = 0; step_i < maxScramble; step_i++) {
      const moves = scrambleMoves(tubes, capacity);
      if (moves.length === 0) {
        const lm = legalMoves(tubes, capacity);
        if (lm.length === 0) break;
        const pick = lm[Math.floor(rng() * lm.length)];
        applyMove(tubes, pick);
        solutionPath.push(pick);
        lastMove = pick;
        continue;
      }
      let candidates = moves;
      if (lastMove) {
        const filtered = moves.filter(m => !(m.from === lastMove!.to && m.to === lastMove!.from));
        if (filtered.length > 0) candidates = filtered;
      }
      const pick = candidates[Math.floor(rng() * candidates.length)];
      const maxC = Math.max(1, pick.count);
      const cnt = 1 + Math.floor(rng() * maxC);
      const realMove: Move = { from: pick.from, to: pick.to, layers: pick.layers, count: cnt };
      applyMove(tubes, realMove);
      solutionPath.push(realMove);
      lastMove = realMove;
    }

    let guard = 0;
    while (isWin(tubes) && guard < 30) {
      const moves = scrambleMoves(tubes, capacity);
      if (moves.length === 0) break;
      const pick = moves[Math.floor(rng() * moves.length)];
      const cnt = 1 + Math.floor(rng() * Math.max(1, pick.count));
      const realMove: Move = { from: pick.from, to: pick.to, layers: pick.layers, count: cnt };
      applyMove(tubes, realMove);
      solutionPath.push(realMove);
      guard++;
    }

    // forward = đảo ngược scramble → nước đi GIẢI (BPI tự replay = win)
    const forward: Move[] = [];
    for (let i = solutionPath.length - 1; i >= 0; i--) {
      const m = solutionPath[i];
      forward.push({ from: m.to, to: m.from, layers: m.count, count: m.count });
    }
    return forward.length === 0 ? null : { tubes, forward };
  };

  let currentSeed = seed;
  let fallback: { tubes: Liquid[][]; forward: Move[]; usedSeed: number } | null = null;

  for (let attempt = 0; attempt < GEN_ATTEMPTS; attempt++) {
    const rng = mulberry32(currentSeed);
    let scrambled: { tubes: Liquid[][]; forward: Move[] } | null = null;
    try {
      scrambled = scrambleOnce(rng);
    } catch { /* ignore — thử seed khác */ }
    if (!scrambled) {
      currentSeed = (currentSeed * 1664525 + 1013904223) >>> 0;
      continue;
    }
    const { tubes, forward } = scrambled;
    const colors = palette.slice(0, colorCount).map((c) => c.hex);

    // PHASE A: solvable by construction (replay forward hợp lệ → win) — KHÔNG cần BFS.
    if (!isWin(tubes) && legalMoves(tubes, capacity).length > 0 && replayForwardWins(tubes, forward, capacity)) {
      const optimal = Math.max(1, Math.min(30, forward.length));
      return makeBoard(tubes, colors, forward, optimal, currentSeed);
    }

    if (!fallback && !isWin(tubes) && legalMoves(tubes, capacity).length > 0) {
      fallback = { tubes: tubes.map((t) => t.slice()), forward, usedSeed: currentSeed };
    }
    currentSeed = (currentSeed * 1664525 + 1013904223) >>> 0;
  }

  // PHASE B fallback: BFS bounded trả về đường thắng THẬT (verified) cho seed hiếm.
  if (fallback) {
    const colors = palette.slice(0, colorCount).map((c) => c.hex);
    const sol = solveBoard(fallback.tubes, capacity, FALLBACK_VERIFY_STATES);
    if (sol && sol.length > 0) {
      return makeBoard(fallback.tubes, colors, sol, sol.length, fallback.usedSeed);
    }
    // best-effort: forward (replay có thể không hoàn chỉnh nhưng hint vẫn tìm được nước hợp lệ)
    const optimal = Math.max(1, Math.min(30, fallback.forward.length));
    return makeBoard(fallback.tubes, colors, fallback.forward, optimal, fallback.usedSeed);
  }

  // Không thể xảy ra trong thực tế — bảo hiểm: solved board trắng (độ giả, không bao giờ dùng)
  const empty = Array.from({ length: Math.max(1, totalTubes) }, () => [] as Liquid[]);
  return makeBoard(empty, palette.slice(0, colorCount).map((c) => c.hex), [], Math.max(1, level * 2), seed);
}

// ---------- Board controller (move/undo/restart/hint) ----------

export function createBoard(cfg: MechanicsConfig, level: number, seed?: number): BoardState {
  const s = seed ?? (level * 7919 + 13);
  const cached = getCachedBoard(level, s);
  if (cached) return cached;
  const board = generateBoard(cfg, level, s, 0);
  boardCache.set(cacheKey(level, s), cloneBoard(board));
  return board;
}

export function doMove(board: BoardState, from: number, to: number): Move | null {
  if (!isLegal(board.tubes, from, to, board.capacity)) return null;
  const layers = topRun(board.tubes[from]);
  const count = moveCount(board.tubes, from, to, board.capacity);
  const move: Move = { from, to, layers, count };
  applyMove(board.tubes, move);
  board.history.push(move);
  board.moveCount += 1;
  board.win = isWin(board.tubes);
  board.stuck = !board.win && legalMoves(board.tubes, board.capacity).length === 0;
  return move;
}

export function undoMove(board: BoardState): Move | null {
  const last = board.history.pop();
  if (!last) return null;
  const reverse: Move = { from: last.to, to: last.from, layers: last.count, count: last.count };
  applyMove(board.tubes, reverse);
  board.moveCount = Math.max(0, board.moveCount - 1);
  board.win = isWin(board.tubes);
  board.stuck = false;
  return reverse;
}

/**
 * Restart (M2-05): sinh lại CHÍNH board gốc từ seed — nhưng GIỮ ống thưởng mà
 * người chơi đã xem quảng cáo để có (P0-3).
 *
 * Bug cũ: generateBoard() luôn trả `extraTubeUsed: 0`, nên sau restart cap
 * `maxExtra` bị bỏ qua → mua thêm ống lần 2 → restart lần 2 sinh board ÍT ống
 * hơn số tube UI đang có → renderLiquid(views, undefined) → TypeError.
 * Nay: extraTubeUsed được BẢO TOÀN và số ống luôn = ramp.tubes + extraTubeUsed.
 */
export function restartBoard(cfg: MechanicsConfig, board: BoardState): BoardState {
  const extra = board.extraTubeUsed;
  const fresh = generateBoard(cfg, board.level, board.seed, extra);
  fresh.extraTubeUsed = extra;
  // Bảo hiểm: board mới KHÔNG BAO GIỜ được ít ống hơn board cũ (UI đang vẽ n ống).
  while (fresh.tubes.length < board.tubes.length) fresh.tubes.push([]);
  fresh.tubeCount = fresh.tubes.length;
  return fresh;
}

export function addExtraTube(board: BoardState): void {
  board.tubes.push([]);
  board.tubeCount += 1;
  board.extraTubeUsed += 1;
  board.stuck = false;
}

// Hint CHUẨN XÁC: Tìm bước đi giải quyết board
export function hintMove(board: BoardState): Move | null {
  if (isWin(board.tubes)) return null;

  // 1. Thử giải BFS tìm đường thắng ngắn nhất
  const sol = solveBoard(board.tubes, board.capacity, 25000);
  if (sol && sol.length > 0) return sol[0];

  // 2. Nếu ở trạng thái ban đầu chưa đi nước nào mà BFS sâu -> lấy nước đầu tiên từ solutionPath sinh ra
  if (board.history.length === 0 && board.solutionPath.length > 0) {
    for (const m of board.solutionPath) {
      if (isLegal(board.tubes, m.from, m.to, board.capacity)) {
        return m;
      }
    }
  }

  // 3. Fallback heuristic thông minh cho các board phức tạp nhiều ống
  const moves = legalMoves(board.tubes, board.capacity);
  if (moves.length === 0) return null;

  let bestMove: Move | null = null;
  let bestScore = -Infinity;

  const lastMove = board.history.length > 0 ? board.history[board.history.length - 1] : null;

  for (const m of moves) {
    const srcTube = board.tubes[m.from];
    const dstTube = board.tubes[m.to];
    let score = 0;

    if (lastMove && m.from === lastMove.to && m.to === lastMove.from) {
      score -= 80;
    }

    if (dstTube.length + m.count === board.capacity && (dstTube.length === 0 || isClean(dstTube))) {
      score += 200;
    }
    if (dstTube.length > 0 && dstTube[dstTube.length - 1] === srcTube[srcTube.length - 1]) {
      score += 60;
    }
    if (srcTube.length > m.count && srcTube[srcTube.length - 1 - m.count] !== srcTube[srcTube.length - 1]) {
      score += 50;
    }
    if (srcTube.length === m.count) {
      score += 40;
    }
    if (dstTube.length === 0 && isClean(srcTube)) {
      score -= 150;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMove = m;
    }
  }

  return bestMove;
}

export function isSolvable(tubes: Liquid[][], capacity: number): boolean {
  const sol = solveBoard(tubes, capacity);
  return sol !== null;
}
