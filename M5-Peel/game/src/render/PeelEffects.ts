import * as Phaser from 'phaser';
import { GAME_CONFIG, PEEL_CONFIG } from '../config/peelConfig';

interface ParticleItem {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  rotation: number;
  vRot: number;
}

export class PeelEffects {
  private scene: Phaser.Scene;
  private particleGraphics: Phaser.GameObjects.Graphics;
  private particles: ParticleItem[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.particleGraphics = this.scene.add.graphics();
    this.particleGraphics.setDepth(28);
  }

  /**
   * Bắn 2-4 vụn vỏ theo pháp tuyến vết cắt (2 tông màu vỏ quả, KHÔNG CÓ MÀU TRẮNG)
   * Quỹ đạo parabol 0.3 - 0.5s, fade mờ dần
   */
  public emitCuttingZest(
    x: number,
    y: number,
    normalAngle: number,
    rindColor: number,
    _fleshColor: number,
    count: number = 3
  ): void {
    // 2 tông màu vỏ: Tông tươi (rindColor) và Tông đậm hơn (dark rind)
    const darkRindColor = this.getDarkerRindTone(rindColor);

    for (let i = 0; i < count; i++) {
      const spread = (Math.random() - 0.5) * 0.7;
      const angle = normalAngle + spread;
      const speed = 2.8 + Math.random() * 3.5;

      const isDarkTone = Math.random() > 0.5;
      const color = isDarkTone ? darkRindColor : rindColor;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.2, // Lực nâng parabol
        color,
        size: 2.2 + Math.random() * 2.2,
        alpha: 1.0,
        life: 0,
        maxLife: Math.floor(18 + Math.random() * 12), // 18-30 frames (0.3s - 0.5s @ 60fps)
        rotation: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 0.3,
      });
    }
  }

  private getDarkerRindTone(color: number): number {
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;

    const darkR = Math.floor(r * 0.75);
    const darkG = Math.floor(g * 0.75);
    const darkB = Math.floor(b * 0.75);

    return (darkR << 16) | (darkG << 8) | darkB;
  }

  /**
   * Bùng nổ khi đạt PERFECT PEEL (chỉ dùng các tông màu vỏ lấp lánh)
   */
  public emitPerfectBurst(x: number, y: number, rindColor: number): void {
    const count = 28;
    const darkRind = this.getDarkerRindTone(rindColor);

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const speed = 3.5 + Math.random() * 5.5;
      const isDark = Math.random() > 0.5;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2.0,
        color: isDark ? darkRind : rindColor,
        size: 3.5 + Math.random() * 2.0,
        alpha: 1.0,
        life: 0,
        maxLife: Math.floor(25 + Math.random() * 15),
        rotation: 0,
        vRot: (Math.random() - 0.5) * 0.3,
      });
    }
  }

  /**
   * Pop chữ "PERFECT PEEL!"
   */
  public showPopText(
    text: string,
    color: string = '#FFD700',
    isPerfect: boolean = true
  ): void {
    const targetY = GAME_CONFIG.CENTER_Y - 260;
    const popText = this.scene.add
      .text(GAME_CONFIG.CENTER_X, targetY + 30, text, {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: isPerfect ? '38px' : '30px',
        fontStyle: '900',
        color: color,
        stroke: '#000000',
        strokeThickness: 5,
        shadow: {
          offsetX: 0,
          offsetY: 4,
          color: '#000000',
          blur: 10,
          fill: true,
        },
      })
      .setOrigin(0.5)
      .setDepth(45)
      .setScale(PEEL_CONFIG.POP_SCALE_START);

    if (isPerfect) {
      this.scene.cameras.main.shake(120, 2 / GAME_CONFIG.WIDTH);
    }

    this.scene.tweens.add({
      targets: popText,
      scale: PEEL_CONFIG.POP_SCALE_END,
      y: targetY,
      duration: 350,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: popText,
          alpha: 0,
          y: targetY - 35,
          duration: 300,
          delay: 150,
          ease: 'Power2',
          onComplete: () => {
            popText.destroy();
          },
        });
      },
    });
  }

  public update(): void {
    this.particleGraphics.clear();
    if (this.particles.length === 0) return;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life++;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.32;
      p.vx *= 0.98;
      p.rotation += p.vRot;
      p.alpha = 1.0 - (p.life / p.maxLife);

      if (p.life >= p.maxLife || p.alpha <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      this.particleGraphics.fillStyle(p.color, p.alpha);
      this.particleGraphics.fillCircle(p.x, p.y, p.size);
    }
  }

  public destroy(): void {
    this.particleGraphics.destroy();
    this.particles = [];
  }
}
