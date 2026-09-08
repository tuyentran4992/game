// Pickups — single source of numbers (DATA-MODEL §4). Pure TS, no Phaser.
export const PICKUP_DEFS = [
  { id: 'up-double', bandTopM: 250, bandBotM: 350, money: 0 },
  { id: 'up-sonar', bandTopM: 550, bandBotM: 650, money: 0 },
  { id: 'chest150', bandTopM: 1190, bandBotM: 1200, money: 150 },
] as const;

export const SONAR_CHARGES = 2;
export const SONAR_SCAN_S = 4; // 4s sweep reveal
export const WHALE_SPAWN_INTERVAL = 8; // s (resume 8s after whale escapes)
export const WHALE_TOSS_LIMIT = 20; // s hooked before it escapes on its own
export const WHALE_TOSS_DRIFT = 36; // px, boat drift amplitude over 2.4s
export const WHALE_TOSS_DRIFT_S = 2.4;
export const WHALE_TOSS_CYCLES = 3; // fight cycles the player must ride out

// money-float combo: consecutive surface-sells without break/escape: 1 / 1.15 / 1.3 / 1.5 (cap)
export const COMBO_STEPS = [1, 1.15, 1.3, 1.5] as const;
export const comboMult = (chain: number): number =>
  COMBO_STEPS[Math.min(chain, COMBO_STEPS.length - 1)] as number;

// current drag in 850m+ while descending (DATA-MODEL §3 dragTerm)
export const CURRENT_DEPTH_M = 850;
export const CURRENT_DRAG = 14;
export const DOUBLE_HOOK_DRAG = 6; // per extra fish beyond the first
