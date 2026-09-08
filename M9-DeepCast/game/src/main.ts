// Deep Cast bootstrap: Phaser game config (480x854 portrait, FIT scale).
import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.ts';
import { GameScene } from './scenes/GameScene.ts';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game', // mount inside #game so the canvas is centered, not appended to <body>
  width: 480,
  height: 854,
  backgroundColor: '#041128',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 0 } } },
  scene: [BootScene, GameScene],
};

const game = new Phaser.Game(config);
(window as unknown as { __game?: Phaser.Game }).__game = game;
