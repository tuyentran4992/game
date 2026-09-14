// ============================================================================
// Pattern: Test Swarm (contract-first — src/platform/debug.ts CHƯA tồn tại ⇒ suite này ĐỎ).
// TRÁCH NHIỆM: chốt hợp đồng máy kiểm được của 4 debug hooks (SPEC §5.4, pack B2 §6):
//   parseDebugQuery(search: string) -> DebugFlags — hàm THUẦN, 0 đọc window.
// RÀNG BUỘC: vitest environment 'node' (pack B2 §8) ⇒ input là CHUỖI search truyền thẳng,
//   không window.location.search, không DOM, không mạng.
//
// TÊN CHỐT Ở TEST NÀY (pack B2 §6 chỉ chốt 4 hook, không chốt tên) — code phải theo đúng:
//   src/platform/debug.ts ::
//     export type DebugFlags = {
//       readonly debug: boolean; readonly level: number | null; readonly seed: string | null;
//       readonly adMock: boolean; readonly ephemeralSave: boolean }
//     export function parseDebugQuery(search: string): DebugFlags
//   Quy ước (mọi dòng có nguồn; input rác ⇒ hành vi XÁC ĐỊNH, không NaN, không ném):
//     debug ......... chỉ đúng chuỗi '1' bật (SPEC §5.4 viết nguyên văn ?debug=1).
//     level ......... token chữ số thập phân thuần, giá trị 1..120 (SPEC §1.4.1: 120 màn);
//                    âm / 0 / số thực / '1e6' / 'abc' / ngoài dải -> null.
//                    key trùng -> lần xuất hiện ĐẦU thắng (giong URLSearchParams.get).
//     seed ........... /^[0-9a-fA-F]+$/ SAU khi giải %xx; giữ NGUYÊN literal (không lower-case
//                    vì seed là khoá sinh đề — đổi chữ hoa là đổi đề).
//     adMock ......... chỉ đúng chuỗi 'mock' (SPEC §5.4 ?ad=mock).
//     ephemeralSave .. true khi và chỉ khi level !== null — SPEC §5.4: nhảy thẳng màn NN
//                    "KHÔNG ghi vào save thật". Caller không được tự suy ra từ level.
// ============================================================================

import { describe, expect, it } from 'vitest';
// tên chốt ở test này (src/platform/debug.ts)
import { parseDebugQuery } from '../../src/platform/debug';
import type { DebugFlags } from '../../src/platform/debug';
import { levelSpec } from '../../src/logic/generator';
import type { ChapterLevelConfig } from '../../src/logic/types';

/** Trạng thái mặc định: DebugFlags LUÔN đủ 5 field, không undefined, không NaN. */
const OFF: DebugFlags = { debug: false, level: null, seed: null, adMock: false, ephemeralSave: false };

/** NGUỒN: SPEC §1.4.1 — chiến dịch 120 màn (8 chương × 15). level ngoài dải ⇒ hook không bật. */
const MAX_LEVEL = 120;

/** cfg tối thiểu dựng được đề chương 1 — dùng cho ca nối hook vào logic. */
const CFG_CH1: ChapterLevelConfig = {
  chapter: 1,
  levelInChapter: 1,
  foldCount: 1,
  punchCount: 1,
  useCut: false,
  useDiagonal: false,
  timerOn: false,
};

describe('?debug=1 — bật overlay debug (SPEC §5.4)', () => {
  it('debug=1 bật overlay; 3 hook còn lại vẫn ở mặc định', () => {
    expect(parseDebugQuery('?debug=1')).toEqual({ ...OFF, debug: true });
  });

  it('chỉ nhận đúng chuỗi "1": 0 / trống / true / 01 / 2 / DEBUG=1 đều TẮT', () => {
    for (const search of ['?debug=0', '?debug', '?debug=true', '?debug=01', '?debug=2', '?DEBUG=1']) {
      expect(parseDebugQuery(search), search).toEqual(OFF);
    }
  });
});

describe('?level=NN — nhảy màn + ephemeral save (SPEC §5.4)', () => {
  it('level=23 ⇒ levelIndex 23 VÀ bật cờ không ghi save thật (ephemeralSave)', () => {
    expect(parseDebugQuery('?level=23')).toEqual({ ...OFF, level: 23, ephemeralSave: true });
  });

  it('ranh dải 1..120 (SPEC §1.4.1): 1 và 120 được nhận; 121, 999999 -> null; thiếu level -> ephemeralSave false', () => {
    expect(parseDebugQuery('?level=1').level).toBe(1);
    expect(parseDebugQuery('?level=' + MAX_LEVEL).level).toBe(MAX_LEVEL);
    expect(parseDebugQuery('?level=121'), 'level=121').toEqual(OFF);
    expect(parseDebugQuery('?level=999999'), 'level=999999').toEqual(OFF);
    expect(parseDebugQuery('?debug=1').ephemeralSave, 'ephemeralSave không tự bật').toBe(false);
  });

  // Bảng giá trị rác mà prompt B2-1b nêu đích danh: phải XÁC ĐỊNH, không NaN lọt ra ngoài.
  it.each(['abc', '-9', '0', '1e6', '1.5'])('level=%s (rác) ⇒ null, không bật ephemeral, không NaN', (bad) => {
    const flags = parseDebugQuery('?level=' + bad);
    expect(flags.level, 'level=' + bad).toBeNull();
    expect(flags.ephemeralSave, 'level=' + bad).toBe(false);
    expect(flags.level === null || Number.isInteger(flags.level), 'level=' + bad).toBe(true);
  });

  it('input mơ hồ vẫn xác định: 007 ⇒ 7 (parse hệ 10, không bát phân); key trùng ⇒ đầu thắng', () => {
    expect(parseDebugQuery('?level=007').level).toBe(7);
    expect(parseDebugQuery('?level=5&level=7').level).toBe(5);
  });
});

