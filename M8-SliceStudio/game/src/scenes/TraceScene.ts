// Slice Studio — scenes/TraceScene.ts (Tier B, thin — all decisions from Tier A)
// The whole loop: silhouette + faint path -> trace -> release = split ->
// accuracy % -> 1-3 stars. Onboarding: no words for the first 30s.
import * as Phaser from 'phaser';
import { LEVELS, type SliceLevel } from '../level/levels';
import { NOGO_STOP_ZONE, TraceEngine } from '../core/engine';
import { resampleUniform, type Vec } from '../geom/path';
import { bakeHalves, fillPoly, flashAlongCut, sparkBurst, starPoints } from '../render/fx';
import { Synth } from '../audio/synth';
import { Hud } from '../ui/hud';
import { cutInputFromResult, gameSave } from '../sdk/save';

export class TraceScene extends Phaser.Scene {
  private engine = new TraceEngine();
  private synth = new Synth();
  private hud!: Hud;
  private levelIdx = 0;
  private level!: SliceLevel;
  private levelRoot!: Phaser.GameObjects.Container;
  private traceG!: Phaser.GameObjects.Graphics;
  private demoDot: Phaser.GameObjects.Arc | null = null;
  private demoTimer: Phaser.Time.TimerEvent | null = null;
  private awardFx: Phaser.GameObjects.Container | null = null;
  private fallers: Phaser.GameObjects.Container[] = [];
  private shakeT = 0;

  constructor() {
    super('TraceScene');
  }

