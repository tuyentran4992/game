/**
 * Juicy Merge — Reddit Devvit
 *
 * Entry point for the Phaser game inside Reddit's WebView.
 * M3 game logic ported from /data/youtube-playables/M3-Juicy-Merge/
 */

import Phaser from 'phaser';
import { Boot } from './scenes/Boot';
import { Preloader } from './scenes/Preloader';
import { MainMenu } from './scenes/MainMenu';
import { Game as MainGame } from './scenes/Game';
import { GameOver } from './scenes/GameOver';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#FFF8E7',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 720,
    height: 1280,
  },
  physics: {
    default: 'matter',
    matter: {
      gravity: { y: 1.5 },
      debug: false,
    },
  },
  scene: [Boot, Preloader, MainMenu, MainGame, GameOver],
};

const StartGame = (parent: string) => {
  return new Phaser.Game({ ...config, parent });
};

document.addEventListener('DOMContentLoaded', () => {
  StartGame('game-container');
});