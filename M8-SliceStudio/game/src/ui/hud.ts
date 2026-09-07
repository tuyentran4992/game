// Slice Studio — ui/hud.ts (Tier B, thin Phaser UI)
import * as Phaser from 'phaser';
import type { Theme } from '../level/levels';
import type { Synth } from '../audio/synth';

export class Hud {
  private scene: Phaser.Scene;
  private theme: Theme;
  private levelText: Phaser.GameObjects.Text;
  private hintText: Phaser.GameObjects.Text;
  private streakText: Phaser.GameObjects.Text;
  private barBg: Phaser.GameObjects.Rectangle;
  private barFill: Phaser.GameObjects.Rectangle;
  private targetText: Phaser.GameObjects.Text;
  private muteBtn: Phaser.GameObjects.Text;
  private retryBtn: Phaser.GameObjects.Text;
  private skipBtn: Phaser.GameObjects.Text | null = null;

  constructor(scene: Phaser.Scene, theme: Theme, level: { id: number; name: string; thresholds: [number, number, number] }, synth: Synth, onRetry: () => void, onSkip: () => void) {
    this.scene = scene;
    this.theme = theme;

    this.levelText = scene.add.text(28, 24, `LEVEL ${level.id} — ${level.name}`, {
      fontFamily: 'Arial', fontSize: '30px', color: '#ffffff', fontStyle: 'bold',
    }).setAlpha(0.9).setDepth(50);

    this.streakText = scene.add.text(28, 62, '', {
      fontFamily: 'Arial', fontSize: '26px', color: '#a5f3fc', fontStyle: 'bold',
    }).setDepth(50);

    this.hintText = scene.add.text(360, 950, '', {
      fontFamily: 'Arial', fontSize: '30px', color: '#ffffff', fontStyle: 'bold',
      backgroundColor: '#00000066', padding: { x: 16, y: 8 },
    }).setOrigin(0.5).setAlpha(0).setDepth(55);

    // progress bar (bottom, under the play area)
    this.barBg = scene.add.rectangle(360, 1030, 560, 10, theme.path, 0.18).setOrigin(0.5).setDepth(50);
    this.barFill = scene.add.rectangle(80, 1030, 0, 10, theme.accent, 0.85).setOrigin(0, 0.5).setDepth(51);

    this.targetText = scene.add.text(360, 1068, `★★★ at ${level.thresholds[2]}%`, {
      fontFamily: 'Arial', fontSize: '22px', color: '#ffffff',
    }).setOrigin(0.5).setAlpha(0.45).setDepth(50);

    // retry (top-left under level text)
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
      this.skipBtn = scene.add.text(620, 990, 'SKIP >>', {
        fontFamily: 'Arial', fontSize: '28px', color: '#fbbf24',
      }).setAlpha(0.7).setDepth(50).setInteractive({ useHandCursor: true });
      this.skipBtn.on('pointerdown', onSkip);
    }
  }

  setStreak(n: number): void {
    this.streakText.setText(n > 0 ? `GHOST x${n}` : '');
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

  retint(theme: Theme, level: { id: number; name: string; thresholds: [number, number, number] }): void {
    this.theme = theme;
    this.levelText.setText(`LEVEL ${level.id} — ${level.name}`);
    this.targetText.setText(`★★★ at ${level.thresholds[2]}%`);
    this.barBg.setFillStyle(theme.path, 0.18);
    this.barFill.setFillStyle(theme.accent, 0.85);
    this.setProgress(0);
  }
}
