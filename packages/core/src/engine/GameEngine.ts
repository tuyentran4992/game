import { animation } from '../tokens';

/**
 * Lightweight game lifecycle abstraction.
 *
 * Instead of extending Phaser.Scene, game logic modules implement this interface.
 * This keeps logic pure TS and testable without Phaser.
 */
export interface GameConfig {
  /** Game identifier */
  id: string;
  /** Display name */
  title: string;
  /** Target framerate */
  fps: number;
  /** Canvas size */
  width: number;
  height: number;
}

/**
 * Pure game state interface (no rendering).
 * Each game implements this for its logic.
 */
export interface GameState {
  score: number;
  isPlaying: boolean;
  isGameOver: boolean;
  level: number;
}

export class GameEngine {
  private config: GameConfig;
  private _state: GameState;

  constructor(config: GameConfig) {
    this.config = config;
    this._state = {
      score: 0,
      isPlaying: false,
      isGameOver: false,
      level: 1,
    };
  }

  get state(): GameState {
    return { ...this._state };
  }

  get configData(): GameConfig {
    return { ...this.config };
  }

  start(): void {
    this._state.isPlaying = true;
    this._state.isGameOver = false;
    this._state.score = 0;
    this._state.level = 1;
  }

  addScore(points: number): void {
    this._state.score += points;
  }

  gameOver(): void {
    this._state.isPlaying = false;
    this._state.isGameOver = true;
  }

  reset(): void {
    this._state.isPlaying = false;
    this._state.isGameOver = false;
    this._state.score = 0;
    this._state.level = 1;
  }
}