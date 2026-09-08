// GameScene — THIN glue: input + render calls + system tick. No game rules here (TB-05).
import Phaser from 'phaser';
import { createGame, startDive, applyContinue } from '../core/rules.ts';
import { applyDiveTick } from '../core/tick.ts';
import type { GameState } from '../core/types.ts';
import { WORLD_H, SURFACE_Y } from '../data/world.ts';
import { loadBest, saveBest, PlaygamaBridge } from '../bridge/playgama.ts';
import { WorldLayer } from '../render/worldRender.ts';
import { FishLayer } from '../render/fishRender.ts';
import { LineRenderer } from '../render/lineRender.ts';
import { Hud } from '../render/hud.ts';
import { Overlays } from '../ui/overlays.ts';
import { Juice } from '../fx/juice.ts';
import { sfx } from '../fx/audio.ts';
import { publishTestIds } from '../ui/testids.ts';

const WORLD_TALL = 1300;
const FIXED_DT = 1 / 60;

export class GameScene extends Phaser.Scene {
  private state!: GameState;
  private bridge = new PlaygamaBridge();
  private world!: WorldLayer;
  private fishLayer!: FishLayer;
  private lineR!: LineRenderer;
  private hud!: Hud;
  private overlays!: Overlays;
  private juice!: Juice;
  private holding = false;
  private accumulator = 0;
  private bestScore = 0;
  private debugSeed!: Phaser.GameObjects.Text;

  constructor() {
    super('Game');
  }

  create(): void {
    this.bestScore = loadBest();
    this.state = createGame(1); // default seed; ?debug=1 lets QA set one
    this.bridge.ready();

    this.world = new WorldLayer(this);
    this.fishLayer = new FishLayer(this);
    this.fishLayer.setBoat(this.world.boat);
    this.fishLayer.createShark();
    this.lineR = new LineRenderer(this);
    this.hud = new Hud(this);
    this.overlays = new Overlays(this, this.bestScore);
    this.juice = new Juice(this);
    this.debugSeed = this.add
      .text(4, WORLD_H - 16, '', { fontFamily: 'sans-serif', fontSize: '10px', color: '#8fd3ff' })
      .setScrollFactor(0)
      .setDepth(50);

    this.cameras.main.setBounds(0, 0, 480, WORLD_TALL);

    // one-finger input (SPEC §3)
    this.input.on('pointerdown', () => {
      this.holding = true;
      sfx.play('reel');
    });
    this.input.on('pointerup', () => {
      this.holding = false;
    });

    // UI wiring
    this.overlays.onStart = () => this.beginDive();
    this.overlays.onRetry = () => this.resetGame();
    this.overlays.onContinue = () => {
      if (this.state.phase !== 'lose') return;
      this.bridge.showRewarded(() => applyContinue(this.state));
    };
    this.hud.onSonarPress = () => {
      if (this.state.sonarCharges > 0 && this.state.phase === 'dive') {
        this.state.sonarCharges -= 1;
        this.state.sonarTimer = 4;
        this.juice.sonarRing(this.state.hookX, this.state.hookY);
      }
    };

    const url = new URL(window.location.href);
    if (url.searchParams.get('debug') === '1') {
      this.debugSeed.setText(`seed ${this.state.seed} (?debug=1)`);
    }
  }

  private beginDive(): void {
    if (this.state.hookMode !== 'idle' || this.state.diveCount > 0) {
      if (this.state.money < 150 && this.state.diveCount > 0) return;
    }
    startDive(this.state);
    this.bridge.gameplayStart();
  }

  private resetGame(): void {
    this.fishLayer.destroy();
    this.world.boat.destroy();
    this.state = createGame(1);
    this.fishLayer = new FishLayer(this);
    this.fishLayer.setBoat(this.world.boat);
    this.fishLayer.createShark();
    this.holding = false;
  }

  override update(_time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs / 1000, 0.1);
    const s = this.state;
    const timeS = s.sessionTime;

    // fixed-step logic
    this.accumulator += dt;
    while (this.accumulator >= FIXED_DT && s.phase === 'dive') {
      const before = s.events.length;
      applyDiveTick(s, FIXED_DT, { holding: this.holding });
      this.consumeEvents(s.events.slice(before));
      this.accumulator -= FIXED_DT;
    }
    if (s.phase !== 'dive') this.accumulator = 0;

    // render sync
    this.fishLayer.sync(s);
    this.world.syncPickups(s);
    this.fishLayer.update(s, timeS + this.accumulator);
    this.world.updateBoat(s, timeS + this.accumulator);
    this.world.updateHook(s, timeS + this.accumulator, s.doubleHook);
    const rod = this.world.hookAnchor;
    this.lineR.update(s, rod.x, rod.y, timeS + this.accumulator);
    this.world.drawWaves(timeS + this.accumulator);
    this.hud.update(s);
    this.overlays.update(s, dt, this.bestScore, s.sessionTime);

    // camera follows hook, clamped to keep the boat visible near the surface
    const targetScroll = Math.max(0, Math.min(WORLD_TALL - WORLD_H, s.hookY - 340));
    this.cameras.main.scrollY += (targetScroll - this.cameras.main.scrollY) * Math.min(1, dt * 6);

    publishTestIds({
      ...this.hud.testids,
      ...this.overlays.testids,
      'debug-seed': this.debugSeed.text || '0',
    });
    if (s.phase === 'win' && s.rank === null) this.bridge.sendScore(0);
  }

  private consumeEvents(events: { type: string; value?: number; text?: string }[]): void {
    const s = this.state;
    this.juice.handleEvents(s, events, s.hookX, s.hookY);
    for (const e of events) {
      if (e.type === 'hint-control') this.overlays.showHint(0);
      if (e.type === 'hint-tension') this.overlays.showHint(1);
      if (e.type === 'hint-air') this.overlays.showHint(2);
      if (e.type === 'surface' && (e.value ?? 0) > 0) this.overlays.showResult(e.value ?? 0);
      if (e.type === 'win') this.finishGame(true);
      if (e.type === 'lose') this.finishGame(false);
      if (e.type === 'whale-hook') sfx.play('alarm');
    }
  }

  private finishGame(win: boolean): void {
    this.bridge.gameplayStop();
    const score = win ? 400 + Math.max(0, Math.floor(this.state.money)) : 0;
    this.bridge.sendScore(score);
    if (score > 0) {
      this.bestScore = Math.max(this.bestScore, score);
      saveBest(this.bestScore);
    }
    if (win) {
      this.juice.splashAt(this.state.hookX, SURFACE_Y);
      this.cameras.main.shake(500, 0.004);
    }
  }
}
