// Fish/whale/shark sprite sync + swim wiggle + hooked thrash animation.
import Phaser from 'phaser';
import type { GameState } from '../core/types.ts';
import { fishById } from '../data/fishData.ts';

// defId 'f3' -> texture 'fish_03' (loader keys are zero-padded)
export const fishTexture = (defId: string): string =>
  defId === 'whale' ? 'whale' : `fish_${defId.slice(1).padStart(2, '0')}`;

// display widths per species (DESIGN-SPEC §3: 48–120 px across the 10 species)
const FISH_W = [48, 56, 64, 72, 80, 88, 96, 104, 112, 120];

interface SpriteMeta {
  img: Phaser.GameObjects.Image;
  w: number;
  h: number;
}

export class FishLayer {
  private scene: Phaser.Scene;
  private sprites = new Map<number, SpriteMeta>();
  private shark!: Phaser.GameObjects.Image;
  private boatRef: Phaser.GameObjects.Image | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  setBoat(img: Phaser.GameObjects.Image): void {
    this.boatRef = img;
  }

  createShark(): void {
    this.shark = this.scene.add.image(240, 1146, 'shark').setDepth(8);
    // spec width 160px, aspect kept (source art is 632x390, not the spec's flat 160x54)
    this.shark.setDisplaySize(160, Math.round((160 * this.shark.height) / this.shark.width));
  }

  // keep sprite pool in sync with live fish
  sync(state: GameState): void {
    const alive = new Set<number>();
    for (const f of state.fish) {
      alive.add(f.uid);
      if (!this.sprites.has(f.uid)) {
        const idx = f.defId === 'whale' ? 9 : Number(f.defId.slice(1)) - 1;
        const w = f.defId === 'whale' ? 240 : FISH_W[idx] ?? 64;
        // whale source art is vertical (681x788) -> keep its aspect ratio at 240 wide
        const h = f.defId === 'whale' ? Math.round(240 * (788 / 681)) : Math.round(w * 0.5);
        const img = this.scene.add.image(f.x, f.y, fishTexture(f.defId)).setDepth(6);
        img.setDisplaySize(w, h);
        if (f.defId === 'whale') img.setDepth(7);
        this.sprites.set(f.uid, { img, w, h });
      }
    }
    for (const [uid, meta] of this.sprites) {
      if (!alive.has(uid) && !state.hooked.includes(uid)) {
        meta.img.destroy();
        this.sprites.delete(uid);
      }
    }
  }

  update(state: GameState, timeS: number): void {
    const hookedSet = new Set(state.hooked);
    for (const f of state.fish) {
      const meta = this.sprites.get(f.uid);
      if (!meta) continue;
      const { img, w, h } = meta;
      const def = fishById(f.defId);
      const isWhale = def?.id === 'whale';
      if (hookedSet.has(f.uid)) {
        // hooked: pinned to the hook, thrash rotation + attach squash
        img.setPosition(state.hookX, state.hookY);
        img.setRotation(Math.sin(timeS * 18) * (isWhale ? 0.35 : 0.6));
        img.setDisplaySize(w * 1.12, h * 0.88);
        continue;
      }
      img.setPosition(f.x, f.y);
      img.setRotation(Math.sin(timeS * 4 + f.phase) * 0.08);
      img.setFlipX(f.vx < 0);
      // smooth swim pulse (the old binary 1.0/0.92 flip read as a flicker)
      const wig = 0.96 + 0.04 * Math.sin(timeS * 9 + f.phase);
      img.setDisplaySize(w * wig, h);
    }
    if (this.shark) {
      this.shark.setPosition(state.sharkX, state.sharkY);
      this.shark.setFlipX(state.sharkDir < 0);
    }
  }

  boatAnchor(): { x: number; y: number } {
    if (this.boatRef) return { x: this.boatRef.x + 20, y: this.boatRef.y + 40 };
    return { x: 260, y: 130 };
  }

  destroy(): void {
    for (const meta of this.sprites.values()) meta.img.destroy();
    this.sprites.clear();
    if (this.shark) this.shark.destroy();
  }
}
