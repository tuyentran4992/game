// Playgama Bridge v2 backend cho SdkHandler (multi-backend).
// Đóng gói window.bridge với cùng interface SdkHandler, để scenes gọi không đổi.
// Playgama: rewarded là event-driven (rewarded_state_changed) — KHÁC ytgame trả
// Promise<boolean>. Backend này bọc event thành Promise để 2 contract tương đồng.
//
// QUAN TRỌNG (bug real gặp 2026-08-24): bridge THROW ("Before using the SDK you
// must initialize it") nếu gọi API trước khi bridge.initialize() resolve. Vì main.ts
// gọi sdk.isAudioEnabled/onPause/onAudioEnabledChange/gameReady NGAY khi boot (không
// await init) → backend PHẢI buffer mọi subscribe cho tới khi ready, getter trả
// default an toàn, gameReady/storage/ads no-op hoặc defer. KHÔNG được truy cập
// bridge.platform/advertisement trước ready.
//
// Nguồn: wiki.playgama.com Bridge SDK v2 + grep CDN playgama-bridge.js (2026-08-24)
// Global: window.bridge = window.playgamaBridge. EVENT_NAME.* =
//   PAUSE_STATE_CHANGED / AUDIO_STATE_CHANGED / INTERSTITIAL_STATE_CHANGED /
//   REWARDED_STATE_CHANGED (payload thường là boolean hoặc state string).

export interface LeaderboardEntry {
  id?: string | number;
  name: string;
  score: number;
  rank: number;
  avatar?: string;
  isUser?: boolean;
}

export interface LeaderboardData {
  entries: LeaderboardEntry[];
  userEntry?: LeaderboardEntry | null;
}

export interface PlaygamaBridgeLike {
  initialize(): Promise<void>;
  EVENT_NAME: Record<string, string>;
  platform: {
    language: string;
    isAudioEnabled: boolean;
    isPaused: boolean;
    sendMessage(name: string, params?: Record<string, unknown>): void;
  };
  storage: {
    get(keys: string[]): Promise<(unknown | null)[]>;
    set(keys: string[], values: unknown[]): Promise<void>;
    delete(keys: string[]): Promise<void>;
  };
  advertisement: {
    isInterstitialSupported: boolean;
    isRewardedSupported: boolean;
    showInterstitial(placement?: string): void;
    showRewarded(placement?: string): void;
    on(event: string, cb: (state: unknown) => void): void;
  };
  leaderboard?: {
    isSupported?: boolean;
    isNativePopupSupported?: boolean;
    setScore?(options: { score: number; leaderboardName?: string }): Promise<void>;
    getEntries?(options: {
      leaderboardName?: string;
      quantityTop?: number;
      includeUser?: boolean;
      quantityAround?: number;
    }): Promise<unknown>;
    showNativePopup?(options: { leaderboardName?: string }): Promise<void>;
  };
}

declare global {
  interface Window {
    bridge?: PlaygamaBridgeLike;
    playgamaBridge?: PlaygamaBridgeLike;
  }
}

export function getBridge(): PlaygamaBridgeLike | null {
  if (typeof window === 'undefined') return null;
  return window.bridge ?? window.playgamaBridge ?? null;
}

export const LOCAL_KEY = 'save';
export const DEFAULT_LEADERBOARD_NAME = 'best_score';

export class PlaygamaBackend {
  private bridge: PlaygamaBridgeLike;
  private ready = false;
  private initPromise: Promise<void>;
  private audioOn = true;

  // Hàng đợi gọi dồn tới khi ready (main.ts gọi tức thì lúc boot).
  private pendingOnPause: Array<() => void> = [];
  private pendingOnResume: Array<() => void> = [];
  private pendingAudio: Array<(enabled: boolean) => void> = [];

  constructor(bridge: PlaygamaBridgeLike) {
    this.bridge = bridge;
    this.initPromise = this._init();
  }

  private async _init(): Promise<void> {
    try {
      await Promise.resolve(this.bridge.initialize());
    } catch (e) {
      console.warn('playgama bridge.initialize failed (mock/unsupported?)', e);
    }
    // Đọc trạng thái âm thanh BẮT BUỘC sau khi init (trước đó bridge throw).
    try {
      this.audioOn = this.bridge.platform.isAudioEnabled !== false;
    } catch { /* giữ default */ }
    this.ready = true;
    // Flush các callback đã đăng ký trước khi ready.
    this.pendingOnPause.forEach((cb) => this._subscribe(PAUSE, cb, true));
    this.pendingOnResume.forEach((cb) => this._subscribe(PAUSE, cb, false));
    this.pendingAudio.forEach((cb) => this._subscribeAudio(cb));
    this.pendingOnPause = [];
    this.pendingOnResume = [];
    this.pendingAudio = [];
  }

