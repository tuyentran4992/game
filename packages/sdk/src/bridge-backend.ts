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
  PAUSE_STATE_CHANGED: 'PAUSE_STATE_CHANGED',
  AUDIO_STATE_CHANGED: 'AUDIO_STATE_CHANGED',
  INTERSTITIAL_STATE_CHANGED: 'INTERSTITIAL_STATE_CHANGED',
  REWARDED_STATE_CHANGED: 'REWARDED_STATE_CHANGED',
};

// Bridge v2 interface
interface PlaygamaBridgeLike {
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

function getBridge(): PlaygamaBridgeLike | null {
  if (typeof window === 'undefined') return null;
  return window.bridge ?? window.playgamaBridge ?? null;
}

const LOCAL_KEY = 'save';
const DEFAULT_LEADERBOARD_NAME = 'best_score';

export class PlaygamaBackend implements SDKBackend {
  private bridge: PlaygamaBridgeLike | null = null;
  private ready = false;
  private initPromise: Promise<void> | null = null;
  private audioOn = true;

  // Buffer for calls made before init
  private pendingOnPause: Array<() => void> = [];
  private pendingOnResume: Array<() => void> = [];
  private pendingAudio: Array<(enabled: boolean) => void> = [];
  private pendingRewardedResolve: ((value: boolean) => void) | null = null;

  async initialize(): Promise<void> {
    if (this.ready) return;
    if (this.initPromise) return this.initPromise;

    this.bridge = getBridge();
    if (!this.bridge) {
      console.warn('[Playgama] Bridge not found, running in mock mode');
      this.ready = true;
      return;
    }

    this.initPromise = this._doInit();
    return this.initPromise;
  }

  private async _doInit(): Promise<void> {
    const b = this.bridge!;
    try {
      await Promise.resolve(b.initialize());
    } catch (e) {
      console.warn('[Playgama] Bridge init error:', e);
    }

    // Read audio state after init
    try {
      this.audioOn = b.platform.isAudioEnabled !== false;
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
      const evtName = b.EVENT_NAME?.REWARDED_STATE_CHANGED ?? 'rewarded_state_changed';
      b.advertisement.on(evtName, (state: unknown) => {
        if (state === 'rewarded' && this.pendingRewardedResolve) {
          this.pendingRewardedResolve(true);
          this.pendingRewardedResolve = null;
        }
      });
    } catch { /* no-op */ }

    console.log('[Playgama] Bridge initialized');
  }

  private _subscribePause(cb: () => void, wantTrue: boolean): void {
    try {
      this.bridge!.advertisement.on(EVENT.PAUSE_STATE_CHANGED, (v: unknown) => {
        if (v === wantTrue) cb();
      });
    } catch { /* no-op */ }
  }

  private _subscribeAudio(cb: (enabled: boolean) => void): void {
    try {
      const evtName = this.bridge!.EVENT_NAME?.AUDIO_STATE_CHANGED ?? 'audio_state_changed';
      this.bridge!.advertisement.on(evtName, (v: unknown) => {
        this.audioOn = v !== false;
        cb(this.audioOn);
      });
    } catch { /* no-op */ }
  }

