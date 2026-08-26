/**
 * Mock backend for local development.
 * Simulates all SDK operations without real ads/platform calls.
 */
import type { SDKBackend } from './index';
import type { LeaderboardData } from './types';

export class MockBackend implements SDKBackend {
  private _audioEnabled = true;
  private pauseCallbacks: (() => void)[] = [];
  private resumeCallbacks: (() => void)[] = [];
  private audioCallbacks: ((enabled: boolean) => void)[] = [];
  private _data: Record<string, unknown> = {};

  async initialize(): Promise<void> {
    console.log('[SDK Mock] Initialized');
  }

  async showInterstitial(): Promise<void> {
    console.log('[SDK Mock] Interstitial shown (mock)');
  }

  async showRewarded(): Promise<boolean> {
    console.log('[SDK Mock] Rewarded ad — auto-granting reward');
    return true;
  }

  isRewardedAvailable(): boolean {
    return false; // Mock: no real ads
  }

  isAudioEnabled(): boolean {
    return this._audioEnabled;
  }

  async saveData(data: Record<string, unknown>): Promise<void> {
    this._data = { ...this._data, ...data };
    try {
      localStorage.setItem('game_save', JSON.stringify(this._data));
    } catch { /* ignore */ }
  }

  async loadData(): Promise<Record<string, unknown>> {
    try {
      const raw = localStorage.getItem('game_save');
      if (raw) {
        this._data = JSON.parse(raw);
      }
    } catch { /* ignore */ }
    return { ...this._data };
  }

  async sendScore(_score: number): Promise<void> {
    console.log(`[SDK Mock] Score sent: ${_score}`);
  }

  async setScore(score: number, _leaderboardName?: string): Promise<boolean> {
    console.log(`[SDK Mock] Score set: ${score}`);
    return true;
  }

  async getLeaderboardEntries(
    _leaderboardName?: string,
    _quantityTop?: number,
    userScore?: number
  ): Promise<LeaderboardData> {
    const mockPlayers = [
      { name: '🍉 WatermelonKing', score: 3850 },
      { name: '🐉 DragonMaster', score: 3120 },
      { name: '🍍 PineQueen', score: 2680 },
      { name: '🍇 GrapeNinja', score: 2150 },
      { name: '🍓 BerryPop', score: 1820 },
      { name: '🍑 PeachLover', score: 1450 },
      { name: '🍊 JuicyChamp', score: 1180 },
      { name: '🍎 RedApple', score: 920 },
      { name: '🍐 GreenPear', score: 650 },
      { name: '🍒 SweetCherry', score: 420 },
    ];
    const allList = [...mockPlayers, { name: '⭐ You (Me)', score: userScore ?? 0, isUser: true }];
    allList.sort((a, b) => b.score - a.score);
    const userIndex = allList.findIndex(p => (p as any).isUser);
    return {
      entries: allList.slice(0, 10).map((p, idx) => ({
        name: p.name,
        score: p.score,
        rank: idx + 1,
        isUser: Boolean((p as any).isUser),
      })),
      userEntry: { name: '⭐ You (Me)', score: userScore ?? 0, rank: Math.max(userIndex + 1, 1), isUser: true },
    };
  }

  async showNativeLeaderboard(_leaderboardName?: string): Promise<boolean> {
    console.log('[SDK Mock] Native leaderboard (mock)');
    return false;
  }

  gameReady(): void {
    console.log('[SDK Mock] Game ready');
  }

  onPause(cb: () => void): void {
    this.pauseCallbacks.push(cb);
  }

  onResume(cb: () => void): void {
    this.resumeCallbacks.push(cb);
  }

  onAudioChange(cb: (enabled: boolean) => void): void {
    this.audioCallbacks.push(cb);
  }
}