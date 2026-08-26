import Phaser from 'phaser';

export class MainMenu extends Phaser.Scene {
  constructor() { super('MainMenu'); }

  create() {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    this.add.text(cx, cy - 120, '🍉', { fontSize: '64px' }).setOrigin(0.5);
    this.add.text(cx, cy - 40, 'Juicy Merge', {
      fontSize: '42px', fontFamily: 'sans-serif', fontStyle: 'bold', color: '#4A2C2A',
    }).setOrigin(0.5);
    this.add.text(cx, cy + 20, 'Drop • Merge • Grow', {
      fontSize: '20px', color: '#888',
    }).setOrigin(0.5);

    const btn = this.add.text(cx, cy + 100, '▶  PLAY', {
      fontSize: '28px', fontFamily: 'sans-serif', fontStyle: 'bold', color: '#ffffff',
      backgroundColor: '#FF6B81', padding: { x: 40, y: 16 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setBackgroundColor('#E8556F'));
    btn.on('pointerout', () => btn.setBackgroundColor('#FF6B81'));
    btn.on('pointerdown', () => {
      this.cameras.main.fadeOut(200, 0, 0, 0);
      this.time.delayedCall(200, () => this.scene.start('Game'));
    });
  }
}