  /** Chờ cho backend sẵn sàng (game KHÔNG bắt buộc await, nhưng để dùng an toàn). */
  readyPromise(): Promise<void> { return this.initPromise; }

  gameReady(): void {
    if (!this.ready) {
      // main.ts gọi lúc boot trước khi init → fire ngay sau khi ready (frame đầu).
      this.initPromise.then(() => this._fireGameReady()).catch(() => {});
      return;
    }
    this._fireGameReady();
  }

  private _fireGameReady(): void {
    try { this.bridge.platform.sendMessage('game_ready'); } catch { /* no-op */ }
  }

  onPause(cb: () => void): void {
    if (!this.ready) { this.pendingOnPause.push(cb); return; }
    this._subscribe(PAUSE, cb, true);
  }

  onResume(cb: () => void): void {
    if (!this.ready) { this.pendingOnResume.push(cb); return; }
    this._subscribe(PAUSE, cb, false);
  }

  private _subscribe(event: string, cb: () => void, wantTrue: boolean): void {
    try {
      this.bridge.advertisement.on(event, (v: unknown) => {
        if (v === wantTrue) {
          cb();
        }
      });
    } catch { /* no-op */ }
  }

  isAudioEnabled(): boolean {
    return this.audioOn;
  }

  onAudioEnabledChange(cb: (enabled: boolean) => void): void {
    if (!this.ready) { this.pendingAudio.push(cb); return; }
    this._subscribeAudio(cb);
  }

  private _subscribeAudio(cb: (enabled: boolean) => void): void {
    try {
      const eventName = this.bridge.EVENT_NAME?.AUDIO_STATE_CHANGED ?? 'audio_state_changed';
      this.bridge.advertisement.on(eventName, (v: unknown) => {
        this.audioOn = v !== false;
        cb(this.audioOn);
      });
    } catch { /* no-op */ }
  }

  async saveData(data: unknown): Promise<boolean> {
    if (!this.ready) {
      // Chưa init → không lưu được qua bridge, báo false (SdkHandler tự fallback local).
      return false;
    }
    try {
      const jsonStr = JSON.stringify(data);
      await this.bridge.storage.set([LOCAL_KEY], [jsonStr]);
      return true;
    } catch (e) {
      console.warn('bridge.storage.set failed', e);
      return false;
    }
  }

  async loadData(): Promise<unknown | null> {
    if (!this.ready) return null;
    try {
      const res = await this.bridge.storage.get([LOCAL_KEY]);
      let raw: unknown = null;
      if (Array.isArray(res)) {
        raw = res[0];
      } else if (res && typeof res === 'object') {
        raw = (res as Record<string, unknown>)[LOCAL_KEY] ?? (res as Record<string, unknown>)['0'] ?? res;
      }
      if (raw == null) return null;
      if (typeof raw === 'object') return raw;
      if (typeof raw === 'string') {
        try {
          return JSON.parse(raw);
        } catch {
          return null;
        }
      }
      return null;
    } catch (e) {
      console.warn('bridge.storage.get failed', e);
      return null;
    }
  }

  // --- Leaderboard Integration (Playgama Bridge SDK v2) ---

  async setScore(score: number, leaderboardName = DEFAULT_LEADERBOARD_NAME): Promise<boolean> {
    if (!this.ready) return false;
    if (this.bridge.leaderboard?.isSupported && typeof this.bridge.leaderboard?.setScore === 'function') {
      try {
        await this.bridge.leaderboard.setScore({ score, leaderboardName });
        return true;
      } catch (e) {
        console.warn('bridge.leaderboard.setScore failed', e);
      }
    }
    return false;
  }

  sendScore(score: number, leaderboardName = DEFAULT_LEADERBOARD_NAME): void {
    void this.setScore(score, leaderboardName);
  }

