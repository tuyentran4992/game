// Overlays: title (+ interactive demo) / win / lose / result popup / onboarding
// hints (DESIGN-SPEC §4, SPEC §7, Stage C "3-second self-teaching opening").
import Phaser from 'phaser';
import type { GameState } from '../core/types.ts';
import { TitleDemo } from './titleDemo.ts';

const UI = { font: 'sans-serif', stroke: '#1B2A41' } as const;

export class Overlays {
  private scene: Phaser.Scene;
  private demo: TitleDemo;
  titleC!: Phaser.GameObjects.Container;
  winC!: Phaser.GameObjects.Container;
  loseC!: Phaser.GameObjects.Container;
  private rankText!: Phaser.GameObjects.Text;
  private winStats!: Phaser.GameObjects.Text;
  private loseText!: Phaser.GameObjects.Text;
  private continueBtn!: Phaser.GameObjects.Container;
  private resultC!: Phaser.GameObjects.Container;
  private resultText!: Phaser.GameObjects.Text;
  private resultTimer = 0;
  private hints: Phaser.GameObjects.Text[] = [];
  private hintTimers: number[] = [0, 0, 0];
  onStart: (() => void) | null = null;
  onRetry: (() => void) | null = null;
  onContinue: (() => void) | null = null;

  constructor(scene: Phaser.Scene, best: number, hookAnchor: () => { x: number; y: number }) {
    this.scene = scene;
    this.demo = new TitleDemo(scene, hookAnchor);
    this.buildTitle(best);
    this.buildWin();
    this.buildLose();
    this.buildResult();
  }

  // Buttons are visual only — taps are routed by Overlays.routeTap from the scene-level
  // pointer handler (container hitArea proved unreliable for negative-coord rects).
  private makeButton(x: number, y: number, label: string, color = 0xffd166, fontSize = 26): Phaser.GameObjects.Container {
    const c = this.scene.add.container(x, y);
    const bg = this.scene.add.rectangle(0, 0, 220, 64, color).setStrokeStyle(4, 0x1b2a41);
    const t = this.scene.add
      .text(0, 0, label, { fontFamily: UI.font, fontSize: `${fontSize}px`, color: '#1B2A41' })
      .setOrigin(0.5);
    c.add([bg, t]);
    return c;
  }

  /**
   * Scene-level tap router (screen coords = pt.position, not camera-scrolled world).
   * Zones are 260x90 (>= the 260x80 thumb minimum) centered on the REAL button rects
   * (220x64) derived from the builders below — keep in sync when moving buttons:
   *   PLAY        titleC(240,427) + local(0, 30)  -> (240, 457)
   *   PLAY AGAIN  winC(240,427)   + local(0, 120) -> (240, 547)
   *   REVIVE      loseC(240,427)  + local(0, 40)  -> (240, 467)
   *   TRY AGAIN   loseC(240,427)  + local(0, 130) -> (240, 557)
   */
  routeTap(x: number, y: number, phase: string, usedContinue: boolean): 'start' | 'retry' | 'continue' | null {
    const hit = (cx: number, cy: number) => Math.abs(x - cx) <= 130 && Math.abs(y - cy) <= 45;
    if (phase === 'title' && hit(240, 457)) return 'start';
    if (phase === 'win' && hit(240, 547)) return 'retry';
    if (phase === 'lose') {
      if (!usedContinue && hit(240, 467)) return 'continue';
      if (hit(240, 557)) return 'retry';
    }
    return null;
  }

