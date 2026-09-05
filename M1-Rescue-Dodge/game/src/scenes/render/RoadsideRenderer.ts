// T1e (card t_c4495ee8) — RoadsideRenderer: props ven đường + hạt nature (CONTRACT K0 §6
// giao rõ "props ven đường, nature particles"). Tầng B: CHỈ render — toán chuyển động là
// RENDER MOTION (không đổi gameplay): dời nguyên khối seed (create cũ) + drawRoadsideProps
// + bước 3 của drawGroundFlow từ Gameplay.ts. Tham số giữ NGUYÊN: 14 props / 16 hạt /
// speed 0.00085 / 0.75 / cycle logic cũ.
import Phaser from 'phaser';
import { z } from '../../tokens';

export type RoadsidePropType = 'daisy' | 'grass' | 'flower_purple' | 'pebble';

export interface RoadsideProp {
  side: -1 | 1;
  t: number;
  speedMult: number;
  lateralOffsetRatio: number;
  propType: RoadsidePropType;
}

export interface NatureParticle {
  xRatio: number;
  y: number;
  speedMult: number;
  swayOffset: number;
  swaySpeed: number;
  size: number;
  color: number;
  alpha: number;
}

const PROP_TYPES: RoadsidePropType[] = ['daisy', 'grass', 'flower_purple', 'pebble'];

export class RoadsideRenderer {
  private scene: Phaser.Scene;
  // Texture keys bake sẵn ở GameplayScene (FLOW_TEX.prop / FLOW_TEX.dotWhite) — renderer không bake lại
  private propTexture: (t: string) => string;
  private dotTexture: string;

  private props: RoadsideProp[] = [];
  private propImgs: Phaser.GameObjects.Image[] = [];
  private nature: NatureParticle[] = [];
  private natureImgs: Phaser.GameObjects.Image[] = [];

  constructor(
    scene: Phaser.Scene,
    opts: {
      propTexture: (t: string) => string;
      dotTexture: string;
    },
  ) {
    this.scene = scene;
    this.propTexture = opts.propTexture;
    this.dotTexture = opts.dotTexture;
  }

  // ---------- Seed (mirror create() cũ — tham số giữ nguyên) ----------

  /** Seed toàn bộ props + hạt nature + Image tương ứng (gọi sau khi bake texture xong). */
  seed(height: number) {
    this.seedProps();
    this.seedNature(height);
    this.rebuildPropImages();
    this.rebuildNatureImages();
  }

  /** Mirror khối roadsideProps cũ: 14 props xen kẽ 2 bên, phân bố theo i/14. */
  private seedProps() {
    this.props = [];
    for (let i = 0; i < 14; i++) {
      this.props.push({
        side: (i % 2 === 0 ? -1 : 1),
        t: (i / 14) + Math.random() * 0.05,
        speedMult: 0.85 + Math.random() * 0.30,
        lateralOffsetRatio: Math.random(),
        propType: PROP_TYPES[i % PROP_TYPES.length],
      });
    }
  }

  /** Mirror khối natureParticles cũ: 16 hạt dot trắng tint, sway + alpha theo p.y. */
  private seedNature(height: number) {
    this.nature = [];
    for (let i = 0; i < 16; i++) {
      this.nature.push({
        xRatio: Math.random(),
        y: Phaser.Math.Between(0, height),
        speedMult: 0.65 + Math.random() * 0.70,
        swayOffset: Math.random() * Math.PI * 2,
        swaySpeed: 1.8 + Math.random() * 2.2,
        size: Phaser.Math.Between(3, 6),
        color: Math.random() < 0.4 ? 0xFFFFFF : (Math.random() < 0.7 ? 0x88D49E : 0xFFD166),
        alpha: 0.25 + Math.random() * 0.35,
      });
    }
  }

  // ---------- Image pool (mirror buildFlowObjects cũ — 1 Image mỗi object) ----------

  private rebuildPropImages() {
    for (const im of this.propImgs) im.destroy();
    this.propImgs = [];
    for (const p of this.props) {
      const im = this.scene.add.image(0, 0, this.propTexture(p.propType))
        .setDisplaySize(26, 26).setDepth(z.bg + 2).setVisible(false);
      this.propImgs.push(im);
    }
  }

