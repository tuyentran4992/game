/**
 * Neon Grid — Power-ups Manager
 *
 * Handles Undo (free 3/game), Shuffle (rewarded), and Bomb (rewarded).
 */

import type { PowerUpState } from './types';

export const INITIAL_POWER_UPS: PowerUpState = {
  undoRemainingFree: 3,
  shuffleCount: 0,
  bombCount: 0,
};

export class PowerUpManager {
  private state: PowerUpState;

  constructor(initialState: PowerUpState = { ...INITIAL_POWER_UPS }) {
    this.state = { ...initialState };
  }

  public get undoRemaining(): number {
    return this.state.undoRemainingFree;
  }

  public canUseUndo(): boolean {
    return this.state.undoRemainingFree > 0;
  }

  public useUndo(): boolean {
    if (this.state.undoRemainingFree > 0) {
      this.state.undoRemainingFree--;
      return true;
    }
    return false;
  }

  public resetForNewGame(): void {
    this.state = { ...INITIAL_POWER_UPS };
  }

  public getState(): PowerUpState {
    return { ...this.state };
  }
}
