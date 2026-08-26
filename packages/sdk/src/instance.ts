/**
 * Mock backend for local development.
 * Simulates all SDK operations without real ads/platform calls.
 */
import type { SDKBackend } from './index';

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

  isAudioEnabled(): boolean {
    return this._audioEnabled;
  }

  async saveData(data: Record<string, unknown>): Promise<void> {
    this._data = { ...this._data, ...data };
    // Persist to localStorage as fallback
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