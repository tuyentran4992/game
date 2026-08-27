import Phaser from 'phaser';
import { color, type, z, dur, fontStyle } from '../tokens';
import { drawButton } from '../ui';
import { ctx } from '../context';
import { sdk } from '@game/sdk';
import { ShopModal } from '../ui/ShopModal';
import { QuestsModal } from '../ui/QuestsModal';

export class StartScene extends Phaser.Scene {
  private bg!: Phaser.GameObjects.Image;
  private overlay!: Phaser.GameObjects.Graphics;
  private catContainer!: Phaser.GameObjects.Container;
  private catImage!: Phaser.GameObjects.Image;
  private currentCatSize = 140;
  private fishText!: Phaser.GameObjects.Text;
  private fishPillG!: Phaser.GameObjects.Graphics;
  private questBadge!: Phaser.GameObjects.Arc;
  private audioBtn!: Phaser.GameObjects.Text;
  private titleGroup!: Phaser.GameObjects.Container;
  private titleText!: Phaser.GameObjects.Text;
  private titleShadow!: Phaser.GameObjects.Text;
  private subTitleText!: Phaser.GameObjects.Text;
  private playContainer!: Phaser.GameObjects.Container;
  private skinsContainer!: Phaser.GameObjects.Container;
  private questsContainer!: Phaser.GameObjects.Container;

  constructor() { super({ key: 'StartScene' }); }

