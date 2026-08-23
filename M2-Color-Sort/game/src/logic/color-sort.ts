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

  while (queue.length > 0) {
    const { t, path } = queue.shift()!;
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
export function generateBoard(
  cfg: MechanicsConfig,
  level: number,
  seed: number,
  extraTubeCount = 0,
): BoardState {
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

  let currentSeed = seed;
  let fallbackBoard: BoardState | null = null;

  for (let attempt = 0; attempt < 25; attempt++) {
    const rng = mulberry32(currentSeed);

    // BƯỚC 1: solved state
    const tubes: Liquid[][] = [];
    const colors: Liquid[] = palette.slice(0, colorCount).map(c => c.hex);
    for (let c = 0; c < colorCount; c++) {
      const arr: Liquid[] = [];
      for (let k = 0; k < capacity; k++) arr.push(colors[c]);
      tubes.push(arr);
    }
    for (let e = 0; e < emptyTubes; e++) tubes.push([]);
    while (tubes.length < totalTubes) tubes.push([]);

    // BƯỚC 2: trộn N bước bằng scramble moves (reversible)
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

    const forward: Move[] = [];
    for (let i = solutionPath.length - 1; i >= 0; i--) {
      const m = solutionPath[i];
      forward.push({ from: m.to, to: m.from, layers: m.count, count: m.count });
    }

    // TÍNH SỐ BƯỚC TỐI ƯU & KIỂM TRA ĐỘ GIẢI ĐƯỢC
    const shortestSolution = solveBoard(tubes, capacity, 15000);
    if (!isWin(tubes) && legalMoves(tubes, capacity).length > 0 && shortestSolution !== null && shortestSolution.length > 0) {
      return {
        level,
        capacity,
        tubes,
        tubeCount: totalTubes,
        colors,
        moveCount: 0,
        history: [],
        extraTubeUsed: 0,
        win: false,
        stuck: false,
        seed: currentSeed,
        solutionPath: shortestSolution,
        optimalMoves: shortestSolution.length,
      };
    }

    if (!fallbackBoard && !isWin(tubes) && legalMoves(tubes, capacity).length > 0) {
      fallbackBoard = {
        level,
        capacity,
        tubes,
        tubeCount: totalTubes,
        colors,
        moveCount: 0,
        history: [],
        extraTubeUsed: 0,
        win: false,
        stuck: false,
        seed: currentSeed,
        solutionPath: shortestSolution || forward,
        optimalMoves: shortestSolution ? shortestSolution.length : Math.max(3, Math.min(10, forward.length)),
      };
    }

    currentSeed = (currentSeed * 1664525 + 1013904223) >>> 0;
  }

  return fallbackBoard!;
}

// ---------- Board controller (move/undo/restart/hint) ----------

export function createBoard(cfg: MechanicsConfig, level: number, seed?: number): BoardState {
  const s = seed ?? (level * 7919 + 13);
  return generateBoard(cfg, level, s, 0);
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

export function restartBoard(cfg: MechanicsConfig, board: BoardState): BoardState {
  const fresh = generateBoard(cfg, board.level, board.seed, board.extraTubeUsed);
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
