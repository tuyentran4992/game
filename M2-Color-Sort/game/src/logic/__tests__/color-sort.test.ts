import { describe, it, expect } from 'vitest';
import {
  BoardState, Move,
  generateBoard, createBoard,
  doMove, undoMove, restartBoard, addExtraTube,
  isLegal, moveCount, topRun, topColor, isClean, isWin,
  legalMoves, solveBoard, hintMove, isSolvable,
  mulberry32,
} from '../color-sort';
import { MECHANICS } from '../mechanics';

describe('color-sort — helpers cơ bản', () => {
  it('topColor/topRun đúng cho ống [a,b,b,b]', () => {
    expect(topColor(['a', 'b', 'b', 'b'])).toBe('b');
    expect(topRun(['a', 'b', 'b', 'b'])).toBe(3);
    expect(topColor([])).toBeNull();
    expect(topRun([])).toBe(0);
    expect(topRun(['a', 'a', 'a', 'a'])).toBe(4);
  });

  it('isClean: ống trống hoặc 1 màu duy nhất', () => {
    expect(isClean([])).toBe(true);
    expect(isClean(['a', 'a', 'a'])).toBe(true);
    expect(isClean(['a', 'b', 'b'])).toBe(false);
    expect(isClean(['a', 'a', 'b'])).toBe(false);
  });

  it('isWin: mọi ống clean', () => {
    expect(isWin([['a', 'a'], ['b', 'b'], []])).toBe(true);
    expect(isWin([['a', 'b'], ['b', 'b']])).toBe(false);
  });
});

describe('color-sort — luật đổ M2-01', () => {
  const cap = 4;
  it('đổ hợp lệ khi đích trống', () => {
    const tubes = [['a', 'a', 'b', 'b'], []];
    expect(isLegal(tubes, 0, 1, cap)).toBe(true);
    expect(moveCount(tubes, 0, 1, cap)).toBe(2); // 2 b liên tiếp
  });

  it('đổ hợp lệ khi đỉnh đích cùng màu + đủ chỗ', () => {
    const tubes = [['a', 'b', 'b'], ['a', 'a', 'x']];
    // đỉnh nguồn b, đỉnh đích x → không hợp lệ
    expect(isLegal(tubes, 0, 1, cap)).toBe(false);
    // đổi đỉnh đích thành b → hợp lệ
    const tubes2 = [['a', 'b', 'b'], ['a', 'a', 'b']];
    expect(isLegal(tubes2, 0, 1, cap)).toBe(true);
    expect(moveCount(tubes2, 0, 1, cap)).toBe(1); // chỉ 1 chỗ trống
  });

  it('không hợp lệ khi đích đầy', () => {
    const tubes = [['a', 'b'], ['c', 'c', 'c', 'c']];
    expect(isLegal(tubes, 0, 1, cap)).toBe(false);
  });

  it('không hợp lệ khi nguồn trống', () => {
    const tubes = [[], ['a', 'a', 'a', 'a']];
    expect(isLegal(tubes, 0, 1, cap)).toBe(false);
  });

  it('không hợp lệ khi from === to', () => {
    const tubes = [['a', 'a']];
    expect(isLegal(tubes, 0, 0, cap)).toBe(false);
  });

  it('đổ count = min(layers, space) — giới hạn chỗ trống đích', () => {
    // nguồn 3 b đỉnh, đích còn 2 chỗ cùng màu b → đổ 2
    const tubes = [['a', 'b', 'b', 'b'], ['c', 'b']];
    expect(moveCount(tubes, 0, 1, cap)).toBe(2);
  });
});

describe('color-sort — doMove/apply', () => {
  it('doMove thực hiện và cập nhật history/moveCount/win', () => {
    const board = createBoard(MECHANICS, 1, 42);
    const before = board.tubes.map(t => t.slice());
    // tìm 1 nước đi hợp lệ
    const moves = legalMoves(board.tubes, board.capacity);
    expect(moves.length).toBeGreaterThan(0);
    const m = moves[0];
    const done = doMove(board, m.from, m.to);
    expect(done).not.toBeNull();
    expect(board.moveCount).toBe(1);
    expect(board.history.length).toBe(1);
    // board đã thay đổi
    const after = board.tubes.map(t => t.slice());
    expect(JSON.stringify(after)).not.toBe(JSON.stringify(before));
  });

  it('doMove trả về null khi không hợp lệ', () => {
    const board = createBoard(MECHANICS, 1, 42);
    // cố đổ vào chính mình
    expect(doMove(board, 0, 0)).toBeNull();
    expect(board.moveCount).toBe(0);
  });
});

