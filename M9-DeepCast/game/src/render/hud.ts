// HUD: 3 gauges (air/tension/money) + hearts + depth meter + sonar button (DESIGN-SPEC §1, §4).
import Phaser from 'phaser';
import type { GameState } from '../core/types.ts';
import { AIR_MAX, LINE_LIMIT, depthPxToM } from '../data/world.ts';

const AIR_COLOR = 0x4ecdc4;
const tensionColor = (t: number): number => (t > 80 ? 0xe71d36 : t > 55 ? 0xff9f1c : 0xffd166);

export class Hud {
  private scene: Phaser.Scene;
  private airFill!: Phaser.GameObjects.Rectangle;
  private tenFill!: Phaser.GameObjects.Rectangle;
  private moneyText!: Phaser.GameObjects.Text;
  private depthText!: Phaser.GameObjects.Text;
  private heartsText!: Phaser.GameObjects.Text;
  private sonarBtn!: Phaser.GameObjects.Container;
  private sonarChargesText!: Phaser.GameObjects.Text;
  onSonarPress: (() => void) | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const cam = scene.cameras.main;
    // scrollFactor 0 = fixed to the 480x854 viewport
    this.buildAirBar();
    this.buildTensionBar();
    this.buildRightSide();
    this.buildSonarButton();
    void cam;
  }

  private gaugeRect(x: number, y: number, w: number, h: number): void {
    this.scene.add.rectangle(x, y, w + 4, h + 4, 0x1b2a41).setScrollFactor(0).setDepth(20);
  }

  private buildAirBar(): void {
    this.gaugeRect(74, 26, 150, 16);
    this.scene.add.rectangle(74, 26, 150, 16, 0xffffff).setScrollFactor(0).setDepth(21);
    this.airFill = this.scene.add.rectangle(4, 26, 0, 12, AIR_COLOR).setOrigin(0, 0.5).setScrollFactor(0).setDepth(22);
    this.scene.add
      .text(4, 18, 'AIR', { fontFamily: 'sans-serif', fontSize: '11px', color: '#ffffff', stroke: '#1B2A41', strokeThickness: 3 })
      .setScrollFactor(0)
      .setDepth(23);
  }

  private buildTensionBar(): void {
    this.gaugeRect(74, 52, 150, 16);
    this.scene.add.rectangle(74, 52, 150, 16, 0xffffff).setScrollFactor(0).setDepth(21);
    this.tenFill = this.scene.add.rectangle(4, 52, 0, 12, 0xffd166).setOrigin(0, 0.5).setScrollFactor(0).setDepth(22);
    this.scene.add
      .text(4, 44, 'LINE', { fontFamily: 'sans-serif', fontSize: '11px', color: '#ffffff', stroke: '#1B2A41', strokeThickness: 3 })
      .setScrollFactor(0)
      .setDepth(23);
  }

  private buildRightSide(): void {
    this.moneyText = this.scene.add
      .text(476, 8, '$600', { fontFamily: 'sans-serif', fontSize: '20px', color: '#FFE66D', stroke: '#1B2A41', strokeThickness: 4 })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(23);
    this.heartsText = this.scene.add
      .text(476, 34, '♥♥♥', { fontFamily: 'sans-serif', fontSize: '18px', color: '#E71D36', stroke: '#1B2A41', strokeThickness: 3 })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(23);
    this.depthText = this.scene.add
      .text(472, 427, '0m', { fontFamily: 'sans-serif', fontSize: '16px', color: '#ffffff', stroke: '#1B2A41', strokeThickness: 4 })
      .setOrigin(1, 1)
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

  update(state: GameState): void {
    const airFrac = Math.max(0, Math.min(1, state.air / AIR_MAX));
    this.airFill.width = 150 * airFrac;
    this.airFill.fillColor = AIR_COLOR;
    const tenFrac = Math.max(0, Math.min(1, state.tension / LINE_LIMIT));
    this.tenFill.width = 150 * tenFrac;
    this.tenFill.fillColor = tensionColor(state.tension);
    this.moneyText.setText(`$${Math.max(0, Math.floor(state.money))}`);
    this.heartsText.setText('♥'.repeat(Math.max(0, state.hearts)) + '·'.repeat(Math.max(0, 3 - state.hearts)));
    this.depthText.setText(`${Math.floor(depthPxToM(state.hookY))}m`); // current depth (deepest goes on the lose screen)
    const charges = state.sonarCharges;
    this.sonarBtn.setVisible(charges > 0);
    this.sonarChargesText.setText(charges > 0 ? 'x' + charges : '');
  }

  get testids(): Record<string, string> {
    return {
      'hud-air': String(this.airFill.width),
      'hud-tension': String(this.tenFill.width),
      'hud-money': this.moneyText.text,
      'hud-depth': this.depthText.text,
      'hud-hearts': this.heartsText.text,
      'btn-sonar': this.sonarBtn.visible ? '1' : '0',
    };
  }
}
