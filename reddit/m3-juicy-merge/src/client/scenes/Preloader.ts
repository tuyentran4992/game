import Phaser from 'phaser';

export class Preloader extends Phaser.Scene {
  constructor() { super('Preloader'); }

  preload() {
    // Load game assets
    this.load.image('bg', '../assets/bg_gradient.png');
    this.load.image('bucket', '../assets/bucket.png');

    // Load fruit sprites (bậc 1-15)
    const fruits = [
      'cherry', 'strawberry', 'grape', 'dekopon', 'pomegranate',
      'orange', 'apple', 'pear', 'peach', 'pineapple',
      'melon', 'watermelon', 'dragonfruit', 'durian', 'galaxy_watermelon'
    ];
    fruits.forEach((f, i) => {
      this.load.image(`fruit_${String(i + 1).padStart(2, '0')}`, `../assets/fruit_${String(i + 1).padStart(2, '0')}_${f}.png`);
    });

    // Load audio
    this.load.audio('sfx_drop', '../assets/sfx_drop.mp3');
    this.load.audio('sfx_merge', '../assets/sfx_merge.mp3');
    this.load.audio('sfx_gameover', '../assets/sfx_gameover.mp3');
    this.load.audio('sfx_danger', '../assets/sfx_danger.mp3');
    this.load.audio('bgm_main', '../assets/bgm_main.mp3');
  }

  create() {
    this.scene.start('MainMenu');
  }
}