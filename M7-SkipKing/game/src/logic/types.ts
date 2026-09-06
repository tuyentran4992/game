/**
 * M7 Skip King — types Tầng A (pure TS, 0 import Phaser/DOM — CONTRACT mục 1).
 * Schema chung 1 đường sim (K4×V1): HumanFlickProvider + ScriptedFlickProvider cùng sinh FlickInput.
 */

/** Viên đá trong không gian 2.5D: bay trên mặt phẳng (x,z), y = độ cao. */
export interface Stone {
  /** m — vị trí ngang. */
  x: number;
  /** m — vị trí sâu (z=0 waterline, z=fieldZMax horizon). */
  z: number;
  /** m — độ cao so mặt nước. */
  y: number;
  /** m/s — vận tốc ngang. */
  vx: number;
  /** m/s — vận tốc thẳng đứng. */
  vy: number;
  /** m/s — vận tốc sâu. */
  vz: number;
}

/** Một cú flick — đầu vào duy nhất của engine (từ chạm tay hoặc script demo). */
export interface FlickInput {
  /** -1..1 — hướng ngang (âm trái, dương phải). */
  dirX: number;
  /** hướng sâu của cú ném (thường âm — kéo ngược về người). */
  dirZ: number;
  /** 0..1 — lực thả (độ dài kéo). */
  power: number;
}

/** Kết quả 1 run — public interface cho HUD/end-card (tầng B chỉ đọc qua đây). */
export interface RunResult {
  /** điểm run (cú PERFECT ×2 — CONTRACT §2). */
  score: number;
  /** số lần skip (nảy) trong run. */
  bounces: number;
  /** best cục bộ (localStorage wrap ở runLifecycle — T2). */
  best: number;
}

/** Event engine phát mỗi step — scene/render/audio map qua đây (tầng B không tự tính luật). */
export type EngineEvent =
  | { type: 'bounce'; stoneX: number; stoneZ: number; impact: number }
  | { type: 'splash'; stoneX: number; stoneZ: number }
  | { type: 'perfect'; streak: number }
  | { type: 'perfectRunEnd'; bounces: number };
