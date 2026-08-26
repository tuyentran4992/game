import Phaser from 'phaser';
import { color, type, radius, shadow, z, dur, fontStyle, toColor } from '../tokens';
import { drawButton } from '../ui';
import { ctx } from '../context';
import { sdk } from '../sdk-instance';

export interface PauseModalCallbacks {
  onResume: () => void;
  onRestart: () => void;
  onHome: () => void;
  onToggleAudio?: (muted: boolean) => void;
}

export class PauseModal {
  private scene: Phaser.Scene;
  private root: Phaser.GameObjects.Container;
  private callbacks: PauseModalCallbacks;
  private audioBtnText!: Phaser.GameObjects.Text;
  private isClosing = false;

  constructor(scene: Phaser.Scene, callbacks: PauseModalCallbacks) {
    this.scene = scene;
    this.callbacks = callbacks;
    this.root = this.scene.add.container(0, 0).setDepth((z.dialog ?? 100) + 10);

    this.create();
  }

  private create() {
    const { width, height } = this.scene.scale;
    const isShort = height < 560;

    // 1. Dark Backdrop (Blocks all input behind modal)
    const backdrop = this.scene.add.graphics();
    backdrop.fillStyle(0x0A0E1A, 0.82);
    backdrop.fillRect(0, 0, width, height);
    backdrop.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains);
    this.root.add(backdrop);

    // 2. Dialog Panel Dimensions
    const pw = Math.min(320, width - 32);
    const ph = Math.min(isShort ? 430 : 470, height - 30);
    const cx = width / 2;
    const cy = height / 2;

    const panelContainer = this.scene.add.container(cx, cy);
    this.root.add(panelContainer);

    // Panel Background Graphics
    const panelG = this.scene.add.graphics();
    panelG.fillStyle(toColor(color.shadow), shadow.panel.alpha);
    panelG.fillRoundedRect(-pw / 2, -ph / 2 + shadow.panel.dy, pw, ph, radius.lg);
    panelG.fillStyle(0xFFFFFF, 1);
    panelG.fillRoundedRect(-pw / 2, -ph / 2, pw, ph, radius.lg);
    panelG.lineStyle(4, toColor(color.primary), 1);
    panelG.strokeRoundedRect(-pw / 2, -ph / 2, pw, ph, radius.lg);
    panelContainer.add(panelG);

    let curY = -ph / 2 + (isShort ? 24 : 28);

    // 3. Header: "PAUSED" & Close Button
    const title = this.scene.add.text(0, curY, '⏸️ GAME PAUSED', fontStyle({ size: isShort ? '20px' : '22px', weight: '900', lh: 1 }, color.primary))
      .setOrigin(0.5);
    panelContainer.add(title);

