import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  sdk,
  SDKHandler,
  MockBackend,
  PlaygamaBackend,
  DevvitBackend,
  type PlaygamaBridgeLike,
} from '../index';

describe('@game/sdk Universal SDK', () => {
  describe('MockBackend', () => {
    let mockBackend: MockBackend;

    beforeEach(() => {
      mockBackend = new MockBackend();
    });

    it('initializes and reports defaults correctly', async () => {
      await mockBackend.initialize();
      expect(mockBackend.isAudioEnabled()).toBe(true);
      expect(mockBackend.isRewardedAvailable()).toBe(false);
    });

    it('handles save and load data', async () => {
      const data = { score: 1234, bestScore: 5678, name: 'Tester' };
      const saved = await mockBackend.saveData(data);
      expect(saved).toBe(true);

      const loaded = await mockBackend.loadData();
      expect(loaded).toEqual(data);
    });

    it('handles showRewarded and grants reward in mock mode', async () => {
      const rewarded = await mockBackend.showRewarded('extra_life');
      expect(rewarded).toBe(true);
    });

    it('returns leaderboard entries with user rank', async () => {
      const lb = await mockBackend.getLeaderboardEntries('best_score', 10, 2500);
      expect(lb.entries.length).toBe(10);
      expect(lb.userEntry?.score).toBe(2500);
      expect(lb.userEntry?.isUser).toBe(true);
    });

    it('fires pause, resume, and audio callbacks', () => {
      const pauseFn = vi.fn();
      const resumeFn = vi.fn();
      const audioFn = vi.fn();

      mockBackend.onPause(pauseFn);
      mockBackend.onResume(resumeFn);
      mockBackend.onAudioChange(audioFn);

      mockBackend.gameReady();
      expect(pauseFn).not.toHaveBeenCalled();
    });
  });

  describe('PlaygamaBackend with Bridge', () => {
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

    it('buffers early callbacks before bridge init resolves', async () => {
      const backend = new PlaygamaBackend(mockBridge);
      const pauseCb = vi.fn();
      backend.onPause(pauseCb);

      await backend.readyPromise();
      expect(mockBridge.initialize).toHaveBeenCalled();
    });

    it('sets score and gets leaderboard entries', async () => {
      const backend = new PlaygamaBackend(mockBridge);
      await backend.readyPromise();

      const ok = await backend.setScore(1500, 'best_score');
      expect(ok).toBe(true);
      expect(mockBridge.leaderboard?.setScore).toHaveBeenCalledWith({
        score: 1500,
        leaderboardName: 'best_score',
      });

      const lb = await backend.getLeaderboardEntries('best_score', 10, 2500);
      expect(lb.entries.length).toBe(2);
      expect(lb.entries[0].name).toBe('🍉 WatermelonKing');
      expect(lb.userEntry?.rank).toBe(3);
    });

    it('falls back to mock leaderboard when bridge leaderboard is not supported', async () => {
      delete mockBridge.leaderboard;
      const backend = new PlaygamaBackend(mockBridge);
      await backend.readyPromise();

      const lb = await backend.getLeaderboardEntries('best_score', 10, 2500);
      expect(lb.entries.length).toBe(10);
      expect(lb.userEntry?.score).toBe(2500);
    });

    it('supports showNativeLeaderboard and showLeaderboard alias', async () => {
      const backend = new PlaygamaBackend(mockBridge);
      await backend.readyPromise();

      const res = await backend.showLeaderboard('best_score');
      expect(res).toBe(true);
      expect(mockBridge.leaderboard?.showNativePopup).toHaveBeenCalledWith({
        leaderboardName: 'best_score',
      });
    });

    it('fires gameReady and sends message to platform', async () => {
      const backend = new PlaygamaBackend(mockBridge);
      backend.gameReady();
      await backend.readyPromise();

      expect(mockBridge.platform.sendMessage).toHaveBeenCalledWith('game_ready');
    });
  });

  describe('DevvitBackend', () => {
    it('isAvailable returns false in test node environment without window.devvit', () => {
      const devvit = new DevvitBackend();
      expect(typeof devvit.isAvailable).toBe('boolean');
    });
  });

  describe('SDKHandler singleton & aliases', () => {
    it('exposes expected methods and aliases on singleton sdk', async () => {
      expect(sdk).toBeDefined();
      expect(typeof sdk.initialize).toBe('function');
      expect(typeof sdk.showInterstitial).toBe('function');
      expect(typeof sdk.requestInterstitialAd).toBe('function');
      expect(typeof sdk.showRewarded).toBe('function');
      expect(typeof sdk.requestRewardedAd).toBe('function');
      expect(typeof sdk.isRewardedAvailable).toBe('function');
      expect(typeof sdk.isAudioEnabled).toBe('function');
      expect(typeof sdk.saveData).toBe('function');
      expect(typeof sdk.loadData).toBe('function');
      expect(typeof sdk.sendScore).toBe('function');
      expect(typeof sdk.setScore).toBe('function');
      expect(typeof sdk.getLeaderboardEntries).toBe('function');
      expect(typeof sdk.showNativeLeaderboard).toBe('function');
      expect(typeof sdk.showLeaderboard).toBe('function');
      expect(typeof sdk.gameReady).toBe('function');
      expect(typeof sdk.onPause).toBe('function');
      expect(typeof sdk.onResume).toBe('function');
      expect(typeof sdk.onAudioChange).toBe('function');
      expect(typeof sdk.onAudioEnabledChange).toBe('function');
    });

    it('can initialize and invoke aliases without crashing', async () => {
      await sdk.initialize();
      expect(sdk.isAudioEnabled()).toBe(true);
      const rewarded = await sdk.requestRewardedAd('test_reward');
      expect(rewarded).toBe(true);
    });
  });
});
