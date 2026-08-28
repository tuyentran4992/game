import Phaser from 'phaser';
import { color, type, radius, z, dur, fontStyle, toColor } from '../tokens';
import { drawButton } from '../ui';
import { ctx } from '../context';
import { CAT_SKINS } from '../logic/GameEngine';

export class ShopModal {
  private scene: Phaser.Scene;
  private root: Phaser.GameObjects.Container;
  private currentIndex = 0;
  private fishBalanceText!: Phaser.GameObjects.Text;
  private skinImage!: Phaser.GameObjects.Image;
  private previewContainer!: Phaser.GameObjects.Container;
  private skinNameText!: Phaser.GameObjects.Text;
  private skinDescText!: Phaser.GameObjects.Text;
  private actionBtnContainer!: Phaser.GameObjects.Container;
  private actionBtnText!: Phaser.GameObjects.Text;
  private dots: Phaser.GameObjects.Arc[] = [];
  private onCloseCallback?: () => void;

  constructor(scene: Phaser.Scene, onClose?: () => void) {
    this.scene = scene;
    this.onCloseCallback = onClose;
    this.root = this.scene.add.container(0, 0).setDepth((z.dialog ?? 100) + 10);

    const selected = ctx.engine.selectedSkin;
    const idx = CAT_SKINS.findIndex(s => s.id === selected);
    this.currentIndex = idx >= 0 ? idx : 0;

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

    // 2. Dialog Panel Dimensions
    const pw = Math.min(360, width - 32);
    const isShort = height < 560;
    const ph = Math.min(isShort ? 450 : 510, height - 30);
    const cx = width / 2;
    const cy = height / 2;

    const panelG = this.scene.add.graphics();
    panelG.fillStyle(toColor(color.shadow), 0.35);
    panelG.fillRoundedRect(cx - pw / 2, cy - ph / 2 + 10, pw, ph, radius.lg);
    // Volumetric Surface Fill
    panelG.fillStyle(0xF8FAFC, 1);
    panelG.fillRoundedRect(cx - pw / 2, cy - ph / 2, pw, ph, radius.lg);
    panelG.fillStyle(0xFFFFFF, 0.94);
    panelG.fillRoundedRect(cx - pw / 2 + 3, cy - ph / 2 + 3, pw - 6, ph * 0.52, radius.lg - 2);
    // Primary Border
    panelG.lineStyle(4, toColor(color.primary), 1);
    panelG.strokeRoundedRect(cx - pw / 2, cy - ph / 2, pw, ph, radius.lg);
    // Inner Highlight
    panelG.lineStyle(1.5, 0xFFFFFF, 0.70);
    panelG.strokeRoundedRect(cx - pw / 2 + 2, cy - ph / 2 + 2, pw - 4, ph - 4, radius.lg - 2);
    this.root.add(panelG);

    // 3. Header: Title & Close Button
    const titleY = cy - ph / 2 + 28;
    const title = this.scene.add.text(cx, titleY, 'CAT SKIN SHOP', fontStyle({ size: '20px', weight: '900', lh: 1 }, color.primary))
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
    const previewY = balanceY + 68;
    const catRadius = 48;
    const previewBg = this.scene.add.graphics();
    previewBg.fillStyle(0xF4F6F9, 1);
    previewBg.fillCircle(cx, previewY, catRadius);
    previewBg.lineStyle(2, 0xE2E8F0, 1);
    previewBg.strokeCircle(cx, previewY, catRadius);
    this.root.add(previewBg);

    this.spriteSize = 96;
    this.previewContainer = this.scene.add.container(cx, previewY);
    this.skinImage = this.scene.add.image(0, 0, 'cat_idle').setDisplaySize(this.spriteSize, this.spriteSize);
    this.previewContainer.add(this.skinImage);
    this.root.add(this.previewContainer);

    this.scene.tweens.add({
      targets: this.previewContainer,
      scaleY: 1.05,
      scaleX: 0.96,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inout',
    });

    // Left / Right Navigation Arrows
    const arrowXOffset = pw / 2 - 28;
    const leftArrow = this.scene.add.text(cx - arrowXOffset, previewY, '◀', fontStyle({ size: '24px', weight: '800', lh: 1 }, color.primary))
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    leftArrow.on('pointerdown', () => this.prevSkin());
    this.root.add(leftArrow);

    const rightArrow = this.scene.add.text(cx + arrowXOffset, previewY, '▶', fontStyle({ size: '24px', weight: '800', lh: 1 }, color.primary))
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    rightArrow.on('pointerdown', () => this.nextSkin());
    this.root.add(rightArrow);

    // 6. Skin Info: Name & Desc (Centered in middle-lower section, well clear of cat)
    const nameY = previewY + 74;
    this.skinNameText = this.scene.add.text(cx, nameY, '', fontStyle({ size: '18px', weight: '800', lh: 1 }, color.textPrimary))
      .setOrigin(0.5);
    this.root.add(this.skinNameText);

    const descY = nameY + 24;
    this.skinDescText = this.scene.add.text(cx, descY, '', fontStyle({ size: '12px', weight: '500', lh: 1.2 }, color.textSecondary))
      .setOrigin(0.5)
      .setWordWrapWidth(pw - 40, true);
    this.root.add(this.skinDescText);

    // 7. Dots indicator
    const dotsY = descY + 24;
    const totalSkins = CAT_SKINS.length;
    const dotSpacing = 14;
    const startDotX = cx - ((totalSkins - 1) * dotSpacing) / 2;
    this.dots = [];
    for (let i = 0; i < totalSkins; i++) {
      const dot = this.scene.add.circle(startDotX + i * dotSpacing, dotsY, 4, 0xCBD5E1);
      this.root.add(dot);
      this.dots.push(dot);
    }

    // 8. Action Button (Anchored to bottom)
    const btnY = cy + ph / 2 - 36;
    const btnW = Math.min(240, pw - 48);
    const { container: btnCont, textObj: btnTxt } = drawButton(this.scene, cx, btnY, '', {
      width: btnW,
      height: 46,
      textType: { size: '16px', weight: '800', lh: 1 },
    });
    this.actionBtnContainer = btnCont;
    this.actionBtnText = btnTxt;
    this.root.add(btnCont);

    btnCont.on('pointerdown', () => this.handleAction());

    this.updateCard();

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

  private prevSkin() {
    this.currentIndex = (this.currentIndex - 1 + CAT_SKINS.length) % CAT_SKINS.length;
    this.updateCard();
  }

  private nextSkin() {
    this.currentIndex = (this.currentIndex + 1) % CAT_SKINS.length;
    this.updateCard();
  }

  private spriteSize = 105;

  private updateCard() {
    const skin = CAT_SKINS[this.currentIndex];
    const isUnlocked = ctx.engine.isSkinUnlocked(skin.id);
    const isSelected = ctx.engine.selectedSkin === skin.id;

    if (this.scene.textures.exists(skin.textureKey)) {
      this.skinImage.setTexture(skin.textureKey);
      this.skinImage.setDisplaySize(this.spriteSize, this.spriteSize);
    }

    this.skinNameText.setText(skin.name);
    this.skinDescText.setText(skin.desc);

    this.dots.forEach((dot, idx) => {
      dot.setFillStyle(idx === this.currentIndex ? toColor(color.primary) : 0xCBD5E1);
      dot.setScale(idx === this.currentIndex ? 1.3 : 1);
    });

    this.fishBalanceText.setText(`🐟 ${ctx.engine.totalFish} FISH`);

    if (isSelected) {
      this.actionBtnText.setText('✓ EQUIPPED');
      this.actionBtnContainer.setAlpha(0.65).disableInteractive();
    } else if (isUnlocked) {
      this.actionBtnText.setText('EQUIP');
      this.actionBtnContainer.setAlpha(1).setInteractive({ useHandCursor: true });
    } else {
      if (ctx.engine.totalFish >= skin.price) {
        this.actionBtnText.setText(`BUY (🐟 ${skin.price})`);
        this.actionBtnContainer.setAlpha(1).setInteractive({ useHandCursor: true });
      } else {
        this.actionBtnText.setText(`LOCKED (🐟 ${skin.price})`);
        this.actionBtnContainer.setAlpha(0.5).disableInteractive();
      }
    }
  }

  private handleAction() {
    const skin = CAT_SKINS[this.currentIndex];
    const isUnlocked = ctx.engine.isSkinUnlocked(skin.id);

    if (isUnlocked) {
      ctx.engine.selectSkin(skin.id);
      ctx.saveBest();
      if (this.scene.cache.audio.exists('sfx_click')) this.scene.sound.play('sfx_click', { volume: 0.4 });
      this.updateCard();
    } else {
      const success = ctx.engine.unlockSkin(skin.id);
      if (success) {
        ctx.saveBest();
        if (this.scene.cache.audio.exists('sfx_levelup')) this.scene.sound.play('sfx_levelup', { volume: 0.5 });
        this.spawnSparkles(this.scene.scale.width / 2, this.scene.scale.height / 2);
        this.updateCard();
      }
    }
  }

  private spawnSparkles(x: number, y: number) {
    for (let i = 0; i < 18; i++) {
      const p = this.scene.add.circle(x, y, Phaser.Math.Between(4, 8), 0xFFA502).setDepth((z.dialog ?? 100) + 15);
      const angle = (i / 18) * Math.PI * 2;
      const dist = Phaser.Math.Between(40, 90);
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
