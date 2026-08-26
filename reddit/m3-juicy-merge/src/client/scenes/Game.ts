/**
 * Game scene — Juicy Merge gameplay
 * Ported from M3-Juicy-Merge physics-merge logic
 */
import Phaser from 'phaser';

export class Game extends Phaser.Scene {
  constructor() { super('Game'); }

  create() {
    const cx = this.scale.width / 2;

    // Background
    this.add.graphics()
      .fillGradientStyle(0xFFF8E7, 0xFFF8E7, 0xFFE4C4, 0xFFE4C4, 1)
      .fillRect(0, 0, this.scale.width, this.scale.height);

    // Bucket
    this.add.image(cx, this.scale.height - 200, 'bucket').setScale(0.5);

    // Placeholder text
    this.add.text(cx, 100, '🍉 Juicy Merge', {
      fontSize: '24px', fontFamily: 'sans-serif', fontStyle: 'bold', color: '#4A2C2A',
    }).setOrigin(0.5);

    this.add.text(cx, this.scale.height / 2, 'Drop fruits, merge them!\n(Full gameplay coming soon)', {
      fontSize: '18px', color: '#888', align: 'center',
    }).setOrigin(0.5);

    // Back button
    this.add.text(40, 40, '← Back', {
      fontSize: '20px', color: '#FF6B81', fontStyle: 'bold',
    }).setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      this.scene.start('MainMenu');
    });
  }
}