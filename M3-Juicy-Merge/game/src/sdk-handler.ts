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

const LOCAL_STORAGE_KEY = 'juicy_merge_save_v1';

export class SdkHandler {
  private ytgame: YtGame | null;

  constructor() {
    this.ytgame = typeof window !== 'undefined' ? (window.ytgame ?? null) : null;
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

  // BR-11: saveData with local storage fallback (hoạt động hoàn hảo cả trên YouTube lẫn Web thường)
  async saveData(data: unknown): Promise<boolean> {
    const jsonStr = JSON.stringify(data);
    // Luôn ghi một bản cache vào localStorage để không bao giờ bị mất dữ liệu khi test trên web
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(LOCAL_STORAGE_KEY, jsonStr);
      }
    } catch (e) {
      console.warn('localStorage save failed', e);
    }

    if (this.ytgame && typeof this.ytgame.saveData === 'function') {
      try {
        await this.ytgame.saveData(jsonStr);
        return true;
      } catch (e) {
        console.warn('ytgame.saveData failed, using local storage cache', e);
        return false;
      }
    }
    return true;
  }

  // BR-11: loadData with local storage fallback
  async loadData(): Promise<unknown | null> {
    if (this.ytgame && typeof this.ytgame.loadData === 'function') {
      try {
        const raw = await this.ytgame.loadData();
        if (raw) {
          const parsed = JSON.parse(raw);
          try {
            if (typeof window !== 'undefined' && window.localStorage) {
              window.localStorage.setItem(LOCAL_STORAGE_KEY, raw);
            }
          } catch {}
          return parsed;
        }
      } catch (e) {
        console.warn('ytgame.loadData failed, trying local storage', e);
      }
    }

    // Fallback đọc từ localStorage khi chạy trên trình duyệt web thường
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const localRaw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
        if (localRaw) {
          return JSON.parse(localRaw);
        }
      }
    } catch (e) {
      console.warn('localStorage load failed', e);
    }
    return null;
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
