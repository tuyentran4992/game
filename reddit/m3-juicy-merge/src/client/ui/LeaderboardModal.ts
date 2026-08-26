import Phaser from "phaser";
import { ctx } from "../context";
import { z, dur } from "../tokens";

interface ModalLeaderboardEntry {
  name: string;
  score: number;
  rank: number;
  isUser?: boolean;
}

export class LeaderboardModal {
  private scene: Phaser.Scene;
  private root: Phaser.GameObjects.Container;
  private backdrop: Phaser.GameObjects.Graphics;
  private panel: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const { width, height } = scene.scale;

    // 1. Root Container on Topmost Layer
    this.root = scene.add.container(0, 0).setDepth(z.panel + 10);

    // 2. Dim Background (Blocks input below)
    this.backdrop = scene.add.graphics();
    this.backdrop.fillStyle(0x000000, 0.65);
    this.backdrop.fillRect(0, 0, width, height);
    this.backdrop.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, width, height),
      Phaser.Geom.Rectangle.Contains,
    );
    this.backdrop.on("pointerdown", () => this.close());
    this.root.add(this.backdrop);

    // 3. Panel Container — Perfectly bounded Candy Card
    const panelW = Math.min(600, width - 40);
    const panelH = 740;
    this.panel = scene.add.container(width / 2, height / 2);
    this.root.add(this.panel);

    this.drawPanel(panelW, panelH);
    this.loadAndRenderEntries(panelW, panelH);

    // Entry animation
    this.panel.setScale(0.85).setAlpha(0);
    scene.tweens.add({
      targets: this.panel,
      scale: 1,
      alpha: 1,
      duration: dur.base,
      ease: "Back.easeOut",
    });
  }

  private drawPanel(w: number, h: number): void {
    const g = this.scene.add.graphics();

    // Outer Drop Shadow
    g.fillStyle(0x000000, 0.32);
    g.fillRoundedRect(-w / 2, -h / 2 + 8, w, h, 28);

    // Main Card Body (Pure Warm White)
    g.fillStyle(0xffffff, 0.99);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 28);

    // 3D Golden Border
    g.lineStyle(3.5, 0xf59e0b, 1);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 28);

    // Top Header Banner
    const headerH = 62;
    g.fillStyle(0xfef3c7, 1);
    g.fillRoundedRect(-w / 2 + 14, -h / 2 + 14, w - 28, headerH, 18);
    g.lineStyle(1.5, 0xf59e0b, 0.6);
    g.strokeRoundedRect(-w / 2 + 14, -h / 2 + 14, w - 28, headerH, 18);

    this.panel.add(g);

    // Header Title
    const title = this.scene.add
      .text(0, -h / 2 + 45, "🏆 TOP MERGERS 🏆", {
        fontFamily: "sans-serif",
        fontSize: "22px",
        fontStyle: "bold",
        color: "#92400E",
      })
      .setOrigin(0.5)
      .setStroke("#FFFFFF", 4);
    this.panel.add(title);

    // Close Button (✕) — Clean 3D Round Pill
    const closeBtnBg = this.scene.add.graphics();
    closeBtnBg.fillStyle(0xff4757, 1);
    closeBtnBg.fillCircle(w / 2 - 36, -h / 2 + 45, 17);
    closeBtnBg.lineStyle(2, 0xffffff, 1);
    closeBtnBg.strokeCircle(w / 2 - 36, -h / 2 + 45, 17);

    const closeBtnTxt = this.scene.add
      .text(w / 2 - 36, -h / 2 + 45, "✕", {
        fontFamily: "sans-serif",
        fontSize: "15px",
        fontStyle: "bold",
        color: "#FFFFFF",
      })
      .setOrigin(0.5);

    const closeHit = this.scene.add
      .zone(w / 2 - 36, -h / 2 + 45, 42, 42)
      .setInteractive({ useHandCursor: true });
    closeHit.on("pointerdown", () => this.close());

    this.panel.add([closeBtnBg, closeBtnTxt, closeHit]);
  }

  private async loadAndRenderEntries(w: number, h: number): Promise<void> {
    const loadingText = this.scene.add
      .text(0, 0, "⏳ Loading Leaderboard...", {
        fontFamily: "sans-serif",
        fontSize: "18px",
        fontStyle: "bold",
        color: "#64748B",
      })
      .setOrigin(0.5);
    this.panel.add(loadingText);

    const userBest = ctx.engine.state.bestScore || ctx.score.bestScore || 0;
    const data = await ctx.getLeaderboardEntries(10, userBest);

    loadingText.destroy();

    // Render list — perfectly spaced inside the card
    const startY = -h / 2 + 90;
    const rowH = 43;
    const rowGap = 5;
    const rowW = w - 32;

    data.entries.forEach((item, index) => {
      const rowY = startY + index * (rowH + rowGap);
      this.drawRow(rowW, rowY, rowH, item, index);
    });

    // Draw Bottom Sticky User Card
    const userRank = data.userEntry?.rank ?? 1;
    const footerY = startY + 10 * (rowH + rowGap) + 4;
    const footerH = 58;
    this.drawMyRankCard(rowW, footerY, footerH, userRank, userBest);
  }

  private drawRow(
    w: number,
    y: number,
    h: number,
    item: ModalLeaderboardEntry,
    index: number,
  ): void {
    const rowG = this.scene.add.graphics();
    const isTop1 = index === 0;
    const isTop2 = index === 1;
    const isTop3 = index === 2;
    const isUser = item.isUser;

    // Row Background Styling
    let bgColor = 0xf8fafc;
    let borderColor = 0xe2e8f0;
    if (isTop1) {
      bgColor = 0xfef3c7;
      borderColor = 0xf59e0b;
    } else if (isTop2) {
      bgColor = 0xf1f5f9;
      borderColor = 0x94a3b8;
    } else if (isTop3) {
      bgColor = 0xffedd5;
      borderColor = 0xfb923c;
    } else if (isUser) {
      bgColor = 0xe0f2fe;
      borderColor = 0x0284c7;
    }

    rowG.fillStyle(bgColor, 1);
    rowG.fillRoundedRect(-w / 2, y, w, h, 10);
    rowG.lineStyle(1.5, borderColor, isTop1 || isUser ? 1 : 0.6);
    rowG.strokeRoundedRect(-w / 2, y, w, h, 10);
    this.panel.add(rowG);

    // Rank Badge Icon
    let rankStr = `#${item.rank}`;
    let rankColor = "#475569";
    if (isTop1) {
      rankStr = "🥇 1";
      rankColor = "#B45309";
    } else if (isTop2) {
      rankStr = "🥈 2";
      rankColor = "#475569";
    } else if (isTop3) {
      rankStr = "🥉 3";
      rankColor = "#C2410C";
    }

    const rankText = this.scene.add
      .text(-w / 2 + 16, y + h / 2, rankStr, {
        fontFamily: "sans-serif",
        fontSize: "14px",
        fontStyle: "bold",
        color: rankColor,
      })
      .setOrigin(0, 0.5);

    // Clean Player Name
    let cleanName = item.name
      .replace(/\s*\(Me\)/gi, "")
      .replace(/\s*\(YOU\)/gi, "")
      .trim();
    if (isUser) {
      cleanName = `⭐ ${cleanName} (You)`;
    }

    const nameMaxW = w * 0.46;
    const nameText = this.scene.add
      .text(-w / 2 + 76, y + h / 2, cleanName, {
        fontFamily: "sans-serif",
        fontSize: "14px",
        fontStyle: isUser ? "bold" : "normal",
        color: isUser ? "#0369A1" : "#1E293B",
      })
      .setOrigin(0, 0.5);

    if (nameText.width > nameMaxW) {
      nameText.setScale(nameMaxW / nameText.width);
    }

    // Score Badge
    const scoreText = this.scene.add
      .text(w / 2 - 14, y + h / 2, `💎 ${item.score.toLocaleString()}`, {
        fontFamily: "sans-serif",
        fontSize: "14px",
        fontStyle: "bold",
        color: isTop1 ? "#B45309" : "#0F172A",
      })
      .setOrigin(1, 0.5);

    this.panel.add([rankText, nameText, scoreText]);
  }

  private drawMyRankCard(
    w: number,
    y: number,
    h: number,
    rank: number,
    score: number,
  ): void {
    const cardG = this.scene.add.graphics();
    // Shadow
    cardG.fillStyle(0x000000, 0.14);
    cardG.fillRoundedRect(-w / 2, y + 2, w, h, 14);
    // Body (Rich Cyan-Blue gradient tone)
    cardG.fillStyle(0x0284c7, 1);
    cardG.fillRoundedRect(-w / 2, y, w, h, 14);
    cardG.lineStyle(2, 0x38bdf8, 1);
    cardG.strokeRoundedRect(-w / 2, y, w, h, 14);
    this.panel.add(cardG);

    const rankLabel = this.scene.add
      .text(-w / 2 + 18, y + h / 2, `⭐ YOUR RANK: #${rank}`, {
        fontFamily: "sans-serif",
        fontSize: "15px",
        fontStyle: "bold",
        color: "#FFFFFF",
      })
      .setOrigin(0, 0.5);

    const scoreLabel = this.scene.add
      .text(w / 2 - 18, y + h / 2, `💎 ${score.toLocaleString()} pts`, {
        fontFamily: "sans-serif",
        fontSize: "15px",
        fontStyle: "bold",
        color: "#FDE047",
      })
      .setOrigin(1, 0.5);

    this.panel.add([rankLabel, scoreLabel]);
  }

  public close(): void {
    this.scene.tweens.add({
      targets: this.panel,
      scale: 0.85,
      alpha: 0,
      duration: dur.fast,
      ease: "Back.easeIn",
      onComplete: () => {
        this.root.destroy();
      },
    });
  }
}
