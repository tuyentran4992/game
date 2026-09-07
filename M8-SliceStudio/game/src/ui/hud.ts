// Slice Studio — ui/hud.ts (Tier B, thin Phaser UI)
import * as Phaser from 'phaser';
import type { Theme } from '../level/levels';
import type { Synth } from '../audio/synth';
import { COPY_EN } from '../config/copy-en';

export class Hud {
  private scene: Phaser.Scene;
  private theme: Theme;
  private levelText: Phaser.GameObjects.Text;
  private flavorText: Phaser.GameObjects.Text;
  private hintText: Phaser.GameObjects.Text;
  private streakText: Phaser.GameObjects.Text;
  private streakChip: Phaser.GameObjects.Rectangle;
  private barBg: Phaser.GameObjects.Rectangle;
  private barFill: Phaser.GameObjects.Rectangle;
  private ticks: Phaser.GameObjects.Rectangle[] = [];
  private targetText: Phaser.GameObjects.Text;
  private muteBtn: Phaser.GameObjects.Text;
  private retryBtn: Phaser.GameObjects.Text;
  private skipBtn: Phaser.GameObjects.Text | null = null;
  private levelNo = 1;

  constructor(scene: Phaser.Scene, theme: Theme, level: { id: number; name: string; thresholds: [number, number, number]; flavor: string }, synth: Synth, onRetry: () => void, onSkip: () => void) {
    this.scene = scene;
    this.theme = theme;
    this.levelNo = level.id;

    // level counter góc trên trái — luôn thấy (progression visible, trục 4)
    this.levelText = scene.add.text(28, 24, this.levelLabel(level.id), {
      fontFamily: 'Arial', fontSize: '30px', color: '#ffffff', fontStyle: 'bold',
    }).setAlpha(0.95).setDepth(50);

    // flavor line (data hiển thị S2) — 22px, mờ, dưới counter
    this.flavorText = scene.add.text(28, 60, level.flavor, {
      fontFamily: 'Arial', fontSize: '22px', color: '#ffffff',
    }).setAlpha(0.55).setDepth(50);

    this.hintText = scene.add.text(360, 950, '', {
      fontFamily: 'Arial', fontSize: '30px', color: '#ffffff', fontStyle: 'bold',
      backgroundColor: '#00000066', padding: { x: 16, y: 8 },
    }).setOrigin(0.5).setAlpha(0).setDepth(55);

    // streak chip nền mờ góc trên phải (dưới mute) — đọc <=0.3s liếc
    this.streakChip = scene.add.rectangle(660, 84, 150, 34, 0x000000, 0.35).setOrigin(0.5).setDepth(49).setVisible(false);
    this.streakText = scene.add.text(660, 84, '', {
      fontFamily: 'Arial', fontSize: '26px', color: '#a5f3fc', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(50);

    // progress bar (bottom, under the play area)
    this.barBg = scene.add.rectangle(360, 1030, 560, 10, theme.path, 0.18).setOrigin(0.5).setDepth(50);
    this.barFill = scene.add.rectangle(80, 1030, 0, 10, theme.accent, 0.85).setOrigin(0, 0.5).setDepth(51);

    // 3 vạch mờ ngưỡng sao trên bar (t1/t2/t3) — người chơi thấy đang vượt vạch nào
    this.drawThresholdTicks(level.thresholds);

    this.targetText = scene.add.text(360, 1068, this.targetLabel(level), {
      fontFamily: 'Arial', fontSize: '22px', color: '#ffffff',
    }).setOrigin(0.5).setAlpha(0.6).setDepth(50);

    // retry (bottom-left, dưới play area)
    this.retryBtn = scene.add.text(28, 990, '↺', {
      fontFamily: 'Arial', fontSize: '44px', color: '#ffffff',
    }).setAlpha(0.6).setDepth(50).setInteractive({ useHandCursor: true });
    this.retryBtn.on('pointerdown', () => {
      synth.blip();
      onRetry();
    });

    // mute (top-right)
    this.muteBtn = scene.add.text(660, 24, '♪', {
      fontFamily: 'Arial', fontSize: '40px', color: '#ffffff',
    }).setAlpha(0.6).setDepth(50).setInteractive({ useHandCursor: true });
    this.muteBtn.on('pointerdown', () => {
      synth.muted = !synth.muted;
      this.muteBtn.setText(synth.muted ? '✕' : '♪');
      this.muteBtn.setAlpha(synth.muted ? 0.3 : 0.6);
    });

    // debug skip (standalone build only — registry flag set by main.ts)
    if (scene.registry.get('standalone') === true) {
      this.skipBtn = scene.add.text(620, 990, COPY_EN.skip, {
        fontFamily: 'Arial', fontSize: '28px', color: '#fbbf24',
      }).setAlpha(0.7).setDepth(50).setInteractive({ useHandCursor: true });
      this.skipBtn.on('pointerdown', onSkip);
    }
  }

  private levelLabel(id: number): string {
    return `${COPY_EN.level} ${id}/12`;
  }

  private targetLabel(level: { thresholds: [number, number, number] }): string {
    return `★★★ ${COPY_EN.starsAt} ${level.thresholds[2]}%`;
  }

  /** 3 vạch mờ tại t1/t2/t3 trên progress bar (x=80..640 map pct 0..100). */
  private drawThresholdTicks(thresholds: [number, number, number]): void {
    for (const old of this.ticks) old.destroy();
    this.ticks = [];
    for (const t of thresholds) {
      const x = 80 + 560 * Phaser.Math.Clamp(t / 100, 0, 1);
      const tick = this.scene.add.rectangle(x, 1024, 4, 22, 0xffffff, 0.35).setOrigin(0.5).setDepth(52);
      this.ticks.push(tick);
    }
  }

  setStreak(n: number): void {
    this.streakText.setText(n > 0 ? `${COPY_EN.ghostChip}${n}` : '');
    this.streakChip.setVisible(n > 0);
  }

  setProgress(p: number): void {
    const w = 560 * Phaser.Math.Clamp(p, 0, 1);
    this.barFill.width = w;
  }

  flashHint(msg: string, ms = 1200): void {
    this.hintText.setText(msg);
    this.hintText.setAlpha(1);
    this.scene.time.delayedCall(ms, () => this.hintText.setAlpha(0));
  }

  retint(theme: Theme, level: { id: number; name: string; thresholds: [number, number, number]; flavor: string }): void {
    this.theme = theme;
    this.levelNo = level.id;
    this.levelText.setText(this.levelLabel(level.id));
    this.flavorText.setText(level.flavor);
    this.targetText.setText(this.targetLabel(level));
    this.barBg.setFillStyle(theme.path, 0.18);
    this.barFill.setFillStyle(theme.accent, 0.85);
    this.drawThresholdTicks(level.thresholds);
    this.setProgress(0);
  }
}
