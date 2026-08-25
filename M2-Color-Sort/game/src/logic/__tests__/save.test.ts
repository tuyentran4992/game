// Unit test SAVE SCHEMA v2 (P0-2) + chu trình rewarded-tube ↔ restart (P0-3).
import { describe, it, expect } from 'vitest';
import {
  SCHEMA_VERSION, encodeSession, decodeSession, normalizeSave,
  type SavedGameV2, type SessionSave,
} from '../save';
import { createBoard, doMove, addExtraTube, restartBoard, legalMoves } from '../color-sort';
import { MECHANICS, rampForLevel } from '../mechanics';

/** Đi n nước hợp lệ đầu tiên để board có state "giữa ván". */
function playSomeMoves(board: ReturnType<typeof createBoard>, n: number) {
  for (let i = 0; i < n; i++) {
    const ms = legalMoves(board.tubes, board.capacity);
    if (ms.length === 0) break;
    doMove(board, ms[0].from, ms[0].to);
  }
}

describe('save v2 — encode/decode session (resume giữa ván)', () => {
  it('encodeSession giữ level/seed/capacity + mã hoá màu thành index', () => {
    const board = createBoard(MECHANICS, 3);
    playSomeMoves(board, 2);
    const s = encodeSession(board, false);

    expect(s.level).toBe(board.level);
    expect(s.seed).toBe(board.seed);
    expect(s.capacity).toBe(board.capacity);
    expect(s.tubes.length).toBe(board.tubes.length);
    expect(s.moves).toBe(board.moveCount);
    expect(s.history.length).toBe(board.history.length);
    expect(s.hint_used).toBe(false);
    // mọi phần tử là index màu hợp lệ (không phải hex)
    for (const t of s.tubes) for (const ci of t) {
      expect(Number.isInteger(ci)).toBe(true);
      expect(ci).toBeGreaterThanOrEqual(0);
      expect(ci).toBeLessThan(board.colors.length);
    }
  });

  it('round-trip: decode(encode(board)) khôi phục ĐÚNG board + undo stack', () => {
    const board = createBoard(MECHANICS, 4);
    playSomeMoves(board, 3);
    const restored = decodeSession(MECHANICS, encodeSession(board, true), board.level);

    expect(restored).not.toBeNull();
    expect(restored!.tubes).toEqual(board.tubes);          // đúng từng lát màu
    expect(restored!.capacity).toBe(board.capacity);
    expect(restored!.moveCount).toBe(board.moveCount);
    expect(restored!.history.length).toBe(board.history.length);
    expect(restored!.optimalMoves).toBe(board.optimalMoves); // không cần chạy lại solver
    expect(restored!.solutionPath).toEqual([]);
  });

  it('undo sau resume hoàn tác đúng nước cuối', () => {
    const board = createBoard(MECHANICS, 4);
    playSomeMoves(board, 3);
    const before = board.tubes.map((t) => t.slice());
    const last = board.history[board.history.length - 1];

    const restored = decodeSession(MECHANICS, encodeSession(board, false), board.level)!;
    const rev = { from: last.to, to: last.from, count: last.count };
    // hoàn tác trên board resume phải cho ra state trước nước đi đó
    const moved = restored.tubes[rev.from].splice(restored.tubes[rev.from].length - rev.count, rev.count);
    for (const c of moved) restored.tubes[rev.to].push(c);

    // Board gốc undo cùng nước → 2 board bằng nhau
    const orig = before.map((t) => t.slice());
    const m2 = orig[rev.from].splice(orig[rev.from].length - rev.count, rev.count);
    for (const c of m2) orig[rev.to].push(c);
    expect(restored.tubes).toEqual(orig);
  });

  it('session được giữ khi board có ống thưởng (extra_tubes khớp số ống)', () => {
    const board = createBoard(MECHANICS, 6);
    addExtraTube(board);
    const s = encodeSession(board, false);
    expect(s.extra_tubes).toBe(1);
    const restored = decodeSession(MECHANICS, s, board.level);
    expect(restored).not.toBeNull();
    expect(restored!.tubes.length).toBe(board.tubes.length);
    expect(restored!.extraTubeUsed).toBe(1);
  });
});

