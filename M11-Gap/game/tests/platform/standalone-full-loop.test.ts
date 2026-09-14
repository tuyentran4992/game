// TC-SAO-02 (nhóm L) — chơi TRỌN vòng lặp không SDK: boot → màn 1 → chọn đúng → next → 5 màn,
// chỉ qua interface PlatformAdapter; save in-memory chạy; storage ném giữa đường ⇒ không sập
// (tinh thần TC-NET-04 / TC-ERR-10).
//
// HỢP ĐỒNG CHỐT Ở TEST NÀY: src/platform/nullAdapter.ts export `createNullAdapter(): PlatformAdapter`
// (mỗi phiên 1 instance để cách ly state). Vòng lặp + driver ở ./helpers/fakes.ts (test-side,
// KHÔNG import luật từ src/logic — oracle là bảng CORRECT_OPTION_BY_LEVEL tự chốt trong test).
import { describe, expect, it } from 'vitest';
import { createNullAdapter } from '../../src/platform/nullAdapter';
import {
  recordAdapterCalls,
  runScriptedSession,
  withDeadStorage,
  type AnyAdapter,
} from './helpers/fakes';

const FIVE_LEVEL_STATES = [
  'boot',
  'ready',
  'answered',
  'correct',
  'next',
  'ready',
  'answered',
  'correct',
  'next',
  'ready',
  'answered',
  'correct',
  'next',
  'ready',
  'answered',
  'correct',
  'next',
  'ready',
  'answered',
  'correct',
  'next',
];

describe('standalone full loop — TC-SAO-02 / PC-20, PC-09', () => {
  it('boot → 5 màn chỉ dùng adapter: chuỗi state boot→(ready,answered,correct,next)^5, 0 lỗi', async () => {
    const trace = await runScriptedSession(createNullAdapter(), 5);
    expect(trace.states).toEqual(FIVE_LEVEL_STATES);
    expect(trace.levelsPlayed).toEqual([1, 2, 3, 4, 5]);
    expect(trace.errors).toEqual([]);
  });

  it('TC-SAO-02 / PC-09: không có state win-screen chắn giữa (tập state đúng 5 tên đã chốt)', async () => {
    const trace = await runScriptedSession(createNullAdapter(), 5);
    expect([...new Set(trace.states)].sort()).toEqual(['answered', 'boot', 'correct', 'next', 'ready']);
  });

  it('TC-SAO-02 / PC-16 + TC-GEN-03: m11.save là 1 object JSON version 1, progress.n=5, ink=50, 15 sao, không chứa nội dung đề', async () => {
    const adapter = createNullAdapter();
    await runScriptedSession(adapter, 5);
    const raw = adapter.storage.get('m11.save');
    expect(typeof raw).toBe('string');
    const save = JSON.parse(raw as string) as Record<string, unknown>;
    expect(save['version']).toBe(1);
    expect(save['progress']).toEqual({
      n: 5,
      stars: { '1': 3, '2': 3, '3': 3, '4': 3, '5': 3 },
    });
    expect(save['ink']).toBe(50);
    expect(Object.keys(save).sort()).toEqual(
      [
        'activeSkin',
        'album',
        'badges',
        'ghost',
        'ink',
        'masterUnlocked',
        'ownedSkins',
        'progress',
        'streak',
        'top5',
        'version',
      ].sort(),
    );
    expect(raw as string).not.toContain('answerHoles');
    expect(raw as string).not.toContain('options');
  });

  it('TC-SAO-02 / PC-15: m11.log ghi đủ cặp event phiên theo đúng thứ tự, m11.save.good là bản copy dự phòng', async () => {
    const adapter = createNullAdapter();
    const trace = await runScriptedSession(adapter, 5);
    expect(trace.logEvents).toEqual([
      'session_start',
      'level_complete',
      'undo_unavailable',
      'level_complete',
      'level_complete',
      'level_complete',
      'level_complete',
      'session_end',
    ]);
    expect(JSON.parse(adapter.storage.get('m11.log') as string)).toEqual(trace.logEvents);
    expect(adapter.storage.get('m11.save.good')).toBe(adapter.storage.get('m11.save'));
  });

  it('nhóm F (MockAds ghi thứ tự): 5 màn ⇒ đúng 1 rewarded undo + 4 interstitial, xen đúng nhịp', async () => {
    const { adapter, calls } = recordAdapterCalls(createNullAdapter());
    const trace = await runScriptedSession(adapter, 5);
    expect(trace.adRequests).toEqual([
      { place: 'interstitial', status: 'unavailable' },
      { place: 'undo', status: 'unavailable' },
      { place: 'interstitial', status: 'unavailable' },
      { place: 'interstitial', status: 'unavailable' },
      { place: 'interstitial', status: 'unavailable' },
    ]);
    expect(calls.filter((c) => c.method === 'ads.showRewarded')).toEqual([{ method: 'ads.showRewarded', args: ['undo'] }]);
    expect(calls.filter((c) => c.method === 'ads.showInterstitial')).toHaveLength(4);
    // nơi gọi không được phép hỏi "if (cóAds)" — không có lời gọi ads.available nào trong phiên
    expect(calls.some((c) => c.method === 'ads.available')).toBe(false);
  });

  it('TC-SAO-02 / TC-NET-04: m11.save + m11.log chết giữa phiên (ẩn danh) ⇒ vẫn đủ 5 màn, chỉ mất log/save', async () => {
    const dead: AnyAdapter = withDeadStorage(createNullAdapter(), ['m11.save', 'm11.log']);
    const trace = await runScriptedSession(dead, 5);
    expect(trace.levelsPlayed).toEqual([1, 2, 3, 4, 5]);
    expect(trace.states).toEqual(FIVE_LEVEL_STATES);
    expect(trace.errors).toEqual([
      'read m11.save',
      'write m11.log',
      'write m11.save',
      'write m11.log',
      'write m11.log',
      'write m11.save',
      'write m11.log',
      'write m11.save',
      'write m11.log',
      'write m11.save',
      'write m11.log',
      'write m11.save',
      'write m11.log',
      'write m11.log',
    ]);
    expect(trace.starsByLevel).toEqual({ '1': 3, '2': 3, '3': 3, '4': 3, '5': 3 });
    expect(dead.storage.get('m11.save.good')).toContain('"n":5');
  });
});
