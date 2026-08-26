import Phaser from "phaser";
import { FRUIT_KEYS, AUDIO_KEYS } from "../assets";
import { ctx } from "../context";
import { dur } from "../tokens";

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  preload(): void {
    this.load.baseURL = "./raw/";
    for (const key of FRUIT_KEYS) this.load.image(key, `${key}.png`);
    this.load.image("bucket", "bucket.png");
    this.load.image("bg_gradient", "bg_gradient.png");
    for (const key of AUDIO_KEYS) this.load.audio(key, `${key}.mp3`);
    this.load.on("loaderror", (file: Phaser.Loader.File) => {
      console.warn(`asset missing (fallback geometric): ${file.key}`);
    });
  }

  create(): void {
    const canvas = this.game.canvas;
    if (canvas) canvas.setAttribute("data-testid", "game-canvas");
    ctx.load().finally(() => {
      this.cameras.main.fadeOut(dur.scene, 0, 0, 0);
      this.time.delayedCall(dur.scene, () => this.scene.start("StartScene"));
    });
  }
}

export { BootScene as Boot };
