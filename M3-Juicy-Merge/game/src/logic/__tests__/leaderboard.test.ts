import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlaygamaBackend, type PlaygamaBridgeLike } from '../../sdk-bridge-backend';
import { SdkHandler } from '../../sdk-handler';

describe('Playgama Leaderboard Integration', () => {
  let mockBridge: PlaygamaBridgeLike;

  beforeEach(() => {
    mockBridge = {
      initialize: vi.fn().mockResolvedValue(undefined),
      EVENT_NAME: {
        AUDIO_STATE_CHANGED: 'audio_state_changed',
        PAUSE_STATE_CHANGED: 'pause_state_changed',
        INTERSTITIAL_STATE_CHANGED: 'interstitial_state_changed',
        REWARDED_STATE_CHANGED: 'rewarded_state_changed',
      },
      platform: {
        language: 'en',
        isAudioEnabled: true,
        isPaused: false,
        sendMessage: vi.fn(),
      },
      storage: {
        get: vi.fn().mockResolvedValue([]),
        set: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
      },
      advertisement: {
        isInterstitialSupported: true,
        isRewardedSupported: true,
        showInterstitial: vi.fn(),
        showRewarded: vi.fn(),
        on: vi.fn(),
      },
      leaderboard: {
        isSupported: true,
        isNativePopupSupported: true,
        setScore: vi.fn().mockResolvedValue(undefined),
        getEntries: vi.fn().mockResolvedValue({
          entries: [
            { id: 1, name: '🍉 WatermelonKing', score: 3850, rank: 1 },
            { id: 2, name: '🐉 DragonMaster', score: 3120, rank: 2 },
          ],
          userEntry: { id: 'me', name: 'You', score: 2500, rank: 3 },
        }),
        showNativePopup: vi.fn().mockResolvedValue(undefined),
      },
    };
  });

  it('setScore should call bridge.leaderboard.setScore when supported', async () => {
    const backend = new PlaygamaBackend(mockBridge);
    await backend.readyPromise();

    const ok = await backend.setScore(1500, 'best_score');
    expect(ok).toBe(true);
    expect(mockBridge.leaderboard?.setScore).toHaveBeenCalledWith({
      score: 1500,
      leaderboardName: 'best_score',
    });
  });

  it('getLeaderboardEntries should parse and format bridge entries', async () => {
    const backend = new PlaygamaBackend(mockBridge);
    await backend.readyPromise();

    const data = await backend.getLeaderboardEntries('best_score', 10, 2500);
    expect(data.entries.length).toBe(2);
    expect(data.entries[0].name).toBe('🍉 WatermelonKing');
    expect(data.entries[0].score).toBe(3850);
    expect(data.userEntry?.rank).toBe(3);
    expect(data.userEntry?.score).toBe(2500);
  });

  it('fallback mock leaderboard should return sorted top 10 and calculate user rank', async () => {
    delete mockBridge.leaderboard;
    const backend = new PlaygamaBackend(mockBridge);
    await backend.readyPromise();

    const data = await backend.getLeaderboardEntries('best_score', 10, 2500);
    expect(data.entries.length).toBe(10);
    expect(data.entries[0].score).toBeGreaterThanOrEqual(data.entries[1].score);
    expect(data.userEntry).toBeDefined();
    expect(data.userEntry?.score).toBe(2500);
    // User with 2500 score should rank above 2150 and below 2680 (Rank 4)
    expect(data.userEntry?.rank).toBe(4);
  });

  it('showNativeLeaderboard should invoke bridge.leaderboard.showNativePopup', async () => {
    const backend = new PlaygamaBackend(mockBridge);
    await backend.readyPromise();

    const res = await backend.showNativeLeaderboard('best_score');
    expect(res).toBe(true);
    expect(mockBridge.leaderboard?.showNativePopup).toHaveBeenCalledWith({
      leaderboardName: 'best_score',
    });
  });
});
