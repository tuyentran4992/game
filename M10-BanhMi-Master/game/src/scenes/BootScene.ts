// BootScene — tai 37 PNG production theo danh sach manifest (loader tung file, khong
// texture atlas). Sau do bao ready + ve Title.
import Phaser from 'phaser'
import { ASSET_KEYS } from '../data/assets.ts'
import { bridge } from '../bridge.ts'
import { markCanvas } from '../ui/testids.ts'

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene')
  }

  preload(): void {
    markCanvas(this.game)
    // Tai DUNG danh sach manifest 37 file — loader PNG tung file (khong texture packer)
    for (const key of ASSET_KEYS) this.load.image(key, `assets/${key}.png`)
    this.load.on('complete', () => void bridge.init().then(() => bridge.ready()))
  }

  create(): void {
    // loi nhac/progress khong can — TitleScene tu hien khi textures xong
    this.scene.start('TitleScene')
  }
}
