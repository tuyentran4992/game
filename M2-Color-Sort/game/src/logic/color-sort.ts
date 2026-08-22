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
  solutionPath: Move[];  // hidden path (cho hint khi chưa chơi)
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
// Hợp lệ khi: nguồn có chất lỏng, đích có chỗ, đích trống HOẶC đỉnh đích cùng màu.
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

// ---------- Level generator (sinh NGƯỢC — M2-04) ----------
// Kỹ thuật: khởi tạo trạng thái "đã sort" (mỗi ống đầy 1-màu + ống trống),
// rồi áp dụng N "scramble moves" — mỗi move LÀ REVERSIBLE bởi 1 legal forward move:
//   (a) pour top-run X từ A sang B nơi B trống HOẶC top_B ≠ X (mix color),
//   (b) count < R (để A còn top X → reverse pour B→A hợp lệ) HOẶC count = len_A (A rỗng).
// Do đó board kết quả luôn giải được bằng cách đảo ngược N bước (M2-04).
export function generateBoard(
  cfg: MechanicsConfig,
  level: number,
  seed: number,
  extraTubes: number = 0,
): BoardState {
  const step: RampStep = rampForLevel(cfg, level);
  const capacity = step.capacity;
  const colorCount = step.colors;
  const palette = colorsForLevel(cfg, level);
  const emptyTubes = step.empty + extraTubes;
  const totalTubes = step.tubes + extraTubes;

  const rng = mulberry32(seed);

  // BƯỚC 1: solved state — colorCount ống đầy 1 màu + empty ống trống.
  const tubes: Liquid[][] = [];
  const colors: Liquid[] = palette.slice(0, colorCount).map(c => c.hex);
  for (let c = 0; c < colorCount; c++) {
    const arr: Liquid[] = [];
    for (let k = 0; k < capacity; k++) arr.push(colors[c]);
    tubes.push(arr);
  }
  for (let e = 0; e < emptyTubes; e++) tubes.push([]);
  while (tubes.length < totalTubes) tubes.push([]);

  // BƯỚC 2: trộn N bước bằng scramble moves (reversible).
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
        // chỉ mix: đích trống HOẶC đỉnh đích khác màu nguồn (tránh consolidating = un-scramble)
        const dstTop = dst.length === 0 ? null : dst[dst.length - 1];
        if (dstTop === top) continue; // cùng màu → bỏ (solving move)
        // count tối đa = min(R, sp)
        let maxCount = Math.min(R, sp);
        if (maxCount <= 0) continue;
        // nếu count == R mà A còn màu khác bên dưới (lenI > R) → không reversible → giảm 1
        if (maxCount === R && lenI > R) {
          maxCount = R - 1;
          if (maxCount <= 0) continue;
        }
        // thêm candidate với count ngẫu nhiên sẽ chọn sau; ở đây dùng maxCount làm tham chiếu
        out.push({ from: i, to: j, layers: R, count: maxCount });
      }
    }
    return out;
  };

  const solutionPath: Move[] = [];
  let lastMove: Move | null = null;
  for (let step_i = 0; step_i < cfg.shuffleBackSteps; step_i++) {
    const moves = scrambleMoves(tubes, capacity);
    if (moves.length === 0) {
      // fallback: nếu hết scramble move (board đã mix nhiều) → dùng legal forward move
      const lm = legalMoves(tubes, capacity);
      if (lm.length === 0) break;
      const pick = lm[Math.floor(rng() * lm.length)];
      applyMove(tubes, pick);
      solutionPath.push(pick);
      lastMove = pick;
      continue;
    }
    // tránh exact-reverse của lastMove
    let candidates = moves;
    if (lastMove) {
      const filtered = moves.filter(m => !(m.from === lastMove!.to && m.to === lastMove!.from));
      if (filtered.length > 0) candidates = filtered;
    }
    const pick = candidates[Math.floor(rng() * candidates.length)];
    // chọn count ngẫu nhiên trong [1, maxCount] để đa dạng partial split
    const maxC = Math.max(1, pick.count);
    const cnt = 1 + Math.floor(rng() * maxC); // [1, maxC]
    const realMove: Move = { from: pick.from, to: pick.to, layers: pick.layers, count: cnt };
    applyMove(tubes, realMove);
    solutionPath.push(realMove);
    lastMove = realMove;
  }

  // BƯỚC 3: nếu board tình cờ vẫn solved → ép thêm 1 scramble move (đảm bảo không solved).
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

  // Đảo solutionPath thành "forward solution" từ scrambled state (M2-04 khóa lời giải).
  // Mỗi scramble move reverse: from↔to swap, count giữ nguyên — là 1 legal forward move.
  const forward: Move[] = [];
  for (let i = solutionPath.length - 1; i >= 0; i--) {
    const m = solutionPath[i];
    forward.push({ from: m.to, to: m.from, layers: m.count, count: m.count });
  }

  return {
    level,
    capacity,
    tubes,
    tubeCount: totalTubes,
    colors,
    moveCount: 0,
    history: [],
    extraTubeUsed: 0,
    win: isWin(tubes),
    stuck: false,
    seed,
    solutionPath: forward,
  };
}

