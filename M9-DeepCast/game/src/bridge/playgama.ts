// Playgama Bridge stub (SPEC §9, DATA-MODEL §7). Real SDK injected via window.bridge when present.
import { SONAR_CHARGES } from '../data/upgrades.ts';

interface BridgeLike {
  init?: (cb: () => void) => void;
  gameplayStart?: () => void;
  gameplayStop?: () => void;
  sendScore?: (score: number) => void;
  showRewarded?: (cb: (success: boolean) => void) => void;
}

declare global {
  interface Window {
    bridge?: BridgeLike;
  }
}

export class PlaygamaBridge {
  private rewardedCalls = 0; // GC-16: exactly one per session
  private rewardedUsed = false;
  readySent = false;

  ready(): void {
    if (this.readySent) return;
    this.readySent = true;
    try {
      window.bridge?.init?.(() => undefined);
    } catch {
      /* stub never throws (QB-06) */
    }
  }

  gameplayStart(): void {
    try {
      window.bridge?.gameplayStart?.();
    } catch {
      /* noop */
    }
  }

  gameplayStop(): void {
    try {
      window.bridge?.gameplayStop?.();
    } catch {
      /* noop */
    }
  }

  // score = whale value + money on win (SPEC §9); 0 on lose
  sendScore(score: number): void {
    try {
      window.bridge?.sendScore?.(score);
    } catch {
      /* noop */
    }
  }

  // returns true if the rewarded continue may be granted (1st call only, GC-16)
  canContinue(): boolean {
    return !this.rewardedUsed;
  }

  showRewarded(onReward: () => void): void {
    if (this.rewardedUsed) return;
    this.rewardedUsed = true;
    this.rewardedCalls++;
    try {
      window.bridge?.showRewarded?.((success: boolean) => {
        if (success) onReward();
      });
    } catch {
      /* stub: grant anyway so the flow is testable without SDK */
      onReward();
    }
  }

  get rewardedCount(): number {
    return this.rewardedCalls;
  }
}

export const loadBest = (): number => {
  try {
    return Number(localStorage.getItem('deepcast.best') ?? '0') || 0;
  } catch {
    return 0;
  }
};

export const saveBest = (score: number): void => {
  try {
    const prev = loadBest();
    if (score > prev) localStorage.setItem('deepcast.best', String(score));
  } catch {
    /* storage may be unavailable */
  }
};

export const sonarChargesPerPickup = SONAR_CHARGES;
