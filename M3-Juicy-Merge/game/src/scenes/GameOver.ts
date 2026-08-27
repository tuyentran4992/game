import Phaser from "phaser";
import { ctx } from "../context";
import { z, dur, radius } from "../tokens";
import { drawButton, drawMuteButton, type ButtonResult } from "../ui";
import { playFireworksCelebration } from "../gameplay/juice-effects";

export interface GameOverInitData {
  isStageMode?: boolean;
  stageId?: number;
  isStageVictory?: boolean;
  stars?: number;
  score?: number;
}

export class GameOverScene extends Phaser.Scene {
  private continueBtn: ButtonResult | null = null;
  private initData: GameOverInitData = {};

  constructor() {
    super({ key: "GameOverScene" });
  }

  init(data?: GameOverInitData): void {
    this.initData = data || {};
  }

  create(): void {
    const { width, height } = this.scale;

    const isStage = Boolean(this.initData.isStageMode);
    const isStageWin = Boolean(this.initData.isStageVictory);
    const stageId = this.initData.stageId || 1;
    const stageStars = this.initData.stars || 1;

    const score = this.initData.score !== undefined ? this.initData.score : ctx.engine.state.score;
    const prevBest = ctx.score.bestScore;
    const isNewRecord = !isStage && score > 0 && score > prevBest;

    if (!isStage) {
      void ctx.onGameOver(score);
    }

    // 1. Dim overlay
    this.add
      .rectangle(0, 0, width, height, 0x0f172a)
      .setOrigin(0)
      .setAlpha(0.68)
      .setDepth(z.overlay);

    drawMuteButton(this);

    const panelW = Math.min(520, width - 44);
    const panelH = isStage ? 620 : 670;
    const cx = width / 2;
    const cy = height / 2;
    const panel = this.add.container(cx, cy).setDepth(z.panel);

    const card = this.add.graphics();
    // Outer drop shadow
    card.fillStyle(0x000000, 0.28);
    card.fillRoundedRect(
      -panelW / 2,
      -panelH / 2 + 10,
      panelW,
      panelH,
      radius.lg,
    );

    // Frosted white glass body
    card.fillStyle(0xffffff, 0.98);
    card.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, radius.lg);

    const diff = ctx.getCurrentDailyDifficulty();
    const isDailyWin = !isStage && ctx.isDailyMode && score >= diff.targetScore;

    // Header Accent Color
    const headerColor = isStage
      ? isStageWin
        ? 0x10b981
        : 0xef4444
      : isDailyWin
      ? 0xf59e0b
      : 0xff4d6d;

