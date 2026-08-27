import * as Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  public preload(): void {
    // Assets programmatic chất lượng cao
  }

  public create(): void {
    // 1. Tạo cặp texture 2 lớp (Vỏ bóng 3D & Ruột matte sáng đục tự nhiên)
    this.createFruitPair('orange', 0xff7a00, 0xc85000, 0xffd180);
    this.createFruitPair('watermelon', 0x2e7d32, 0x1b5e20, 0xef5350);
    this.createFruitPair('mango', 0xfbc02d, 0xf57f17, 0xffe082);

    // 2. Tạo sprite dao gọt hoa quả (Lưỡi bạc cán gỗ)
    this.createParingKnifeTexture();

    // 3. Chuyển sang PlayScene
    this.scene.start('PlayScene');
  }

  /**
   * Tạo 2 texture chồng khít: Vỏ (rind) bóng 3D và Ruột (flesh) sáng đục matte tự nhiên
   * XÓA HOÀN TOÀN các đường nan quạt / xoáy xám ở giữa quả
   */
  private createFruitPair(
    id: string,
    primaryColor: number,
    darkShade: number,
    fleshBaseColor: number
  ): void {
    const size = 512;
    const center = size / 2;
    const radius = center - 8;

    // --- 1. Texture Ruột (Flesh - Sáng, đục matte, đồng nhất, không vân xám) ---
    const fleshTex = this.textures.createCanvas(`${id}_flesh`, size, size);
    if (fleshTex) {
      const ctx = fleshTex.getContext();

      ctx.save();
      ctx.beginPath();
      ctx.arc(center, center, radius, 0, Math.PI * 2);
      ctx.clip();

      // Nền ruột sáng đục tự nhiên
      const fleshHex = '#' + fleshBaseColor.toString(16).padStart(6, '0');
      const fleshGrad = ctx.createRadialGradient(
        center - 40, center - 40, 30,
        center + 20, center + 30, radius
      );
      fleshGrad.addColorStop(0, fleshHex);
      fleshGrad.addColorStop(0.85, fleshHex);
      fleshGrad.addColorStop(1, '#' + darkShade.toString(16).padStart(6, '0'));

      ctx.fillStyle = fleshGrad;
      ctx.fillRect(0, 0, size, size);

      // Thêm hạt tép quả li ti siêu mịn (cùng tông màu ruột, không có màu xám)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      for (let i = 0; i < 200; i++) {
        const randAngle = Math.random() * Math.PI * 2;
        const randDist = Math.random() * (radius - 15);
        const px = center + Math.cos(randAngle) * randDist;
        const py = center + Math.sin(randAngle) * randDist;
        ctx.beginPath();
        ctx.arc(px, py, 1.2 + Math.random() * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
      fleshTex.refresh();
    }

    // --- 2. Texture Vỏ Ngoài (Rind - Góc nghiêng 3D, bóng sáng specular studio) ---
    const rindTex = this.textures.createCanvas(`${id}_rind`, size, size);
    if (rindTex) {
      const ctx = rindTex.getContext();

      ctx.save();
      ctx.beginPath();
      ctx.arc(center, center, radius, 0, Math.PI * 2);
      ctx.clip();

      const lightHex = '#' + primaryColor.toString(16).padStart(6, '0');
      const darkHex = '#' + darkShade.toString(16).padStart(6, '0');

      const rindGrad = ctx.createRadialGradient(
        center - 70, center - 70, 30,
        center + 30, center + 40, radius * 1.1
      );
      rindGrad.addColorStop(0, lightHex);
      rindGrad.addColorStop(0.7, lightHex);
      rindGrad.addColorStop(1, darkHex);

      ctx.fillStyle = rindGrad;
      ctx.fillRect(0, 0, size, size);

      // Vân da sần vỏ quả
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      for (let i = 0; i < 180; i++) {
        const randAngle = Math.random() * Math.PI * 2;
        const randDist = Math.random() * (radius - 12);
        const px = center + Math.cos(randAngle) * randDist;
        const py = center + Math.sin(randAngle) * randDist;
        ctx.beginPath();
        ctx.arc(px, py, 1.5 + Math.random() * 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Điểm bóng sáng Specular (Ánh sáng studio góc nghiêng trên-trái)
      const specGrad = ctx.createRadialGradient(
        center - 75, center - 75, 5,
        center - 75, center - 75, 80
      );
      specGrad.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
      specGrad.addColorStop(0.4, 'rgba(255, 255, 255, 0.2)');
      specGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.fillStyle = specGrad;
      ctx.fillRect(0, 0, size, size);

      ctx.restore();
      rindTex.refresh();
    }
  }

  /**
   * Tạo Sprite Con dao gọt hoa quả (Lưỡi bạc sáng bóng, cán gỗ ấm áp)
   */
  private createParingKnifeTexture(): void {
    const w = 48;
    const h = 140;
    const tex = this.textures.createCanvas('knife_tool', w, h);
    if (!tex) return;

    const ctx = tex.getContext();
    const cx = w / 2;

    ctx.save();
    // 1. Cán gỗ (y từ 60 đến 135)
    const handleGrad = ctx.createLinearGradient(cx - 10, 0, cx + 10, 0);
    handleGrad.addColorStop(0, '#5d4037');
    handleGrad.addColorStop(0.5, '#8d6e63');
    handleGrad.addColorStop(1, '#3e2723');

    ctx.fillStyle = handleGrad;
    ctx.beginPath();
    ctx.roundRect(cx - 8, 60, 16, 72, [4, 4, 8, 8]);
    ctx.fill();

    // Đinh tán đồng
    ctx.fillStyle = '#ffd54f';
    ctx.beginPath();
    ctx.arc(cx, 75, 2.5, 0, Math.PI * 2);
    ctx.arc(cx, 98, 2.5, 0, Math.PI * 2);
    ctx.arc(cx, 120, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // 2. Chốt kim loại nối cán (y: 54 đến 60)
    ctx.fillStyle = '#b0bec5';
    ctx.fillRect(cx - 9, 54, 18, 6);

    // 3. Lưỡi dao bạc sáng bóng (y: 6 đến 54)
    const bladeGrad = ctx.createLinearGradient(cx - 7, 0, cx + 7, 0);
    bladeGrad.addColorStop(0, '#cfd8dc');
    bladeGrad.addColorStop(0.4, '#ffffff');
    bladeGrad.addColorStop(0.7, '#eceff1');
    bladeGrad.addColorStop(1, '#90a4ae');

    ctx.fillStyle = bladeGrad;
    ctx.beginPath();
    ctx.moveTo(cx - 6, 54);
    ctx.lineTo(cx - 6, 20);
    ctx.lineTo(cx, 6);
    ctx.lineTo(cx + 6, 22);
    ctx.lineTo(cx + 6, 54);
    ctx.closePath();
    ctx.fill();

    // Sống dao sáng
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx, 6);
    ctx.lineTo(cx - 4, 54);
    ctx.stroke();

    ctx.restore();
    tex.refresh();
  }
}
