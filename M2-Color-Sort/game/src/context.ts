// ============================================================================
// Game context M2 (P0-2) — save/resume THẬT qua ytgame.game.saveData/loadData
// + mirror localStorage (reload ngoài SDK vẫn resume).
//
//  * schema v2: best_level / current_level / best_moves_by_level /
//    flags{tutorial_seen,muted} / session{board+undo stack} / last_updated_ts
//  * DEBOUNCE ≥ 1 s: save() gọi liên tục (mỗi nước đổ) chỉ ghi tối đa 1 lần/giây;
//    saveNow() để flush ngay (level clear / next / pause).
//  * last-write-wins theo last_updated_ts (so sánh trong SdkHandler.loadData).
// ============================================================================
import { sdk } from './sdk-instance';
import { BoardState } from './logic/color-sort';
import { MECHANICS } from './logic/mechanics';
import {
  SCHEMA_VERSION,
  SavedGameV2,
  SessionSave,
  decodeSession,
  encodeSession,
  normalizeSave,
} from './logic/save';
import {
  AdPacingState,
  afterInterstitial,
  afterLevelCleared,
  emptyAdPacing,
  shouldShowInterstitial,
} from './logic/ad-pacing';

/** Không ghi save nhanh hơn 1 s/lần (quota + tránh spam I/O). */
const SAVE_DEBOUNCE_MS = 1000;

class GameContext {
  bestLevel = 0;
  currentLevel = 1;
  bestMoves = 0;
  bestMovesByLevel: Record<string, number> = {};
  tutorialSeen = false;
  /** mute preference — persist (M2-11: obey mute, phải sống qua reload) */
  muted = false;
  /** B2: đã tiêu suất gợi ý MIỄN PHÍ onboarding (1 lần/người chơi) */
  freeHintUsed = false;
  /** B2: pacing interstitial (cooldown 75 s + ≥2 level giữa 2 quảng cáo) */
  ads: AdPacingState = emptyAdPacing();
  /** snapshot giữa-level (null = không có gì để resume) */
  session: SessionSave | null = null;

  private loaded = false;
  private loadPromise: Promise<void> | null = null;
  private dirty = false;
  private lastWriteTs = 0;
  private timer: number | null = null;
  private writing: Promise<boolean> | null = null;

  // ------------------------------------------------------------------ load ---
  async load(): Promise<void> {
    if (this.loaded) return;
    if (this.loadPromise) return this.loadPromise;
    this.loadPromise = this.doLoad();
    return this.loadPromise;
  }

  private async doLoad(): Promise<void> {
    try {
      const raw = await sdk.loadData();
      const data = normalizeSave(raw);
      this.bestLevel = data.best_level;
      this.currentLevel = data.current_level;
      this.bestMoves = data.best_moves;
      this.bestMovesByLevel = data.best_moves_by_level;
      this.tutorialSeen = data.flags.tutorial_seen;
      this.muted = data.flags.muted;
      this.freeHintUsed = data.flags.free_hint_used;
      this.ads = data.ads;
      // Session chỉ dùng khi trùng level đang chơi (P0-2 invalidation rule).
      this.session = data.session && data.session.level === this.currentLevel ? data.session : null;
      if (data.session && !this.session) {
        console.info('[save] session dropped (level mismatch)');
      }
    } catch (e) {
      console.warn('[save] loadData failed, starting fresh', e);
    }
    this.loaded = true;
  }

  // ------------------------------------------------------------------ save ---
  private payload(): SavedGameV2 {
    return {
      schema_version: SCHEMA_VERSION,
      best_level: this.bestLevel,
      current_level: this.currentLevel,
      best_moves: this.bestMoves,
      best_moves_by_level: this.bestMovesByLevel,
      flags: {
        tutorial_seen: this.tutorialSeen,
        muted: this.muted,
        free_hint_used: this.freeHintUsed,
      },
      ads: this.ads,
      session: this.session,
      last_updated_ts: Date.now(),
    };
  }

  /** Ghi có DEBOUNCE (≥ 1 s). An toàn để gọi mỗi nước đi. */
  save(): void {
    this.dirty = true;
    if (this.timer !== null) return;
    const wait = Math.max(0, SAVE_DEBOUNCE_MS - (Date.now() - this.lastWriteTs));
    if (wait === 0) {
      void this.flush();
      return;
    }
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.flush();
    }, wait) as unknown as number;
  }

  /** Ghi NGAY (level clear / next level / pause) — bỏ qua debounce. */
  async saveNow(): Promise<boolean> {
    this.dirty = true;
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    return this.flush();
  }

  private async flush(): Promise<boolean> {
    if (this.writing) await this.writing;
    if (!this.dirty) return true;
    this.dirty = false;
    this.lastWriteTs = Date.now();
    this.writing = sdk.saveData(this.payload());
    try {
      return await this.writing;
    } catch (e) {
      console.warn('[save] saveData failed', e);
      return false;
    } finally {
      this.writing = null;
    }
  }

  // --------------------------------------------------------------- session ---
  /** Chụp lại board đang chơi (gọi ở mọi thời điểm ý nghĩa) + save debounce. */
  snapshot(board: BoardState, hintUsed: boolean): void {
    this.session = encodeSession(board, hintUsed);
    this.currentLevel = board.level;
    this.save();
  }

  /** Trả BoardState resume được cho `level`, hoặc null (session sai/không có). */
  resumeBoard(level: number): BoardState | null {
    if (!this.session) return null;
    const board = decodeSession(MECHANICS, this.session, level);
    if (!board) {
      console.info('[save] session invalid → new board');
      this.session = null;
      return null;
    }
    if (board.win) { this.session = null; return null; }
    return board;
  }

  hintUsedForSession(level: number): boolean {
    return !!(this.session && this.session.level === level && this.session.hint_used);
  }

  clearSession(): void {
    this.session = null;
  }

  getBestMovesForLevel(level: number): number {
    return this.bestMovesByLevel[String(level)] || 0;
  }

  setMuted(muted: boolean): void {
    if (this.muted === muted) return;
    this.muted = muted;
    this.save();
  }

  // ------------------------------------------------------------- ad economy ---
  /** B2-2: interstitial chỉ khi level ≥3, ≥2 level kể từ ad trước, cooldown 75 s. */
  canShowInterstitial(level: number, now = Date.now()): boolean {
    return shouldShowInterstitial(this.ads, level, now);
  }

  /** Ghi nhận đã CHẠY interstitial (kể cả timeout/no-fill → vẫn tính cooldown). */
  markInterstitialShown(now = Date.now()): void {
    this.ads = afterInterstitial(this.ads, now);
    this.save();
  }

  /** B2: đã tiêu suất gợi ý miễn phí onboarding → lần sau phải xem rewarded. */
  markFreeHintUsed(): void {
    if (this.freeHintUsed) return;
    this.freeHintUsed = true;
    this.save();
  }

  // Gọi khi clear 1 level → cập nhật best level & kỷ lục từng level (M2-08).
  onLevelClear(level: number, moves: number): void {
    if (level > this.bestLevel) this.bestLevel = level;
    const key = String(level);
    const curBest = this.bestMovesByLevel[key] || 0;
    if (curBest === 0 || moves < curBest) {
      this.bestMovesByLevel[key] = moves;
    }
    this.bestMoves = this.bestMovesByLevel[key];
    this.currentLevel = level + 1;
    this.session = null; // level xong → không còn gì để resume
    this.ads = afterLevelCleared(this.ads);   // B2-2: +1 level kể từ ad gần nhất
    sdk.sendScore(this.bestLevel);
  }
}

export const ctx = new GameContext();
