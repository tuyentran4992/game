import Phaser from 'phaser';

/**
 * Input manager abstraction.
 * Wraps Phaser input for pointer (touch/mouse) and keyboard.
 */
export class InputManager {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /** Returns pointer x,y in game coordinates */
  getPointerPosition(): { x: number; y: number } {
    return {
      x: this.scene.input.x,
      y: this.scene.input.y,
    };
  }

  /** Check if pointer is down */
  isPointerDown(): boolean {
    return this.scene.input.activePointer.isDown;
  }

  /** Register a tap/click callback */
  onTap(cb: (x: number, y: number) => void): void {
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      cb(pointer.x, pointer.y);
    });
  }

  /** Register keyboard callback */
  onKey(key: string, cb: () => void): void {
    this.scene.input.keyboard!.on(`keydown-${key.toUpperCase()}`, cb);
  }
}