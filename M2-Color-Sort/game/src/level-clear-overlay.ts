// ============================================================================
// In-scene Level Clear Overlay (Studio-Grade Victory Modal)
// 3D Star Bounce Slam + Stardust Burst + Chunky 3D Next Button
// ============================================================================
import Phaser from 'phaser';
import { color, type, sp, z, dur, fontStyle, studioFontStyle, toColor } from './tokens';
import { drawPanel, drawButton, drawStar, synthAudio } from './ui';
import { L, LF } from './lang';

export interface ClearOverlayOpts {
  level: number;
  moves: number;
  optimal: number;
  best: number;
  newBest: boolean;
  seals: number;
  onNext: () => void;
  onReplay: () => void;
}

export class LevelClearOverlay {
  private root: Phaser.GameObjects.Container;
  private dim: Phaser.GameObjects.Rectangle | null = null;
  private advancing = false;
  private builtOnce = false;
  private relayoutBound!: () => void;

  constructor(private scene: Phaser.Scene, private opts: ClearOverlayOpts) {
    this.root = scene.add.container(0, 0).setDepth(z.overlay);
    this.relayoutBound = () => this.rebuild();
    scene.scale.on('resize', this.relayoutBound);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.scale.off('resize', this.relayoutBound);
    });
    this.rebuild(true);
  }

  /** Re-render toàn bộ panel cho kích thước mới. `animate` = lần đầu (panel slide-up). */
  private rebuild(animate = false): void {
    this.root.removeAll(true);
    if (this.dim) { this.dim.destroy(); this.dim = null; }

    const { width, height } = this.scene.scale;
    const cx = width / 2, cy = height / 2;
    const o = this.opts;
    const pw = Math.min(440, width - sp[5] * 2);
    const ph = Math.min(440, height - sp[5] * 2 - 40);

    // 1. Dim overlay
    this.dim = this.scene.add.rectangle(cx, cy, width, height, toColor('#000000'), 0)
      .setInteractive();
    this.root.add(this.dim);

    // 2. Panel frosted neon glass
    const panel = drawPanel(this.scene, cx, cy, pw, ph);
    this.root.add(panel);

    // 3. Title: LEVEL N COMPLETE (Studio Style Fredoka)
    const title = this.scene.add.text(cx, cy - ph / 2 + 54, LF('clear_title', o.level), {
      fontFamily: '"Fredoka", "Outfit", sans-serif',
      fontSize: '32px',
      fontStyle: '900',
      color: '#2ECC71',
      align: 'center',
    }).setOrigin(0.5);
    title.setStroke('#064E3B', 5);
    title.setShadow(0, 3, 'rgba(0,0,0,0.5)', 4, false, true);
    this.root.add(title);

    // 4. Star rating (3-Star 3D Slam Animation)
    const earned = o.moves <= o.optimal + 2 ? 3 : (o.moves <= o.optimal + 6 ? 2 : 1);
    const starY = cy - ph / 2 + 118;
    const gap = 52;

    for (let i = 0; i < 3; i++) {
      const filled = i < earned;
      const star = drawStar(this.scene, toColor(filled ? '#FFD700' : '#2A1F4D'), filled ? 42 : 36, true);
      star.setPosition(cx + (i - 1) * gap, starY);
      star.setAlpha(filled ? 1 : 0.45);
      this.root.add(star);

      if (filled && animate) {
        star.setScale(0).setAlpha(0);
        this.scene.tweens.add({
          targets: star,
          scale: 1,
          alpha: 1,
          duration: 380,
          delay: 200 + i * 160,
          ease: 'back.out',
          onStart: () => synthAudio.playSparkle(i),
        });
      } else if (filled && !this.builtOnce) {
        synthAudio.playSparkle(i);
      }
    }

    // 5. Stat Card Box (Glassmorphism Capsule)
    const statCardY = cy - ph / 2 + 200;
    const statW = pw - 56;
    const statH = 74;
    const statG = this.scene.add.graphics();
    statG.fillStyle(0x000000, 0.4);
    statG.fillRoundedRect(cx - statW / 2, statCardY - statH / 2, statW, statH, 16);
    statG.lineStyle(1.5, toColor(color.accent), 0.45);
    statG.strokeRoundedRect(cx - statW / 2, statCardY - statH / 2, statW, statH, 16);
    this.root.add(statG);

    // Moves Text
    const movesT = this.scene.add.text(cx, statCardY - 14, LF('moves', o.moves), {
      fontFamily: '"Fredoka", "Outfit", sans-serif',
      fontSize: '24px',
      fontStyle: '800',
      color: '#FFFFFF',
      align: 'center',
    }).setOrigin(0.5);
    movesT.setShadow(0, 2, 'rgba(0,0,0,0.6)', 3, false, true);
    this.root.add(movesT);

    // Best / ★ NEW BEST moment
    const bestStr = o.newBest
      ? LF('new_best', o.moves)
      : (o.best > 0 ? LF('best', o.best, o.optimal) : LF('optimal', o.optimal));
    const bestBox = this.scene.add.text(cx, statCardY + 16, bestStr, {
      fontFamily: '"Outfit", sans-serif',
      fontSize: '17px',
      fontStyle: '700',
      color: o.newBest ? '#FFD700' : '#00E5FF',
      align: 'center',
    }).setOrigin(0.5);
    this.root.add(bestBox);

    // 6. Buttons: Chunky 3D Emerald NEXT + Ghost REPLAY
    const next = drawButton(this.scene, cx, cy + ph / 2 - 116, L('next_level'), {
      testid: 'next-level-btn',
      width: Math.min(270, pw - 48),
      height: 64,
      variant: 'emerald',
      fontSize: 24,
      enableShimmer: true,
    });
    next.container.on('pointerdown', () => {
      if (this.advancing) return;
      this.advancing = true;
      synthAudio.playClick();
      this.opts.onNext();
    });
    this.root.add(next.container);

    const replay = drawButton(this.scene, cx, cy + ph / 2 - 48, L('replay'), {
      testid: 'replay-btn',
      width: Math.min(220, pw - 80),
      height: 46,
      variant: 'ghost',
      fontSize: 18,
      enableShimmer: false,
    });
    replay.container.on('pointerdown', () => {
      if (this.advancing) return;
      synthAudio.playClick();
      this.opts.onReplay();
    });
    this.root.add(replay.container);

    // 7. Panel slide-up entrance animation
    if (animate) {
      this.root.setAlpha(0).setY(40);
      this.scene.tweens.add({ targets: this.root, y: 0, alpha: 1, duration: dur.slow, ease: 'cubic.out' });
      this.scene.tweens.add({ targets: this.dim, fillAlpha: 0.52, duration: dur.base, ease: 'quad.out' });
    } else {
      this.root.setAlpha(1).setY(0);
      this.dim.setFillStyle(toColor('#000000'), 0.52);
    }
    this.builtOnce = true;
  }

  destroy(): void {
    this.scene.scale.off('resize', this.relayoutBound);
    this.root.destroy();
    if (this.dim) this.dim.destroy();
  }
}
