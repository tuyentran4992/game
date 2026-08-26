// SdkHandler multi-backend — Playgama Bridge ưu tiên, fallback YouTube Playables
// (ytgame), fallback mock/localStorage cho dev local. Giữ NGUYÊN interface công
// khai để scenes (Gameplay/GameOver/Start/main.ts/context.ts) KHÔNG đổi.
// BR-04, BR-11. Tích hợp Playgama 2026-08-24 (xem docs/playgama-integration.md).

import { getBridge, PlaygamaBackend, type PlaygamaBridgeLike } from './sdk-bridge-backend';

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
  private bridge: PlaygamaBridgeLike | null = null;
  useBridge = false;

  constructor() {
    this.ytgame = typeof window !== 'undefined' ? (window.ytgame ?? null) : null;
    this.bridge = getBridge();
    // Ưu tiên Playgama nếu có (nộp qua Playgama đa nền tảng). Ngược lại dùng ytgame
    // (nộp thẳng Mediacube/YouTube). Bind backend trước để mọi method gọi đúng backend.
    if (this.bridge) {
      this.useBridge = true;
      this.pb = new PlaygamaBackend(this.bridge);
      // Backend tự gọi bridge.initialize() trong constructor (async) và buffer
      // mọi call/callback cho tới khi ready — không cần await ở đây.
    }
  }

  private pb: PlaygamaBackend | null = null;

  gameReady(): void {
    if (this.pb) { this.pb.gameReady(); return; }
    this.ytgame?.gameReady?.();
  }

  /** Đăng ký event sau khi bridge init — để game_ready gửi đúng vào frame đầu. */
  private _afterBridgeReady(fn: () => void): void {
    if (!this.pb) return;
    Promise.resolve(this.pb.readyPromise()).then(() => fn()).catch(() => {});
  }

  onPause(cb: () => void): void {
    if (this.pb) { this.pb.onPause(cb); return; }
    this.ytgame?.onPause?.(cb);
  }

  onResume(cb: () => void): void {
    if (this.pb) { this.pb.onResume(cb); return; }
    this.ytgame?.onResume?.(cb);
  }

  isAudioEnabled(): boolean {
    if (this.pb) return this.pb.isAudioEnabled();
    return this.ytgame?.isAudioEnabled?.() ?? true;
  }

  onAudioEnabledChange(cb: (enabled: boolean) => void): void {
    if (this.pb) { this.pb.onAudioEnabledChange(cb); return; }
    this.ytgame?.onAudioEnabledChange?.(cb);
  }

  // BR-11: saveData with local storage fallback (hoạt động cả trên YouTube lẫn Web thường)
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

    if (this.pb) return this.pb.saveData(data);

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
    if (this.pb) {
      const d = await this.pb.loadData();
      if (d != null) return d;
      // fallback local storage cache
      return this._readLocalCache();
    }

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

    return this._readLocalCache();
  }

  private _readLocalCache(): unknown | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const localRaw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
        if (localRaw) return JSON.parse(localRaw);
      }
    } catch (e) {
      console.warn('localStorage load failed', e);
    }
    return null;
  }

  sendScore(score: number, leaderboardName = 'best_score'): void {
    if (this.pb) { this.pb.sendScore(score, leaderboardName); return; }
    this.ytgame?.sendScore?.(score);
  }

  async setScore(score: number, leaderboardName = 'best_score'): Promise<boolean> {
    if (this.pb) return this.pb.setScore(score, leaderboardName);
    this.ytgame?.sendScore?.(score);
    return true;
  }

  async getLeaderboardEntries(leaderboardName = 'best_score', quantityTop = 10, userScore = 0) {
    if (this.pb) return this.pb.getLeaderboardEntries(leaderboardName, quantityTop, userScore);
    // Mock data khi chạy fallback
    return {
      entries: [
        { name: '🍉 WatermelonKing', score: 3850, rank: 1 },
        { name: '🐉 DragonMaster', score: 3120, rank: 2 },
        { name: '🍍 PineQueen', score: 2680, rank: 3 },
        { name: '🍇 GrapeNinja', score: 2150, rank: 4 },
        { name: '🍓 BerryPop', score: 1820, rank: 5 },
      ],
      userEntry: { name: '⭐ You (Me)', score: userScore, rank: 6, isUser: true },
    };
  }

  async showLeaderboard(leaderboardName = 'best_score'): Promise<boolean> {
    if (this.pb) return this.pb.showNativeLeaderboard(leaderboardName);
    return false;
  }

  async requestInterstitialAd(): Promise<void> {
    if (this.pb) { await this.pb.requestInterstitialAd(); return; }
    await this.ytgame?.ads?.requestInterstitialAd?.();
  }

  async requestRewardedAd(rewardId: string): Promise<boolean> {
    if (this.pb) return this.pb.requestRewardedAd(rewardId);
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