/**
 * Playgama Bridge backend — advanced version with leaderboard support.
 *
 * Wraps window.bridge (Playgama Bridge SDK v2).
 * Buffers all calls until initialize() resolves (bridge throws if used before init).
 *
 * Features:
 * - Interstitial + Rewarded ads (event-driven)
 * - Leaderboard (setScore, getEntries, showNativePopup)
 * - Storage (save/load)
 * - Lifecycle (pause/resume/audio)
 * - Mock fallback when bridge unsupported
 */

import type { SDKBackend } from './index';
import type { LeaderboardData, LeaderboardEntry } from './types';

// Playgama bridge event names
const EVENT = {
  PAUSE_STATE_CHANGED: 'pause_state_changed',
  AUDIO_STATE_CHANGED: 'audio_state_changed',
  INTERSTITIAL_STATE_CHANGED: 'interstitial_state_changed',
  REWARDED_STATE_CHANGED: 'rewarded_state_changed',
};

// Bridge v2 interface
export interface PlaygamaBridgeLike {
  initialize(): Promise<void>;
  EVENT_NAME?: Record<string, string>;
  platform: {
    language?: string;
    isAudioEnabled?: boolean;
    isPaused?: boolean;
    sendMessage(name: string, params?: Record<string, unknown>): void;
  };
  storage: {
    get(keys: string[]): Promise<(unknown | null)[] | Record<string, unknown>>;
    set(keys: string[], values: unknown[]): Promise<void>;
    delete(keys: string[]): Promise<void>;
  };
  advertisement: {
    isInterstitialSupported?: boolean;
    isRewardedSupported?: boolean;
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

export class PlaygamaBackend implements SDKBackend {
  private bridge: PlaygamaBridgeLike | null = null;
  private ready = false;
  private initPromise: Promise<void>;
  private audioOn = true;

  // Buffer for calls made before init
  private pendingOnPause: Array<() => void> = [];
  private pendingOnResume: Array<() => void> = [];
  private pendingAudio: Array<(enabled: boolean) => void> = [];
  private pendingRewardedResolve: ((value: boolean) => void) | null = null;

  constructor(bridge?: PlaygamaBridgeLike | null) {
    this.bridge = bridge !== undefined ? bridge : getBridge();
    this.initPromise = this._doInit();
  }

  async initialize(): Promise<void> {
    return this.initPromise;
  }

  readyPromise(): Promise<void> {
    return this.initPromise;
  }

  private async _doInit(): Promise<void> {
    if (!this.bridge) {
      this.ready = true;
      return;
    }

    try {
      await Promise.resolve(this.bridge.initialize());
    } catch (e) {
      console.warn('[Playgama] Bridge init error (mock/unsupported?):', e);
    }

    // Read audio state after init
    try {
      this.audioOn = this.bridge.platform.isAudioEnabled !== false;
    } catch { /* keep default */ }

    this.ready = true;

    // Flush pending callbacks
    this.pendingOnPause.forEach((cb) => this._subscribePause(cb, true));
    this.pendingOnResume.forEach((cb) => this._subscribePause(cb, false));
    this.pendingAudio.forEach((cb) => this._subscribeAudio(cb));
    this.pendingOnPause = [];
    this.pendingOnResume = [];
    this.pendingAudio = [];

    // Wire rewarded event
    try {
      const evtName = this.bridge.EVENT_NAME?.REWARDED_STATE_CHANGED ?? EVENT.REWARDED_STATE_CHANGED;
      this.bridge.advertisement.on(evtName, (state: unknown) => {
        if (state === 'rewarded' && this.pendingRewardedResolve) {
          this.pendingRewardedResolve(true);
          this.pendingRewardedResolve = null;
        } else if ((state === 'closed' || state === 'failed') && this.pendingRewardedResolve) {
          this.pendingRewardedResolve(false);
          this.pendingRewardedResolve = null;
        }
      });
    } catch { /* no-op */ }
  }

  private _subscribePause(cb: () => void, wantTrue: boolean): void {
    try {
      const evtName = this.bridge?.EVENT_NAME?.PAUSE_STATE_CHANGED ?? EVENT.PAUSE_STATE_CHANGED;
      this.bridge?.advertisement.on(evtName, (v: unknown) => {
        if (v === wantTrue) {
          try { cb(); } catch { /* listener error protection */ }
        }
      });
    } catch { /* no-op */ }
  }

  private _subscribeAudio(cb: (enabled: boolean) => void): void {
    try {
      const evtName = this.bridge?.EVENT_NAME?.AUDIO_STATE_CHANGED ?? EVENT.AUDIO_STATE_CHANGED;
      this.bridge?.advertisement.on(evtName, (v: unknown) => {
        this.audioOn = v !== false;
        try { cb(this.audioOn); } catch { /* listener error protection */ }
      });
    } catch { /* no-op */ }
  }

  gameReady(): void {
    if (!this.ready || !this.bridge) {
      if (this.initPromise) {
        this.initPromise.then(() => this._fireGameReady()).catch(() => {});
      }
      return;
    }
    this._fireGameReady();
  }

  private _fireGameReady(): void {
    try { this.bridge?.platform.sendMessage('game_ready'); } catch { /* no-op */ }
  }

  onPause(cb: () => void): void {
    if (!this.ready) { this.pendingOnPause.push(cb); return; }
    this._subscribePause(cb, true);
  }

  onResume(cb: () => void): void {
    if (!this.ready) { this.pendingOnResume.push(cb); return; }
    this._subscribePause(cb, false);
  }

  isAudioEnabled(): boolean {
    return this.audioOn;
  }

  onAudioChange(cb: (enabled: boolean) => void): void {
    if (!this.ready) { this.pendingAudio.push(cb); return; }
    this._subscribeAudio(cb);
  }

  onAudioEnabledChange(cb: (enabled: boolean) => void): void {
    this.onAudioChange(cb);
  }

  async showInterstitial(): Promise<void> {
    if (!this.ready || !this.bridge) return;
    if (this.bridge.advertisement?.isInterstitialSupported === false) return;
    return new Promise<void>((resolve) => {
      let settled = false;
      const done = () => { if (!settled) { settled = true; resolve(); } };
      const sub = (state: unknown) => { if (state === 'closed' || state === 'failed') done(); };
      try {
        const evtName = this.bridge!.EVENT_NAME?.INTERSTITIAL_STATE_CHANGED ?? EVENT.INTERSTITIAL_STATE_CHANGED;
        this.bridge!.advertisement.on(evtName, sub);
        this.bridge!.advertisement.showInterstitial();
      } catch { done(); }
      setTimeout(done, 15000);
    });
  }

  async requestInterstitialAd(): Promise<void> {
    return this.showInterstitial();
  }

  async showRewarded(placement?: string): Promise<boolean> {
    if (!this.ready || !this.bridge) return true;
    if (this.bridge.advertisement?.isRewardedSupported === false) return true;
    return new Promise<boolean>((resolve) => {
      let settled = false;
      const settle = (val: boolean) => { if (!settled) { settled = true; resolve(val); } };
      const sub = (state: unknown) => {
        if (state === 'rewarded') settle(true);
        else if (state === 'closed' || state === 'failed') settle(false);
      };
      try {
        const evtName = this.bridge!.EVENT_NAME?.REWARDED_STATE_CHANGED ?? EVENT.REWARDED_STATE_CHANGED;
        this.bridge!.advertisement.on(evtName, sub);
        this.bridge!.advertisement.showRewarded(placement);
      } catch { settle(true); }
      setTimeout(() => settle(true), 30000);
    });
  }

  async requestRewardedAd(placement?: string): Promise<boolean> {
    return this.showRewarded(placement);
  }

  isRewardedAvailable(): boolean {
    if (!this.ready || !this.bridge) return false;
    return this.bridge.advertisement?.isRewardedSupported !== false;
  }

  async saveData(data: unknown): Promise<boolean> {
    await this.initPromise;

    const jsonStr = typeof data === 'string' ? data : JSON.stringify(data);

    // Save to localStorage as immediate local cache
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('game_save', jsonStr);
      }
    } catch { /* ignore */ }

    if (this.bridge && this.bridge.storage && typeof this.bridge.storage.set === 'function') {
      try {
        await this.bridge.storage.set([LOCAL_KEY], [jsonStr]);
        return true;
      } catch (e) {
        try {
          await (this.bridge.storage.set as any)(LOCAL_KEY, jsonStr);
          return true;
        } catch (e2) {
          console.warn('[Playgama] bridge.storage.set failed', e, e2);
        }
      }
    }

    return true;
  }