  private rebuildNatureImages() {
    for (const im of this.natureImgs) im.destroy();
    this.natureImgs = [];
    for (const p of this.nature) {
      const im = this.scene.add.image(0, 0, this.dotTexture).setDepth(z.bg + 2).setTint(p.color);
      im.setDisplaySize(p.size * 2, p.size * 2);
      this.natureImgs.push(im);
    }
  }

  /** Reset state (scene.init khi restart) — mirror `roadsideProps/natureParticles = []` cũ. */
  reset() {
    this.props = [];
    this.nature = [];
    for (const im of this.propImgs) im.destroy();
    for (const im of this.natureImgs) im.destroy();
    this.propImgs = [];
    this.natureImgs = [];
  }

  get propCount(): number { return this.props.length; }
  get natureCount(): number { return this.nature.length; }

  // ---------- Update mỗi frame (mirror drawRoadsideProps + bước 3 drawGroundFlow cũ) ----------

  /**
   * Cuộn props ven đường + hạt nature. `metrics` từ getStraightRoadMetrics của scene
   * (single source layout). Toán giữ NGUYÊN từ code cũ — không đổi cảm giác chuyển động.
   */
  update(speed: number, dt: number, elapsed: number, metrics: { leftEdge: number; roadW: number }) {
    // Mirror cũ: Image rỗng sau destroy (resize/shutdown edge) → dựng lại từ state hiện có
    if (this.propImgs.length === 0 && this.props.length > 0) this.rebuildPropImages();
    if (this.natureImgs.length === 0 && this.nature.length > 0) this.rebuildNatureImages();

    const { height } = this.scene.scale;
    const { leftEdge, roadW } = metrics;

    // 1. Props ven đường
    for (let i = 0; i < this.props.length; i++) {
      const p = this.props[i];
      const im = this.propImgs[i];
      if (!im) continue;
      // Advance progress t downwards
      p.t += (speed * 0.00085 * p.speedMult) * dt;
      if (p.t >= 1.0) {
        p.t = p.t % 1.0;
        p.side = Math.random() < 0.5 ? -1 : 1;
        p.speedMult = 0.85 + Math.random() * 0.30;
        p.lateralOffsetRatio = Math.random();
        p.propType = PROP_TYPES[Math.floor(Math.random() * PROP_TYPES.length)];
        im.setTexture(this.propTexture(p.propType));
      }

      const py = p.t * height;
      const edgeX = p.side === -1 ? leftEdge : (leftEdge + roadW);
      // Lateral outward offset into roadside grass
      const px = edgeX + p.side * (12 + p.lateralOffsetRatio * 28);
      const alpha = Math.min(1.0, Math.sin(p.t * Math.PI) * 1.5);

      if (alpha <= 0.01) {
        if (im.visible) im.setVisible(false);
        continue;
      }
      im.setVisible(true).setPosition(px, py).setAlpha(alpha);
    }

    // 2. Hạt nature: cùng toán chuyển động cũ, render bằng Image tint
    for (let i = 0; i < this.nature.length; i++) {
      const p = this.nature[i];
      p.y += speed * 0.75 * p.speedMult * dt;
      if (p.y > height + 20) {
        p.y = Phaser.Math.Between(-20, 0);
        p.xRatio = Math.random();
      }
      const sway = Math.sin(elapsed * p.swaySpeed + p.swayOffset) * 12;
      const px = leftEdge + p.xRatio * roadW + sway;
      const pProgress = Math.max(0, Math.min(1, p.y / height));
      const pAlpha = Math.sin(pProgress * Math.PI) * p.alpha;
      const im = this.natureImgs[i];
      if (im) im.setPosition(px, p.y).setAlpha(pAlpha);
    }
  }

  /** Dọn game object khi scene shutdown (destroy theo chủ sở hữu). */
  destroy() {
    for (const im of this.propImgs) im.destroy();
    for (const im of this.natureImgs) im.destroy();
    this.propImgs = [];
    this.natureImgs = [];
    this.props = [];
    this.nature = [];
  }
}