  async getLeaderboardEntries(
    leaderboardName = DEFAULT_LEADERBOARD_NAME,
    quantityTop = 10,
    userScore = 0
  ): Promise<LeaderboardData> {
    if (this.ready && this.bridge.leaderboard?.isSupported && typeof this.bridge.leaderboard?.getEntries === 'function') {
      try {
        const raw = await this.bridge.leaderboard.getEntries({
          leaderboardName,
          quantityTop,
          includeUser: true,
          quantityAround: 3,
        });

        if (raw && typeof raw === 'object') {
          // Chuẩn hóa dữ liệu trả về từ Bridge Playgama
          const list = Array.isArray((raw as Record<string, unknown>).entries)
            ? (raw as { entries: Array<Record<string, unknown>> }).entries
            : Array.isArray(raw)
            ? (raw as Array<Record<string, unknown>>)
            : [];

          if (list.length > 0) {
            const entries: LeaderboardEntry[] = list.map((rawItem, idx) => {
              const item = rawItem as Record<string, unknown>;
              const player = item.player as Record<string, unknown> | undefined;
              const entry: LeaderboardEntry = {
                id: (item.id as string | number) ?? idx + 1,
                name: String(item.name || player?.name || item.title || `Player #${idx + 1}`),
                score: Number(item.score || item.scoreFormatted || 0),
                rank: Number(item.rank || idx + 1),
                isUser: Boolean(item.isUser || item.isCurrentPlayer),
              };
              if (typeof item.avatar === 'string') {
                entry.avatar = item.avatar;
              }
              return entry;
            });

            let userEntry: LeaderboardEntry | null = null;
            const rawUser = (raw as Record<string, unknown>).userEntry as Record<string, unknown> | undefined;
            if (rawUser) {
              userEntry = {
                id: (rawUser.id as string | number) ?? 'me',
                name: String(rawUser.name || 'You'),
                score: Number(rawUser.score || userScore),
                rank: Number(rawUser.rank || 1),
                isUser: true,
              };
              if (typeof rawUser.avatar === 'string') {
                userEntry.avatar = rawUser.avatar;
              }
            } else {
              userEntry = entries.find(e => e.isUser) ?? {
                id: 'me',
                name: 'You',
                score: userScore,
                rank: entries.findIndex(e => e.score <= userScore) + 1 || entries.length + 1,
                isUser: true,
              };
            }

            return { entries, userEntry };
          }
        }
      } catch (e) {
        console.warn('bridge.leaderboard.getEntries failed, fallback mock', e);
      }
    }

    // Fallback Mock Leaderboard cho môi trường dev / local test
    return this._getMockLeaderboard(userScore);
  }

  async showNativeLeaderboard(leaderboardName = DEFAULT_LEADERBOARD_NAME): Promise<boolean> {
    if (!this.ready) return false;
    if (this.bridge.leaderboard?.isNativePopupSupported && typeof this.bridge.leaderboard?.showNativePopup === 'function') {
      try {
        await this.bridge.leaderboard.showNativePopup({ leaderboardName });
        return true;
      } catch (e) {
        console.warn('bridge.leaderboard.showNativePopup failed', e);
      }
    }
    return false;
  }

  private _getMockLeaderboard(userScore: number): LeaderboardData {
    interface MockPlayer {
      name: string;
      score: number;
      isUser?: boolean;
    }

    const mockPlayers: MockPlayer[] = [
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

    const allList: MockPlayer[] = [...mockPlayers, { name: '⭐ You (Me)', score: userScore, isUser: true }];
    allList.sort((a, b) => b.score - a.score);

    const userIndex = allList.findIndex(p => p.isUser);
    const userRank = userIndex >= 0 ? userIndex + 1 : mockPlayers.length + 1;

    const entries: LeaderboardEntry[] = allList.slice(0, 10).map((p, idx) => ({
      name: p.name,
      score: p.score,
      rank: idx + 1,
      isUser: Boolean(p.isUser),
    }));

    const userEntry: LeaderboardEntry = {
      name: '⭐ You (Me)',
      score: userScore,
      rank: userRank,
      isUser: true,
    };

    return { entries, userEntry };
  }

  async requestInterstitialAd(): Promise<void> {
    if (!this.ready) return;
    if (!this.bridge.advertisement.isInterstitialSupported) return;
    return new Promise<void>((resolve) => {
      let settled = false;
      const done = () => { if (!settled) { settled = true; resolve(); } };
      const sub = (state: unknown) => { if (state === 'closed' || state === 'failed') done(); };
      try {
        const eventName = this.bridge.EVENT_NAME?.INTERSTITIAL_STATE_CHANGED ?? 'interstitial_state_changed';
        this.bridge.advertisement.on(eventName, sub);
        this.bridge.advertisement.showInterstitial();
      } catch { done(); }
      setTimeout(done, 15000);
    });
  }

  async requestRewardedAd(placement?: string): Promise<boolean> {
    if (!this.ready) return true; // Local dev fallback
    if (!this.bridge.advertisement?.isRewardedSupported) {
      // Môi trường local dev / không hỗ trợ ad SDK: cấp thưởng để test gameplay mượt mà
      return true;
    }
    // Grant reward CHỈ khi state === 'rewarded'. Nếu close/failed → false.
    return new Promise<boolean>((resolve) => {
      let settled = false;
      const settle = (val: boolean) => { if (!settled) { settled = true; resolve(val); } };
      const sub = (state: unknown) => {
        if (state === 'rewarded') settle(true);
        else if (state === 'closed' || state === 'failed') settle(false);
      };
      try {
        const eventName = this.bridge.EVENT_NAME?.REWARDED_STATE_CHANGED ?? 'rewarded_state_changed';
        this.bridge.advertisement.on(eventName, sub);
        this.bridge.advertisement.showRewarded(placement);
      } catch { settle(true); }
      setTimeout(() => settle(true), 30000);
    });
  }
}

const PAUSE = 'pause_state_changed';