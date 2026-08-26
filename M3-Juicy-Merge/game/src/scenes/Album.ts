import Phaser from "phaser";
import { radius, z, dur } from "../tokens";
import { FRUIT_ENCYCLOPEDIA, getAlbumProgress } from "../logic/album";
import { resolveFruitTexture } from "../gameplay/fruit-sprite";
import { ctx } from "../context";
import { drawButton } from "../ui";

export class AlbumScene extends Phaser.Scene {
  private returnScene = "StartScene";

  constructor() {
    super({ key: "AlbumScene" });
  }

  init(data: { returnScene?: string }): void {
    if (data.returnScene) this.returnScene = data.returnScene;
  }

  create(): void {
    const { width, height } = this.scale;
    const unlocked = ctx.score.getUnlockedTiers();
    const progress = getAlbumProgress(unlocked);

    // Dark backdrop overlay
    const backdrop = this.add
      .rectangle(width / 2, height / 2, width, height, 0x0f172a, 0.72)
      .setDepth(z.panel + 10)
      .setInteractive();

    // Modal container
    const modal = this.add
      .container(width / 2, height / 2)
      .setDepth(z.panel + 11);

    const cardW = Math.min(560, width - 40);
    const cardH = 740;
    const bg = this.add.graphics();

    // Shadow
    bg.fillStyle(0x000000, 0.28);
    bg.fillRoundedRect(-cardW / 2, -cardH / 2 + 10, cardW, cardH, radius.lg);

    // Card body
    bg.fillStyle(0xffffff, 0.98);
    bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, radius.lg);