describe('save v2 — session INVALID thì trả null (không crash, chơi lại level)', () => {
  const board = createBoard(MECHANICS, 5);
  const base = () => JSON.parse(JSON.stringify(encodeSession(board, false))) as SessionSave;

  it('lệch level', () => {
    expect(decodeSession(MECHANICS, base(), board.level + 1)).toBeNull();
  });

  it('lệch capacity so với ramp', () => {
    const s = base(); s.capacity = s.capacity + 1;
    expect(decodeSession(MECHANICS, s, board.level)).toBeNull();
  });

  it('số ống không khớp ramp + extra', () => {
    const s = base(); s.tubes.push([]);
    expect(decodeSession(MECHANICS, s, board.level)).toBeNull();
  });

  it('extra_tubes vượt maxExtra', () => {
    const s = base(); s.extra_tubes = MECHANICS.reward.extraTube.maxExtra + 1;
    expect(decodeSession(MECHANICS, s, board.level)).toBeNull();
  });

  it('index màu ngoài palette', () => {
    const s = base(); s.tubes[0] = [999];
    expect(decodeSession(MECHANICS, s, board.level)).toBeNull();
  });

  it('không bảo toàn màu (mất 1 lát)', () => {
    const s = base();
    const i = s.tubes.findIndex((t) => t.length > 0);
    s.tubes[i] = s.tubes[i].slice(1);
    expect(decodeSession(MECHANICS, s, board.level)).toBeNull();
  });

  it('ống tràn quá capacity', () => {
    const s = base();
    s.tubes[0] = new Array<number>(s.capacity + 1).fill(0);
    expect(decodeSession(MECHANICS, s, board.level)).toBeNull();
  });

  it('history tuple sai định dạng / index ngoài biên', () => {
    const s1 = base(); s1.history = [[0, 1] as unknown as [number, number, number]];
    expect(decodeSession(MECHANICS, s1, board.level)).toBeNull();
    const s2 = base(); s2.history = [[0, 99, 1]];
    expect(decodeSession(MECHANICS, s2, board.level)).toBeNull();
  });

  it('payload rác / rỗng', () => {
    expect(decodeSession(MECHANICS, null, 1)).toBeNull();
    expect(decodeSession(MECHANICS, {}, 1)).toBeNull();
    expect(decodeSession(MECHANICS, 'nope', 1)).toBeNull();
  });
});

describe('save v2 — normalizeSave (migration + chống rác)', () => {
  it('payload rỗng → mặc định an toàn', () => {
    const d = normalizeSave(null);
    expect(d.schema_version).toBe(SCHEMA_VERSION);
    expect(d.best_level).toBe(0);
    expect(d.current_level).toBe(1);
    expect(d.session).toBeNull();
    expect(d.flags).toEqual({ tutorial_seen: false, muted: false, free_hint_used: false });
    expect(d.ads).toEqual({ last_interstitial_ts: 0, levels_since_ad: 0 });
  });

  it('save v1 (không có session) → session bị huỷ, tiến độ giữ lại', () => {
    const v1 = { schema_version: 1, best_level: 9, current_level: 10, best_moves: 12, session: { level: 10 } };
    const d = normalizeSave(v1);
    expect(d.best_level).toBe(9);
    expect(d.current_level).toBe(10);
    expect(d.best_moves).toBe(12);
    expect(d.session).toBeNull();
    expect(d.schema_version).toBe(SCHEMA_VERSION);
  });

  it('save v2 hợp lệ → giữ nguyên session + flags + best_moves_by_level', () => {
    const board = createBoard(MECHANICS, 2);
    const raw: SavedGameV2 = {
      schema_version: 2,
      best_level: 1,
      current_level: 2,
      best_moves: 7,
      best_moves_by_level: { '1': 7 },
      flags: { tutorial_seen: true, muted: true, free_hint_used: true },
      ads: { last_interstitial_ts: 5, levels_since_ad: 2 },
      session: encodeSession(board, false),
      last_updated_ts: 1234,
    };
    const d = normalizeSave(JSON.parse(JSON.stringify(raw)));
    expect(d.session).not.toBeNull();
    expect(d.session!.level).toBe(2);
    expect(d.flags).toEqual({ tutorial_seen: true, muted: true, free_hint_used: true });
    expect(d.ads).toEqual({ last_interstitial_ts: 5, levels_since_ad: 2 });
    expect(d.best_moves_by_level['1']).toBe(7);
    expect(d.last_updated_ts).toBe(1234);
  });

  it('payload ~<=200 byte cho 1 session thực tế', () => {
    const board = createBoard(MECHANICS, 8);
    playSomeMoves(board, 4);
    const raw: SavedGameV2 = {
      schema_version: SCHEMA_VERSION,
      best_level: 7, current_level: 8, best_moves: 20,
      best_moves_by_level: { '7': 20 },
      flags: { tutorial_seen: true, muted: false, free_hint_used: true },
      ads: { last_interstitial_ts: Date.now(), levels_since_ad: 1 },
      session: encodeSession(board, false),
      last_updated_ts: Date.now(),
    };
    const bytes = new TextEncoder().encode(JSON.stringify(raw)).length;
    expect(bytes).toBeLessThan(3 * 1024 * 1024); // hard limit M2-10
    expect(bytes).toBeLessThan(600);             // thực tế rất nhỏ
  });

  it('v2.1 BACK-COMPAT: save v2 (không có ads/free_hint_used) vẫn resume + mặc định an toàn', () => {
    const board = createBoard(MECHANICS, 4);
    const v2 = {
      schema_version: 2,
      best_level: 3,
      current_level: 4,
      best_moves: 9,
      best_moves_by_level: { '3': 9 },
      flags: { tutorial_seen: true, muted: false },
      session: encodeSession(board, true),
      last_updated_ts: 42,
    };
    const d = normalizeSave(JSON.parse(JSON.stringify(v2)));
    expect(d.schema_version).toBe(SCHEMA_VERSION);   // nâng cấp lên 2.1
    expect(d.session).not.toBeNull();                // session KHÔNG bị huỷ (back-compat)
    expect(d.session!.hint_used).toBe(true);         // hint_used_this_level giữ nguyên
    expect(d.flags.free_hint_used).toBe(false);      // suất gợi ý miễn phí còn nguyên
    expect(d.ads).toEqual({ last_interstitial_ts: 0, levels_since_ad: 0 });
  });

  it('block ads rác (âm / string / thiếu) → chuẩn hoá về số hợp lệ', () => {
    const d = normalizeSave({
      schema_version: SCHEMA_VERSION,
      ads: { last_interstitial_ts: -50, levels_since_ad: 'x' },
    });
    expect(d.ads.last_interstitial_ts).toBe(0);
    expect(d.ads.levels_since_ad).toBe(0);
  });
});

