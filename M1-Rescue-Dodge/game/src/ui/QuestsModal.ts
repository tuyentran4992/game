import Phaser from 'phaser';
import { color, type, radius, z, dur, fontStyle, toColor } from '../tokens';
import { ctx } from '../context';
import { Quest } from '../logic/GameEngine';

export class QuestsModal {
  private scene: Phaser.Scene;
  private root: Phaser.GameObjects.Container;
  private fishBalanceText!: Phaser.GameObjects.Text;
  private questCardsContainer!: Phaser.GameObjects.Container;
  private onCloseCallback?: () => void;

  constructor(scene: Phaser.Scene, onClose?: () => void) {
    this.scene = scene;
    this.onCloseCallback = onClose;
    this.root = this.scene.add.container(0, 0).setDepth((z.dialog ?? 100) + 10);

    this.create();
  }

  private create() {
    const { width, height } = this.scene.scale;

    // 1. Dark Backdrop
    const backdrop = this.scene.add.graphics();
    backdrop.fillStyle(0x0A0E1A, 0.80);
    backdrop.fillRect(0, 0, width, height);
    backdrop.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains);
    this.root.add(backdrop);

    // 2. Dialog Panel
    const pw = Math.min(360, width - 32);
    const isShort = height < 560;
    const ph = Math.min(isShort ? 450 : 510, height - 30);
    const cx = width / 2;
    const cy = height / 2;

    const panelG = this.scene.add.graphics();
    panelG.fillStyle(toColor(color.shadow), 0.4);
    panelG.fillRoundedRect(cx - pw / 2, cy - ph / 2 + 10, pw, ph, radius.lg);
    panelG.fillStyle(0xFFFFFF, 1);
    panelG.fillRoundedRect(cx - pw / 2, cy - ph / 2, pw, ph, radius.lg);
    panelG.lineStyle(4, toColor(color.primary), 1);
    panelG.strokeRoundedRect(cx - pw / 2, cy - ph / 2, pw, ph, radius.lg);
    this.root.add(panelG);

    // 3. Header: Title & Close Button
    const titleY = cy - ph / 2 + 28;
    const title = this.scene.add.text(cx, titleY, 'DAILY QUESTS', fontStyle({ size: '20px', weight: '900', lh: 1 }, color.primary))
      .setOrigin(0.5);
    this.root.add(title);