// ---------- Board controller (move/undo/restart/hint) ----------

// Tạo board mới cho level (dùng seed = level*1000 + randomOrDefault).
export function createBoard(cfg: MechanicsConfig, level: number, seed?: number): BoardState {
  const s = seed ?? (level * 7919 + 13); // deterministic theo level nếu không truyền
  return generateBoard(cfg, level, s, 0);
}

// Thực hiện nước đi (M2-01). Trả về move đã làm hoặc null nếu không hợp lệ.
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

// Undo 1 nước (M2-05). Trả về move đã undo hoặc null nếu không có history.
export function undoMove(board: BoardState): Move | null {
  const last = board.history.pop();
  if (!last) return null;
  // đảo ngược move: đổ từ `to` trả về `from`, count lát.
  const reverse: Move = { from: last.to, to: last.from, layers: last.count, count: last.count };
  // đảm bảo hợp lệ (mặc dù luôn hợp lệ theo bất biến)
  applyMove(board.tubes, reverse);
  board.moveCount = Math.max(0, board.moveCount - 1);
  board.win = isWin(board.tubes);
  board.stuck = false; // sau undo luôn có ít nhất nước vừa undo → không kẹt
  return reverse;
}

// Restart: reset board về trạng thái gốc (tái sinh cùng seed, M2-05).
export function restartBoard(cfg: MechanicsConfig, board: BoardState): BoardState {
  const fresh = generateBoard(cfg, board.level, board.seed, board.extraTubeUsed);
  return fresh;
}

// Thêm 1 ống trống (extra tube rewarded, M2-06).
export function addExtraTube(board: BoardState): void {
  board.tubes.push([]);
  board.tubeCount += 1;
  board.extraTubeUsed += 1;
  board.stuck = false; // có ống trống mới → có nước đi
}

// ---------- Solver (BFS) — cho hint + verify solvable ----------

// Serialize tubes thành key (xáo trộn ống không quan trọng → sort tubes trước).
function serialize(tubes: Liquid[][]): string {
  const parts = tubes.map(t => t.join(','));
  parts.sort();
  return parts.join('|');
}

// Giải board bằng BFS. Trả về danh sách move giải hoặc null nếu không tìm thấy trong maxStates.
export function solveBoard(tubes: Liquid[][], capacity: number, maxStates = 20000): Move[] | null {
  if (isWin(tubes)) return [];
  const startKey = serialize(tubes);
  const queue: { t: Liquid[][]; path: Move[] }[] = [{ t: tubes.map(t => t.slice()), path: [] }];
  const visited = new Set<string>([startKey]);
  while (queue.length > 0) {
    const { t, path } = queue.shift()!;
    const moves = legalMoves(t, capacity);
    for (const m of moves) {
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

// Hint: tìm 1 nước đi đúng từ trạng thái hiện tại (M2-06).
// Thử BFS solver; nếu không giải được trong maxStates → fallback nước đi "tiến bộ"
// (giảm số ống lẫn màu / đổ vào ống cùng màu đỉnh).
export function hintMove(board: BoardState): Move | null {
  if (isWin(board.tubes)) return null; // đã thắng → không cần gợi ý
  const sol = solveBoard(board.tubes, board.capacity);
  if (sol && sol.length > 0) return sol[0];
  // fallback: chọn nước đi hợp lệ "tốt nhất" heuristic
  const moves = legalMoves(board.tubes, board.capacity);
  if (moves.length === 0) return null;
  let best = moves[0];
  let bestScore = -1;
  for (const m of moves) {
    const next = board.tubes.map(t => t.slice());
    applyMove(next, m);
    // điểm = số ống clean (càng nhiều càng tốt)
    let score = 0;
    for (const t of next) if (isClean(t)) score += 1;
    if (score > bestScore) { bestScore = score; best = m; }
  }
  return best;
}

// Kiểm tra board sinh ra luôn giải được (M2-04). Dùng cho test level_solvable.
export function isSolvable(tubes: Liquid[][], capacity: number): boolean {
  const sol = solveBoard(tubes, capacity);
  return sol !== null;
}