  gameReady(): void {
    if (!this.ready || !this.bridge) {
      // Defer until init
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

  async showInterstitial(): Promise<void> {
    if (!this.ready || !this.bridge) return;
    if (!this.bridge.advertisement.isInterstitialSupported) return;
    return new Promise<void>((resolve) => {
      let settled = false;
      const done = () => { if (!settled) { settled = true; resolve(); } };
      try {
        const evtName = this.bridge!.EVENT_NAME?.INTERSTITIAL_STATE_CHANGED ?? 'interstitial_state_changed';
        this.bridge!.advertisement.on(evtName, (state: unknown) => {
          if (state === 'closed' || state === 'failed') done();
        });
        this.bridge!.advertisement.showInterstitial();
      } catch { done(); }
      setTimeout(done, 15000);
    });
  }

  async showRewarded(): Promise<boolean> {
    if (!this.ready || !this.bridge) return true;
    if (!this.bridge.advertisement.isRewardedSupported) return true;
    return new Promise<boolean>((resolve) => {
      let settled = false;
      const settle = (val: boolean) => { if (!settled) { settled = true; resolve(val); } };
      try {
        this.pendingRewardedResolve = settle;
        this.bridge!.advertisement.showRewarded();
      } catch { settle(true); }
      setTimeout(() => settle(true), 30000);
    });
  }

  isRewardedAvailable(): boolean {
    if (!this.ready || !this.bridge) return false;
    return this.bridge.advertisement.isRewardedSupported;
  }

  async saveData(data: Record<string, unknown>): Promise<void> {
    if (!this.ready || !this.bridge) {
      // Fallback to localStorage
      try {
        const existing = JSON.parse(localStorage.getItem('game_save') || '{}');
        localStorage.setItem('game_save', JSON.stringify({ ...existing, ...data }));
      } catch { /* ignore */ }
      return;
    }
    try {
      const jsonStr = JSON.stringify(data);
      await this.bridge.storage.set([LOCAL_KEY], [jsonStr]);
    } catch (e) {
      console.warn('[Playgama] saveData failed, fallback localStorage', e);
      try {
        const existing = JSON.parse(localStorage.getItem('game_save') || '{}');
        localStorage.setItem('game_save', JSON.stringify({ ...existing, ...data }));
      } catch { /* ignore */ }
    }
  }

  async loadData(): Promise<Record<string, unknown>> {
    if (!this.ready) {
      // Not ready yet — try localStorage
      try {
        return JSON.parse(localStorage.getItem('game_save') || '{}');
      } catch { return {}; }
    }
    // Try bridge first
    if (this.bridge) {
      try {
        const res = await this.bridge.storage.get([LOCAL_KEY]);
        let raw: unknown = null;
        if (Array.isArray(res)) {
          raw = res[0];
        } else if (res && typeof res === 'object') {
          raw = (res as Record<string, unknown>)[LOCAL_KEY] ?? (res as Record<string, unknown>)['0'] ?? res;
        }
        if (raw != null) {
          if (typeof raw === 'object') return raw as Record<string, unknown>;
          if (typeof raw === 'string') {
            try { return JSON.parse(raw) as Record<string, unknown>; } catch { /* fall through */ }
          }
        }
      } catch (e) {
        console.warn('[Playgama] loadData failed, fallback localStorage', e);
      }
    }
    // Fallback to localStorage
    try {
      return JSON.parse(localStorage.getItem('game_save') || '{}');
    } catch { return {}; }
  }

  async sendScore(score: number): Promise<void> {
    await this.setScore(score, DEFAULT_LEADERBOARD_NAME);
  }

  async setScore(score: number, leaderboardName = DEFAULT_LEADERBOARD_NAME): Promise<boolean> {
    if (!this.ready || !this.bridge) return false;
    if (this.bridge.leaderboard?.isSupported && this.bridge.leaderboard.setScore) {
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
    if (this.ready && this.bridge?.leaderboard?.isSupported && this.bridge.leaderboard.getEntries) {
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
    if (this.bridge.leaderboard?.isNativePopupSupported && this.bridge.leaderboard.showNativePopup) {
      try {
        await this.bridge.leaderboard.showNativePopup({ leaderboardName });
        return true;
      } catch (e) {
        console.warn('[Playgama] showNativePopup failed', e);
      }
    }
    return false;
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
      return {
        id: (item.id as string | number) ?? idx + 1,
        name: String(item.name || player?.name || item.title || `Player #${idx + 1}`),
        score: Number(item.score || item.scoreFormatted || 0),
        rank: Number(item.rank || idx + 1),
        isUser: Boolean(item.isUser || item.isCurrentPlayer),
      };
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
    const userIndex = allList.findIndex(p => (p as any).isUser);
    return {
      entries: allList.slice(0, 10).map((p, idx) => ({
        name: p.name,
        score: p.score,
        rank: idx + 1,
        isUser: Boolean((p as any).isUser),
      })),
      userEntry: { name: '⭐ You (Me)', score: userScore, rank: Math.max(userIndex + 1, 1), isUser: true },
    };
  }
}