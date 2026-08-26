/**
 * Neon Grid — Skin Select Screen (src/scenes/Skins.ts)
 *
 * Visual selection of 7 cyber skins with preview, unlock status, and persistence.
 */

import Phaser from 'phaser';
import { Button } from '@game/core/ui';
import { fonts } from '@game/core/tokens';
import { SKINS, getSkinById } from '../logic/skins';
import { saveManager } from '../logic/save-manager';
import { soundFx } from '../audio/audio-synth';
import { GridRenderer } from '../render/phaser-adapter';
import type { Skin } from '../logic/types';

export class SkinsScene extends Phaser.Scene {
  private selectedSkinId: number = 0;
  private currentLabel!: Phaser.GameObjects.Text;
  private conditionLabel!: Phaser.GameObjects.Text;
  private skinCards: Phaser.GameObjects.Container[] = [];

  constructor() {
    super({ key: 'Skins' });
  }

  create(): void {
    const cx = this.scale.width / 2;
    this.selectedSkinId = saveManager.getActiveSkinId();

    // 1. Background gradient
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x040410, 0x040410, 0x0f0f26, 0x0f0f26, 1);
    bg.fillRect(0, 0, this.scale.width, this.scale.height);

    // Subtle perspective grid
    const deco = this.add.graphics();
    deco.lineStyle(1, 0x00f5ff, 0.05);
    for (let i = 0; i < 22; i++) {
      deco.lineBetween(0, i * 60, this.scale.width, i * 60);
    }

    // 2. Title
    this.add.text(cx, 70, '🎨 CYBER SKINS', {
      fontFamily: fonts.display.family,
      fontSize: '36px',
      fontStyle: '800',
      color: '#00f5ff',
      stroke: '#080816',
      strokeThickness: 4,
    }).setOrigin(0.5);

    // 3. Grid of 7 Skins (3 columns)
    this.createSkinsGrid(cx, 130);

    // 4. Details Panel at bottom
    const infoCard = this.add.graphics();
    infoCard.fillStyle(0x12122c, 0.9);
    infoCard.fillRoundedRect(cx - 220, 680, 440, 110, 16);
    infoCard.lineStyle(1.5, 0x252555, 0.8);
    infoCard.strokeRoundedRect(cx - 220, 680, 440, 110, 16);

    const activeSkin = getSkinById(this.selectedSkinId);
    this.currentLabel = this.add.text(cx, 715, `Skin: ${activeSkin.name}`, {
      fontFamily: fonts.display.family,
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.conditionLabel = this.add.text(cx, 755, activeSkin.unlockCondition, {
      fontFamily: fonts.body.family,
      fontSize: '15px',
      color: '#8888bb',
    }).setOrigin(0.5);

    // 5. Back Button
    const backBtn = new Button(this, cx, 860, {
      variant: 'secondary',
      label: '←  BACK TO MENU',
      width: 280,
      height: 60,
      fontSize: 22,
    });

    backBtn.onClick(() => {
      soundFx.playButtonClick();
      this.cameras.main.fadeOut(180, 0, 0, 0);
      this.time.delayedCall(180, () => {
        this.scene.start('Start');
      });
    });
  }

  private createSkinsGrid(cx: number, startY: number): void {
    const cols = 3;
    const cardW = 160;
    const cardH = 150;
    const gapX = 25;
    const gapY = 20;

    const startX = cx - ((cols - 1) * (cardW + gapX)) / 2;

    SKINS.forEach((skin, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);

      const x = startX + col * (cardW + gapX);
      const y = startY + row * (cardH + gapY) + cardH / 2;

      const container = this.add.container(x, y);
      this.skinCards.push(container);

      this.renderSkinCard(container, skin, cardW, cardH);
    });
  }

  private renderSkinCard(container: Phaser.GameObjects.Container, skin: Skin, w: number, h: number): void {
    container.removeAll(true);

    const isUnlocked = saveManager.isSkinUnlocked(skin.id);
    const isActive = saveManager.getActiveSkinId() === skin.id;

    // Card background
    const bg = this.add.graphics();
    bg.fillStyle(skin.palette.gridBg, 0.95);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 14);

    if (isActive) {
      bg.lineStyle(2.5, 0xffd000, 0.95);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
    } else if (isUnlocked) {
      bg.lineStyle(1.5, skin.palette.gridColor, 0.7);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
    } else {
      bg.lineStyle(1, 0x333355, 0.6);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
    }
    container.add(bg);

    // Mini 2x2 preview block cluster
    const previewG = this.add.graphics();
    const miniSize = 20;
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 2; c++) {
        const px = -miniSize + c * (miniSize + 2);
        const py = -miniSize - 6 + r * (miniSize + 2);
        const colorIdx = (r * 2 + c) % skin.palette.blockColors.length;
        GridRenderer.drawSingleBlock(previewG, px, py, miniSize, colorIdx, isUnlocked ? 1.0 : 0.25, 4);
      }
    }
    container.add(previewG);

    // Skin Name
    const nameText = this.add.text(0, 32, skin.name, {
      fontFamily: fonts.body.family,
      fontSize: '14px',
      fontStyle: 'bold',
      color: isUnlocked ? '#ffffff' : '#666688',
    }).setOrigin(0.5);
    container.add(nameText);

    // Badge (Active / Locked / Unlocked)
    let badgeStr = 'UNLOCKED';
    let badgeColor = '#00ff88';

    if (isActive) {
      badgeStr = '🌟 ACTIVE';
      badgeColor = '#ffd000';
    } else if (!isUnlocked) {
      badgeStr = '🔒 LOCKED';
      badgeColor = '#ff4466';
    }

    const badgeText = this.add.text(0, 52, badgeStr, {
      fontFamily: fonts.mono.family,
      fontSize: '11px',
      fontStyle: 'bold',
      color: badgeColor,
    }).setOrigin(0.5);
    container.add(badgeText);

    // Hit area for selection
    const hitArea = this.add.rectangle(0, 0, w, h, 0x000000, 0).setInteractive({ useHandCursor: true });
    container.add(hitArea);

    hitArea.on('pointerdown', () => {
      this.selectSkin(skin);
    });
  }

  private selectSkin(skin: Skin): void {
    const isUnlocked = saveManager.isSkinUnlocked(skin.id);

    this.selectedSkinId = skin.id;
    this.currentLabel.setText(`Skin: ${skin.name}`);

    if (isUnlocked) {
      saveManager.setActiveSkinId(skin.id);
      soundFx.playButtonClick();
      this.conditionLabel.setText('✅ Applied to game!');
      this.conditionLabel.setColor('#00ff88');
    } else {
      soundFx.playSnapback();
      this.conditionLabel.setText(`Unlock: ${skin.unlockCondition}`);
      this.conditionLabel.setColor('#ffaa00');
    }

    // Refresh all cards
    this.skinCards.forEach((c, idx) => {
      this.renderSkinCard(c, SKINS[idx], 160, 150);
    });
  }
}
