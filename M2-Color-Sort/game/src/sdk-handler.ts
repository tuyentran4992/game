// YouTube Playables SDK handler (BR-04, BR-11)
// Wraps ytgame.* with safe fallbacks so local dev works without the SDK.

interface YtGame {
  gameReady(): void;
  onPause(cb: () => void): void;
  onResume(cb: () => void): void;
  isAudioEnabled(): boolean;
  onAudioEnabledChange(cb: (enabled: boolean) => void): void;
  saveData(data: string): Promise<void>;
  loadData(): Promise<string | null>;
  sendScore(score: number): void;
  ads: {
    requestInterstitialAd(): Promise<void>;
    requestRewardedAd(rewardId: string): Promise<boolean>;
  };
}

declare global {
  interface Window { ytgame?: YtGame; }
}

export class SdkHandler {
  private ytgame: YtGame | null;

  constructor() {
    this.ytgame = window.ytgame ?? null;
  }

  gameReady(): void {
    this.ytgame?.gameReady?.();
  }

  onPause(cb: () => void): void {
    this.ytgame?.onPause?.(cb);
  }

  onResume(cb: () => void): void {
    this.ytgame?.onResume?.(cb);
  }

  isAudioEnabled(): boolean {
    return this.ytgame?.isAudioEnabled?.() ?? true;
  }

  onAudioEnabledChange(cb: (enabled: boolean) => void): void {
    this.ytgame?.onAudioEnabledChange?.(cb);
  }

  // BR-11: saveData with error fallback (no crash on failure)
  async saveData(data: unknown): Promise<boolean> {
    try {
      await this.ytgame?.saveData?.(JSON.stringify(data));
      return true;
    } catch (e) {
      console.warn('saveData failed, using current session', e);
      return false;
    }
  }

  // BR-11: loadData with error fallback
  async loadData(): Promise<unknown | null> {
    try {
      const raw = await this.ytgame?.loadData?.();
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.warn('loadData failed, starting fresh', e);
      return null;
    }
  }

  sendScore(score: number): void {
    this.ytgame?.sendScore?.(score);
  }

  async requestInterstitialAd(): Promise<void> {
    await this.ytgame?.ads?.requestInterstitialAd?.();
  }

  async requestRewardedAd(rewardId: string): Promise<boolean> {
    if (!this.ytgame) {
      // Fallback local dev: luôn cấp thưởng để test gameplay mượt mà
      return true;
    }
    try {
      return await this.ytgame.ads?.requestRewardedAd?.(rewardId) ?? true;
    } catch {
      return false;
    }
  }
}