  private buildTitle(best: number): void {
    const s = this.scene;
    this.titleC = s.add.container(240, 427).setScrollFactor(0).setDepth(40);
    const logo = s.add
      .text(0, -140, 'DEEP CAST', { fontFamily: UI.font, fontSize: '64px', color: '#FFD166', stroke: UI.stroke, strokeThickness: 8 })
      .setOrigin(0.5);
    const sub = s.add
      .text(0, -70, 'Catch the Blue Whale. Come back rich.', { fontFamily: UI.font, fontSize: '16px', color: '#ffffff', stroke: UI.stroke, strokeThickness: 4 })
      .setOrigin(0.5);
    // Stage C: the label teaches the verb pair the demo is acting out below
    const play = this.makeButton(0, 30, 'HOLD & RELEASE', 0xffd166, 20);
    const bestT = s.add
      .text(0, 110, `BEST: $${best}`, { fontFamily: UI.font, fontSize: '16px', color: '#FFE66D', stroke: UI.stroke, strokeThickness: 3 })
      .setOrigin(0.5);
    this.titleC.add([logo, sub, play, bestT]);
    s.tweens.add({ targets: logo, y: '-=10', duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }

  private buildWin(): void {
    const s = this.scene;
    this.winC = s.add.container(240, 427).setScrollFactor(0).setDepth(41).setVisible(false);
    const bg = s.add.rectangle(0, 0, 480, 854, 0x041128, 0.82);
    const headline = s.add
      .text(0, -230, 'WHALE LANDED!', { fontFamily: UI.font, fontSize: '44px', color: '#FFD166', stroke: UI.stroke, strokeThickness: 7 })
      .setOrigin(0.5);
    this.rankText = s.add
      .text(0, -120, 'S', { fontFamily: UI.font, fontSize: '96px', color: '#4ECDC4', stroke: UI.stroke, strokeThickness: 9 })
      .setOrigin(0.5);
    this.winStats = s.add
      .text(0, -10, '', { fontFamily: UI.font, fontSize: '18px', color: '#ffffff', stroke: UI.stroke, strokeThickness: 3, align: 'center' })
      .setOrigin(0.5);
    const retry = this.makeButton(0, 120, 'PLAY AGAIN');
    this.winC.add([bg, headline, this.rankText, this.winStats, retry]);
  }

  private buildLose(): void {
    const s = this.scene;
    this.loseC = s.add.container(240, 427).setScrollFactor(0).setDepth(41).setVisible(false);
    const bg = s.add.rectangle(0, 0, 480, 854, 0x041128, 0.82);
    const headline = s.add
      .text(0, -190, 'OUT OF SUPPLIES', { fontFamily: UI.font, fontSize: '34px', color: '#E71D36', stroke: UI.stroke, strokeThickness: 6 })
      .setOrigin(0.5);
    this.loseText = s.add
      .text(0, -100, '', { fontFamily: UI.font, fontSize: '18px', color: '#ffffff', stroke: UI.stroke, strokeThickness: 3, align: 'center' })
      .setOrigin(0.5);
    this.continueBtn = this.makeButton(0, 40, 'WATCH AD: REVIVE', 0x4ecdc4);
    const retry = this.makeButton(0, 130, 'TRY AGAIN');
    this.loseC.add([bg, headline, this.loseText, this.continueBtn, retry]);
  }

  private buildResult(): void {
    const s = this.scene;
    this.resultC = s.add.container(240, 150).setScrollFactor(0).setDepth(39).setVisible(false);
    const bg = s.add.rectangle(0, 0, 320, 110, 0x1b2a41, 0.92).setStrokeStyle(3, 0xffd166);
    this.resultText = s.add
      .text(0, 0, '', { fontFamily: UI.font, fontSize: '16px', color: '#FFE66D', stroke: UI.stroke, strokeThickness: 3, align: 'center' })
      .setOrigin(0.5);
    this.resultC.add([bg, this.resultText]);
  }

  showResult(gains: number): void {
    this.resultText.setText(`CAUGHT!  +$${Math.round(gains)}`);
    this.resultC.setVisible(true).setAlpha(1);
    this.resultTimer = 1.6;
  }

  showHint(index: 0 | 1 | 2): void {
    if (this.hints[index] && this.hints[index]!.alpha > 0) return;
    const texts = [
      'Hold to descend, release to reel up',
      'Fish thrashing! HOLD to give line — wait it out!',
      'Low air — head up now!',
    ];
    const ys = [620, 560, 620];
    if (!this.hints[index]) {
      this.hints[index] = this.scene.add
        .text(240, ys[index]!, texts[index]!, {
          fontFamily: UI.font, fontSize: '17px', color: '#ffffff', stroke: UI.stroke, strokeThickness: 4,
          backgroundColor: '#1B2A41CC', padding: { x: 10, y: 6 },
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(38);
    }
    this.hints[index]!.setAlpha(1).setVisible(true);
    this.hintTimers[index] = 3.5;
  }

  update(state: GameState, dt: number, sessionBestScore: number, sessionTimeS: number): void {
    const onTitle = state.phase === 'title';
    this.titleC.setVisible(onTitle);
    // update() runs every frame: its !shown branch hides the demo objects when the
    // dive starts (setVisible alone would leave the ghost hand/caption on screen)
    this.demo.setVisible(onTitle);
    this.demo.update(dt);
    this.winC.setVisible(state.phase === 'win');
    this.loseC.setVisible(state.phase === 'lose');
    this.continueBtn.setVisible(!state.usedContinue && state.phase === 'lose');
    if (state.phase === 'win') {
      this.rankText.setText(state.rank ?? 'B');
      this.winStats.setText(`MONEY: $${Math.max(0, Math.floor(state.money))}   TIME: ${sessionTimeS.toFixed(0)}s\nBEST: $${sessionBestScore}`);
    }
    if (state.phase === 'lose') {
      this.loseText.setText(`${state.loseReason ?? ''}\nDeepest: ${state.deepestM}m   Money: $${Math.max(0, Math.floor(state.money))}`);
    }
    if (this.resultTimer > 0) {
      this.resultTimer -= dt;
      if (this.resultTimer <= 0) this.resultC.setVisible(false);
    }
    for (let i = 0; i < 3; i++) {
      if (this.hintTimers[i]! > 0 && this.hints[i]) {
        this.hintTimers[i]! -= dt;
        if (this.hintTimers[i]! <= 0) this.hints[i]!.setVisible(false);
      }
    }
  }

  get testids(): Record<string, string> {
    return {
      'screen-title': this.titleC.visible ? '1' : '0',
      'screen-win': this.winC.visible ? '1' : '0',
      'screen-lose': this.loseC.visible ? '1' : '0',
      'btn-retry': this.winC.visible || this.loseC.visible ? '1' : '0',
      'rank-badge': this.rankText.text,
      'popup-result': this.resultC.visible ? this.resultText.text : '0',
    };
  }
}
