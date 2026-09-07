// Slice Studio — main.ts (Tier B, thin bootstrap)
import * as Phaser from 'phaser';
import { TraceScene } from './scenes/TraceScene';
import { EndScene } from './scenes/EndScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 720,
  height: 1280,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [TraceScene, EndScene],
};

window.addEventListener('load', () => {
  const game = new Phaser.Game(config);
  // QA console hook (CONTRACT mục 1) — testid/E2E đụng qua window.__game
  (window as unknown as { __game: Phaser.Game }).__game = game;
  // standalone build flag: enables the skip-level debug button (boss session aid)
  (game.registry as Phaser.Data.DataManager).set('standalone', true);
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
