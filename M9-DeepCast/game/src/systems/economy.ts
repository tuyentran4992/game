// Economy — money, fuel, combo (DATA-MODEL §4 money-float, §5 win/lose).
import { START_MONEY, FUEL_COST, HEARTS } from '../data/world.ts';
import { comboMult } from '../data/upgrades.ts';
import type { GameState, GameEvent } from '../core/types.ts';
import { fishById } from '../data/fishData.ts';

export const createWallet = (): number => START_MONEY;

// Sell everything on the hook: sum(value * comboMult(chain)); chain advances per fish sold.
// Chain resets on break / tear-off / shark-hit (handled by callers setting combo = 0).
export const sellHooked = (state: GameState): { money: number; combo: number; gained: number } => {
  let gained = 0;
  let chain = state.combo;
  for (const uid of state.hooked) {
    const inst = state.fish.find((f) => f.uid === uid);
    const def = inst ? fishById(inst.defId) : undefined;
    if (!def) continue;
    gained += def.value * comboMult(chain);
    chain = Math.min(chain + 1, 3); // comboMult caps at 1.5 (index 3)
  }
  return { money: state.money + gained, combo: chain, gained };
};

export const canAffordFuel = (money: number): boolean => money >= FUEL_COST;

export const resetHearts = (hearts: number): number => Math.min(HEARTS, hearts + 1);

export const loseEvent = (reason: 'OUT OF FUEL' | 'LINES BROKEN'): GameEvent => ({
  type: 'lose',
  text: reason,
});
