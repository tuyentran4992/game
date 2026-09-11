// M1 Rescue Dodge — Mechanics & Balance Config
// Tuning constants for lanes, progression, fever mode, swarm raids, and color palettes.

import type { MechanicsConfig } from '../logic/types';

export const MECHANICS: MechanicsConfig = {
  laneCount: 3,
  // BALANCE-M1 (t_2e94b3be, 04/09): newbie sim 300ms — mi 10→22, er 2.5→1.2,
  // step 18→10, r 5→4 sống 30→60s: 0%→60%. Khung D-A2 giữ nguyên (CEO duyệt).
  milestoneInterval: 22,
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
  swarmIntervalSec: 44, // UPG2-B1: 22→44 — bot không còn lane thoát khi swarm dồn (diag N=100)
  swarmBonus: 10,
  feverPerSwarm: 30,
  startSpeed: 160,
  maxSpeed: 440,
  speedIncreasePerSec: 5.0,
  // UPG2-B1 (t_a990dc20, khung CEO #78-Y2): re-sim khóa curve sau P1b debut beat.
  // earlyRampPerSec 1.2→0.85 (knob i của card) + 2 nút MẬT ĐỘ (evidence diag N=100):
  // 99% ca chết khi ≥4 ong đồng thời, 64% chết khi bot không còn lane thoát an toàn,
  // ~47% rơi cửa swarm → spawnRateMax 4→2 (cap ong đồng thời) + swarmIntervalSec 22→44.
  // Kết quả (newbie bot 300ms, N=100): 30→90s 13%→45% (3 batch seed 45/40/52%),
  // 30→60s 77% (gate cũ ≥50%), old N=40 test cũ 38% (≥20%). [PLACEHOLDER] tới boss Fun Gate PB-2.
  earlyRampPerSec: 0.85,
  earlyRampUntilSec: 90,
  levelSpeedStep: 10,
  spawnIncrease: 0.04,
  spawnRateMax: 2, // UPG2-B1: 4→2 — 99% ca chết khi ≥4 ong đồng thời (diag N=100), cap mật độ
  warmupSeconds: 30,
  continueMaxPerGameOver: 1,
  interstitialDelayGames: 2,

  // --- UPG2-N1 (t_79d2b77d): input-feel lane-switch + cadence spawn + speedMult ong
  // về MỘT chỗ — lead/boss chỉnh số không đọc code. Default GIỮ NGUYÊN giá trị đang
  // chạy (giữ nguyên cảm giác); số chưa playtest đánh dấu [PLACEHOLDER].
  laneMoveMs: 120,        // [PLACEHOLDER] — cũ dur.tn trong tokens.ts
  laneMoveDelayMs: 35,    // [PLACEHOLDER] — delay tween bóng đổ
  laneMoveEase: 'cubic.out',
  laneMoveSettleMs: 80,   // [PLACEHOLDER] — tween dựng dậy sau khi tới làn
  inputBufferMs: 0,       // [PLACEHOLDER] — 0 = phản hồi tức thì (nguyên trạng)

  spawnIntervalBase: 1.35,
  spawnIntervalFloor: 0.38,
  spawnSpeedFactor: 0.0035,
  spawnLevelFactor: 0.10,

  // --- UPG2-J1 (t_cc6c390d): juice hit-stop + camera punch — [PLACEHOLDER] chưa playtest.
  // Điều kiện UX#63: hit-stop ≤120ms; KHÔNG băng HUD tween/input buffer (freeze áp
  // dt=0 cho world trong update(), không đụng tweens/time.timeScale toàn cục).
  hitStopShieldMs: 60,    // khiên đỡ đòn — lực va nhỏ nhất (cửa dưới khung 60–120ms)
  hitStopHitMs: 90,       // va chạm thường — giữa khung
  hitStopDeathMs: 110,    // chết — mạnh nhất, ≤120 (UX#63)
  punchHitZoom: 0.04,     // biên zoom punch va chạm thường
  punchDeathZoom: 0.07,   // biên zoom punch khi chết (mạnh hơn va chạm)
  punchHoldMs: 70,        // giữ điểm đáy zoom trước khi hồi

  speedyMult: 1.18,
  normalMult: 1.0,
  fatSpeedMult: 0.72,

  // --- UPG2-P1a (t_6035fb14): debut beat — cửa sổ cụm thưa + sàn telegraph (giây).
  // [PLACEHOLDER] chưa playtest — QA BLOCK yêu cầu ≥1.2s dữ liệu telegraph (ô M4 plan P1'').
  debutSparseSec: 2.0,
  debutTelegraphMinSec: 1.2,

  palettes: [
    { key: 'pal_morning', level: 1, bgTop: '#7EC8FF', bgBottom: '#B8E6A8', grass: '#5ED07A', laneColor: '#FFFFFF', primary: '#FF9F1C', accent: '#E8820F' },
    { key: 'pal_sunset',  level: 2, bgTop: '#FFB578', bgBottom: '#FF8E7A', grass: '#C97B5D', laneColor: '#FFE4C2', primary: '#FF9F1C', accent: '#E8820F' },
    { key: 'pal_night',   level: 3, bgTop: '#2B3A67', bgBottom: '#4A3B8C', grass: '#3D6B8E', laneColor: '#A9C6FF', primary: '#FF9F1C', accent: '#E8820F' },
  ],
};
