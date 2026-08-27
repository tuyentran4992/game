import Phaser from "phaser";
import { z } from "../tokens";
import { drawBackground } from "../ui";
import { ctx } from "../context";
import { getAllStages, calculateTotalStars, type StageConfig } from "../logic/stages";

export class StageSelectScene extends Phaser.Scene {
  private currentPage = 0;
  private totalPages = 2; // 15 stages per page (1-15, 16-30)
  private cardsContainer!: Phaser.GameObjects.Container;
  private pageIndicatorText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: "StageSelectScene" });
  }

  create(): void {
    const { width, height } = this.scale;
    drawBackground(this);

    // --- 1. Top Navigation Bar ----------------------------------------------
    this.createHeader(width);

    // --- 2. Stage Cards Container -------------------------------------------
    this.cardsContainer = this.add.container(0, 0).setDepth(z.hud);
    this.renderCurrentPage(width, height);

    // --- 3. Pagination Controls (Bottom) ------------------------------------
    this.createPaginationControls(width, height);
  }

  private playClickSfx(): void {
    if (this.cache.audio.exists("click")) {
      this.sound.play("click", { volume: 0.5 });
    } else if (this.cache.audio.exists("sfx_drop")) {
      this.sound.play("sfx_drop", { volume: 0.4 });
    }
  }

  private createHeader(width: number): void {
    const topY = 60;

    // Back button
    const backBtn = this.add.container(60, topY).setDepth(z.hud + 2);
    const backBg = this.add.graphics();
    backBg.fillStyle(0xffffff, 0.95);
    backBg.fillCircle(0, 0, 24);
    backBg.lineStyle(2, 0x0288d1, 0.8);
    backBg.strokeCircle(0, 0, 24);
    const backTxt = this.add
      .text(0, 0, "◀", {
        fontFamily: "sans-serif",
        fontSize: "20px",
        fontStyle: "bold",
        color: "#0288D1",
      })
      .setOrigin(0.5);
    backBtn.add([backBg, backTxt]);
    backBtn.setSize(48, 48);
    backBtn.setInteractive({ useHandCursor: true });
    backBtn.on("pointerdown", () => {
      this.playClickSfx();
      this.scene.start("StartScene");
    });

    // Title
    this.add
      .text(width / 2, topY - 12, "🗺️ ADVENTURE SAGA", {
        fontFamily: "sans-serif",
        fontSize: "26px",
        fontStyle: "bold",
        color: "#2C3E50",
      })
      .setOrigin(0.5)
      .setDepth(z.hud + 1);

    // Total Stars Pill
    const totalStars = calculateTotalStars(ctx.score.stageStars);
    const starsCard = this.add.container(width - 75, topY).setDepth(z.hud + 2);
    const starBg = this.add.graphics();
    starBg.fillStyle(0xfff8e1, 0.95);
    starBg.fillRoundedRect(-52, -18, 104, 36, 18);
    starBg.lineStyle(2, 0xf59e0b, 1);
    starBg.strokeRoundedRect(-52, -18, 104, 36, 18);

    const starTxt = this.add
      .text(0, 0, `⭐ ${totalStars}/90`, {
        fontFamily: "sans-serif",
        fontSize: "14px",
        fontStyle: "bold",
        color: "#B45309",
      })
      .setOrigin(0.5);
    starsCard.add([starBg, starTxt]);
  }

  private renderCurrentPage(width: number, height: number): void {
    this.cardsContainer.removeAll(true);

    const stages = getAllStages();
    const stagesPerPage = 15;
    const startIndex = this.currentPage * stagesPerPage;
    const pageStages = stages.slice(startIndex, startIndex + stagesPerPage);

    const unlockedStage = ctx.score.getUnlockedStage();
    const cols = 3;

    const startX = width * 0.2;
    const spacingX = width * 0.3;
    const startY = height * 0.17;
    const spacingY = height * 0.132;

    pageStages.forEach((stage, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const x = startX + col * spacingX;
      const y = startY + row * spacingY;

      const isUnlocked = stage.id <= unlockedStage;
      const isCurrent = stage.id === unlockedStage;
      const stars = ctx.score.getStageStars(stage.id);

      const card = this.createStageNode(x, y, stage, isUnlocked, isCurrent, stars);
      this.cardsContainer.add(card);
    });
  }

  private createStageNode(
    x: number,
    y: number,
    stage: StageConfig,
    isUnlocked: boolean,
    isCurrent: boolean,
    stars: number
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    const size = 74;
    const halfSize = size / 2;

    const bg = this.add.graphics();

    // Pulse aura for current latest level
    if (isCurrent) {
      const aura = this.add.graphics();
      aura.lineStyle(4, 0x10b981, 0.9);
      aura.strokeCircle(0, 0, halfSize + 10);
      container.add(aura);

      this.tweens.add({
        targets: aura,
        scaleX: 1.18,
        scaleY: 1.18,
        alpha: 0.2,
        duration: 750,
        yoyo: true,
        repeat: -1,
      });
    }

    if (isUnlocked) {
      // 3D Shadow
      bg.fillStyle(0x000000, 0.2);
      bg.fillRoundedRect(-halfSize, -halfSize + 5, size, size, 22);

      // Main Button Body
      const btnColor = isCurrent ? 0x10b981 : 0x0288d1;
      bg.fillStyle(btnColor, 1);
      bg.fillRoundedRect(-halfSize, -halfSize, size, size, 22);

      // Top Glass Highlight Sheen
      bg.fillStyle(0xffffff, 0.32);
      bg.fillRoundedRect(-halfSize + 4, -halfSize + 4, size - 8, halfSize - 4, 14);

      // Crisp White Border
      bg.lineStyle(3, 0xffffff, 0.95);
      bg.strokeRoundedRect(-halfSize, -halfSize, size, size, 22);

      const numTxt = this.add
        .text(0, -6, `${stage.id}`, {
          fontFamily: "sans-serif",
          fontSize: "24px",
          fontStyle: "bold",
          color: "#FFFFFF",
        })
        .setOrigin(0.5);

      // Stars under node
      const starStr = `${stars >= 1 ? "⭐" : "☆"}${stars >= 2 ? "⭐" : "☆"}${stars >= 3 ? "⭐" : "☆"}`;
      const starsTxt = this.add
        .text(0, halfSize + 15, starStr, {
          fontFamily: "sans-serif",
          fontSize: "14px",
          color: "#F59E0B",
        })
        .setOrigin(0.5);

      container.add([bg, numTxt, starsTxt]);

      container.setSize(size, size);
      container.setInteractive({ useHandCursor: true });
      container.on("pointerup", () => {
        this.playClickSfx();
        this.scene.start("GameplayScene", {
          mode: "stage",
          stageId: stage.id,
        });
      });

      // Hover micro-animation
      container.on("pointerover", () => {
        this.tweens.add({
          targets: container,
          scaleX: 1.08,
          scaleY: 1.08,
          duration: 120,
        });
      });
      container.on("pointerout", () => {
        this.tweens.add({
          targets: container,
          scaleX: 1,
          scaleY: 1,
          duration: 120,
        });
      });
    } else {
      // Locked Node: Frosted glass slate button
      bg.fillStyle(0x000000, 0.12);
      bg.fillRoundedRect(-halfSize, -halfSize + 4, size, size, 22);

      bg.fillStyle(0x94a3b8, 0.85);
      bg.fillRoundedRect(-halfSize, -halfSize, size, size, 22);

      bg.lineStyle(2, 0x64748b, 0.6);
      bg.strokeRoundedRect(-halfSize, -halfSize, size, size, 22);

      const lockTxt = this.add
        .text(0, -5, "🔒", {
          fontSize: "24px",
        })
        .setOrigin(0.5);

      const numTxt = this.add
        .text(0, halfSize + 14, `${stage.id}`, {
          fontFamily: "sans-serif",
          fontSize: "13px",
          fontStyle: "bold",
          color: "#475569",
        })
        .setOrigin(0.5);

      container.add([bg, lockTxt, numTxt]);
    }

    return container;
  }

  private createPaginationControls(width: number, height: number): void {
    const navY = height * 0.92;

    // Prev Page Button
    const prevBtn = this.add.container(width * 0.28, navY).setDepth(z.hud + 2);
    const prevBg = this.add.graphics();
    prevBg.fillStyle(0xffffff, 0.95);
    prevBg.fillRoundedRect(-44, -20, 88, 40, 16);
    prevBg.lineStyle(2, 0x0288d1, 0.8);
    prevBg.strokeRoundedRect(-44, -20, 88, 40, 16);
    const prevTxt = this.add
      .text(0, 0, "◀ Prev", {
        fontFamily: "sans-serif",
        fontSize: "15px",
        fontStyle: "bold",
        color: "#0288D1",
      })
      .setOrigin(0.5);
    prevBtn.add([prevBg, prevTxt]);
    prevBtn.setSize(88, 40);
    prevBtn.setInteractive({ useHandCursor: true });
    prevBtn.on("pointerdown", () => {
      if (this.currentPage > 0) {
        this.playClickSfx();
        this.currentPage--;
        this.updatePage(width, height);
      }
    });

    // Page indicator
    this.pageIndicatorText = this.add
      .text(width / 2, navY, `Page ${this.currentPage + 1} / ${this.totalPages}`, {
        fontFamily: "sans-serif",
        fontSize: "16px",
        fontStyle: "bold",
        color: "#334155",
      })
      .setOrigin(0.5)
      .setDepth(z.hud + 2);

    // Next Page Button
    const nextBtn = this.add.container(width * 0.72, navY).setDepth(z.hud + 2);
    const nextBg = this.add.graphics();
    nextBg.fillStyle(0xffffff, 0.95);
    nextBg.fillRoundedRect(-44, -20, 88, 40, 16);
    nextBg.lineStyle(2, 0x0288d1, 0.8);
    nextBg.strokeRoundedRect(-44, -20, 88, 40, 16);
    const nextTxt = this.add
      .text(0, 0, "Next ▶", {
        fontFamily: "sans-serif",
        fontSize: "15px",
        fontStyle: "bold",
        color: "#0288D1",
      })
      .setOrigin(0.5);
    nextBtn.add([nextBg, nextTxt]);
    nextBtn.setSize(88, 40);
    nextBtn.setInteractive({ useHandCursor: true });
    nextBtn.on("pointerdown", () => {
      if (this.currentPage < this.totalPages - 1) {
        this.playClickSfx();
        this.currentPage++;
        this.updatePage(width, height);
      }
    });
  }

  private updatePage(width: number, height: number): void {
    this.pageIndicatorText.setText(`Page ${this.currentPage + 1} / ${this.totalPages}`);
    this.renderCurrentPage(width, height);
  }
}