    card.fillStyle(headerColor, 1);
    card.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, 20, {
      tl: radius.lg,
      tr: radius.lg,
      bl: 0,
      br: 0,
    });
    // Inner outline
    card.lineStyle(2.5, headerColor, 0.9);
    card.strokeRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, radius.lg);
    panel.add(card);

    if (isStageWin || isDailyWin || isNewRecord) {
      playFireworksCelebration(this, 6, z.overlay + 30);
    }

    if (isStage) {
      this.renderStageResultContent(panel, panelW, panelH, stageId, isStageWin, stageStars, score);
    } else {
      this.renderStandardResultContent(panel, panelW, panelH, isDailyWin, isNewRecord, score);
    }

    panel.setScale(0.85).setAlpha(0);
    this.input.enabled = true;
    this.tweens.add({
      targets: panel,
      scale: 1,
      alpha: 1,
      duration: dur.base,
      ease: "Back.easeOut",
    });
  }

  private renderStageResultContent(
    panel: Phaser.GameObjects.Container,
    panelW: number,
    panelH: number,
    stageId: number,
    isWin: boolean,
    stars: number,
    score: number
  ): void {
    const trophyIcon = isWin ? "🌟" : "💔";
    const trophy = this.add
      .text(0, -panelH / 2 + 60, trophyIcon, { fontSize: "48px" })
      .setOrigin(0.5);
    panel.add(trophy);

    const titleText = isWin ? `STAGE ${stageId} COMPLETE!` : `STAGE ${stageId} FAILED`;
    const titleColor = isWin ? "#065F46" : "#B91C1C";
    const title = this.add
      .text(0, -panelH / 2 + 115, titleText, {
        fontFamily: "sans-serif",
        fontSize: "26px",
        fontStyle: "bold",
        color: titleColor,
      })
      .setOrigin(0.5);
    panel.add(title);

    if (isWin) {
      // 3 Bouncing Stars Container
      const starsCont = this.add.container(0, -panelH / 2 + 175);
      const starSpacing = 65;
      for (let i = 1; i <= 3; i++) {
        const hasStar = i <= stars;
        const starTxt = this.add
          .text((i - 2) * starSpacing, 0, hasStar ? "⭐" : "☆", {
            fontSize: "44px",
            color: hasStar ? "#F59E0B" : "#9CA3AF",
          })
          .setOrigin(0.5);
        if (hasStar) {
          starTxt.setScale(0.2);
          this.tweens.add({
            targets: starTxt,
            scaleX: 1,
            scaleY: 1,
            delay: (i - 1) * 160 + 200,
            duration: 350,
            ease: "Back.easeOut",
          });
        }
        starsCont.add(starTxt);
      }
      panel.add(starsCont);

      // Score pill
      const scoreCard = this.add.graphics();
      scoreCard.fillStyle(0xf0fdf4, 0.95);
      scoreCard.fillRoundedRect(-140, -panelH / 2 + 225, 280, 50, 25);
      scoreCard.lineStyle(2, 0x10b981, 0.8);
      scoreCard.strokeRoundedRect(-140, -panelH / 2 + 225, 280, 50, 25);
      panel.add(scoreCard);

      const scoreTxt = this.add
        .text(0, -panelH / 2 + 250, `💎 Score: ${score}`, {
          fontFamily: "sans-serif",
          fontSize: "20px",
          fontStyle: "bold",
          color: "#065F46",
        })
        .setOrigin(0.5);
      panel.add(scoreTxt);

      // Stage Buttons
      const btnW = panelW - 56;
      let curY = -panelH / 2 + 330;

      if (stageId < 30) {
        const { container: nextBtn } = drawButton(
          this,
          0,
          curY,
          "NEXT STAGE ▶",
          {
            variant: "emerald",
            width: btnW,
            height: 64,
            fontSize: 22,
          }
        );
        panel.add(nextBtn);
        nextBtn.on("pointerup", () => {
          this.playClickSfx();
          this.scene.stop("GameOverScene");
          this.scene.start("GameplayScene", {
            mode: "stage",
            stageId: stageId + 1,
          });
        });
        curY += 78;
      }

      const { container: mapBtn } = drawButton(
        this,
        0,
        curY,
        "STAGE MAP 🗺️",
        {
          variant: "primary",
          width: btnW,
          height: 58,
          fontSize: 20,
        }
      );
      panel.add(mapBtn);
      mapBtn.on("pointerup", () => {
        this.playClickSfx();
        this.scene.stop("GameOverScene");
        this.scene.stop("GameplayScene");
        this.scene.start("StageSelectScene");
      });
    } else {
      // Failed explanation
      const failTxt = this.add
        .text(0, -panelH / 2 + 180, "Out of moves or fruit crossed the danger line!", {
          fontFamily: "sans-serif",
          fontSize: "15px",
          color: "#6B7280",
          align: "center",
          wordWrap: { width: panelW - 60 },
        })
        .setOrigin(0.5);
      panel.add(failTxt);

      const btnW = panelW - 56;
      const { container: retryBtn } = drawButton(
        this,
        0,
        -panelH / 2 + 280,
        "TRY AGAIN 🔄",
        {
          variant: "amber",
          width: btnW,
          height: 68,
          fontSize: 23,
        }
      );
      panel.add(retryBtn);
      retryBtn.on("pointerup", () => {
        this.playClickSfx();
        this.scene.stop("GameOverScene");
        this.scene.start("GameplayScene", {
          mode: "stage",
          stageId,
        });
      });

      const { container: mapBtn } = drawButton(
        this,
        0,
        -panelH / 2 + 365,
        "STAGE MAP 🗺️",
        {
          variant: "ghost",
          width: btnW,
          height: 58,
          fontSize: 19,
        }
      );
      panel.add(mapBtn);
      mapBtn.on("pointerup", () => {
        this.playClickSfx();
        this.scene.stop("GameOverScene");
        this.scene.stop("GameplayScene");
        this.scene.start("StageSelectScene");
      });
    }
  }

  private renderStandardResultContent(
    panel: Phaser.GameObjects.Container,
    panelW: number,
    panelH: number,
    isDailyWin: boolean,
    isNewRecord: boolean,
    score: number
  ): void {
    const trophyIcon = isDailyWin ? "🏆" : isNewRecord ? "👑" : "🍉";
    const trophy = this.add
      .text(0, -panelH / 2 + 65, trophyIcon, { fontSize: "44px" })
      .setOrigin(0.5);
    panel.add(trophy);

    const titleText = isDailyWin ? "DAILY VICTORY" : "GAME OVER";
    const titleColor = isDailyWin ? "#B45309" : "#C9184A";
    const title = this.add
      .text(0, -panelH / 2 + 115, titleText, {
        fontFamily: "sans-serif",
        fontSize: "32px",
        fontStyle: "bold",
        color: titleColor,
      })
      .setOrigin(0.5)
      .setStroke("#FFFFFF", 4);
    panel.add(title);
    title.setData("testid", "gameover-title");

    if (isNewRecord) {
      this.showRecordBadge(panel, -panelH / 2 + 155);
    }

    // Dual Score Card
    const best = ctx.engine.state.bestScore;
    const scoreCardW = panelW - 56;
    const scoreCardH = 114;
    const cardTopY = -panelH / 2 + 185;

    const dualCard = this.add.graphics();
    dualCard.fillStyle(0xf8fafc, 0.9);
    dualCard.fillRoundedRect(-scoreCardW / 2, cardTopY, scoreCardW, scoreCardH, radius.md);
    dualCard.lineStyle(2, 0xe2e8f0, 1);
    dualCard.strokeRoundedRect(-scoreCardW / 2, cardTopY, scoreCardW, scoreCardH, radius.md);
    dualCard.lineBetween(0, cardTopY + 12, 0, cardTopY + scoreCardH - 12);
    panel.add(dualCard);

    // Score (Left)
    const scoreVal = this.add
      .text(-scoreCardW / 4, cardTopY + 45, `${score}`, {
        fontFamily: "sans-serif",
        fontSize: "34px",
        fontStyle: "bold",
        color: "#0F172A",
      })
      .setOrigin(0.5);
    scoreVal.setData("testid", "final-score");
    panel.add(scoreVal);

    const scoreLbl = this.add
      .text(-scoreCardW / 4, cardTopY + 84, "SCORE", {
        fontFamily: "sans-serif",
        fontSize: "13px",
        fontStyle: "bold",
        color: "#64748B",
      })
      .setOrigin(0.5);
    panel.add(scoreLbl);

    // Best (Right)
    const bestVal = this.add
      .text(scoreCardW / 4, cardTopY + 45, `${best}`, {
        fontFamily: "sans-serif",
        fontSize: "34px",
        fontStyle: "bold",
        color: "#D97706",
      })
      .setOrigin(0.5);
    bestVal.setData("testid", "best-score");
    panel.add(bestVal);

    const bestLbl = this.add
      .text(scoreCardW / 4, cardTopY + 84, "BEST", {
        fontFamily: "sans-serif",
        fontSize: "13px",
        fontStyle: "bold",
        color: "#B45309",
      })
      .setOrigin(0.5);
    panel.add(bestLbl);

    // Buttons
    const btnW = panelW - 56;
    const canContinue = ctx.engine.canContinue();

    if (canContinue) {
      const contY = cardTopY + scoreCardH + 50;
      const retryY = contY + 76;
      const homeY = retryY + 70;

      const res = drawButton(this, 0, contY, "CONTINUE (FREE)", {
        testid: "continue-btn",
        variant: "emerald",
        icon: "🎬",
        width: btnW,
        height: 68,
        fontSize: 22,
      });
      this.continueBtn = res;
      panel.add(res.container);
      res.container.on("pointerdown", () => {
        void this.onContinue();
      });

      const { container: retryBtn } = drawButton(
        this,
        0,
        retryY,
        "PLAY AGAIN",
        {
          testid: "retry-btn",
          variant: "amber",
          icon: "🔄",
          width: btnW,
          height: 64,
          fontSize: 22,
        },
      );
      panel.add(retryBtn);
      retryBtn.on("pointerdown", () => this.onRetry());

      const halfBtnW = (btnW - 14) / 2;
      const { container: homeBtn } = drawButton(
        this,
        -btnW / 4 - 3,
        homeY,
        "MAIN MENU",
        {
          testid: "home-btn",
          variant: "ghost",
          icon: "🏠",
          width: halfBtnW,
          height: 52,
          fontSize: 15,
        },
      );
      panel.add(homeBtn);
      homeBtn.on("pointerdown", () => {
        this.scene.stop("GameplayScene");
        this.scene.stop("GameOverScene");
        this.scene.start("StartScene");
      });

      const { container: leaderBtn } = drawButton(
        this,
        btnW / 4 + 3,
        homeY,
        "RANKING",
        {
          testid: "ranking-btn",
          variant: "purple",
          icon: "🏆",
          width: halfBtnW,
          height: 52,
          fontSize: 15,
        },
      );
      panel.add(leaderBtn);
      leaderBtn.on("pointerdown", async () => {
        const { LeaderboardModal } = await import("../ui/LeaderboardModal");
        new LeaderboardModal(this);
      });
    } else {
      const retryY = cardTopY + scoreCardH + 60;
      const homeY = retryY + 80;

      const { container: retryBtn } = drawButton(
        this,
        0,
        retryY,
        "PLAY AGAIN",
        {
          testid: "retry-btn",
          variant: "amber",
          icon: "🔄",
          width: btnW,
          height: 70,
          fontSize: 24,
        },
      );
      panel.add(retryBtn);
      retryBtn.on("pointerdown", () => this.onRetry());

      const halfBtnW = (btnW - 14) / 2;
      const { container: homeBtn } = drawButton(
        this,
        -btnW / 4 - 3,
        homeY,
        "MAIN MENU",
        {
          testid: "home-btn",
          variant: "ghost",
          icon: "🏠",
          width: halfBtnW,
          height: 56,
          fontSize: 16,
        },
      );
      panel.add(homeBtn);
      homeBtn.on("pointerdown", () => {
        this.scene.stop("GameplayScene");
        this.scene.stop("GameOverScene");
        this.scene.start("StartScene");
      });

      const { container: leaderBtn } = drawButton(
        this,
        btnW / 4 + 3,
        homeY,
        "RANKING",
        {
          testid: "ranking-btn",
          variant: "purple",
          icon: "🏆",
          width: halfBtnW,
          height: 56,
          fontSize: 16,
        },
      );
      panel.add(leaderBtn);
      leaderBtn.on("pointerdown", async () => {
        const { LeaderboardModal } = await import("../ui/LeaderboardModal");
        new LeaderboardModal(this);
      });
    }
  }

  private showRecordBadge(
    panel: Phaser.GameObjects.Container,
    y: number,
  ): void {
    const badge = this.add
      .text(0, y, "✨ NEW RECORD BROKEN! ✨", {
        fontFamily: "sans-serif",
        fontSize: "16px",
        fontStyle: "bold",
        color: "#D97706",
      })
      .setOrigin(0.5)
      .setStroke("#FFFFFF", 4);
    badge.setData("testid", "record-popup");
    panel.add(badge);
    badge.setScale(0.4).setAlpha(0);
    this.tweens.add({
      targets: badge,
      scale: 1,
      alpha: 1,
      duration: dur.pop,
      ease: "Back.easeOut",
    });
  }

  private onContinue(): void {
    if (!ctx.engine.canContinue()) return;
    this.continueBtn?.container.disableInteractive();
    ctx.engine.useContinue();
    const gameplay = this.scene.get("GameplayScene") as {
      clearFruitsAboveDanger?: () => void;
    };
    gameplay.clearFruitsAboveDanger?.();
    this.scene.resume("GameplayScene");
    this.scene.stop("GameOverScene");
  }

  private onRetry(): void {
    ctx.startNewTurn();
    this.scene.start("GameplayScene");
  }

  private playClickSfx(): void {
    if (this.cache.audio.exists("click")) {
      this.sound.play("click", { volume: 0.5 });
    } else if (this.cache.audio.exists("sfx_drop")) {
      this.sound.play("sfx_drop", { volume: 0.4 });
    }
  }
}
