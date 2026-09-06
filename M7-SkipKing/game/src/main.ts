import * as Phaser from 'phaser';
import { MECHANICS } from './config/mechanics';
import { BootScene } from './scenes/BootScene';
import { OnboardingPlayScene } from './scenes/OnboardingPlayScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: MECHANICS.canvas.width,
  height: MECHANICS.canvas.height,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, OnboardingPlayScene],
};

window.addEventListener('load', () => {
  const game = new Phaser.Game(config);
  // QA console hook (CONTRACT mục 1) — testid/E2E đụng qua window.__game
  (window as unknown as { __game: Phaser.Game }).__game = game;
});

// game-canvas testid (CONTRACT mục 4) — Phaser sinh canvas sau khi boot.
window.addEventListener('load', () => {
  const iv = setInterval(() => {
    const c = document.querySelector('#game-container canvas');
    if (c) {
      c.setAttribute('data-testid', 'game-canvas');
      clearInterval(iv);
    }
  }, 50);
  setTimeout(() => clearInterval(iv), 10000);
});
