// M1 Rescue Dodge — Mechanics & Balance Config
// Tuning constants for lanes, progression, fever mode, swarm raids, and color palettes.

import type { MechanicsConfig } from '../logic/types';

export const MECHANICS: MechanicsConfig = {
  laneCount: 3,
  milestoneInterval: 10,
  comboPer: 5,
  comboBonus: 5,
  pointsPerDodge: 1,
  pointsPerSecond: 1,
  pointsPerFish: 2,
  feverPerDodge: 6,
  feverPerFish: 12,
  feverPerNearMiss: 18,
  nearMissBonus: 2,
  feverDurationSec: 4.5,
  magnetDurationSec: 6.0,
  feverKillBonus: 5,
  swarmIntervalSec: 22,
  swarmBonus: 10,
  feverPerSwarm: 30,
  startSpeed: 160,
  maxSpeed: 440,
  speedIncreasePerSec: 5.0,
  earlyRampPerSec: 2.5,
  earlyRampUntilSec: 90,
  levelSpeedStep: 18,
  spawnIncrease: 0.04,
  spawnRateMax: 5,
  warmupSeconds: 30,
  continueMaxPerGameOver: 1,
  interstitialDelayGames: 2,
  palettes: [
    { key: 'pal_morning', level: 1, bgTop: '#7EC8FF', bgBottom: '#B8E6A8', grass: '#5ED07A', laneColor: '#FFFFFF', primary: '#FF9F1C', accent: '#E8820F' },
    { key: 'pal_sunset',  level: 2, bgTop: '#FFB578', bgBottom: '#FF8E7A', grass: '#C97B5D', laneColor: '#FFE4C2', primary: '#FF9F1C', accent: '#E8820F' },
    { key: 'pal_night',   level: 3, bgTop: '#2B3A67', bgBottom: '#4A3B8C', grass: '#3D6B8E', laneColor: '#A9C6FF', primary: '#FF9F1C', accent: '#E8820F' },
  ],
};
