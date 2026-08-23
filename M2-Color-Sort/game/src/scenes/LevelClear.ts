import Phaser from 'phaser';
import { color, type, sp, radius, z, dur, glow, fontStyle, toColor, liquidPalette } from '../tokens';
import { drawGalaxyBg, drawPanel, drawButton, synthAudio, GalaxyBgObjects } from '../ui';
import { ctx } from '../context';
import { sdk } from '../sdk-instance';
import { MECHANICS } from '../logic/mechanics';

export class LevelClearScene extends Phaser.Scene {
  private bgObjects!: GalaxyBgObjects;

  constructor() {
    super({ key: 'LevelClearScene' });
  }

  create(data: { level: number; moves: number; optimal?: number; best: number }) {
    const { width, height } = this.scale;
    this.bgObjects = drawGalaxyBg(this);

    const level = data?.level ?? 1;
    const moves = data?.moves ?? 0;
    const optimal = data?.optimal ?? Math.max(3, level * 2 + 1);
    const best = data?.best ?? moves;

    // 1. Pháo hoa Neon Confetti bắn tỏa ra
    this.spawnConfetti(width, height);

    // 2. Overlay mờ nền
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, toColor('#000000'), 0)
      .setDepth(z.overlay);
    this.tweens.add({ targets: overlay, fillAlpha: 0.65, duration: dur.base, ease: 'quad.out' });

    // 3. Panel Frosted Glass slide-up
    const pw = Math.min(460, width - sp[5] * 2);
    const ph = Math.min(440, height - sp[5] * 2);
    const cx = width / 2, cy = height / 2;
    const root = this.add.container(cx, cy + 50).setDepth(z.panel).setAlpha(0);

    const panel = drawPanel(this, 0, 0, pw, ph);
    root.add(panel);

    // Title: LEVEL CLEAR!
    const title = this.add.text(0, -ph / 2 + sp[6] + 8, '🎉 LEVEL CLEAR!', fontStyle(type.h1, color.success))
      .setOrigin(0.5).setDepth(z.panel + 1);
    title.setShadow(0, 0, color.success, 16, false, true);
    root.add(title);

    // 4. Star Rating (3 Stars: <= optimal+2 -> 3 stars, <= optimal+6 -> 2 stars, otherwise 1 star)
    const starContainer = this.add.container(0, -ph / 2 + sp[6] + 62).setDepth(z.panel + 1);
    root.add(starContainer);

    const starsEarned = moves <= optimal + 2 ? 3 : (moves <= optimal + 6 ? 2 : 1);
    const starSpacing = 48;
    for (let s = 0; s < 3; s++) {
      const sx = (s - 1) * starSpacing;
      const isEarned = s < starsEarned;
      const starText = this.add.text(sx, 0, '★', {
        fontFamily: 'sans-serif',
        fontSize: '38px',
        color: isEarned ? color.warning : '#4A3E62',
      }).setOrigin(0.5).setScale(0);

      if (isEarned) {
        starText.setShadow(0, 0, color.warning, 12, false, true);
      }
      starContainer.add(starText);

      // Star pop animation
      this.tweens.add({
        targets: starText,
        scale: 1,
        duration: 350,
        delay: 200 + s * 140,
        ease: 'back.out',
        onStart: () => {
          if (isEarned) synthAudio.playClick();
        },
      });
    }

    // 5. Stats: Moves & Optimal & Best
    const movesObj = { count: 0 };
    const movesT = this.add.text(0, -ph / 2 + sp[6] + 118, `Moves: 0`, fontStyle(type.score, color.surface))
      .setOrigin(0.5).setDepth(z.panel + 1);
    movesT.setShadow(0, 2, color.shadow, 4, false, true);
    root.add(movesT);

    this.tweens.add({
      targets: movesObj,
      count: moves,
      duration: 600,
      delay: 300,
      ease: 'cubic.out',
      onUpdate: () => {
        movesT.setText(`Moves: ${Math.round(movesObj.count)}`);
      },
    });

    const infoText = (best > 0 && best < moves)
      ? `★ Optimal: ${optimal} moves  |  Best: ${best}`
      : `★ Optimal: ${optimal} moves`;
    const bestT = this.add.text(0, movesT.y + 36, infoText, fontStyle(type.body, color.accent))
      .setOrigin(0.5).setDepth(z.panel + 1);
    bestT.setShadow(0, 2, color.shadow, 4, false, true);
    root.add(bestT);

    // 6. Next Level Button (data-testid: next-level-btn)
    const { container: nextBtn } = drawButton(this, 0, ph / 2 - sp[6] - 14, 'NEXT LEVEL ▶', {
      testid: 'next-level-btn',
      width: 250,
      height: 64,
      variant: 'primary',
      glowColor: color.primary,
    });
    root.add(nextBtn);

    nextBtn.on('pointerdown', async () => {
      synthAudio.playClick();
      if (level > 1 && MECHANICS.ad.interstitialAfterClear) {
        try {
          await sdk.requestInterstitialAd();
        } catch {
          // Ignore
        }
      }
      this.cameras.main.fadeOut(dur.scene, 0, 0, 0);
      this.time.delayedCall(dur.scene, () => {
        ctx.currentLevel = level + 1;
        void ctx.save();
        this.scene.start('GameplayScene');
      });
    });

    // Panel entrance tween
    this.tweens.add({
      targets: root,
      y: cy,
      alpha: 1,
      duration: dur.slow,
      ease: 'cubic.out',
    });

    this.scale.on('resize', (sz: Phaser.Structs.Size) => {
      this.cameras.main.setSize(sz.width, sz.height);
    });
  }

  private spawnConfetti(width: number, height: number) {
    const cx = width / 2, cy = height * 0.45;
    for (let i = 0; i < 75; i++) {
      const hex = liquidPalette[Math.floor(Math.random() * liquidPalette.length)];
      const size = Phaser.Math.Between(3, 7);
      const isCircle = i % 2 === 0;

      const p: Phaser.GameObjects.GameObject = isCircle
        ? this.add.circle(cx, cy, size / 2, toColor(hex), 1).setDepth(z.overlay + 1)
        : this.add.rectangle(cx, cy, size, size * 1.6, toColor(hex), 1).setDepth(z.overlay + 1);

      const angle = Math.random() * Math.PI * 2;
      const dist = Phaser.Math.Between(70, 360);
      const tx = cx + Math.cos(angle) * dist;
      const ty = cy + Math.sin(angle) * dist + Phaser.Math.Between(60, 220);

      this.tweens.add({
        targets: p,
        x: tx,
        y: ty,
        alpha: 0,
        angle: Phaser.Math.Between(180, 1080),
        duration: Phaser.Math.Between(900, 1500),
        ease: 'cubic.out',
        onComplete: () => p.destroy(),
      });
    }
  }
}
