// Mechanic config — mirror của games/cuu-meo.yaml (BR-13: yaml là nguồn sự thật).
// Giữ runtime khỏi parser YAML (bundle nhỏ). Khi yaml đổi, cập nhật file này cho khớp.

export interface Palette {
  key: string;
  level: number;
  bgTop: string;
  bgBottom: string;
  grass: string;
  laneColor: string;
  primary: string;
  accent: string;
}

export interface MechanicsConfig {
  laneCount: number;
  milestoneInterval: number;     // điểm/lần để lên 1 level (BR-14)
  comboPer: number;               // số né liên tiếp để combo (BR-15)
  comboBonus: number;            // điểm thưởng mỗi combo (BR-15)
  pointsPerDodge: number;        // +1/lần né
  pointsPerSecond: number;       // +1/s trụ
  startSpeed: number;            // tốc độ ong ban đầu — THẤP 10s đầu (BR-17)
  speedIncreasePerSec: number;   // tăng tốc sau 10s đầu
  levelSpeedStep: number;        // nhảy bậc tốc độ mỗi level (BR-17)
  spawnIncrease: number;         // mật độ spawn tăng mỗi giây sau 10s
  spawnRateMax: number;          // số ong tối đa cùng lúc
  warmupSeconds: number;         // 10s đầu giữ chân người mới (BR-17)
  continueMaxPerGameOver: number;// rewarded tối đa 1 lần/game over (BR-10)
  interstitialDelayGames: number;// interstitial từ lượt thứ N (BR-09)
  palettes: Palette[];
}

export const MECHANICS: MechanicsConfig = {
  laneCount: 3,
  milestoneInterval: 10,
  comboPer: 5,
  comboBonus: 5,
  pointsPerDodge: 1,
  pointsPerSecond: 1,
  startSpeed: 120,
  speedIncreasePerSec: 8,
  levelSpeedStep: 20,
  spawnIncrease: 0.03,
  spawnRateMax: 4,
  warmupSeconds: 10,
  continueMaxPerGameOver: 1,
  interstitialDelayGames: 2,
  palettes: [
    { key: 'pal_morning', level: 1, bgTop: '#7EC8FF', bgBottom: '#B8E6A8', grass: '#5ED07A', laneColor: '#FFFFFF', primary: '#FF9F1C', accent: '#E8820F' },
    { key: 'pal_sunset',  level: 2, bgTop: '#FFB578', bgBottom: '#FF8E7A', grass: '#C97B5D', laneColor: '#FFE4C2', primary: '#FF9F1C', accent: '#E8820F' },
    { key: 'pal_night',   level: 3, bgTop: '#2B3A67', bgBottom: '#4A3B8C', grass: '#3D6B8E', laneColor: '#A9C6FF', primary: '#FF9F1C', accent: '#E8820F' },
  ],
};
