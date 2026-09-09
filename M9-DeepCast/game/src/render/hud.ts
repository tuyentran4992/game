// HUD (Stage C goal legibility): AIR + TENSION gauges with labels, MONEY progress
// bar $0 -> $2,000 with the whale goal icon ("bar full = whale up"), hearts, a
// visible combo chip, the depth ruler, and the sonar button (DESIGN-SPEC §1/§4).
import Phaser from 'phaser';
import type { GameState } from '../core/types.ts';
import { AIR_MAX, LINE_LIMIT, GOAL_MONEY } from '../data/world.ts';
import { comboMult } from '../data/upgrades.ts';
import { DepthRuler } from './depthRuler.ts';

const AIR_COLOR = 0x4ecdc4;
const tensionColor = (t: number): number => (t > 80 ? 0xe71d36 : t > 55 ? 0xff9f1c : 0xffd166);
const BAR_X = 4; // gauge left edge (fills grow rightward from here)
const BAR_W = 150;
const TRACK_X = 170; // money bar geometry (right of the gauges, left of the ruler)
const TRACK_W = 258;

export class Hud {
  private scene: Phaser.Scene;
  private ruler: DepthRuler;
  private airFill!: Phaser.GameObjects.Rectangle;
  private tenFill!: Phaser.GameObjects.Rectangle;
  private moneyFill!: Phaser.GameObjects.Rectangle;
  private moneyText!: Phaser.GameObjects.Text;
  private whaleIcon!: Phaser.GameObjects.Image;
  private whaleReady!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private heartsText!: Phaser.GameObjects.Text;
  private sonarBtn!: Phaser.GameObjects.Container;
  private sonarChargesText!: Phaser.GameObjects.Text;
  private whaleLit = false;
  private whaleBaseScale = 1;
  private whalePulse: Phaser.Tweens.Tween | null = null;
  onSonarPress: (() => void) | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.buildAirBar();
    this.buildTensionBar();
    this.buildMoneyGoal();
    this.buildCombo();
    this.buildSonarButton();
    this.ruler = new DepthRuler(scene);
  }

  private gaugeLabel(x: number, y: number, str: string): void {
    this.scene.add
      .text(x, y, str, { fontFamily: 'sans-serif', fontSize: '11px', color: '#ffffff', stroke: '#1B2A41', strokeThickness: 3 })
      .setScrollFactor(0)
      .setDepth(23);
  }

  private buildAirBar(): void {
    this.scene.add.rectangle(BAR_X + 74, 26, BAR_W + 4, 16, 0x1b2a41).setScrollFactor(0).setDepth(20);
    this.scene.add.rectangle(BAR_X + 74, 26, BAR_W, 16, 0xffffff).setScrollFactor(0).setDepth(21);
    this.airFill = this.scene.add.rectangle(BAR_X, 26, 0, 12, AIR_COLOR).setOrigin(0, 0.5).setScrollFactor(0).setDepth(22);
    this.gaugeLabel(BAR_X, 18, 'AIR');
  }

  private buildTensionBar(): void {
    this.scene.add.rectangle(BAR_X + 74, 52, BAR_W + 4, 16, 0x1b2a41).setScrollFactor(0).setDepth(20);
    this.scene.add.rectangle(BAR_X + 74, 52, BAR_W, 16, 0xffffff).setScrollFactor(0).setDepth(21);
    this.tenFill = this.scene.add.rectangle(BAR_X, 52, 0, 12, 0xffd166).setOrigin(0, 0.5).setScrollFactor(0).setDepth(22);
    this.gaugeLabel(BAR_X, 44, 'TENSION');
    // hearts sit right of the tension bar, inside the bar row
    this.heartsText = this.scene.add
      .text(162, 52, '♥♥♥', { fontFamily: 'sans-serif', fontSize: '18px', color: '#E71D36', stroke: '#1B2A41', strokeThickness: 3 })
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(23);
  }

  // money progress bar: fill = money / GOAL_MONEY, whale icon lights up when full
  private buildMoneyGoal(): void {
    this.scene.add.rectangle(TRACK_X + TRACK_W / 2, 17, TRACK_W + 4, 16, 0x1b2a41).setScrollFactor(0).setDepth(20);
    this.moneyFill = this.scene.add
      .rectangle(TRACK_X + 2, 17, 0, 10, 0xffe66d)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(22);
    this.moneyText = this.scene.add
      .text(TRACK_X + TRACK_W / 2, 17, `$0 / $${GOAL_MONEY.toLocaleString('en-US')}`, {
        fontFamily: 'sans-serif', fontSize: '11px', color: '#ffffff', stroke: '#1B2A41', strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(23);
    this.whaleIcon = this.scene.add.image(TRACK_X + TRACK_W + 24, 17, 'whale').setScrollFactor(0).setDepth(22);
    this.whaleIcon.setDisplaySize(30, Math.round((30 * this.whaleIcon.height) / this.whaleIcon.width));
    this.whaleIcon.setTint(0x51606f); // dimmed until the goal is reached
    this.whaleBaseScale = this.whaleIcon.scale;
    this.whaleReady = this.scene.add
      .text(TRACK_X + TRACK_W + 24, 33, 'GOAL!', {
        fontFamily: 'sans-serif', fontSize: '9px', color: '#FFD166', stroke: '#1B2A41', strokeThickness: 3,
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(23)
      .setVisible(false);
  }

  private buildCombo(): void {
    this.comboText = this.scene.add
      .text(BAR_X, 68, '', { fontFamily: 'sans-serif', fontSize: '12px', color: '#4ECDC4', stroke: '#1B2A41', strokeThickness: 3 })
      .setScrollFactor(0)
      .setDepth(23);
  }

  private buildSonarButton(): void {
    const c = this.scene.add.container(436, 782).setScrollFactor(0).setDepth(24);
    const bg = this.scene.add.rectangle(0, 0, 72, 72, 0x1a63a0).setStrokeStyle(3, 0x1b2a41);
    const label = this.scene.add.text(0, -6, 'SONAR', { fontFamily: 'sans-serif', fontSize: '13px', color: '#ffffff' }).setOrigin(0.5);
    this.sonarChargesText = this.scene.add.text(0, 14, '', { fontFamily: 'sans-serif', fontSize: '14px', color: '#FFE66D' }).setOrigin(0.5);
    c.add([bg, label, this.sonarChargesText]);
    c.setSize(72, 72);
    this.sonarBtn = c;
  }

  /** Tap-router zone for the sonar button (screen coords, padded for thumbs). */
  sonarHit(x: number, y: number): boolean {
    return Math.abs(x - 436) <= 50 && Math.abs(y - 782) <= 50;
  }

  private updateWhaleGoal(money: number): void {
    const reached = money >= GOAL_MONEY;
    if (reached && !this.whaleLit) {
      this.whaleLit = true;
      this.whaleIcon.clearTint();
      this.whaleReady.setVisible(true);
      // target from the stored base scale — reading the live scale here would
      // ratchet the icon bigger on every lit/unlit crossing (tween remove keeps it)
      this.whalePulse = this.scene.tweens.add({
        targets: this.whaleIcon,
        scale: this.whaleBaseScale * 1.18,
        duration: 450,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut',
      });
    } else if (!reached && this.whaleLit) {
      this.whaleLit = false;
      this.whaleIcon.setTint(0x51606f);
      this.whaleReady.setVisible(false);
      this.whalePulse?.remove();
      this.whalePulse = null;
      this.whaleIcon.setScale(this.whaleBaseScale);
    }
  }

  update(state: GameState): void {
    const airFrac = Math.max(0, Math.min(1, state.air / AIR_MAX));
    this.airFill.width = BAR_W * airFrac;
    this.airFill.fillColor = AIR_COLOR;
    const tenFrac = Math.max(0, Math.min(1, state.tension / LINE_LIMIT));
    this.tenFill.width = BAR_W * tenFrac;
    this.tenFill.fillColor = tensionColor(state.tension);
    // near-snap feedback: the TENSION bar itself rattles >80 and blinks >95
    this.tenFill.x = BAR_X + (state.tension > 80 ? Math.sin(state.sessionTime * 40) * 1.5 : 0);
    this.tenFill.alpha = state.tension > 95 ? 0.7 + 0.3 * Math.sin(state.sessionTime * 25) : 1;

    const money = Math.max(0, Math.floor(state.money));
    this.moneyFill.width = TRACK_W * Math.max(0, Math.min(1, money / GOAL_MONEY));
    this.moneyText.setText(`$${money} / $${GOAL_MONEY.toLocaleString('en-US')}`);
    this.updateWhaleGoal(money);

    if (state.combo >= 1) {
      this.comboText.setText(`COMBO x${comboMult(state.combo).toFixed(2)}`).setVisible(true);
    } else {
      this.comboText.setVisible(false);
    }
    this.heartsText.setText('♥'.repeat(Math.max(0, state.hearts)) + '·'.repeat(Math.max(0, 3 - state.hearts)));
    this.ruler.update(state); // live depth marker on the right-edge rail

    const charges = state.sonarCharges;
    this.sonarBtn.setVisible(charges > 0);
    this.sonarChargesText.setText(charges > 0 ? 'x' + charges : '');
  }

  get testids(): Record<string, string> {
    return {
      'hud-air': String(this.airFill.width),
      'hud-tension': String(this.tenFill.width),
      'hud-money': this.moneyText.text,
      'hud-depth': this.ruler.depthLabel,
      'hud-hearts': this.heartsText.text,
      'btn-sonar': this.sonarBtn.visible ? '1' : '0',
    };
  }
}