  create(): void {
    this.levelIdx = 0;
    // muted state from the save (schema field read at boot; mute button lives in hud)
    const savedMuted = this.registry.get('saveMuted') as boolean | undefined;
    if (savedMuted !== undefined) this.synth.muted = savedMuted;
    this.hud = new Hud(this, LEVELS[0].theme, LEVELS[0], this.synth, () => this.retry(), () => this.nextLevel());
    this.loadLevel(0);

    // pointer input (single touch only — engine ignores extra strokes)
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.synth.ensure(); // unlock audio inside a user gesture
      const pt = { x: p.x, y: p.y };
      if (this.engine.begin(pt, this.level.path)) {
        this.clearDemo();
      }
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.isDown) this.engine.move({ x: p.x, y: p.y });
    });
    this.input.on('pointerup', () => this.onRelease());
  }

  private loadLevel(idx: number): void {
    this.levelIdx = idx;
    this.level = LEVELS[idx];
    this.engine.resetLevel();
    this.clearDemo();
    if (this.awardFx) {
      this.awardFx.destroy();
      this.awardFx = null;
    }
    for (const f of this.fallers) f.destroy();
    this.fallers = [];

    if (this.levelRoot) this.levelRoot.destroy(true);
    const t = this.level.theme;
    this.cameras.main.setBackgroundColor(t.bg);

    this.levelRoot = this.add.container(0, 0);
    const g = this.add.graphics();
    this.levelRoot.add(g);

    // silhouette
    fillPoly(g, this.ellipsePts(this.level.shape.cx, this.level.shape.cy, this.level.shape.rx, this.level.shape.ry, 56), t.silhouette, 1);
    g.lineStyle(4, t.silhouetteEdge, 0.9);
    g.strokeEllipse(this.level.shape.cx, this.level.shape.cy, this.level.shape.rx * 2, this.level.shape.ry * 2);

    // hidden core (revealed after split)
    this.drawCore(g, false);

    // faint guide path
    g.lineStyle(6, t.path, 0.35);
    const path = this.level.path;
    g.beginPath();
    g.moveTo(path[0].x, path[0].y);
    for (const p of path.slice(1)) g.lineTo(p.x, p.y);
    g.strokePath();

    // no-go segment (M4): thick red over the path
    if (this.level.noGo) this.drawNoGo(g);

    // pulsing start point + magnet ring (onboarding)
    const startRing = this.add.circle(path[0].x, path[0].y, 26).setStrokeStyle(4, t.accent, 0.9).setDepth(20);
    this.tweens.add({ targets: startRing, scale: 1.25, alpha: 0.4, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.levelRoot.add(startRing);
    const startDot = this.add.circle(path[0].x, path[0].y, 12, t.accent).setDepth(20);
    this.levelRoot.add(startDot);

    // chapter ambience (S3/S4): one quiet pad per chapter, swapped on loadLevel
    this.synth.ambience(this.level.milestone);

    // live trace layer
    this.traceG = this.add.graphics().setDepth(30);
    this.levelRoot.add(this.traceG);

    // demo: a dot walks the path once (1s) on milestone-first levels
    if ([0, 2, 5, 9].includes(idx)) this.startDemo(path);

    this.hud.retint(t, this.level);
    this.hud.setProgress(0);
  }

  private ellipsePts(cx: number, cy: number, rx: number, ry: number, n: number): Vec[] {
    const pts: Vec[] = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      pts.push({ x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) });
    }
    return pts;
  }

  private drawCore(g: Phaser.GameObjects.Graphics, reveal: boolean): void {
    const core = this.level.core;
    if (core.kind === 'none') return;
    const a = reveal ? 1 : 0;
    if (core.kind === 'star') {
      g.fillStyle(core.color, a);
      g.fillPoints(starPoints(this.level.shape.cx, this.level.shape.cy, Math.min(this.level.shape.rx, this.level.shape.ry) * 0.52), true);
    } else if (core.kind === 'circle') {
      g.fillStyle(core.color, a);
      g.fillCircle(this.level.shape.cx, this.level.shape.cy, Math.min(this.level.shape.rx, this.level.shape.ry) * 0.45);
    } else if (core.kind === 'heart') {
      g.fillStyle(core.color, a);
      this.heartPts(this.level.shape.cx, this.level.shape.cy, Math.min(this.level.shape.rx, this.level.shape.ry) * 0.5).forEach((h) => g.fillCircle(h.x, h.y, 14));
    }
  }

  private heartPts(cx: number, cy: number, r: number): Vec[] {
    const pts: Vec[] = [];
    for (let i = 0; i < 12; i++) {
      for (let j = 0; j < 8; j++) {
        const x = cx + (i - 5.5) * r * 0.16;
        const y = cy + (j - 3.5) * r * 0.16 + Math.abs(i - 5.5) * r * 0.05;
        if (Math.hypot(x - cx, (y - cy) * 1.2) < r * 0.75) pts.push({ x, y });
      }
    }
    return pts;
  }

  private drawNoGo(g: Phaser.GameObjects.Graphics): void {
    const ref = resampleUniform(this.level.path, 96);
    const [from, to] = this.level.noGo!;
    g.lineStyle(16, this.level.theme.noGo, 0.95);
    g.beginPath();
    g.moveTo(ref[from].x, ref[from].y);
    for (let i = from + 1; i <= to; i++) g.lineTo(ref[i].x, ref[i].y);
    g.strokePath();
  }

  private startDemo(path: readonly Vec[]): void {
    this.clearDemo();
    const dense = resampleUniform(path, 40);
    this.demoDot = this.add.circle(dense[0].x, dense[0].y, 10, this.level.theme.path, 0.9).setDepth(25);
    this.levelRoot.add(this.demoDot);
    let i = 0;
    this.demoTimer = this.time.addEvent({
      delay: 25,
      repeat: dense.length - 1,
      callback: () => {
        i++;
        if (this.demoDot && dense[i]) this.demoDot.setPosition(dense[i].x, dense[i].y);
      },
    });
  }

  private clearDemo(): void {
    this.demoTimer?.remove();
    this.demoTimer = null;
    this.demoDot?.destroy();
    this.demoDot = null;
  }

  update(_time: number, deltaMs: number): void {
    // live trace
    this.traceG?.clear();
    if (this.traceG) {
      this.traceG.lineStyle(10, this.level.theme.accent, 0.95);
      const pts = this.engine.tracePoints;
      if (pts.length > 1) {
        this.traceG.beginPath();
        this.traceG.moveTo(pts[0].x, pts[0].y);
        for (const p of pts.slice(1)) this.traceG.lineTo(p.x, p.y);
        this.traceG.strokePath();
      }
      // stop-zone hint on M4 while drawing near the red edge
      if (this.level.noGo && pts.length) {
        const ref = resampleUniform(this.level.path, 96);
        const edge = ref[this.level.noGo[0]];
        const d = Math.hypot(pts[pts.length - 1].x - edge.x, pts[pts.length - 1].y - edge.y);
        if (d < NOGO_STOP_ZONE + 60) {
          this.traceG.lineStyle(3, this.level.theme.noGo, 0.5 + 0.3 * Math.sin(_time / 120));
          this.traceG.strokeCircle(edge.x, edge.y, NOGO_STOP_ZONE);
        }
      }
    }
    this.hud.setProgress(this.engine.snapshot(this.level.path).progress);
    this.shakeT = Math.max(0, this.shakeT - deltaMs);
  }

  private onRelease(): void {
    const before = this.engine.currentPhase;
    const result = this.engine.release(this.level);
    if (result === null) {
      if (before === 'drawing' && this.engine.currentPhase === 'mid') {
        this.hud.flashHint('LIFTED AT THE RED LINE — touch after it to continue');
        this.synth.blip();
        this.synth.resumeCue(); // S4 call-site: "release the edge, keep going" ping
      }
      return;
    }
    this.judge(result);
  }

  private judge(result: NonNullable<ReturnType<TraceEngine['release']>>): void {
    const { score, award } = result;
    const t = this.level.theme;

    // run log for the end screen (Tier B owns persistence, engine stays pure)
    const runAwards = (this.registry.get('awards') as { stars: number }[] | undefined) ?? [];
    this.registry.set('awards', [...runAwards, { stars: award.stars }]);

    // SAVE after EVERY cut (DATA-MODEL §2 — not waiting for end-session): atomic
    // whole-object write; a failed save keeps play going and retries next cut.
    gameSave.recordCut(cutInputFromResult(this.level, { stars: award.stars, pct: score.pct }, this.engine.ghostStreak));
    void gameSave.flush();

    // JUICE (fun gate): hitstop + flash + shake + falling halves + sound.
    this.cameras.main.shake(160, 0.006);
    this.time.delayedCall(120, () => this.splitAndShow(score, award)); // 0.2s hitstop approx
    if (award.ghost) {
      this.hud.setStreak(this.engine.ghostStreak);
    } else if (award.stars === 0) {
      this.hud.setStreak(0);
    }

    if (score.noGoHitAt) {
      this.synth.chunkLost();
    } else {
      this.synth.slice(score.pct);
      this.synth.strum(score.pct); // S4 call-site: split strum follows the accuracy
    }
    if (this.level.core.kind !== 'none' && award.stars > 0) {
      this.time.delayedCall(220, () => this.synth.reveal());
    }
    if (award.ghost) this.time.delayedCall(320, () => this.synth.ghost());

    const label: Record<string, string> = {
      perfect: 'GHOST CUT',
      great: 'GREAT CUT',
      good: 'GOOD CUT',
      'chunk-lost': 'CHUNK LOST — you touched the red',
      'keep-going': score.releasedEarly ? 'LIFTED EARLY — try reaching the end' : 'TRY AGAIN',
    };
    this.hud.flashHint(`${label[award.label]}  ${score.pct}%`, 1500);

    this.time.delayedCall(1150, () => {
      if (award.stars > 0) this.nextLevel();
      else this.retry();
    });
  }

  private splitAndShow(score: { pct: number }, award: { stars: number; ghost: boolean }): void {
    const halves = bakeHalves(this.level.path, this.level.shape);
    if (!halves) return;
    const t = this.level.theme;

    flashAlongCut(this, halves.entry, halves.exit);
    sparkBurst(this, halves.entry.x, halves.entry.y, t.accent, award.ghost ? 40 : 22);

    if (this.level.core.kind !== 'none' && award.stars > 0) {
      const g = this.add.graphics().setDepth(15);
      this.drawCore(g, true);
    }

    // two falling pieces (gravity + slight rotation)
    const mk = (pts: Vec[], dir: number) => {
      const g = this.add.graphics().setDepth(10);
      fillPoly(g, pts, t.silhouette, 1);
      const b = this.add.container(0, 0, [g]);
      b.setRotation(dir * 0.02);
      this.fallers.push(b);
      this.tweens.add({
        targets: b,
        y: 520,
        x: dir * 60,
        angle: dir * 16,
        alpha: 0,
        duration: 900,
        ease: 'Quad.in',
        onComplete: () => b.destroy(),
      });
    };
    mk(halves.a, -1);
    mk(halves.b, 1);

    // score badge
    const c = this.add.container(360, 470).setDepth(70);
    const txt = this.add.text(0, 0, `${score.pct}%`, {
      fontFamily: 'Arial', fontSize: '96px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    const stars = this.add.text(0, 70, '★'.repeat(award.stars) + '☆'.repeat(3 - award.stars), {
      fontFamily: 'Arial', fontSize: '56px', color: award.ghost ? '#67e8f9' : '#fde047',
    }).setOrigin(0.5);
    c.add([txt, stars]);
    c.setScale(0.4);
    this.tweens.add({ targets: c, scale: 1, duration: 260, ease: 'Back.out' });
    this.awardFx = c;
  }

  private retry(): void {
    this.loadLevel(this.levelIdx);
  }

  private nextLevel(): void {
    if (this.levelIdx + 1 >= LEVELS.length) {
      this.scene.start('EndScene', { ghostStreak: this.engine.ghostStreak });
      return;
    }
    this.loadLevel(this.levelIdx + 1);
  }
}