describe('P0-3 — rewarded tube ↔ restart KHÔNG làm hụt số ống', () => {
  it('extra-tube → restart → extra-tube → restart: số ống không bao giờ giảm', () => {
    const cfg = MECHANICS;
    const level = 26; // level có nhiều ống (ramp cao)
    const ramp = rampForLevel(cfg, level);
    let board = createBoard(cfg, level);
    expect(board.tubes.length).toBe(ramp.tubes);

    addExtraTube(board);
    expect(board.tubes.length).toBe(ramp.tubes + 1);
    expect(board.extraTubeUsed).toBe(1);

    // Restart lần 1 — trước đây extraTubeUsed bị reset 0 ⇒ cap maxExtra bị bỏ qua
    board = restartBoard(cfg, board);
    expect(board.extraTubeUsed).toBe(1);
    expect(board.tubes.length).toBe(ramp.tubes + 1);
    expect(board.tubeCount).toBe(board.tubes.length);

    // Người chơi "mua" thêm lần 2 (UI chặn theo maxExtra, nhưng logic vẫn phải bền)
    addExtraTube(board);
    const n = board.tubes.length;
    board = restartBoard(cfg, board);
    // Restart lần 2: board KHÔNG được ít ống hơn UI đang vẽ ⇒ hết TypeError renderLiquid(undefined)
    expect(board.tubes.length).toBeGreaterThanOrEqual(n);
    for (let i = 0; i < board.tubes.length; i++) {
      expect(Array.isArray(board.tubes[i])).toBe(true); // mọi index đều có nội dung
    }
    expect(board.tubeCount).toBe(board.tubes.length);
  });

  it('restart giữ nguyên seed/level và reset tiến độ ván', () => {
    const board = createBoard(MECHANICS, 5);
    playSomeMoves(board, 3);
    const fresh = restartBoard(MECHANICS, board);
    expect(fresh.level).toBe(board.level);
    expect(fresh.seed).toBe(board.seed);
    expect(fresh.moveCount).toBe(0);
    expect(fresh.history).toEqual([]);
    expect(fresh.win).toBe(false);
  });

  it('session của board sau restart vẫn decode được (không lệch số ống)', () => {
    const cfg = MECHANICS;
    let board = createBoard(cfg, 12);
    addExtraTube(board);
    board = restartBoard(cfg, board);
    const restored = decodeSession(cfg, encodeSession(board, false), board.level);
    expect(restored).not.toBeNull();
    expect(restored!.tubes.length).toBe(board.tubes.length);
  });
});
