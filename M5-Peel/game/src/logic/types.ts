/**
 * Pure TypeScript types for the Peel logic layer.
 * 0 Phaser dependencies — 100% testable via vitest.
 */

import { FruitDefinition } from '../config/peelConfig';

export type PeelDirection = 1 | -1 | 0; // 1: Clockwise, -1: Counter-Clockwise, 0: Undetermined

export type PeelStatus =
  | 'IDLE'
  | 'PEELING'
  | 'DISCONNECTED'
  | 'COMPLETED_STROKE';

export type DisconnectReason =
  | 'TIMEOUT_STALLED'       // Dừng quá 150ms hoặc rời rãnh
  | 'REVERSED_DIRECTION'     // Đảo chiều di chuyển
  | 'OUT_OF_TRACK'          // Lệch bán kính quá mức cho phép
  | 'LIFTED_TOO_EARLY';     // Nhấc tay trước khi đạt GOOD

export type PeelQuality = 'PERFECT' | 'GOOD' | 'INCOMPLETE' | 'FAILED';

export interface GrooveState {
  index: number;
  startAngleRad: number;     // Góc bắt đầu của rãnh (rad)
  totalArcRad: number;       // Tổng độ dài cung cần gọt của rãnh này (rad, thường là ~2*PI / 3)
  peeledRatio: number;       // Tỷ lệ đã gọt sạch (0.0 -> 1.0)
  isCompleted: boolean;      // Đã gọt xong rãnh này
}

export interface ActiveStroke {
  grooveIndex: number;
  startAngleRad: number;
  lastAngleRad: number;
  currentAngleRad: number;
  accumulatedArcRad: number;
  targetArcRad: number;
  direction: PeelDirection;
  startTimeMs: number;
  lastMoveTimeMs: number;
  peeledRatio: number;       // accumulatedArcRad / targetArcRad (0.0 -> 1.0)
  points: Array<{ x: number; y: number; angle: number; time: number }>;
}

export interface PeelUpdateOutput {
  status: PeelStatus;
  peeledDeltaArcRad: number;
  currentRatio: number;
  currentAngleRad: number;
  currentRadius: number;
  speedDegPerFrame: number;
  isDisconnected: boolean;
  disconnectReason?: DisconnectReason;
  quality?: PeelQuality;
  isGrooveCompleted: boolean;
  allGroovesCompleted: boolean;
  streak: number;
}

export interface PeelStrokeEndOutput {
  quality: PeelQuality;
  ratio: number;
  grooveIndex: number;
  streak: number;
  allGroovesCompleted: boolean;
}
