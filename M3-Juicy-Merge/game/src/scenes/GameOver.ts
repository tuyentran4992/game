import Phaser from 'phaser';
import { ctx } from '../context';
import { color, type, z, dur, fontStyle, toColor, radius } from '../tokens';
import { drawButton, drawMuteButton, type ButtonResult } from '../ui';
import { DAILY_TARGET_SCORE } from '../logic/daily-challenge';

// GameOver scene — overlay panel launched on top of a paused Gameplay scene
// (Bước 11). Bước 12 wires the full game-over flow:
//
//  • NEW RECORD (M3-08): if this run's score beats the persisted best, show a
//    "NEW RECORD" badge and persist + sendScore via ctx.onGameOver (exactly
//    once per game-over — the run's score is captured synchronously so a fast
//    Retry can't race the async save into storing a 0).
//  • Interstitial (M3-07): only from the 2nd game-over this turn — the SDK
//    interstitial plays before the panel is revealed.
//  • Rewarded Continue (M3-05/06): Continue → sdk.requestRewardedAd. Earned →
//    clear above-line fruits + resume Gameplay. Not-earned → stay on the panel
//    (M3-06), the Continue button disabled so the only path forward is Retry.
//  • Retry (M3-04): a brand-new random seed + score=0 (ctx.startNewTurn).
//
// Mobile-first portrait: the panel is centered, buttons ≥96px tall (touch-safe),
// spaced so Continue and Retry cannot be tapped by mistake.
export class GameOverScene extends Phaser.Scene {
  /** Continue button handle — kept so the not-earned branch can disable it. */
  private continueBtn: ButtonResult | null = null;
  /** Retry button handle — disabled during a pending interstitial so the player
   *  cannot "blind-tap" Retry before the panel (and its ad) has resolved. */
  private retryBtn: Phaser.GameObjects.Container | null = null;

  constructor() { super({ key: 'GameOverScene' }); }

