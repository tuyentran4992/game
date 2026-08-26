/**
 * Juicy Merge — Reddit Devvit
 *
 * Entry point for the Phaser game inside Reddit's WebView.
 * Full 15-tier Kawaii physics merge game with Redis storage.
 */

import Phaser, { Scale, AUTO } from "phaser";
import { BootScene } from "./scenes/Boot";
import { StartScene } from "./scenes/Start";
import { GameplayScene } from "./scenes/Gameplay";
import { GameOverScene } from "./scenes/GameOver";
import { AlbumScene } from "./scenes/Album";
import { applyMute } from "./ui";
import { ctx } from "./context";

const config: Phaser.Types.Core.GameConfig = {
  type: AUTO,
  parent: "game-container",
  backgroundColor: "#FFF8E7",
  scale: {
    mode: Scale.FIT,
    autoCenter: Scale.CENTER_BOTH,
    width: 720,
    height: 1280,
  },
  physics: {
    default: "matter",
    matter: {
      enableSleeping: true,
      debug: false,
    },
  },
  scene: [BootScene, StartScene, GameplayScene, GameOverScene, AlbumScene],
  render: { antialias: true, roundPixels: true },
};

const StartGame = (parent: string) => {
  const game = new Phaser.Game({ ...config, parent });
  applyMute(game, ctx.isAudioEnabled());
  return game;
};

document.addEventListener("DOMContentLoaded", () => {
  StartGame("game-container");
});
