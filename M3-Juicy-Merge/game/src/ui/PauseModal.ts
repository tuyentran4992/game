import Phaser from 'phaser';
import { color, z, dur, radius } from '../tokens';
import { drawButton } from '../ui';
import { ctx } from '../context';
import { sdk } from '../sdk-instance';

export interface PauseModalCallbacks {
  onResume: () => void;
  onRestart: () => void;
  onHome: () => void;
}

export class PauseModal {
  private scene: Phaser.Scene;
  private root: Phaser.GameObjects.Container;
  private callbacks: PauseModalCallbacks;
  private soundBtnTxt!: Phaser.GameObjects.Text;
  private isClosing = false;

  constructor(scene: Phaser.Scene, callbacks: PauseModalCallbacks) {
    this.scene = scene;
    this.callbacks = callbacks;
    const { width, height } = scene.scale;

    // 1. Root container on top HUD / Modal layer
    this.root = scene.add.container(0, 0).setDepth(z.panel + 20);

    // 2. Dim background (intercepts touches)
    const backdrop = scene.add.graphics();
    backdrop.fillStyle(0x0F172A, 0.72);
    backdrop.fillRect(0, 0, width, height);
    backdrop.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, width, height),
      Phaser.Geom.Rectangle.Contains
    );
    backdrop.on('pointerdown', () => this.resume());
    this.root.add(backdrop);

    // 3. Panel Container
    const pw = Math.min(480, width - 40);
    const ph = 560;
    const panel = scene.add.container(width / 2, height / 2);
    this.root.add(panel);

    // Drop shadow
    const g = scene.add.graphics();
    g.fillStyle(0x000000, 0.32);
    g.fillRoundedRect(-pw / 2, -ph / 2 + 8, pw, ph, 28);

    // White Card Body
    g.fillStyle(0xFFFFFF, 0.99);
    g.fillRoundedRect(-pw / 2, -ph / 2, pw, ph, 28);

    // Golden Border
    g.lineStyle(3.5, 0xF59E0B, 1);
    g.strokeRoundedRect(-pw / 2, -ph / 2, pw, ph, 28);

    // Top Header Banner
    const headerH = 64;
    g.fillStyle(0xFEF3C7, 1);
    g.fillRoundedRect(-pw / 2 + 14, -ph / 2 + 14, pw - 28, headerH, 18);
    g.lineStyle(1.5, 0xF59E0B, 0.6);
    g.strokeRoundedRect(-pw / 2 + 14, -ph / 2 + 14, pw - 28, headerH, 18);
    panel.add(g);

    // Title
    const title = scene.add.text(0, -ph / 2 + 46, '⏸️ GAME PAUSED', {
      fontFamily: 'sans-serif',
      fontSize: '22px',
      fontStyle: 'bold',
      color: '#92400E',
    }).setOrigin(0.5).setStroke('#FFFFFF', 4);
    panel.add(title);

    // Close Button (✕)
    const closeBtnBg = scene.add.graphics();
    closeBtnBg.fillStyle(0xFF4757, 1);
    closeBtnBg.fillCircle(pw / 2 - 36, -ph / 2 + 46, 17);
    closeBtnBg.lineStyle(2, 0xFFFFFF, 1);
    closeBtnBg.strokeCircle(pw / 2 - 36, -ph / 2 + 46, 17);

    const closeBtnTxt = scene.add.text(pw / 2 - 36, -ph / 2 + 46, '✕', {
      fontFamily: 'sans-serif',
      fontSize: '15px',
      fontStyle: 'bold',
      color: '#FFFFFF',
    }).setOrigin(0.5);

    const closeHit = scene.add.zone(pw / 2 - 36, -ph / 2 + 46, 42, 42)
      .setInteractive({ useHandCursor: true });
    closeHit.on('pointerdown', () => this.resume());
    panel.add([closeBtnBg, closeBtnTxt, closeHit]);

    // 4. Mini Stats Box (Score & Best Score)
    const statsBoxW = pw - 48;
    const statsBoxH = 74;
    const statsY = -ph / 2 + 135;
    const statsG = scene.add.graphics();
    statsG.fillStyle(0xF8FAFC, 1);
    statsG.fillRoundedRect(-statsBoxW / 2, statsY - statsBoxH / 2, statsBoxW, statsBoxH, 16);
    statsG.lineStyle(1.5, 0xE2E8F0, 1);
    statsG.strokeRoundedRect(-statsBoxW / 2, statsY - statsBoxH / 2, statsBoxW, statsBoxH, 16);
    panel.add(statsG);

    const curScore = ctx.engine.state.score;
    const bestScore = Math.max(ctx.engine.state.bestScore, curScore);

    const scoreNum = scene.add.text(-statsBoxW / 4, statsY - 10, `${curScore.toLocaleString()}`, {
      fontFamily: 'sans-serif',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#0284C7',
    }).setOrigin(0.5);

    const scoreLbl = scene.add.text(-statsBoxW / 4, statsY + 14, '💎 CURRENT', {
      fontFamily: 'sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#64748B',
    }).setOrigin(0.5);

    const bestNum = scene.add.text(statsBoxW / 4, statsY - 10, `${bestScore.toLocaleString()}`, {
      fontFamily: 'sans-serif',
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#B45309',
    }).setOrigin(0.5);

    const bestLbl = scene.add.text(statsBoxW / 4, statsY + 14, '🏆 BEST SCORE', {
      fontFamily: 'sans-serif',
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#64748B',
    }).setOrigin(0.5);

    panel.add([scoreNum, scoreLbl, bestNum, bestLbl]);

    // 5. Sound / Music Toggle Button
    const isMuted = scene.sound.mute;
    const soundBtnW = statsBoxW;
    const soundBtnH = 46;
    const soundY = -ph / 2 + 208;

    const soundContainer = scene.add.container(0, soundY);
    const soundBg = scene.add.graphics();
    soundBg.fillStyle(0xF1F5F9, 1);
    soundBg.fillRoundedRect(-soundBtnW / 2, -soundBtnH / 2, soundBtnW, soundBtnH, 12);
    soundBg.lineStyle(1.5, 0xCBD5E1, 1);
    soundBg.strokeRoundedRect(-soundBtnW / 2, -soundBtnH / 2, soundBtnW, soundBtnH, 12);
    soundContainer.add(soundBg);

    this.soundBtnTxt = scene.add.text(
      0, 0,
      isMuted ? '🔇 Sound & Music: MUTED' : '🔊 Sound & Music: ON',
      {
        fontFamily: 'sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        color: isMuted ? '#EF4444' : '#059669',
      }
    ).setOrigin(0.5);
    soundContainer.add(this.soundBtnTxt);

    soundContainer.setInteractive(
      new Phaser.Geom.Rectangle(-soundBtnW / 2, -soundBtnH / 2, soundBtnW, soundBtnH),
      Phaser.Geom.Rectangle.Contains
    );
    if (soundContainer.input) soundContainer.input.cursor = 'pointer';

    soundContainer.on('pointerdown', () => {
      scene.sound.mute = !scene.sound.mute;
      const nowMuted = scene.sound.mute;
      this.soundBtnTxt.setText(nowMuted ? '🔇 Sound & Music: MUTED' : '🔊 Sound & Music: ON');
      this.soundBtnTxt.setColor(nowMuted ? '#EF4444' : '#059669');
    });
    panel.add(soundContainer);

    // 6. Action Buttons: Resume, Restart, Main Menu
    const btnW = statsBoxW;
    const btnH = 58;

    // A. Resume Button (Pink Candy Primary)
    const { container: resumeBtn } = drawButton(scene, 0, -ph / 2 + 285, 'RESUME GAME', {
      variant: 'primary',
      icon: '▶️',
      width: btnW,
      height: btnH,
      fontSize: 18,
    });
    panel.add(resumeBtn);
    resumeBtn.on('pointerdown', () => this.resume());

    // B. Restart Button (Amber)
    const { container: restartBtn } = drawButton(scene, 0, -ph / 2 + 365, 'RESTART GAME', {
      variant: 'amber',
      icon: '🔄',
      width: btnW,
      height: btnH,
      fontSize: 18,
    });
    panel.add(restartBtn);
    restartBtn.on('pointerdown', () => this.restart());

    // C. Main Menu Button (Ghost)
    const { container: homeBtn } = drawButton(scene, 0, -ph / 2 + 445, 'MAIN MENU', {
      variant: 'ghost',
      icon: '🏠',
      width: btnW,
      height: 52,
      fontSize: 17,
    });
    panel.add(homeBtn);
    homeBtn.on('pointerdown', () => this.home());

    // Entrance Animation
    panel.setScale(0.85).setAlpha(0);
    scene.tweens.add({
      targets: panel,
      scale: 1,
      alpha: 1,
      duration: dur.base,
      ease: 'Back.easeOut',
    });
  }

  public resume(): void {
    if (this.isClosing) return;
    this.isClosing = true;
    this.scene.tweens.add({
      targets: this.root,
      alpha: 0,
      scale: 0.9,
      duration: dur.fast,
      ease: 'Back.easeIn',
      onComplete: () => {
        this.destroy();
        this.callbacks.onResume();
      },
    });
  }

  public restart(): void {
    if (this.isClosing) return;
    this.isClosing = true;
    this.destroy();
    this.callbacks.onRestart();
  }

  public home(): void {
    if (this.isClosing) return;
    this.isClosing = true;
    this.destroy();
    this.callbacks.onHome();
  }

  public destroy(): void {
    if (this.root && this.root.active) {
      this.root.destroy();
    }
  }
}
