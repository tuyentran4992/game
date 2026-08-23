import Phaser from 'phaser';
import { ctx } from '../context';
import { color, type, z, dur, fontStyle, toColor, radius } from '../tokens';
import { drawButton } from '../ui';

// GameOver scene — overlay panel launched on top of a paused Gameplay scene
// (Bước 11). Shows final score + best, plus Continue / Retry. First game-over
// this turn shows NO interstitial (M3-07: interstitial is from the 2nd game-over
// onward — handled in step 12). Continue earned-resume + Retry fresh-start are
// wired here so the panel is functional for QA; step 12 wraps Continue in
// `requestRewardedAd` (not-earned branch) + adds the NEW RECORD popup + save.
//
// Mobile-first portrait: the panel is centered, buttons ≥96px tall (touch-safe),
// spaced so Continue and Retry cannot be tapped by mistake.
export class GameOverScene extends Phaser.Scene {
  constructor() { super({ key: 'GameOverScene' }); }

  create(): void {
    const { width, height } = this.scale;

    // Interstitial gate (M3-07): only from the 2nd game-over this turn. On the
    // first game-over `shouldShowInterstitial()` is false → straight to panel.
    // Step 12 wires the actual sdk interstitial call before the panel appears.
    const interstitial = ctx.engine.shouldShowInterstitial();
    if (interstitial) {
      // TODO(step 12): ctx.sdk.showInterstitial() then reveal the panel.
      // For now fall through — step 11 only exercises the first game-over.
    }

    // --- Dim overlay ---------------------------------------------------------
    // Semi-transparent so the frozen Gameplay pile stays visible behind the
    // panel (the scene was paused, not stopped, on game over).
    this.add.rectangle(0, 0, width, height, 0x000000)
      .setOrigin(0).setAlpha(0.55).setDepth(z.overlay);

    const panelW = Math.min(560, width - 64);
    const panelH = 620;
    const cx = width / 2;
    const cy = height / 2;
    const panel = this.add.container(cx, cy).setDepth(z.panel);

    const card = this.add.graphics();
    // shadow
    card.fillStyle(toColor(color.shadow), 0.3);
    card.fillRoundedRect(-panelW / 2, -panelH / 2 + 8, panelW, panelH, radius.lg);
    // surface
    card.fillStyle(toColor(color.surface), 1);
    card.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, radius.lg);
    // top accent bar (danger tone — the run ended)
    card.fillStyle(toColor(color.danger), 1);
    card.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, 16, {
      tl: radius.lg, tr: radius.lg, bl: 0, br: 0,
    });
    panel.add(card);

    // --- Title + scores ------------------------------------------------------
    const title = this.add.text(0, -panelH / 2 + 80, 'GAME OVER', fontStyle(type.display, color.danger))
      .setOrigin(0.5).setStroke(color.textStroke, 6);
    panel.add(title);
    title.setData('testid', 'gameover-title');

    const score = ctx.engine.state.score;
    const best = ctx.engine.state.bestScore;

    const finalLabel = this.add.text(0, -60, 'SCORE', fontStyle(type.small, color.textSecondary))
      .setOrigin(0.5);
    const finalVal = this.add.text(0, -28, `${score}`, fontStyle(type.h1, color.textPrimary))
      .setOrigin(0.5);
    panel.add(finalLabel); panel.add(finalVal);
    finalVal.setData('testid', 'final-score');

    const bestLabel = this.add.text(0, 36, 'BEST', fontStyle(type.small, color.textSecondary))
      .setOrigin(0.5);
    const bestVal = this.add.text(0, 68, `${best}`, fontStyle(type.h2, color.warning))
      .setOrigin(0.5);
    panel.add(bestLabel); panel.add(bestVal);
    bestVal.setData('testid', 'best-score');

    // --- Buttons -------------------------------------------------------------
    const canContinue = ctx.engine.canContinue();
    const retryY = 175;
    const continueY = retryY - 120;

    if (canContinue) {
      const { container: continueBtn } = drawButton(this, 0, continueY, 'Continue', {
        testid: 'continue-btn', width: panelW - 96, height: 96,
      });
      panel.add(continueBtn);
      continueBtn.on('pointerdown', () => this.onContinue());
    }

    const { container: retryBtn } = drawButton(this, 0, retryY, 'Retry', {
      testid: 'retry-btn', width: panelW - 96, height: 96, variant: 'ghost',
    });
    panel.add(retryBtn);
    retryBtn.on('pointerdown', () => this.onRetry());

    // Animate the panel in (scale + fade) for a soft landing.
    panel.setScale(0.85).setAlpha(0);
    this.tweens.add({
      targets: panel,
      scale: 1, alpha: 1,
      duration: dur.base, ease: 'Back.easeOut',
    });
  }

  /** Rewarded Continue (M3-05, earned path). Step 12 will gate this behind
   *  `requestRewardedAd`; the mechanical resume (clear above-line fruits +
   *  unfreeze) lives in Gameplay.clearFruitsAboveDanger. */
  private onContinue(): void {
    if (!ctx.engine.canContinue()) return;
    ctx.engine.useContinue();
    const gameplay = this.scene.get('GameplayScene') as { clearFruitsAboveDanger?: () => void };
    gameplay.clearFruitsAboveDanger?.();
    this.scene.resume('GameplayScene');
    this.scene.stop();
  }

  /** Retry = fresh turn (new score, reset continue/playCount). Gameplay.create
   *  calls startNewGame, so starting the scene gives a clean run. scene.start
   *  stops this GameOver overlay and (re)starts Gameplay in one call. Step 12
   *  also reseeds a new RNG seed for variety. */
  private onRetry(): void {
    this.scene.start('GameplayScene');
  }
}