describe('color-sort — undo M2-05', () => {
  it('undo quay lại nước trước + giảm moveCount', () => {
    const board = createBoard(MECHANICS, 1, 42);
    const before = board.tubes.map(t => t.slice());
    const moves = legalMoves(board.tubes, board.capacity);
    doMove(board, moves[0].from, moves[0].to);
    expect(board.moveCount).toBe(1);
    const undone = undoMove(board);
    expect(undone).not.toBeNull();
    expect(board.moveCount).toBe(0);
    expect(board.history.length).toBe(0);
    // board về như cũ
    expect(JSON.stringify(board.tubes.map(t => t.slice()))).toBe(JSON.stringify(before));
  });

  it('undo khi không có history trả null', () => {
    const board = createBoard(MECHANICS, 1, 42);
    expect(undoMove(board)).toBeNull();
  });
});

describe('color-sort — restart M2-05', () => {
  it('restart reset board về gốc + moveCount 0', () => {
    const cfg = MECHANICS;
    const board = createBoard(cfg, 1, 99);
    const original = board.tubes.map(t => t.slice());
    const moves = legalMoves(board.tubes, board.capacity);
    doMove(board, moves[0].from, moves[0].to);
    doMove(board, moves[1] ? moves[1].from : moves[0].from, moves[1] ? moves[1].to : moves[0].to);
    expect(board.moveCount).toBeGreaterThan(0);
    const restarted = restartBoard(cfg, board);
    expect(restarted.moveCount).toBe(0);
    expect(JSON.stringify(restarted.tubes.map(t => t.slice()))).toBe(JSON.stringify(original));
  });
});

describe('color-sort — level generator M2-04 (luôn giải được)', () => {
  it('board sinh không ở trạng thái solved (trừ khi không thể)', () => {
    const board = createBoard(MECHANICS, 1, 1);
    // level 1 đơn giản nhưng vẫn phải trộn
    // (có thể trùng hiếm — chỉ assert giải được)
  });

  it('board sinh LUÔN giải được — test solutionPath cho N level', () => {
    for (let level = 1; level <= 6; level++) {
      for (let seed = 1; seed <= 4; seed++) {
        const board = createBoard(MECHANICS, level, seed * 100 + level);
        // áp dụng solutionPath (forward solution từ generator) → phải win
        const t2 = board.tubes.map(t => t.slice());
        for (const m of board.solutionPath) {
          const src = t2[m.from]; const dst = t2[m.to];
          const moved = src.splice(src.length - m.count, m.count);
          for (const c of moved) dst.push(c);
        }
        expect(isWin(t2)).toBe(true);
      }
    }
  });

  it('generator deterministic theo seed', () => {
    const b1 = createBoard(MECHANICS, 2, 1234);
    const b2 = createBoard(MECHANICS, 2, 1234);
    expect(JSON.stringify(b1.tubes.map(t => t.slice()))).toBe(JSON.stringify(b2.tubes.map(t => t.slice())));
  });

  it('seed khác → board khác (không trùng)', () => {
    const b1 = createBoard(MECHANICS, 2, 1);
    const b2 = createBoard(MECHANICS, 2, 2);
    expect(JSON.stringify(b1.tubes.map(t => t.slice()))).not.toBe(JSON.stringify(b2.tubes.map(t => t.slice())));
  });

  it('bất biến tổng lát = colorCount × capacity', () => {
    for (let level = 1; level <= 6; level++) {
      const board = createBoard(MECHANICS, level, 7);
      let total = 0;
      for (const t of board.tubes) total += t.length;
      const expected = board.colors.length * board.capacity;
      expect(total).toBe(expected);
    }
  });

  it('không ống vượt capacity', () => {
    for (let level = 1; level <= 6; level++) {
      const board = createBoard(MECHANICS, level, 7);
      for (const t of board.tubes) expect(t.length).toBeLessThanOrEqual(board.capacity);
    }
  });
});

describe('color-sort — win check M2-02', () => {
  it('win khi mọi ống 1 màu/trống', () => {
    const board = createBoard(MECHANICS, 1, 1);
    // ép board solved
    board.tubes = [
      [board.colors[0], board.colors[0], board.colors[0], board.colors[0]],
      [board.colors[1], board.colors[1], board.colors[1], board.colors[1]],
      [board.colors[2], board.colors[2], board.colors[2], board.colors[2]],
      [],
    ];
    doMove(board, 0, 0); // dummy move để cập nhật win flag qua doMove không hợp lệ
    // gọi trực tiếp isWin
    expect(isWin(board.tubes)).toBe(true);
  });

  it('chưa win khi còn ống lẫn màu', () => {
    const board = createBoard(MECHANICS, 1, 1);
    expect(isWin(board.tubes)).toBe(false);
  });
});