    // Emerald Header Accent
    bg.fillStyle(0x10b981, 1);
    bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, 18, {
      tl: radius.lg,
      tr: radius.lg,
      bl: 0,
      br: 0,
    });
    bg.lineStyle(3, 0x10b981, 0.9);
    bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, radius.lg);
    modal.add(bg);

    // Icon & Header
    const icon = this.add
      .text(0, -cardH / 2 + 48, "📖", { fontSize: "38px" })
      .setOrigin(0.5);
    const title = this.add
      .text(0, -cardH / 2 + 88, "FRUIT ENCYCLOPEDIA", {
        fontFamily: "sans-serif",
        fontSize: "24px",
        fontStyle: "bold",
        color: "#065F46",
      })
      .setOrigin(0.5);
    const subtitle = this.add
      .text(
        0,
        -cardH / 2 + 116,
        `Unlocked: ${progress.unlockedCount}/${progress.totalCount} Fruits (${progress.percentage}%) • ${progress.title}`,
        {
          fontFamily: "sans-serif",
          fontSize: "13px",
          fontStyle: "bold",
          color: "#059669",
        },
      )
      .setOrigin(0.5);
    modal.add([icon, title, subtitle]);

    // Grid layout for 15 Fruits (3 columns × 5 rows)
    const cols = 3;
    const spacingX = 160;
    const spacingY = 78;
    const startX = -spacingX * ((cols - 1) / 2);
    const startY = -cardH / 2 + 165;

    for (let i = 0; i < FRUIT_ENCYCLOPEDIA.length; i++) {
      const info = FRUIT_ENCYCLOPEDIA[i];
      if (!info) continue;
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = startX + col * spacingX;
      const cy = startY + row * spacingY;
      const isUnlocked = unlocked.has(info.tier);
      const isLegendary = info.tier >= 12;

      // Card slot background
      const slotBg = this.add.graphics();
      let slotFill = isUnlocked ? 0xf0fdf4 : 0xf8fafc;
      let slotStroke = isUnlocked ? 0x86efac : 0xe2e8f0;
      if (isLegendary) {
        slotFill = isUnlocked ? 0xfef3c7 : 0xfaf5ff;
        slotStroke = isUnlocked ? 0xf59e0b : 0xc084fc;
      }

      // Soft shadow
      slotBg.fillStyle(0x000000, 0.05);
      slotBg.fillRoundedRect(cx - 75, cy - 35, 150, 70, radius.md);

      slotBg.fillStyle(slotFill, 1);
      slotBg.fillRoundedRect(cx - 75, cy - 35, 150, 70, radius.md);
      slotBg.lineStyle(isLegendary ? 2.5 : 1.5, slotStroke, 1);
      slotBg.strokeRoundedRect(cx - 75, cy - 35, 150, 70, radius.md);
      modal.add(slotBg);

      if (isUnlocked) {
        // Sprite
        const key = resolveFruitTexture(this, info.tier);
        const iconImg = this.add.image(cx - 42, cy, key).setDisplaySize(40, 40);
        modal.add(iconImg);

        const nameTxt = this.add
          .text(cx + 10, cy - 10, info.name, {
            fontFamily: "sans-serif",
            fontSize: "12px",
            fontStyle: "bold",
            color: isLegendary ? "#B45309" : "#1E293B",
          })
          .setOrigin(0.5);
        modal.add(nameTxt);

        const scoreTxt = this.add
          .text(
            cx + 10,
            cy + 10,
            isLegendary ? `+${info.scoreGain} ★` : `+${info.scoreGain} pts`,
            {
              fontFamily: "sans-serif",
              fontSize: "11px",
              fontStyle: "bold",
              color: isLegendary ? "#D97706" : "#059669",
            },
          )
          .setOrigin(0.5);
        modal.add(scoreTxt);
      } else {
        // Locked silhouette
        const lockCircle = this.add.graphics();
        lockCircle.fillStyle(isLegendary ? 0xc084fc : 0x94a3b8, 0.35);
        lockCircle.fillCircle(cx - 42, cy, 18);
        modal.add(lockCircle);

        const lockIcon = this.add
          .text(cx - 42, cy, isLegendary ? "🔒" : "?", {
            fontFamily: "sans-serif",
            fontSize: "16px",
            fontStyle: "bold",
            color: isLegendary ? "#7C3AED" : "#64748B",
          })
          .setOrigin(0.5);
        modal.add(lockIcon);

        const lockName = this.add
          .text(cx + 10, cy - 10, isLegendary ? info.name : "Locked", {
            fontFamily: "sans-serif",
            fontSize: "11px",
            fontStyle: "bold",
            color: isLegendary ? "#7C3AED" : "#94A3B8",
          })
          .setOrigin(0.5);
        modal.add(lockName);

        const milestoneReq =
          info.tier === 12
            ? "Win Day 3"
            : info.tier === 13
              ? "Win Day 6"
              : info.tier === 14
                ? "Win Day 12"
                : `Merge T${info.tier}`;
        const hintTxt = this.add
          .text(cx + 10, cy + 10, milestoneReq, {
            fontFamily: "sans-serif",
            fontSize: "10px",
            fontStyle: isLegendary ? "bold" : "normal",
            color: isLegendary ? "#9333EA" : "#64748B",
          })
          .setOrigin(0.5);
        modal.add(hintTxt);
      }
    }

    // Close Button at bottom (3D Candy Button)
    const closeBtnY = cardH / 2 - 42;
    const { container: closeBtn } = drawButton(this, 0, closeBtnY, "✕ CLOSE", {
      variant: "primary",
      width: 220,
      height: 54,
      fontSize: 20,
    });
    modal.add(closeBtn);

    const onClose = (): void => {
      this.tweens.add({
        targets: modal,
        scale: 0.8,
        alpha: 0,
        duration: dur.fast,
        ease: "Back.easeIn",
        onComplete: () => {
          this.scene.stop();
          this.scene.resume(this.returnScene);
        },
      });
    };

    closeBtn.on("pointerdown", onClose);
    backdrop.on("pointerdown", onClose);

    // Modal entrance animation
    this.tweens.add({
      targets: modal,
      scale: 1,
      alpha: 1,
      duration: dur.pop,
      ease: "Back.easeOut",
    });
  }
}
