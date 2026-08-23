import Phaser from 'phaser';

// GameOver scene — skeleton (filled in steps 11-12: final-score/best-score
// panels, Continue/Retry buttons, rewarded + interstitial + record popup).
// Kept inert now so Boot can register it without a runtime crash.
export class GameOverScene extends Phaser.Scene {
  constructor() { super({ key: 'GameOverScene' }); }

  create(): void {
    const { width, height } = this.scale;
    const placeholder = this.add.text(width / 2, height / 2, 'Game Over', {
      fontFamily: 'sans-serif',
      fontSize: '40px',
      fontStyle: 'bold',
      color: '#4A2C2A',
    }).setOrigin(0.5).setDepth(50);
    placeholder.setData('testid', 'gameover-title');
  }
}