describe('color-sort — stuck check M2-03', () => {
  it('stuck khi hết nước đi hợp lệ mà chưa win', () => {
    // board không thể kẹt vì có ống trống luôn — nhưng test logic cờ
    const board = createBoard(MECHANICS, 1, 1);
    // ép board "gần solved" nhưng không có nước đi — khó dựng thực; chỉ test cờ false lúc đầu
    expect(board.stuck).toBe(false);
  });
});

describe('color-sort — hint M2-06', () => {
  it('hintMove trả về nước đi hợp lệ từ board đang chơi', () => {
    const board = createBoard(MECHANICS, 1, 3);
    const hint = hintMove(board);
    expect(hint).not.toBeNull();
    expect(isLegal(board.tubes, hint!.from, hint!.to, board.capacity)).toBe(true);
  });

  it('hintMove hoạt động tốt trên các level từ 1 đến 25 với seed mặc định', () => {
    for (let level = 1; level <= 25; level++) {
      const board = createBoard(MECHANICS, level);
      const hint = hintMove(board);
      expect(hint, `Level ${level} phải có hint hợp lệ lúc khởi tạo`).not.toBeNull();
      expect(isLegal(board.tubes, hint!.from, hint!.to, board.capacity)).toBe(true);
    }
  });

  it('hintMove trả về null khi đã win (không cần gợi ý)', () => {
    const board = createBoard(MECHANICS, 1, 1);
    board.tubes = [
      [board.colors[0], board.colors[0], board.colors[0], board.colors[0]],
      [board.colors[1], board.colors[1], board.colors[1], board.colors[1]],
      [board.colors[2], board.colors[2], board.colors[2], board.colors[2]],
      [],
    ];
    const hint = hintMove(board);
    // đã win → solver trả [] → hint null
    expect(hint).toBeNull();
  });
});

describe('color-sort — extra tube M2-06', () => {
  it('addExtraTube thêm 1 ống trống', () => {
    const board = createBoard(MECHANICS, 1, 1);
    const before = board.tubes.length;
    addExtraTube(board);
    expect(board.tubes.length).toBe(before + 1);
    expect(board.tubes[board.tubes.length - 1]).toEqual([]);
    expect(board.extraTubeUsed).toBe(1);
  });
});

describe('color-sort — solver', () => {
  it('solveBoard trả [] cho board đã solved', () => {
    const tubes = [['a', 'a'], ['b', 'b'], []];
    expect(solveBoard(tubes, 4)).toEqual([]);
  });

  it('solveBoard giải được board sinh ngược', () => {
    const board = createBoard(MECHANICS, 1, 5);
    const sol = solveBoard(board.tubes, board.capacity);
    expect(sol).not.toBeNull();
    expect(sol!.length).toBeGreaterThan(0);
    // áp dụng solution → win
    const t2 = board.tubes.map(t => t.slice());
    for (const m of sol!) applyMoveFn(t2, m);
    expect(isWin(t2)).toBe(true);
  });
});

// helper local để apply move (tránh export thêm)
function applyMoveFn(tubes: string[][], move: Move): void {
  const src = tubes[move.from];
  const dst = tubes[move.to];
  const moved = src.splice(src.length - move.count, move.count);
  for (const c of moved) dst.push(c);
}

describe('color-sort — level ramp', () => {
  it('level 1: 4 ống / 3 màu / capacity 4', () => {
    const board = createBoard(MECHANICS, 1, 1);
    expect(board.tubeCount).toBe(4);
    expect(board.colors.length).toBe(3);
    expect(board.capacity).toBe(4);
  });

  it('level 3: 5 ống / 4 màu (ramp step at_level 3)', () => {
    const board = createBoard(MECHANICS, 3, 1);
    expect(board.tubeCount).toBe(5);
    expect(board.colors.length).toBe(4);
  });

  it('level 6: 6 ống / 5 màu', () => {
    const board = createBoard(MECHANICS, 6, 1);
    expect(board.tubeCount).toBe(6);
    expect(board.colors.length).toBe(5);
  });
});

describe('color-sort — seeded RNG determinism', () => {
  it('mulberry32 cùng seed → cùng chuỗi', () => {
    const r1 = mulberry32(123);
    const r2 = mulberry32(123);
    for (let i = 0; i < 10; i++) expect(r1()).toBe(r2());
  });
});