  create() {
    const { width, height } = this.scale;

    // 1. Background & Dark Overlay
    this.bg = this.add.image(width / 2, height / 2, 'bg_day').setDepth(z.bg);
    this.overlay = this.add.graphics().setDepth(z.bg + 1);

    // 2. Top Bar
    const isAudio = !this.sound.mute && sdk.isAudioEnabled();
    this.audioBtn = this.add.text(34, 38, isAudio ? '🔊' : '🔇', { fontSize: '26px' })
      .setOrigin(0.5).setDepth(z.hud).setInteractive({ useHandCursor: true });
    this.audioBtn.on('pointerdown', () => {
      const nowMuted = !this.sound.mute;
      this.sound.mute = nowMuted;
      this.audioBtn.setText(nowMuted ? '🔇' : '🔊');
    });

    this.fishPillG = this.add.graphics().setDepth(z.hud);
    this.fishText = this.add.text(width - 72, 38, `🐟 ${ctx.engine.totalFish}`, fontStyle({ size: '14px', weight: '800', lh: 1 }, '#E67E22'))
      .setOrigin(0.5).setDepth(z.hud + 1);

    // 3. English Game Title Group ("CAT RESCUE - BEE DODGE")
    this.titleGroup = this.add.container(width / 2, 80).setDepth(z.hud);
    this.titleShadow = this.add.text(2, 3, 'CAT RESCUE', fontStyle({ size: '36px', weight: '900', lh: 1 }, 'rgba(0,0,0,0.35)')).setOrigin(0.5);
    this.titleText = this.add.text(0, 0, 'CAT RESCUE', fontStyle({ size: '36px', weight: '900', lh: 1 }, '#FFFFFF')).setOrigin(0.5);
    this.subTitleText = this.add.text(0, 32, 'BEE DODGE', fontStyle({ size: '13px', weight: '800', lh: 1 }, '#FFD166')).setOrigin(0.5);
    this.titleGroup.add([this.titleShadow, this.titleText, this.subTitleText]);

    // 4. Cat Mascot (Container wrapped to protect size from tween resets)
    this.catContainer = this.add.container(width / 2, height * 0.42).setDepth(z.actor);
    this.catImage = this.add.image(0, 0, ctx.engine.getSelectedSkinTexture());
    this.catImage.setData('testid', 'cat-idle');
    this.catContainer.add(this.catImage);

    this.tweens.add({
      targets: this.catContainer,
      scaleY: 1.05,
      scaleX: 0.96,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inout',
    });

    // 5. Buttons
    const { container: playCont } = drawButton(this, width / 2, height * 0.65, 'Play', { width: 280, height: 60, testid: 'start-btn' });
    this.playContainer = playCont;
    playCont.on('pointerdown', () => {
      this.cameras.main.fadeOut(dur.scene, 0, 0, 0);
      this.time.delayedCall(dur.scene, () => this.scene.start('TutorialScene'));
    });

    const { container: skinsCont } = drawButton(this, width / 2 - 72, height * 0.80, 'Skins 🐱', {
      variant: 'ghost',
      width: 130,
      height: 48,
      textType: { size: '15px', weight: '800', lh: 1 },
    });
    this.skinsContainer = skinsCont;
    skinsCont.on('pointerdown', () => {
      new ShopModal(this, () => this.refreshUI());
    });

    const { container: questsCont } = drawButton(this, width / 2 + 72, height * 0.80, 'Quests 📜', {
      variant: 'ghost',
      width: 130,
      height: 48,
      textType: { size: '15px', weight: '800', lh: 1 },
    });
    this.questsContainer = questsCont;
    questsCont.on('pointerdown', () => {
      new QuestsModal(this, () => this.refreshUI());
    });

    this.questBadge = this.add.circle(0, 0, 7, 0xEF4444).setDepth(z.panel + 5);

    // Initial Layout & Resize
    this.relayout(width, height);
    this.updateQuestBadge();

    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      this.relayout(gameSize.width, gameSize.height);
    });
  }

  private relayout(width: number, height: number) {
    const isPortrait = height >= width;

    // Background scale
    const bgScale = Math.max(width / this.bg.width, height / this.bg.height);
    this.bg.setPosition(width / 2, height / 2).setScale(bgScale);

    // Gradient Overlay
    this.overlay.clear();
    this.overlay.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.45, 0.45);
    this.overlay.fillRect(0, height * 0.40, width, height * 0.60);

    // Top Bar
    const topY = Math.max(34, isPortrait ? height * 0.05 : 30);
    this.audioBtn.setPosition(34, topY);

    this.fishPillG.clear();
    this.fishPillG.fillStyle(0xFFFFFF, 0.90);
    this.fishPillG.fillRoundedRect(width - 125, topY - 15, 110, 30, 15);
    this.fishPillG.lineStyle(2, 0xFFA502, 1);
    this.fishPillG.strokeRoundedRect(width - 125, topY - 15, 110, 30, 15);
    this.fishText.setPosition(width - 70, topY);

    // Title Positioning
    const titleY = isPortrait ? Math.max(68, height * 0.14) : Math.max(48, height * 0.12);
    this.titleGroup.setPosition(width / 2, titleY);

    // Clear Vertical Button Layout
    const btnW = Math.min(isPortrait ? 280 : 250, width - 40);
    const playH = 60;
    const secH = 48;
    const gapBetweenBtnRows = 22; // Clear 22px gap between Play and Secondary rows
    const halfW = (btnW - 14) / 2;

    const bottomPad = isPortrait ? Math.max(32, height * 0.08) : Math.max(20, height * 0.05);
    const secBtnY = height - bottomPad - secH / 2;
    const playBtnY = secBtnY - secH / 2 - gapBetweenBtnRows - playH / 2;

    // Reposition Buttons
    this.playContainer.setPosition(width / 2, playBtnY);
    this.skinsContainer.setPosition(width / 2 - halfW / 2 - 7, secBtnY);
    this.questsContainer.setPosition(width / 2 + halfW / 2 + 7, secBtnY);

    this.questBadge.setPosition(width / 2 + halfW + 3, secBtnY - secH / 2 + 5);

    // Cat Mascot available space
    const topLimit = titleY + 44;
    const bottomLimit = playBtnY - playH / 2 - 16;
    const availableH = Math.max(70, bottomLimit - topLimit);

    const maxCatSize = isPortrait ? 210 : 145;
    const catH = Math.min(maxCatSize, Math.round(availableH * 0.88));
    const catW = catH;
    const catY = topLimit + availableH / 2;

    this.currentCatSize = catH;
    this.catImage.setDisplaySize(catW, catH);
    this.catContainer.setPosition(width / 2, catY);
  }

  private refreshUI() {
    this.catImage.setTexture(ctx.engine.getSelectedSkinTexture());
    this.catImage.setDisplaySize(this.currentCatSize, this.currentCatSize);
    this.fishText.setText(`🐟 ${ctx.engine.totalFish}`);
    this.updateQuestBadge();
  }

  private updateQuestBadge() {
    this.questBadge.setVisible(ctx.engine.hasUnclaimedQuests());
  }
}