  create(): void {
    const { width, height } = this.scale;

    // --- NEW RECORD detection (M3-08) --------------------------------------
    // ctx.score.bestScore is the persisted best from before this run/game-over
    // (setGameOver only mutates engine.state.bestScore, not the store), so a
    // strictly-greater comparison here is "did this run set a record". Score is
    // captured up front so a fast Retry cannot zero it mid-save.
    const score = ctx.engine.state.score;
    const prevBest = ctx.score.bestScore;
    const isNewRecord = score > 0 && score > prevBest;
    // Persist + report the best (fire-and-forget; safe — score already captured).
    void ctx.onGameOver(score);

    // --- Dim overlay ---------------------------------------------------------
    // Semi-transparent so the frozen Gameplay pile stays visible behind the
    // panel (the scene was paused, not stopped, on game over).
    this.add.rectangle(0, 0, width, height, 0x000000)
      .setOrigin(0).setAlpha(0.55).setDepth(z.overlay);

    // Mute toggle stays reachable on top of the overlay (drawMuteButton uses
    // depth 60 > z.overlay); the player may want silence while reading scores.
    drawMuteButton(this);

    const panelW = Math.min(520, width - 48);
    const panelH = 660;
    const cx = width / 2;
    const cy = height / 2;
    const panel = this.add.container(cx, cy).setDepth(z.panel);

    const card = this.add.graphics();
    // shadow
    card.fillStyle(toColor(color.shadow), 0.35);
    card.fillRoundedRect(-panelW / 2, -panelH / 2 + 10, panelW, panelH, radius.lg);
    // surface
    card.fillStyle(toColor(color.surface), 1);
    card.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, radius.lg);
    // top accent bar (danger tone — the run ended)
    card.fillStyle(toColor(color.danger), 1);
    card.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, 16, {
      tl: radius.lg, tr: radius.lg, bl: 0, br: 0,
    });
    panel.add(card);

    // --- Title + NEW RECORD badge (M3-08) -----------------------------------
    const isDailyWin = ctx.isDailyMode && score >= DAILY_TARGET_SCORE;
    const titleText = isDailyWin ? 'DAILY VICTORY' : 'GAME OVER';
    const titleColor = isDailyWin ? color.warning : color.danger;
    const titleY = isNewRecord ? -215 : -240;
    const title = this.add.text(0, titleY, titleText, fontStyle(type.display, titleColor))
      .setOrigin(0.5).setStroke(color.textStroke, 6);
    panel.add(title);
    title.setData('testid', 'gameover-title');

    if (isNewRecord) {
      this.showRecordBadge(panel, -270);
    }

    // --- Score section (2-column neat card) ----------------------------------
    const best = ctx.engine.state.bestScore;
    const scoreCardW = panelW - 56;
    const scoreCardH = 110;
    const scoreCardY = -105;

    const scoreCardBg = this.add.graphics();
    scoreCardBg.fillStyle(0xF1F5F9, 1);
    scoreCardBg.fillRoundedRect(-scoreCardW / 2, scoreCardY - scoreCardH / 2, scoreCardW, scoreCardH, radius.md);
    scoreCardBg.lineStyle(2, 0xE2E8F0, 1);
    scoreCardBg.strokeRoundedRect(-scoreCardW / 2, scoreCardY - scoreCardH / 2, scoreCardW, scoreCardH, radius.md);
    // Center divider
    scoreCardBg.lineStyle(2, 0xCBD5E1, 0.8);
    scoreCardBg.lineBetween(0, scoreCardY - scoreCardH / 2 + 16, 0, scoreCardY + scoreCardH / 2 - 16);
    panel.add(scoreCardBg);

    // Left Column: SCORE
    const leftColX = -scoreCardW / 4;
    const finalLabel = this.add.text(leftColX, scoreCardY - 24, 'SCORE', fontStyle(type.small, color.textSecondary))
      .setOrigin(0.5);
    const finalVal = this.add.text(leftColX, scoreCardY + 16, `${score}`, fontStyle(type.h1, color.textPrimary))
      .setOrigin(0.5);
    panel.add(finalLabel);
    panel.add(finalVal);
    finalVal.setData('testid', 'final-score');

    // Right Column: BEST
    const rightColX = scoreCardW / 4;
    const bestLabel = this.add.text(rightColX, scoreCardY - 24, 'BEST', fontStyle(type.small, color.textSecondary))
      .setOrigin(0.5);
    const bestVal = this.add.text(rightColX, scoreCardY + 16, `${best}`, fontStyle(type.h1, color.warning))
      .setOrigin(0.5);
    panel.add(bestLabel);
    panel.add(bestVal);
    bestVal.setData('testid', 'best-score');

    // --- Buttons -------------------------------------------------------------
    const canContinue = ctx.engine.canContinue();
    const btnW = panelW - 72;
    const btnH = 80;

    if (canContinue) {
      const continueY = 45;
      const retryY = 145;
      const homeY = 230;

      const res = drawButton(this, 0, continueY, 'Continue', {
        testid: 'continue-btn', width: btnW, height: btnH,
      });
      this.continueBtn = res;
      panel.add(res.container);
      res.container.on('pointerdown', () => { void this.onContinue(); });

      const { container: retryBtn } = drawButton(this, 0, retryY, 'Chơi Lại', {
        testid: 'retry-btn', width: btnW, height: btnH, variant: 'ghost',
      });
      this.retryBtn = retryBtn;
      panel.add(retryBtn);
      retryBtn.on('pointerdown', () => this.onRetry());

      const { container: homeBtn } = drawButton(this, 0, homeY, '🏠 Menu Chính', {
        testid: 'home-btn', width: btnW, height: 60, variant: 'ghost',
      });
      panel.add(homeBtn);
      homeBtn.on('pointerdown', () => {
        this.scene.stop('GameplayScene');
        this.scene.stop('GameOverScene');
        this.scene.start('StartScene');
      });
    } else {
      const retryY = 85;
      const homeY = 185;

      const { container: retryBtn } = drawButton(this, 0, retryY, 'Chơi Lại', {
        testid: 'retry-btn', width: btnW, height: btnH,
      });
      this.retryBtn = retryBtn;
      panel.add(retryBtn);
      retryBtn.on('pointerdown', () => this.onRetry());

      const { container: homeBtn } = drawButton(this, 0, homeY, '🏠 Menu Chính', {
        testid: 'home-btn', width: btnW, height: 60, variant: 'ghost',
      });
      panel.add(homeBtn);
      homeBtn.on('pointerdown', () => {
        this.scene.stop('GameplayScene');
        this.scene.stop('GameOverScene');
        this.scene.start('StartScene');
      });
    }

    // Animate the panel in (scale + fade) for a soft landing. Held until any
    // interstitial resolves (M3-07) so the player never sees the panel mid-ad.
    panel.setScale(0.85).setAlpha(0);
    const reveal = (): void => {
      if (this.sys.settings.status >= Phaser.Scenes.SHUTDOWN) return;
      this.input.enabled = true;
      this.tweens.add({
        targets: panel,
        scale: 1, alpha: 1,
        duration: dur.base, ease: 'Back.easeOut',
      });
    };

    // --- Interstitial gate (M3-07) ------------------------------------------
    // From the 2nd game-over this turn → play the SDK interstitial before reveal.
    // First game-over → straight to the panel. While the ad is pending, the
    // panel is invisible and scene input is disabled so no blind taps land.
    if (ctx.engine.shouldShowInterstitial()) {
      this.input.enabled = false;
      void ctx.sdk.requestInterstitialAd().finally(reveal);
    } else {
      reveal();
    }
  }

  /** "NEW RECORD" ribbon badge above the GAME OVER title (M3-08). */
  private showRecordBadge(panel: Phaser.GameObjects.Container, y: number): void {
    const badge = this.add.text(0, y, '✨ NEW RECORD ✨', fontStyle(type.h2, color.warning))
      .setOrigin(0.5).setStroke(color.textStroke, 6);
    badge.setData('testid', 'record-popup');
    panel.add(badge);
    // Pop in with a back-out scale so the record reads as a celebration.
    badge.setScale(0.4).setAlpha(0);
    this.tweens.add({
      targets: badge,
      scale: 1, alpha: 1,
      duration: dur.pop, ease: 'Back.easeOut',
    });
  }

  /** Rewarded Continue (M3-05). Earned → clear above-line fruits + resume play.
   *  Not-earned → stay on the panel (M3-06): disable Continue so the player
   *  can't spam ad requests, leaving Retry as the only forward path. */
  private async onContinue(): Promise<void> {
    if (!ctx.engine.canContinue()) return;
    // Disable the button for the duration of the ad request so a fast double-
    // tap can't fire a 2nd rewarded ad this turn (M3-05: ≤1 earned/turn).
    this.continueBtn?.container.disableInteractive();
    // Request the rewarded ad. Local dev fallback grants the reward (sdk-handler);
    // mock window.ytgame in the console to exercise the not-earned branch.
    const earned = await ctx.sdk.requestRewardedAd('continue');
    if (!earned) {
      this.showRewardDenied();
      return;
    }
    ctx.engine.useContinue();
    const gameplay = this.scene.get('GameplayScene') as { clearFruitsAboveDanger?: () => void };
    gameplay.clearFruitsAboveDanger?.();
    this.scene.resume('GameplayScene');
    this.scene.stop();
  }

  /** Not-earned feedback (M3-06): grey out + disable Continue and show a hint
   *  so the player understands why nothing resumed. */
  private showRewardDenied(): void {
    if (!this.continueBtn) return;
    this.continueBtn.container.disableInteractive();
    this.continueBtn.container.setAlpha(0.45);
    const hint = this.add.text(0, 260, 'Ad not completed', fontStyle(type.small, color.textSecondary))
      .setOrigin(0.5);
    this.tweens.add({
      targets: hint,
      alpha: { from: 0, to: 1 },
      duration: dur.base,
      yoyo: true, repeat: 1, repeatDelay: 600,
    });
  }

  /** Retry = fresh turn: new random seed (M3-04) + score=0 + continue available
   *  again. ctx.startNewTurn reseeds + resets; Gameplay.create re-runs via
   *  scene.start, stopping this overlay and rebuilding a clean playfield. */
  private onRetry(): void {
    ctx.startNewTurn();
    this.scene.start('GameplayScene');
  }
}
