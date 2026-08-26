/**
 * SDK handler — auto-detects backend and exposes unified API.
 *
 * Priority: Playgama Bridge → Mock (local)
 */
import type { SDKBackend } from './index';
import { PlaygamaBackend } from './bridge-backend';
import { MockBackend } from './instance';

function detectBackend(): SDKBackend {
  if (typeof window !== 'undefined' && (window.bridge || window.playgamaBridge)) {
    return new PlaygamaBackend();
  }
  return new MockBackend();
}

class SDKHandler {
  private backend: SDKBackend;
  private _initialized = false;

  constructor() {
    this.backend = detectBackend();
  }

  async initialize(): Promise<void> {
    if (this._initialized) return;
    await this.backend.initialize();
    this._initialized = true;
    this.backend.gameReady();
  }

  async showInterstitial(): Promise<void> {
    try {
      await this.backend.showInterstitial();
    } catch (e) {
      console.warn('[SDK] Interstitial error:', e);
    }
  }

  async showRewarded(): Promise<boolean> {
    try {
      return await this.backend.showRewarded();
    } catch (e) {
      console.warn('[SDK] Rewarded error:', e);
      return true;
    }
  }

  isAudioEnabled(): boolean {
    return this.backend.isAudioEnabled();
  }

  async saveData(data: Record<string, unknown>): Promise<void> {
    try {
      await this.backend.saveData(data);
    } catch (e) {
      console.warn('[SDK] Save error:', e);
    }
  }

  async loadData(): Promise<Record<string, unknown>> {
    try {
      return await this.backend.loadData();
    } catch (e) {
      console.warn('[SDK] Load error:', e);
      return {};
    }
  }

  async sendScore(score: number): Promise<void> {
    try {
      await this.backend.sendScore(score);
    } catch (e) {
      console.warn('[SDK] SendScore error:', e);
    }
  }

  gameReady(): void {
    this.backend.gameReady();
  }

  onPause(cb: () => void): void {
    this.backend.onPause(cb);
  }

  onResume(cb: () => void): void {
    this.backend.onResume(cb);
  }

  onAudioChange(cb: (enabled: boolean) => void): void {
    this.backend.onAudioChange(cb);
  }
}

export const sdk = new SDKHandler();