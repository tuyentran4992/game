import Phaser from 'phaser';
import { color, type, sp, radius, z, dur, glow, fontStyle, toColor, liquidPalette } from '../tokens';
import { drawGalaxyBg, drawPanel, drawButton } from '../ui';
import { ctx } from '../context';
import { sdk } from '../sdk-instance';
import { MECHANICS } from '../logic/mechanics';

// LevelClearScene M2 (DESIGN-SPEC §4.3) — popup "Hoàn thành!" + confetti + nút Next.
export class LevelClearScene extends Phaser.Scene {
  constructor() { super({ key: 'LevelClearScene' }); }

  create(data: { level: number; moves: number; best: number }) {
    const { width, height } = this.scale;
    drawGalaxyBg(this);
    const level = data?.level ?? 1;
    const moves = data?.moves ?? 0;
    const best = data?.best ?? 0;

    // confetti neon (DESIGN-SPEC §5 A4) — chấm 1-3px palette nổ giữa màn, rơi + xoay
    this.spawnConfetti(width, height);

    // overlay (z40 — DESIGN-SPEC §4.3)
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, toColor(color.overlay), 0)
      .setDepth(z.overlay);
    this.tweens.add({ targets: overlay, fillAlpha: 0.55, duration: dur.base, ease: 'quad.out' });

    // Panel (DESIGN-SPEC §3.5/§4.3) — slide-up
    const pw = Math.min(480, width - sp[6] * 2);
    const ph = Math.min(420, height - sp[6] * 2);
    const cx = width / 2, cy = height / 2;
    const root = this.add.container(cx, cy + 48).setDepth(z.panel).setAlpha(0);

    const panel = drawPanel(this, 0, 0, pw, ph);
    panel.setDepth(z.panel);
    root.add(panel);

    // tiêu đề "HOÀN THÀNH!" type.h1, color.success glow (DESIGN-SPEC §4.3)
    const title = this.add.text(0, -ph / 2 + sp[6] + 8, '🎉 HOÀN THÀNH!', fontStyle(type.h1, color.success))
      .setOrigin(0.5).setDepth(z.panel + 1);
    title.setShadow(0, 0, color.success, 12, false, true);
    root.add(title);

    // Moves + ★Best (DESIGN-SPEC §4.3) — type.score + type.body
    const movesT = this.add.text(0, -ph / 2 + sp[6] + 64, `Moves: ${moves}`, fontStyle(type.score, color.textPrimary))
      .setOrigin(0.5).setDepth(z.panel + 1);
    root.add(movesT);
    const bestT = this.add.text(0, movesT.y + 40, `★ Best: ${best}`, fontStyle(type.body, color.warning))
      .setOrigin(0.5).setDepth(z.panel + 1);
    root.add(bestT);

    // nút "Level tiếp" (data-testid=next-level-btn) — btn-primary neon
    const { container } = drawButton(this, 0, ph / 2 - sp[6] - 16, 'Level tiếp', { testid: 'next-level-btn' });
    root.add(container);
    container.on('pointerdown', async () => {
      // interstitial giữa level, KHÔNG level đầu (M2-07)
      if (level > 1 && MECHANICS.ad.interstitialAfterClear) {
        try { await sdk.requestInterstitialAd(); } catch { /* ignore */ }
      }
      this.cameras.main.fadeOut(dur.scene, 0, 0, 0);
      this.time.delayedCall(dur.scene, () => {
        ctx.currentLevel = level + 1; void ctx.save();
        this.scene.start('GameplayScene');
      });
    });

    // slide-up + fade-in (DESIGN-SPEC §5 A4)
    this.tweens.add({ targets: root, y: cy, alpha: 1, duration: dur.slow, ease: 'cubic.out' });

    this.scale.on('resize', (sz: Phaser.Structs.Size) => {
      this.cameras.main.setSize(sz.width, sz.height);
    });
  }

  private spawnConfetti(width: number, height: number) {
    const cx = width / 2, cy = height / 2;
    for (let i = 0; i < 60; i++) {
      const hex = liquidPalette[Math.floor(Math.random() * liquidPalette.length)];
      const size = Phaser.Math.Between(2, 5);
      const p = this.add.rectangle(cx, cy, size, size, toColor(hex), 1).setDepth(z.overlay - 1);
      const angle = Math.random() * Math.PI * 2;
      const dist = Phaser.Math.Between(80, 320);
      const tx = cx + Math.cos(angle) * dist;
      const ty = cy + Math.sin(angle) * dist + Phaser.Math.Between(80, 200);
      this.tweens.add({
        targets: p, x: tx, y: ty, alpha: 0, angle: Phaser.Math.Between(180, 720),
        duration: dur.slow * 2, ease: 'cubic.out', onComplete: () => p.destroy(),
      });
    }
  }
}
