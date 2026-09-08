// Fish table — single source of numbers (DATA-MODEL §2). Pure TS, no Phaser.
// NOTE (GC-03): spec expects descend time 96->1200 in [7.0, 8.2]s while DESCEND_RAMP
// is +10px/s per 100px. Integration of that ramp gives ~5.8s (constant 140 gives 7.8s).
// DATA-MODEL is the "single source of numbers" -> ramp kept verbatim; see report.

export interface FishDef {
  id: string;
  name: string;
  bandTopM: number;
  bandBotM: number;
  value: number;
  weight: number;
  fightPk: number;
  pulsePeriod: number;
  pulseCount: number; // 1 = single, 2 = stacked at period*0.53, 3 (whale) adds period*0.29
}

export const FISH_DEFS: FishDef[] = [
  { id: 'f1', name: 'Sardine', bandTopM: 0, bandBotM: 150, value: 8, weight: 2, fightPk: 12, pulsePeriod: 1.8, pulseCount: 1 },
  { id: 'f2', name: 'Mackerel', bandTopM: 40, bandBotM: 200, value: 12, weight: 6, fightPk: 18, pulsePeriod: 1.7, pulseCount: 1 },
  { id: 'f3', name: 'Clownfish', bandTopM: 120, bandBotM: 260, value: 20, weight: 8, fightPk: 22, pulsePeriod: 1.9, pulseCount: 1 },
  { id: 'f4', name: 'Snapper', bandTopM: 200, bandBotM: 400, value: 32, weight: 16, fightPk: 30, pulsePeriod: 2.0, pulseCount: 1 },
  { id: 'f5', name: 'Squid', bandTopM: 300, bandBotM: 520, value: 55, weight: 22, fightPk: 40, pulsePeriod: 1.5, pulseCount: 2 },
  { id: 'f6', name: 'Tuna', bandTopM: 380, bandBotM: 620, value: 85, weight: 48, fightPk: 48, pulsePeriod: 2.2, pulseCount: 1 },
  { id: 'f7', name: 'Swordfish', bandTopM: 500, bandBotM: 760, value: 110, weight: 60, fightPk: 55, pulsePeriod: 2.4, pulseCount: 1 },
  { id: 'f8', name: 'Anglerfish', bandTopM: 650, bandBotM: 900, value: 140, weight: 38, fightPk: 62, pulsePeriod: 1.6, pulseCount: 2 },
  { id: 'f9', name: 'Ghost Ray', bandTopM: 800, bandBotM: 1050, value: 170, weight: 70, fightPk: 70, pulsePeriod: 2.6, pulseCount: 1 },
  { id: 'f10', name: 'Giant Squid', bandTopM: 950, bandBotM: 1150, value: 210, weight: 95, fightPk: 80, pulsePeriod: 2.0, pulseCount: 2 },
];

export const WHALE_DEF: FishDef = {
  id: 'whale',
  name: 'BLUE WHALE',
  bandTopM: 1140,
  bandBotM: 1200,
  value: 400,
  weight: 400,
  fightPk: 88,
  pulsePeriod: 2.8,
  pulseCount: 3,
};

// Spawn: each band keeps count = clamp(3 - floor(depthM/400), 1, 3) live fish.
export const bandCount = (depthM: number): number => {
  const c = 3 - Math.floor(depthM / 400);
  return Math.max(1, Math.min(3, c));
};

export const fishById = (id: string): FishDef | undefined =>
  id === 'whale' ? WHALE_DEF : FISH_DEFS.find((f) => f.id === id);