    const closeBtn = this.scene.add.text(cx + pw / 2 - 24, titleY, '✕', fontStyle({ size: '20px', weight: '700', lh: 1 }, color.textSecondary))
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.close());
    this.root.add(closeBtn);

    // 4. Fish Balance Pill
    const balanceY = titleY + 30;
    const balanceBg = this.scene.add.graphics();
    balanceBg.fillStyle(0xFFF3D6, 1);
    balanceBg.fillRoundedRect(cx - 65, balanceY - 13, 130, 26, 13);
    balanceBg.lineStyle(2, 0xFFA502, 1);
    balanceBg.strokeRoundedRect(cx - 65, balanceY - 13, 130, 26, 13);
    this.root.add(balanceBg);

    this.fishBalanceText = this.scene.add.text(cx, balanceY, `🐟 ${ctx.engine.totalFish} FISH`, fontStyle({ size: '12px', weight: '800', lh: 1 }, '#E67E22'))
      .setOrigin(0.5);
    this.root.add(this.fishBalanceText);

    // 5. Quest Cards Container
    this.questCardsContainer = this.scene.add.container(0, 0);
    this.root.add(this.questCardsContainer);

    this.renderQuestCards(cx, balanceY + 24, pw - 32, isShort);

    // Slide-up animation
    this.root.setAlpha(0).setScale(0.92);
    this.scene.tweens.add({
      targets: this.root,
      alpha: 1,
      scale: 1,
      duration: dur.fast,
      ease: 'back.out',
    });
  }

  private renderQuestCards(cx: number, startY: number, cardW: number, isShort = false) {
    this.questCardsContainer.removeAll(true);
    const quests = ctx.engine.getQuests();
    const cardH = isShort ? 58 : 66;
    const gap = isShort ? 8 : 10;

    quests.forEach((q: Quest, idx: number) => {
      const cardY = startY + idx * (cardH + gap) + cardH / 2;

      const cardBg = this.scene.add.graphics();
      const isComplete = q.progress >= q.target;
      cardBg.fillStyle(q.claimed ? 0xF8FAFC : (isComplete ? 0xFFFBEB : 0xF1F5F9), 1);
      cardBg.fillRoundedRect(cx - cardW / 2, cardY - cardH / 2, cardW, cardH, 10);
      cardBg.lineStyle(1.5, isComplete && !q.claimed ? 0xF59E0B : 0xE2E8F0, 1);
      cardBg.strokeRoundedRect(cx - cardW / 2, cardY - cardH / 2, cardW, cardH, 10);
      this.questCardsContainer.add(cardBg);

      // Title & Desc
      const titleTxt = this.scene.add.text(cx - cardW / 2 + 12, cardY - cardH / 2 + 10, q.title, fontStyle({ size: '13px', weight: '700', lh: 1.1 }, color.textPrimary));
      const descTxt = this.scene.add.text(cx - cardW / 2 + 12, cardY - cardH / 2 + 26, q.desc, fontStyle({ size: '10px', weight: '500', lh: 1.1 }, color.textSecondary));
      this.questCardsContainer.add([titleTxt, descTxt]);

      // Progress Bar
      const barW = cardW - 120;
      const barH = 8;
      const barX = cx - cardW / 2 + 12;
      const barY = cardY + cardH / 2 - 14;

      const barBg = this.scene.add.graphics();
      barBg.fillStyle(0xE2E8F0, 1);
      barBg.fillRoundedRect(barX, barY, barW, barH, 4);
      const ratio = Math.min(1, q.progress / q.target);
      if (ratio > 0) {
        barBg.fillStyle(isComplete ? 0x10B981 : 0x3B82F6, 1);
        barBg.fillRoundedRect(barX, barY, barW * ratio, barH, 4);
      }
      this.questCardsContainer.add(barBg);

      const progTxt = this.scene.add.text(barX + barW + 6, barY, `${q.progress}/${q.target}`, fontStyle({ size: '9px', weight: '700', lh: 1 }, color.textSecondary));
      this.questCardsContainer.add(progTxt);

      // Action / Claim Button
      const btnX = cx + cardW / 2 - 42;
      const btnY = cardY;
      const btnW = 68;
      const btnH = 30;

      if (q.claimed) {
        const claimedTxt = this.scene.add.text(btnX, btnY, '✓ Claimed', fontStyle({ size: '10px', weight: '700', lh: 1 }, '#94A3B8'))
          .setOrigin(0.5);
        this.questCardsContainer.add(claimedTxt);
      } else if (isComplete) {
        const claimG = this.scene.add.graphics();
        claimG.fillStyle(0xF59E0B, 1);
        claimG.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 8);
        const claimTxt = this.scene.add.text(0, 0, `+${q.rewardFish} 🐟`, fontStyle({ size: '11px', weight: '800', lh: 1 }, '#FFFFFF'))
          .setOrigin(0.5);

        const claimCont = this.scene.add.container(btnX, btnY, [claimG, claimTxt]).setSize(btnW, btnH);
        claimCont.setInteractive({ useHandCursor: true });
        
        claimCont.on('pointerdown', () => {
          this.claimQuest(q.id);
        });

        this.scene.tweens.add({
          targets: claimCont,
          scale: 1.05,
          duration: 400,
          yoyo: true,
          repeat: -1,
          ease: 'sine.inout',
        });

        this.questCardsContainer.add(claimCont);
      } else {
        const lockedTxt = this.scene.add.text(btnX, btnY, `+${q.rewardFish} 🐟`, fontStyle({ size: '11px', weight: '700', lh: 1 }, '#64748B'))
          .setOrigin(0.5);
        this.questCardsContainer.add(lockedTxt);
      }
    });
  }

  private claimQuest(questId: string) {
    const reward = ctx.engine.claimQuest(questId);
    if (reward > 0) {
      ctx.saveBest();
      if (this.scene.cache.audio.exists('sfx_levelup')) this.scene.sound.play('sfx_levelup', { volume: 0.5 });
      this.spawnSparkles(this.scene.scale.width / 2, this.scene.scale.height / 2);
      this.fishBalanceText.setText(`🐟 ${ctx.engine.totalFish} FISH`);
      const { width, height } = this.scene.scale;
      this.renderQuestCards(width / 2, height / 2 - 255 + 68, Math.min(360, width - 32) - 32, height < 560);
    }
  }

  private spawnSparkles(x: number, y: number) {
    for (let i = 0; i < 20; i++) {
      const p = this.scene.add.circle(x, y, Phaser.Math.Between(4, 8), 0xFFA502).setDepth((z.dialog ?? 100) + 15);
      const angle = (i / 20) * Math.PI * 2;
      const dist = Phaser.Math.Between(40, 100);
      this.scene.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        scale: 0.2,
        duration: 500,
        ease: 'quad.out',
        onComplete: () => p.destroy(),
      });
    }
  }

  public close() {
    this.scene.tweens.add({
      targets: this.root,
      alpha: 0,
      scale: 0.92,
      duration: dur.fast,
      ease: 'quad.in',
      onComplete: () => {
        this.root.destroy();
        this.onCloseCallback?.();
      },
    });
  }
}
