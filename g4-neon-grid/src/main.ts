/**
 * Neon Grid — main.ts
 *
 * Entry point: creates Phaser game with shared core packages.
 */

import Phaser from 'phaser';
import { sdk } from '@game/sdk';
import { StartScene } from './scenes/Start';
import { GameplayScene } from './scenes/Gameplay';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  parent: 'game-container',
  width: 720,
  height: 1280,
  backgroundColor: '#0a0a1a',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [StartScene, GameplayScene],
};

// Boot
const game = new Phaser.Game(config);

// Initialize SDK on game ready
game.events.on('ready', () => {
  sdk.initialize();
  sdk.gameReady();
});