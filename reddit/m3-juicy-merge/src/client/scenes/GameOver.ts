import Phaser from 'phaser';

export class GameOver extends Phaser.Scene {
  constructor() { super('GameOver'); }

  create() {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    this.add.text(cx, cy - 60, 'Game Over', {
      fontSize: '36px', fontFamily: 'sans-serif', fontStyle: 'bold', color: '#4A2C2A',
    }).setOrigin(0.5);

    this.add.text(cx, cy, 'Score: 0', {
      fontSize: '24px', color: '#888',
    }).setOrigin(0.5);

    this.add.text(cx, cy + 80, '▶  Play Again', {
      fontSize: '24px', color: '#ffffff', backgroundColor: '#FF6B81',
      padding: { x: 32, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      this.scene.start('Game');
    });
  }
}