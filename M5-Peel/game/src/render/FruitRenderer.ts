import * as Phaser from 'phaser';
import { FruitDefinition, GAME_CONFIG } from '../config/peelConfig';
import { PeelCalculator } from '../logic/PeelCalculator';
import { GrooveState } from '../logic/types';

export class FruitRenderer {
  private scene: Phaser.Scene;
  private shadowGraphics: Phaser.GameObjects.Graphics;
  private fleshImage: Phaser.GameObjects.Image;
  private bevelGraphics: Phaser.GameObjects.Graphics;
  private rindSprite: Phaser.GameObjects.Image;
  private rindCanvasTexture!: Phaser.Textures.CanvasTexture;
  private tutorialGraphics: Phaser.GameObjects.Graphics;
  private flashGraphics: Phaser.GameObjects.Graphics;
  private knifeSprite: Phaser.GameObjects.Image;
  private labelText: Phaser.GameObjects.Text;

  private currentRindSource: HTMLImageElement | null = null;
  private currentFruit: FruitDefinition | null = null;
  private fruitIndex: number = 1;
  private flashAlpha: number = 0;
  private pulseTimer: number = 0;
  private hasCutStarted: boolean = false;
  private tutorialAlpha: number = 0.6;

  // Brush radius: cố định ~6% bán kính quả (~11px trên màn hình 360px)
  public static readonly BRUSH_RADIUS_SCREEN: number = 11;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const cx = GAME_CONFIG.CENTER_X;
    const cy = GAME_CONFIG.CENTER_Y;

    // 1. Bóng đổ 3D dưới đáy quả
    this.shadowGraphics = this.scene.add.graphics().setDepth(5);

    // 2. Ruột quả (Flesh - Sáng, đục matte tự nhiên, không vân xám)
    this.fleshImage = this.scene.add
      .image(cx, cy, 'orange_flesh')
      .setDisplaySize(360, 360)
      .setDepth(10);

    // 3. Shadow 2px xuống ruột (ánh sáng trên-trái)
    this.bevelGraphics = this.scene.add.graphics().setDepth(11);

    // 4. Vỏ ngoài (Rind) + Nét đứt guide opacity <= 0.35 ĐƯỢC VẼ CÙNG LAYER CANVAS để bị mask xóa theo
    const textureKey = 'fruit_rind_erased';
    if (this.scene.textures.exists(textureKey)) {
      this.scene.textures.remove(textureKey);
    }
    this.rindCanvasTexture = this.scene.textures.createCanvas(textureKey, 512, 512)!;

    this.rindSprite = this.scene.add
      .image(cx, cy, textureKey)
      .setDisplaySize(360, 360)
      .setDepth(12);

    // 5. Hint trắng ấm (opacity 0.6, chỉ QUẢ 1, fade ngay khi bắt đầu cắt)
    this.tutorialGraphics = this.scene.add.graphics().setDepth(15);
    this.flashGraphics = this.scene.add.graphics().setDepth(20);

    // 6. Cursor = Con dao gọt hoa quả (Lưỡi bạc cán gỗ)
    this.knifeSprite = this.scene.add
      .image(0, 0, 'knife_tool')
      .setOrigin(0.5, 0.22)
      .setDisplaySize(42, 120)
      .setVisible(false)
      .setDepth(35);

