import Phaser from 'phaser';

/**
 * Scene manager — wraps Phaser scene transitions with cross-fade.
 */
export class SceneManager {
  private game: Phaser.Game;

  constructor(game: Phaser.Game) {
    this.game = game;
  }

  switchTo(sceneKey: string, data?: Record<string, unknown>): void {
    const currentScene = this.game.scene.getScenes(true)[0];
    if (currentScene) {
      // Fade out current
      currentScene.cameras.main.fadeOut(200, 0, 0, 0);
      currentScene.time.delayedCall(200, () => {
        this.game.scene.start(sceneKey, data);
      });
    } else {
      this.game.scene.start(sceneKey, data);
    }
  }
}