/**
 * Neon Grid — Start Screen (v2 with Meta Progression)
 *
 * Primary hub with Play, Daily Challenge, Skins select, and Achievement tracking.
 */

import Phaser from 'phaser';
import { Button } from '@game/core/ui';
import { ParticleEmitter } from '@game/core/ui';
import { GridRenderer } from '../render/phaser-adapter';
import { soundFx } from '../audio/audio-synth';
import { saveManager } from '../logic/save-manager';
import { isDailyAvailableToday } from '../logic/daily';
import { theme, fonts, getActiveSkinPalette } from '../ui/theme';

export class StartScene extends Phaser.Scene {
  private muteBtnText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'Start' });
  }

  create(): void {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;
    const palette = getActiveSkinPalette();

    // 1. Background gradient
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x040410, 0x040410, palette.gridBg, palette.gridBg, 1);
    bg.fillRect(0, 0, this.scale.width, this.scale.height);

    // 2. Animated Ambient Floating Neon Dust Particles
    this.createAmbientDust();

    // 3. Decorative perspective grid lines
    const deco = this.add.graphics();
    deco.lineStyle(1, palette.gridColor, 0.08);
    for (let i = 0; i < 22; i++) {
      const y = i * 60;
      deco.lineBetween(0, y, this.scale.width, y);
    }
    for (let i = 0; i < 14; i++) {
      const x = i * 56;
      deco.lineBetween(x, 0, x, this.scale.height);
    }

    // Top Sound Mute Toggle Button
    const muteContainer = this.add.container(this.scale.width - 60, 50);
    const muteBg = this.add.graphics();
    muteBg.fillStyle(0x181838, 0.9);
    muteBg.fillRoundedRect(-24, -24, 48, 48, 12);
    muteBg.lineStyle(1.5, 0x303060, 0.8);
    muteBg.strokeRoundedRect(-24, -24, 48, 48, 12);
    muteContainer.add(muteBg);

    this.muteBtnText = this.add.text(0, 0, soundFx.isMuted ? '🔇' : '🔊', {
      fontSize: '22px',
    }).setOrigin(0.5);
    muteContainer.add(this.muteBtnText);

    const muteHit = this.add.rectangle(0, 0, 60, 60, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    muteContainer.add(muteHit);

    muteHit.on('pointerdown', (_pointer: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
      event?.stopPropagation?.();
      const isMuted = soundFx.toggleMute();
      this.muteBtnText.setText(isMuted ? '🔇' : '🔊');
      if (!isMuted) {
        soundFx.playButtonClick();
      }

      this.tweens.add({
        targets: muteContainer,
        scale: 0.88,
        duration: 60,
        yoyo: true,
        ease: 'Quad.easeInOut',
      });
    });

    // Animated Deco Floating Blocks
    this.createFloatingBlocks(cx, cy - 290);

    // Main Logo Title: Glow shadow + crisp text
    const titleGlow = this.add.text(cx, cy - 190, 'NEON GRID', {
      fontFamily: fonts.display.family,
      fontSize: '58px',
      fontStyle: '800',
      color: `#${palette.gridColor.toString(16).padStart(6, '0')}`,
      stroke: `#${palette.gridColor.toString(16).padStart(6, '0')}`,
      strokeThickness: 12,
    }).setOrigin(0.5).setAlpha(0.35);

    const title = this.add.text(cx, cy - 190, 'NEON GRID', {
      fontFamily: fonts.display.family,
      fontSize: '58px',
      fontStyle: '800',
      color: '#ffffff',
      stroke: '#080816',
      strokeThickness: 4,
    }).setOrigin(0.5);
    title.setData('testid', 'start-title');

    // Subtle gentle floating animation for title
    this.tweens.add({
      targets: [title, titleGlow],
      y: cy - 198,
      duration: 2200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Subtitle Badge
    const badge = this.add.graphics();
    badge.fillStyle(0x18183c, 0.9);
    badge.fillRoundedRect(cx - 110, cy - 130, 220, 36, 18);
    badge.lineStyle(1.5, palette.gridColor, 0.4);
    badge.strokeRoundedRect(cx - 110, cy - 130, 220, 36, 18);

    this.add.text(cx, cy - 112, 'CYBER PUZZLE', {
      fontFamily: fonts.mono.family,
      fontSize: '15px',
      fontStyle: 'bold',
      color: `#${palette.gridColor.toString(16).padStart(6, '0')}`,
      letterSpacing: 4,
    }).setOrigin(0.5);

    // ── 3 ACTION BUTTONS (PLAY, DAILY, SKINS) ─────────────────────────

    // 1. Play Button
    const playBtn = new Button(this, cx, cy - 10, {
      variant: 'primary',
      label: '▶   PLAY NOW',
      width: 290,
      height: 64,
      fontSize: 24,
      pulse: true,
      theme,
    });
    playBtn.getContainer().setData('testid', 'play-btn');

    playBtn.onClick(() => {
      soundFx.playButtonClick();
      soundFx.playPickup();
      ParticleEmitter.flash(this, 0x00f5ff, 200);
      this.cameras.main.fadeOut(200, 0, 0, 0);
      this.time.delayedCall(200, () => {
        this.scene.start('Gameplay', { isDaily: false });
      });
    });

    // 2. Daily Challenge Button
    const isDailyAvail = isDailyAvailableToday(saveManager.getData().daily);
    const dailyBtn = new Button(this, cx, cy + 70, {
      variant: 'secondary',
      label: isDailyAvail ? '📅  DAILY CHALLENGE' : '📅  DAILY (DONE ✅)',
      width: 290,
      height: 56,
      fontSize: 20,
      theme,
    });
    dailyBtn.getContainer().setData('testid', 'daily-btn');

    dailyBtn.onClick(() => {
      soundFx.playButtonClick();
      this.cameras.main.fadeOut(200, 0, 0, 0);
      this.time.delayedCall(200, () => {
        this.scene.start('Gameplay', { isDaily: true });
      });
    });

    // NEW Badge on Daily button if uncompleted
    if (isDailyAvail) {
      const newBadge = this.add.graphics();
      newBadge.fillStyle(0xff2255, 1);
      newBadge.fillRoundedRect(cx + 105, cy + 44, 46, 22, 11);
      this.add.text(cx + 128, cy + 55, 'NEW', {
        fontFamily: fonts.mono.family,
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#ffffff',
      }).setOrigin(0.5);
    }

    // 3. Skins & Themes Button
    const skinsBtn = new Button(this, cx, cy + 145, {
      variant: 'ghost',
      label: '🎨  SKINS & THEMES',
      textColor: '#00f5ff',
      width: 290,
      height: 56,
      fontSize: 20,
      theme,
    });
    skinsBtn.getContainer().setData('testid', 'skins-btn');

    skinsBtn.onClick(() => {
      soundFx.playButtonClick();
      this.cameras.main.fadeOut(200, 0, 0, 0);
      this.time.delayedCall(200, () => {
        this.scene.start('Skins');
      });
    });

    // ── STATS & PROGRESS FOOTER BAR ───────────────────────────────────
    const statsCard = this.add.graphics();
    statsCard.fillStyle(0x12122c, 0.85);
    statsCard.fillRoundedRect(cx - 180, cy + 230, 360, 54, 14);
    statsCard.lineStyle(1.5, 0x2e2e60, 0.7);
    statsCard.strokeRoundedRect(cx - 180, cy + 230, 360, 54, 14);

    const bestScore = saveManager.getBestScore();
    const achCount = saveManager.getUnlockedAchievementsCount();

    const bestText = this.add.text(cx - 85, cy + 257, `🏆 BEST: ${bestScore.toLocaleString()}`, {
      fontFamily: fonts.mono.family,
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#ffd000',
    }).setOrigin(0.5);
    bestText.setData('testid', 'best-score');

    const achText = this.add.text(cx + 90, cy + 257, `🎖️ BADGES: ${achCount}/15`, {
      fontFamily: fonts.mono.family,
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#00f5ff',
    }).setOrigin(0.5);
    achText.setData('testid', 'achievement-count');

    // Version
    const versionLabel = this.add.text(cx, this.scale.height - 35, 'v2.0 · Cyberpunk Meta Edition', {
      fontFamily: fonts.body.family,
      fontSize: '14px',
      color: '#555588',
    }).setOrigin(0.5);
    versionLabel.setData('testid', 'version-label');
  }

  private createFloatingBlocks(cx: number, cy: number): void {
    const colors = [0, 1, 2, 3, 4, 5, 6];
    const size = 36;
    const spacing = 46;
    const startX = cx - (colors.length * spacing) / 2 + size / 2;

    const blockContainers: Phaser.GameObjects.Container[] = [];

    colors.forEach((colorIdx, i) => {
      const container = this.add.container(startX + i * spacing, cy);
      const g = this.add.graphics();
      GridRenderer.drawSingleBlock(g, -size / 2, -size / 2, size, colorIdx, 0.95, 6);
      container.add(g);
      blockContainers.push(container);

      // Wave floating tween
      this.tweens.add({
        targets: container,
        y: cy + Math.sin(i * 0.9) * 18,
        duration: 1800 + i * 150,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });
  }

  private createAmbientDust(): void {
    const dustColors = [0x00f5ff, 0xff00ff, 0xffd000, 0x00ff88];
    for (let i = 0; i < 24; i++) {
      const x = Math.random() * this.scale.width;
      const y = Math.random() * this.scale.height;
      const radius = 1.5 + Math.random() * 2.5;
      const color = dustColors[Math.floor(Math.random() * dustColors.length)];
      const dot = this.add.circle(x, y, radius, color, 0.2 + Math.random() * 0.35);
      dot.setBlendMode(Phaser.BlendModes.ADD);

      this.tweens.add({
        targets: dot,
        y: y - 40 - Math.random() * 60,
        x: x + (Math.random() - 0.5) * 30,
        alpha: { from: dot.alpha, to: 0.05 },
        duration: 2500 + Math.random() * 3000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Math.random() * 2000,
      });
    }
  }
}