describe('?seed=<hex> — khoá seed tái lập (SPEC §5.4 + PC-02)', () => {
  it('hex hợp lệ được giữ NGUYÊN literal; %xx giải trước khi kiểm charset; gọi 2 lần giống hệt', () => {
    expect(parseDebugQuery('?seed=abc123').seed).toBe('abc123');
    expect(parseDebugQuery('?seed=AB12').seed).toBe('AB12');
    expect(parseDebugQuery('?seed=%31%32%33').seed).toBe('123');
    expect(parseDebugQuery('?seed=AB12')).toEqual(parseDebugQuery('?seed=AB12'));
  });

  it('seed rác / rỗng ⇒ null, không crash', () => {
    for (const bad of ['zz', '', 'a%20b', 'abc;DROP']) {
      expect(parseDebugQuery('?seed=' + bad).seed, 'seed=' + bad).toBeNull();
    }
  });
});

describe('?ad=mock — thay SDK ad bằng mock (SPEC §5.4)', () => {
  it('chỉ đúng chuỗi "mock" bật; real/MOCK/trống/thiếu key ⇒ tắt', () => {
    expect(parseDebugQuery('?ad=mock').adMock).toBe(true);
    for (const search of ['?ad=real', '?ad=MOCK', '?ad=', '?ad']) {
      expect(parseDebugQuery(search), search).toEqual(OFF);
    }
  });
});

describe('tổ hợp hook + input rác tổng quát + tính thuần', () => {
  it('tổ hợp E2E ?debug=1&seed=beef&level=7&ad=mock ⇒ đủ 4 cờ đúng, không con nào quên', () => {
    expect(parseDebugQuery('?debug=1&seed=beef&level=7&ad=mock')).toEqual({
      debug: true,
      level: 7,
      seed: 'beef',
      adMock: true,
      ephemeralSave: true,
    });
  });

  it('4 hook ĐỘC LẬP — mỗi cái bật một mình, 3 cái kia ở mặc định', () => {
    const single: readonly [string, DebugFlags][] = [
      ['?debug=1', { ...OFF, debug: true }],
      ['?level=7', { ...OFF, level: 7, ephemeralSave: true }],
      ['?seed=beef', { ...OFF, seed: 'beef' }],
      ['?ad=mock', { ...OFF, adMock: true }],
    ];
    for (const [search, want] of single) {
      expect(parseDebugQuery(search), search).toEqual(want);
    }
  });

  it('chuỗi search rác tổng quát ⇒ không exception, trả mặc định', () => {
    for (const search of ['?', '?=&', '?level', '?seed', '?ad', '?&&&', '?=1']) {
      expect(parseDebugQuery(search), search).toEqual(OFF);
    }
  });

  it('chấp nhận search có hoặc không có dấu ? đầu hai cách như nhau', () => {
    expect(parseDebugQuery('debug=1&level=3')).toEqual({ ...OFF, debug: true, level: 3, ephemeralSave: true });
    expect(parseDebugQuery('debug=1&level=3')).toEqual(parseDebugQuery('?debug=1&level=3'));
  });

  it('hàm THUẦN trong môi trường node: không có window/document mà vẫn parse được', () => {
    const host = globalThis as { window?: unknown; document?: unknown };
    expect(host.window, 'pack §8: node không có window').toBeUndefined();
    expect(host.document, 'pack §8: node không có document').toBeUndefined();
    expect(parseDebugQuery('?debug=1&level=9')).toEqual({ ...OFF, debug: true, level: 9, ephemeralSave: true });
  });

  it('nối đúng tầng logic: flags.level + flags.seed đưa thẳng vào levelSpec(seed, levelIndex, cfg)', () => {
    const flags = parseDebugQuery('?seed=beef&level=3');
    if (flags.level === null || flags.seed === null) {
      throw new Error('hook phải bật cả level lẫn seed: ' + JSON.stringify(flags));
    }
    const first = levelSpec(flags.seed, flags.level, CFG_CH1);
    const again = levelSpec(flags.seed, flags.level, CFG_CH1);
    expect(first.levelIndex).toBe(3);
    expect(first.seed).toBe('beef');
    expect(first.options.length).toBe(4);
    expect(again.correctIndex).toBe(first.correctIndex); // PC-02: cùng (seed, level) ⇒ cùng đề
  });
});
