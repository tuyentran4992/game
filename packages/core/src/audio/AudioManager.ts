import Phaser from 'phaser';

/**
 * Audio manager — lightweight wrapper around Phaser's sound system.
 */
export class AudioManager {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  play(key: string, volume: number = 1): void {
    if (this.scene.cache.audio.exists(key)) {
      this.scene.sound.play(key, { volume });
    }
  }

  playBgm(key: string, volume: number = 0.5): void {
    if (this.scene.cache.audio.exists(key)) {
      const bgm = this.scene.sound.add(key, { loop: true, volume });
      bgm.play();
    }
  }

  stopBgm(key: string): void {
    this.scene.sound.stopByKey(key);
  }
}