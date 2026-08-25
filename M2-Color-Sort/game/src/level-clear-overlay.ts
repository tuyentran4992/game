// In-scene Level Clear overlay (AUDIT §B5-4) — board stays alive below; confetti
// bursts over the sealed tubes, then a neon glass panel slides up with stats +
// NEXT / REPLAY. Re-rendered & reflowed on resize (fixes clipped title / NEXT
// below fold after rotation). Panel fill = readable dark neon glass (design decision).
import Phaser from 'phaser';
import { color, type, sp, z, dur, fontStyle, toColor } from './tokens';
import { drawPanel, drawButton, drawStar, synthAudio } from './ui';

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
    const ph = Math.min(430, height - sp[5] * 2 - 48);

    // Dim overlay (swallows taps) — NOT dim chặn board hẳn, vẫn nhìn thấy ống đã seal.
    this.dim = this.scene.add.rectangle(cx, cy, width, height, toColor('#000000'), 0)
      .setInteractive();
    this.root.add(this.dim);

    // Panel frosted neon glass
    const panel = drawPanel(this.scene, cx, cy, pw, ph);
    this.root.add(panel);

    // Title: LEVEL N COMPLETE
    const title = this.scene.add.text(cx, cy - ph / 2 + 58, `LEVEL ${o.level} COMPLETE`, fontStyle(type.h1, color.success))
      .setOrigin(0.5);
    title.setShadow(0, 0, color.success, 16, false, true);
    this.root.add(title);

    // Star rating (vector ★ — AUDIT §B5-6)
    const earned = o.moves <= o.optimal + 2 ? 3 : (o.moves <= o.optimal + 6 ? 2 : 1);
    const starY = cy - ph / 2 + 120;
    const gap = 44;
    for (let i = 0; i < 3; i++) {
      const filled = i < earned;
      const star = drawStar(this.scene, toColor(filled ? color.warning : '#3A2E59'), 34, true);
      star.setPosition(cx + (i - 1) * gap, starY);
      star.setAlpha(filled ? 1 : 0.5);
      this.root.add(star);
      if (filled && !this.builtOnce) synthAudio.playSparkle(i);
    }

    // Moves
    const movesT = this.scene.add.text(cx, cy - ph / 2 + 186, `Moves: ${o.moves}`, fontStyle(type.score, color.surface))
      .setOrigin(0.5);
    this.root.add(movesT);

    // Best / ★ NEW BEST moment (AUDIT §B5-4) — vector star icon, no '★' glyph
    const bestStr = o.newBest
      ? `NEW BEST: ${o.moves} moves`
      : (o.best > 0 ? `Best: ${o.best}   Optimal: ${o.optimal}` : `Optimal: ${o.optimal} moves`);
    const bestBox = this.scene.add.text(cx, cy - ph / 2 + 240, bestStr, fontStyle(type.body, color.accent))
      .setOrigin(0.5);
    const bestWrap = this.scene.add.container(0, 0);
    const bestStar = drawStar(this.scene, toColor(color.warning), 22, true)
      .setPosition(bestBox.x - bestBox.width / 2 - 18, bestBox.y)
      .setAlpha(1);
    bestWrap.add([bestBox, bestStar]);
    this.root.add(bestWrap);

    // Buttons: primary NEXT + ghost REPLAY
    const next = drawButton(this.scene, cx, cy + ph / 2 - 118, 'NEXT LEVEL', {
      testid: 'next-level-btn',
      width: 250,
      height: 60,
      variant: 'primary',
      textType: type.h2,
      glowColor: color.primary,
    });
    next.container.on('pointerdown', () => {
      if (this.advancing) return;
      this.advancing = true;
      synthAudio.playClick();
      this.opts.onNext();
    });
    this.root.add(next.container);

    const replay = drawButton(this.scene, cx, cy + ph / 2 - 52, 'REPLAY', {
      testid: 'replay-btn',
      width: 210,
      height: 46,
      variant: 'ghost',
      textType: type.small,
    });
    replay.container.on('pointerdown', () => {
      if (this.advancing) return;
      synthAudio.playClick();
      this.opts.onReplay();
    });
    this.root.add(replay.container);

    // Panel slide-up entrance (DESIGN-SPEC §5 A4) — lần đầu thôi, resize thì tĩnh.
    if (animate) {
      this.root.setAlpha(0).setY(50);
      this.scene.tweens.add({ targets: this.root, y: 0, alpha: 1, duration: dur.slow, ease: 'cubic.out' });
      this.scene.tweens.add({ targets: this.dim, fillAlpha: 0.42, duration: dur.base, ease: 'quad.out' });
    } else {
      this.root.setAlpha(1).setY(0);
      this.dim.setFillStyle(toColor('#000000'), 0.42);
    }
    this.builtOnce = true;
  }

  destroy(): void {
    this.scene.scale.off('resize', this.relayoutBound);
    this.root.destroy();
    if (this.dim) this.dim.destroy();
  }
}