  async loadData(): Promise<unknown | null> {
    await this.initPromise;

    if (this.bridge && this.bridge.storage && typeof this.bridge.storage.get === 'function') {
      try {
        let res: unknown = null;
        try {
          res = await this.bridge.storage.get([LOCAL_KEY]);
        } catch {
          res = await (this.bridge.storage.get as any)(LOCAL_KEY);
        }

        let raw: unknown = null;
        if (Array.isArray(res)) {
          raw = res[0];
        } else if (res && typeof res === 'object') {
          raw = (res as Record<string, unknown>)[LOCAL_KEY] ?? (res as Record<string, unknown>)['0'] ?? res;
        } else if (res != null) {
          raw = res;
        }

        if (raw != null) {
          let parsed: unknown = raw;
          if (typeof raw === 'string') {
            try { parsed = JSON.parse(raw); } catch { parsed = raw; }
          }
          if (parsed != null) {
            try {
              if (typeof window !== 'undefined' && window.localStorage) {
                localStorage.setItem('game_save', typeof raw === 'string' ? raw : JSON.stringify(raw));
              }
            } catch { /* ignore */ }
            return parsed;
          }
        }
      } catch (e) {
        console.warn('[Playgama] loadData failed, fallback localStorage', e);
      }
    }

    try {
      const raw = localStorage.getItem('game_save');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  async sendScore(score: number, leaderboardName = DEFAULT_LEADERBOARD_NAME): Promise<void> {
    void this.setScore(score, leaderboardName);
  }

  async setScore(score: number, leaderboardName = DEFAULT_LEADERBOARD_NAME): Promise<boolean> {
    if (!this.ready || !this.bridge) return false;
    if (this.bridge.leaderboard?.isSupported && typeof this.bridge.leaderboard.setScore === 'function') {
      try {
        await this.bridge.leaderboard.setScore({ score, leaderboardName });
        return true;
      } catch (e) {
        console.warn('[Playgama] setScore failed', e);
      }
    }
    return false;
  }

  async getLeaderboardEntries(
    leaderboardName = DEFAULT_LEADERBOARD_NAME,
    quantityTop = 10,
    userScore = 0
  ): Promise<LeaderboardData> {
    if (this.ready && this.bridge?.leaderboard?.isSupported && typeof this.bridge.leaderboard.getEntries === 'function') {
      try {
        const raw = await this.bridge.leaderboard.getEntries({
          leaderboardName,
          quantityTop,
          includeUser: true,
          quantityAround: 3,
        });
        if (raw && typeof raw === 'object') {
          return this._normalizeLeaderboard(raw, userScore);
        }
      } catch (e) {
        console.warn('[Playgama] getEntries failed, fallback mock', e);
      }
    }
    return this._getMockLeaderboard(userScore);
  }

  async showNativeLeaderboard(leaderboardName = DEFAULT_LEADERBOARD_NAME): Promise<boolean> {
    if (!this.ready || !this.bridge) return false;
    if (this.bridge.leaderboard?.isNativePopupSupported && typeof this.bridge.leaderboard.showNativePopup === 'function') {
      try {
        await this.bridge.leaderboard.showNativePopup({ leaderboardName });
        return true;
      } catch (e) {
        console.warn('[Playgama] showNativePopup failed', e);
      }
    }
    return false;
  }

  async showLeaderboard(leaderboardName = DEFAULT_LEADERBOARD_NAME): Promise<boolean> {
    return this.showNativeLeaderboard(leaderboardName);
  }

  private _normalizeLeaderboard(raw: unknown, userScore: number): LeaderboardData {
    const list = Array.isArray((raw as Record<string, unknown>).entries)
      ? (raw as { entries: Array<Record<string, unknown>> }).entries
      : Array.isArray(raw)
      ? (raw as Array<Record<string, unknown>>)
      : [];

    if (list.length === 0) return this._getMockLeaderboard(userScore);

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

    const rawUser = (raw as Record<string, unknown>).userEntry as Record<string, unknown> | undefined;
    const userEntry: LeaderboardEntry | null = rawUser ? {
      id: (rawUser.id as string | number) ?? 'me',
      name: String(rawUser.name || 'You'),
      score: Number(rawUser.score || userScore),
      rank: Number(rawUser.rank || 1),
      isUser: true,
    } : entries.find(e => e.isUser) ?? {
      id: 'me',
      name: 'You',
      score: userScore,
      rank: entries.findIndex(e => e.score <= userScore) + 1 || entries.length + 1,
      isUser: true,
    };

    return { entries, userEntry };
  }

  private _getMockLeaderboard(userScore: number): LeaderboardData {
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
    const allList = [...mockPlayers, { name: '⭐ You (Me)', score: userScore, isUser: true }];
    allList.sort((a, b) => b.score - a.score);
    const userIndex = allList.findIndex(p => (p as { isUser?: boolean }).isUser);
    return {
      entries: allList.slice(0, 10).map((p, idx) => ({
        name: p.name,
        score: p.score,
        rank: idx + 1,
        isUser: Boolean((p as { isUser?: boolean }).isUser),
      })),
      userEntry: { name: '⭐ You (Me)', score: userScore, rank: Math.max(userIndex + 1, 1), isUser: true },
    };
  }
}