    const closeBtn = this.scene.add.text(pw / 2 - 22, curY, '✕', fontStyle({ size: '20px', weight: '700', lh: 1 }, color.textSecondary))
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.resume());
    panelContainer.add(closeBtn);

    curY += isShort ? 36 : 42;

    // 4. Mini Stats Box (Score, Level, Fish)
    const statsBoxW = pw - 36;
    const statsBoxH = isShort ? 60 : 70;
    const statsG = this.scene.add.graphics();
    statsG.fillStyle(0xF4F6F9, 1);
    statsG.fillRoundedRect(-statsBoxW / 2, curY, statsBoxW, statsBoxH, radius.md);
    statsG.lineStyle(1.5, 0xE2E8F0, 1);
    statsG.strokeRoundedRect(-statsBoxW / 2, curY, statsBoxW, statsBoxH, radius.md);
    panelContainer.add(statsG);

    // Score item
    const statItemY = curY + statsBoxH / 2;
    const scoreVal = this.scene.add.text(-statsBoxW / 3, statItemY - 8, String(ctx.engine.score), fontStyle({ size: '18px', weight: '900', lh: 1 }, color.primary)).setOrigin(0.5);
    const scoreLbl = this.scene.add.text(-statsBoxW / 3, statItemY + 12, 'SCORE', fontStyle({ size: '10px', weight: '700', lh: 1 }, color.textSecondary)).setOrigin(0.5);

    // Level item
    const lvlVal = this.scene.add.text(0, statItemY - 8, String(ctx.engine.getLevel()), fontStyle({ size: '18px', weight: '900', lh: 1 }, color.textPrimary)).setOrigin(0.5);
    const lvlLbl = this.scene.add.text(0, statItemY + 12, 'LEVEL', fontStyle({ size: '10px', weight: '700', lh: 1 }, color.textSecondary)).setOrigin(0.5);

    // Fish item
    const fishVal = this.scene.add.text(statsBoxW / 3, statItemY - 8, `🐟 ${ctx.engine.fish}`, fontStyle({ size: '18px', weight: '900', lh: 1 }, color.warning)).setOrigin(0.5);
    const fishLbl = this.scene.add.text(statsBoxW / 3, statItemY + 12, 'FISH', fontStyle({ size: '10px', weight: '700', lh: 1 }, color.textSecondary)).setOrigin(0.5);

    panelContainer.add([scoreVal, scoreLbl, lvlVal, lvlLbl, fishVal, fishLbl]);

    curY += statsBoxH + (isShort ? 14 : 18);

    // 5. Sound / Audio Toggle Pill
    const isMuted = this.scene.sound.mute;
    const audioBtnH = isShort ? 36 : 40;
    const audioContainer = this.scene.add.container(0, curY + audioBtnH / 2);
    const audioBg = this.scene.add.graphics();
    audioBg.fillStyle(0xEDF2F7, 1);
    audioBg.fillRoundedRect(-statsBoxW / 2, -audioBtnH / 2, statsBoxW, audioBtnH, radius.md);
    audioBg.lineStyle(1.5, toColor(color.primary), 0.5);
    audioBg.strokeRoundedRect(-statsBoxW / 2, -audioBtnH / 2, statsBoxW, audioBtnH, radius.md);

    this.audioBtnText = this.scene.add.text(
      0, 0,
      isMuted ? '🔇 Sound: OFF' : '🔊 Sound: ON',
      fontStyle({ size: '14px', weight: '800', lh: 1 }, isMuted ? color.textSecondary : color.primary)
    ).setOrigin(0.5);

    audioContainer.add([audioBg, this.audioBtnText]);
    audioContainer.setSize(statsBoxW, audioBtnH).setInteractive({ useHandCursor: true });

    audioContainer.on('pointerdown', () => {
      const nowMuted = !this.scene.sound.mute;
      this.scene.sound.mute = nowMuted;
      this.audioBtnText.setText(nowMuted ? '🔇 Sound: OFF' : '🔊 Sound: ON');
      this.audioBtnText.setColor(nowMuted ? color.textSecondary : color.primary);
      this.callbacks.onToggleAudio?.(nowMuted);
    });

    panelContainer.add(audioContainer);

    curY += audioBtnH + (isShort ? 14 : 18);

    // 6. Action Buttons: Resume, Restart, Home
    const btnW = statsBoxW;
    const btnH = isShort ? 44 : 48;

    // Resume Button (Primary)
    const resumeBtn = drawButton(this.scene, 0, curY + btnH / 2, '▶️ Resume', {
      variant: 'primary',
      width: btnW,
      height: btnH,
      textType: { size: '16px', weight: '900', lh: 1 },
    });
    panelContainer.add(resumeBtn.container);
    resumeBtn.container.on('pointerdown', () => this.resume());

    curY += btnH + 10;

    // Restart Button (Ghost)
    const restartBtn = drawButton(this.scene, 0, curY + btnH / 2, '🔄 Restart', {
      variant: 'ghost',
      width: btnW,
      height: btnH,
      textType: { size: '15px', weight: '800', lh: 1 },
    });
    panelContainer.add(restartBtn.container);
    restartBtn.container.on('pointerdown', () => this.restart());

    curY += btnH + 10;

    // Main Menu Button (Ghost)
    const homeBtn = drawButton(this.scene, 0, curY + btnH / 2, '🏠 Main Menu', {
      variant: 'ghost',
      width: btnW,
      height: btnH,
      textType: { size: '15px', weight: '800', lh: 1 },
    });
    panelContainer.add(homeBtn.container);
    homeBtn.container.on('pointerdown', () => this.home());

    // 7. Pop In Animation
    panelContainer.setScale(0.85).setAlpha(0);
    this.scene.tweens.add({
      targets: panelContainer,
      scale: 1,
      alpha: 1,
      duration: dur.pop,
      ease: 'back.out',
    });
  }

  private resume() {
    if (this.isClosing) return;
    this.isClosing = true;
    this.scene.tweens.add({
      targets: this.root,
      alpha: 0,
      scale: 0.95,
      duration: 150,
      ease: 'quad.in',
      onComplete: () => {
        this.destroy();
        this.callbacks.onResume();
      },
    });
  }

  private restart() {
    if (this.isClosing) return;
    this.isClosing = true;
    this.destroy();
    this.callbacks.onRestart();
  }

  private home() {
    if (this.isClosing) return;
    this.isClosing = true;
    this.destroy();
    this.callbacks.onHome();
  }

  public destroy() {
    if (this.root && this.root.active) {
      this.root.destroy();
    }
  }
}
