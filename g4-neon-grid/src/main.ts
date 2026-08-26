/**
 * Neon Grid — main.ts
 *
 * Entry point: creates Phaser game with shared core packages.
 */

import Phaser from 'phaser';
import { sdk } from '@game/sdk';
import { StartScene } from './scenes/Start';
import { GameplayScene } from './scenes/Gameplay';
import { SkinsScene } from './scenes/Skins';

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
  render: {
    antialias: true,
    antialiasGL: true,
    roundPixels: false,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: true,
  },
  scene: [StartScene, GameplayScene, SkinsScene],
};

// Ensure Google Fonts are loaded before booting Phaser
async function startApp(): Promise<void> {
  if (document.fonts) {
    try {
      // Race fonts.ready against a timeout to prevent hanging in headless/offline environments
      await Promise.race([
        document.fonts.ready,
        new Promise(resolve => setTimeout(resolve, 3000)),
      ]);
    } catch {
      // ignore font loading error and proceed
    }
  }

  const game = new Phaser.Game(config);

  game.events.on('ready', () => {
    sdk.initialize();
    sdk.gameReady();
  });
}

startApp();