/**
 * M7 Skip King — StoneRenderer (T3 Tầng B): vẽ viên đá qua projection.
 * Sprite 'stone' (T6 art) nếu có, fallback shape tự generate đủ boot (CONTRACT §5.6).
 * Renderer KHÔNG tự tính luật — vị trí/cao độ đọc trực tiếp Stone của tầng A.
 */
import * as Phaser from 'phaser';
import type { Stone } from '../logic/types';
import type { Projection } from './layout';
import { SKIM } from './layout';
import { SquashFx } from './SquashFx';

export const STONE_TEX = 'stone';
const STONE_FB_KEY = 'stone_fb';
const STONE_FB_PX = 44;

export class StoneRenderer {
  private sprite: Phaser.GameObjects.Image;
  private squash: SquashFx;
  /** Góc xoay TÍCH LŨY (rad) — FUN2-C2: spin theo tốc độ bay thật, không theo wall-clock. */
  private rot = 0;

  constructor(scene: Phaser.Scene, private proj: Projection) {
    if (!scene.textures.exists(STONE_TEX)) {
      // Fallback shape: viên đá xám viền sáng đủ đọc trên nước — chỉ dùng khi T6 art chưa nạp.
      const g = scene.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0x8d99ae, 1);
      g.slice(STONE_FB_PX / 2, STONE_FB_PX / 2, STONE_FB_PX / 2 - 2, 0, Math.PI * 2);
      g.fillPath();
      g.fillStyle(0xc9d3e0, 1);
      g.slice(STONE_FB_PX / 2 - 8, STONE_FB_PX / 2 - 8, STONE_FB_PX / 6, 0, Math.PI * 2);
      g.fillPath();
      g.generateTexture(STONE_FB_KEY, STONE_FB_PX, STONE_FB_PX);
      g.destroy();
    }
    const key = scene.textures.exists(STONE_TEX) ? STONE_TEX : STONE_FB_KEY;
    this.sprite = scene.add
      .image(this.proj.xToScreenX(0, 0), this.proj.waterlineY, key)
      .setOrigin(0.5, 0.5)
      .setDepth(30)
      .setData('testid', 'stone'); // pattern M1 — QA bấm/soi qua testid
    if (key === STONE_FB_KEY) {
      // BootScene (T6) preload chạy SONG SONG PlayScene.create — sprite chưa chắc đã nạp.
      // Khi texture 'stone' xuất hiện → chuyển ngay từ fallback sang art thật (merge T6 trước T3).
      const swap = (texKey: string): void => {
        if (texKey !== STONE_TEX) return;
        this.sprite.setTexture(STONE_TEX);
        scene.textures.off('addtexture', swap);
      };
      scene.textures.on('addtexture', swap);
      scene.events.once('shutdown', () => scene.textures.off('addtexture', swap));
    }
    this.squash = new SquashFx();
  }

  /** Đá đang bay: đặt theo Stone 2.5D (y = cao độ trên mặt nước).
   * FUN2-C2: spin theo tốc độ bay THẬT (đọc Stone tầng A — khối quang học xoay nhanh lúc
   * vắt mạnh, chậm khi rơi) — rotation TÍCH LŨY ∝ hypot(vx,vz) × SKIM.spinRadPerMsPerSpeed,
   * không còn rotation cứng 0.004 rad/ms theo wall-clock. */
  renderStone(s: Stone, _timeMs: number, deltaMs = 16.7): void {
    const x = this.proj.xToScreenX(s.x, s.z);
    const y = this.proj.zToY(s.z) - s.y * this.proj.pxPerM(s.z);
    const scale = this.proj.zScale(s.z);
    this.sprite.setPosition(x, y).setScale(scale).setVisible(true);
    this.rot += Math.hypot(s.vx, s.vz) * SKIM.spinRadPerMsPerSpeed * deltaMs;
    this.sprite.rotation = this.rot % (Math.PI * 2); // đá xoay theo tốc thật — cảm giác vật lý
  }

  /** Đá đợi ở điểm xuất phát (chưa ném) — neo aim guide. FUN2-C2: rotation về 0 như cũ. */
  renderIdle(): void {
    this.rot = 0;
    this.sprite.setPosition(this.proj.xToScreenX(0, 0), this.proj.waterlineY - 10);
    this.sprite.setScale(1).setRotation(0).setVisible(true);
  }

  hide(): void {
    this.sprite.setVisible(false);
  }

  squashFx(): void {
    this.squash.apply(this.sprite);
  }

  get spriteForTest(): Phaser.GameObjects.Image {
    return this.sprite;
  }
}
