// BootScene: load 25 production PNGs (per-file loader, no texture packer needed).
import Phaser from 'phaser';

const ASSET_KEYS = [
  'boat', 'hook', 'hook_double',
  'fish_01', 'fish_02', 'fish_03', 'fish_04', 'fish_05',
  'fish_06', 'fish_07', 'fish_08', 'fish_09', 'fish_10',
  'whale', 'shark', 'chest', 'treasure',
  'splash', 'sparkle', 'bubble', 'sonar',
  'bg_reef', 'bg_wreck', 'bg_vents', 'bg_trench',
] as const;

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    for (const key of ASSET_KEYS) {
      this.load.image(key, `assets/${key}.png`);
    }
  }

  create(): void {
    this.scene.start('Game');
  }
}