    // 7. Chữ CAM: 40% cỡ, opacity 0.5, sát mép quả
    this.labelText = this.scene.add
      .text(cx, cy + 185 + 24, '', {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '16px',
        fontStyle: '700',
        color: '#94a3b8',
        align: 'center',
      })
      .setOrigin(0.5)
      .setAlpha(0.5)
      .setDepth(25);
  }

  public setFruit(fruit: FruitDefinition, fruitIdx: number = 1): void {
    this.currentFruit = fruit;
    this.fruitIndex = fruitIdx;
    this.hasCutStarted = false;
    this.tutorialAlpha = 0.6;

    if (this.scene.textures.exists(fruit.fleshKey)) {
      this.fleshImage.setTexture(fruit.fleshKey);
    }

    if (this.scene.textures.exists(fruit.rindKey)) {
      const rindTex = this.scene.textures.get(fruit.rindKey);
      this.currentRindSource = rindTex.getSourceImage() as HTMLImageElement;
    }

    const diameterX = fruit.radiusX * 2;
    const diameterY = fruit.radiusY * 2;
    this.fleshImage.setDisplaySize(diameterX, diameterY);
    this.rindSprite.setDisplaySize(diameterX, diameterY);

    this.labelText.setText(fruit.name);
    this.bevelGraphics.clear();
    this.resetRindCanvas();
  }

  public onCutStarted(): void {
    this.hasCutStarted = true;
  }

  /**
   * Vẽ lớp vỏ + nét đứt guide trực tiếp lên CanvasTexture để khi gọt, guide bị xóa sạch cùng vỏ
   */
  public resetRindCanvas(): void {
    if (!this.currentRindSource || !this.rindCanvasTexture) return;
    const ctx = this.rindCanvasTexture.getContext();
    ctx.clearRect(0, 0, 512, 512);

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';

    // 1. Vẽ texture vỏ quả
    ctx.drawImage(this.currentRindSource, 0, 0, 512, 512);

    // 2. Vẽ 3 đường nét đứt guide (opacity <= 0.35) trực tiếp lên vỏ ở quả 1
    if (this.fruitIndex === 1) {
      const canvasCenter = 256;
      const canvasScale = 512 / 360;

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.32)';
      ctx.lineWidth = 2.2;
      ctx.setLineDash([8, 10]);

      for (const c of PeelCalculator.CONTOURS) {
        ctx.save();
        ctx.translate(canvasCenter, canvasCenter + c.offsetY * canvasScale);
        ctx.rotate(c.rotation);
        ctx.beginPath();
        ctx.ellipse(0, 0, c.radiusX * canvasScale, c.radiusY * canvasScale, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    ctx.restore();
    this.rindCanvasTexture.refresh();
  }

  /**
   * ERASE-VIA-MASK: Mask Stamp + Interpolation
   * Dải 3-4px màu vỏ đậm hơn + highlight trắng mép trên + shadow 2px xuống ruột (light trên-trái)
   */
  public eraseAt(
    worldX1: number,
    worldY1: number,
    worldX2: number,
    worldY2: number
  ): void {
    if (!this.rindCanvasTexture) return;

    const cx = GAME_CONFIG.CENTER_X;
    const cy = GAME_CONFIG.CENTER_Y;
    const size = 512;
    const scale = size / 360; // 512 / 360 = 1.4222

    const u1 = (worldX1 - (cx - 180)) * scale;
    const v1 = (worldY1 - (cy - 180)) * scale;
    const u2 = (worldX2 - (cx - 180)) * scale;
    const v2 = (worldY2 - (cy - 180)) * scale;

    const brushR = FruitRenderer.BRUSH_RADIUS_SCREEN * scale; // ~15.6px

    const ctx = this.rindCanvasTexture.getContext();
    ctx.save();

    const dx = u2 - u1;
    const dy = v2 - v1;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 0.5) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(u2, v2, brushR, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const nx = (-dy / dist);
      const ny = (dx / dist);

      // --- 1. MÉP VỎ DÀY 3-4px (màu vỏ đậm hơn) ở 2 bên mép cắt ---
      ctx.globalCompositeOperation = 'source-atop';
      ctx.strokeStyle = 'rgba(150, 45, 0, 0.85)'; // Màu vỏ sẫm hơn tạo độ dày thịt vỏ
      ctx.lineWidth = brushR * 2 + 7;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(u1, v1);
      ctx.lineTo(u2, v2);
      ctx.stroke();

      // Highlight trắng mảnh trên mép (Ánh sáng góc trên-trái)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(u1 + nx * (brushR + 1.2), v1 + ny * (brushR + 1.2));
      ctx.lineTo(u2 + nx * (brushR + 1.2), v2 + ny * (brushR + 1.2));
      ctx.stroke();

      // --- 2. ĐỤC LỖ VỎ (DESTINATION-OUT) ---
      ctx.globalCompositeOperation = 'destination-out';

      const p1x = u1 + nx * brushR;
      const p1y = v1 + ny * brushR;
      const p2x = u2 + nx * brushR;
      const p2y = v2 + ny * brushR;
      const p3x = u2 - nx * brushR;
      const p3y = v2 - ny * brushR;
      const p4x = u1 - nx * brushR;
      const p4y = v1 - ny * brushR;

      ctx.beginPath();
      ctx.moveTo(p1x, p1y);
      ctx.lineTo(p2x, p2y);
      ctx.lineTo(p3x, p3y);
      ctx.lineTo(p4x, p4y);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.arc(u1, v1, brushR, 0, Math.PI * 2);
      ctx.arc(u2, v2, brushR, 0, Math.PI * 2);
      ctx.fill();

      // Sub-sample nội suy
      const steps = Math.ceil(dist / 3);
      if (steps > 1) {
        for (let i = 1; i < steps; i++) {
          const t = i / steps;
          const su = u1 + dx * t;
          const sv = v1 + dy * t;
          ctx.beginPath();
          ctx.arc(su, sv, brushR, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // --- 3. SHADOW 2PX XUỐNG RUỘT (Light trên-trái, shadow đổ xuống-phải) ---
      this.bevelGraphics.lineStyle(brushR * 2 + 3, 0x000000, 0.15);
      this.bevelGraphics.beginPath();
      this.bevelGraphics.moveTo(worldX1 + 1.5, worldY1 + 2.5);
      this.bevelGraphics.lineTo(worldX2 + 1.5, worldY2 + 2.5);
      this.bevelGraphics.strokePath();
    }

    ctx.restore();
    this.rindCanvasTexture.refresh();
  }

  public render(
    fruit: FruitDefinition,
    grooves: GrooveState[],
    knifePos: { x: number; y: number; active: boolean; angle?: number } | null,
    deltaMs: number
  ): void {
    this.pulseTimer += deltaMs * 0.005;

    const cx = GAME_CONFIG.CENTER_X;
    const cy = GAME_CONFIG.CENTER_Y;
    const rx = fruit.radiusX;
    const ry = fruit.radiusY;

    // 1. Bóng đổ quả mềm mại
    this.shadowGraphics.clear();
    this.shadowGraphics.fillStyle(0x000000, 0.45);
    this.shadowGraphics.fillEllipse(cx, cy + ry + 16, rx * 1.7, 36);

    // 2. VÒNG TRẮNG ẤM HINT (opacity 0.6, chỉ QUẢ 1, fade ngay khi bắt đầu cắt)
    this.tutorialGraphics.clear();

    if (this.fruitIndex === 1 && !this.hasCutStarted && this.tutorialAlpha > 0.01) {
      const activeGroove = grooves.find((g) => !g.isCompleted);
      if (activeGroove) {
        const startPt = PeelCalculator.getContourPoint(activeGroove.index, 0, cx, cy);
        const pulse = 0.5 + 0.5 * Math.sin(this.pulseTimer * 1.2);

        // Chấm tròn trắng ấm phát sáng nhẹ
        this.tutorialGraphics.fillStyle(0xfff8e7, this.tutorialAlpha * (0.85 + pulse * 0.15));
        this.tutorialGraphics.fillCircle(startPt.x, startPt.y, 6 + pulse * 2);

        this.tutorialGraphics.lineStyle(2, 0xfff8e7, this.tutorialAlpha * (0.7 - pulse * 0.2));
        this.tutorialGraphics.strokeCircle(startPt.x, startPt.y, 14 + pulse * 4);
      }
    } else if (this.hasCutStarted && this.tutorialAlpha > 0) {
      this.tutorialAlpha -= deltaMs * 0.006; // Fade out nhanh
      if (this.tutorialAlpha < 0) this.tutorialAlpha = 0;
    }

    // 3. Flash đỏ khi đứt
    this.flashGraphics.clear();
    if (this.flashAlpha > 0) {
      this.flashGraphics.fillStyle(0xff0000, this.flashAlpha);
      this.flashGraphics.fillEllipse(cx, cy, rx * 2.1, ry * 2.1);
      this.flashAlpha -= deltaMs / 200;
      if (this.flashAlpha < 0) this.flashAlpha = 0;
    }

    // 4. Con dao gọt hoa quả (Lưỡi bạc cán gỗ) xoay theo hướng vuốt
    if (knifePos && knifePos.active) {
      this.knifeSprite.setVisible(true);
      this.knifeSprite.setPosition(knifePos.x, knifePos.y);

      const angle = knifePos.angle ?? 0;
      this.knifeSprite.setRotation(angle - Math.PI * 0.5);
    } else {
      this.knifeSprite.setVisible(false);
    }
  }

  public triggerRedFlash(): void {
    this.flashAlpha = 0.5;
  }

  public triggerFruitSpawnBounce(): void {
    this.fleshImage.setScale(0.6);
    this.fleshImage.setAlpha(0.2);
    this.rindSprite.setScale(0.6);
    this.rindSprite.setAlpha(0.2);

    this.scene.tweens.add({
      targets: [this.fleshImage, this.rindSprite],
      scale: 1.0,
      alpha: 1.0,
      duration: 320,
      ease: 'Back.easeOut',
    });
  }

  public destroy(): void {
    this.shadowGraphics.destroy();
    this.fleshImage.destroy();
    this.bevelGraphics.destroy();
    this.rindSprite.destroy();
    this.tutorialGraphics.destroy();
    this.flashGraphics.destroy();
    this.knifeSprite.destroy();
    this.labelText.destroy();
  }
}
