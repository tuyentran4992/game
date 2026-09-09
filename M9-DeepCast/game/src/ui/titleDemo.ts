// Title demo (Stage C "3-second self-teaching opening"): a ghost hand plays one
// full loop — HOLD (descend) -> RELEASE -> HOLD/NIN with '!' telegraph -> bite ->
// RELEASE (reel up) -> '+$' float at the surface — so the rules are SEEN before
// the first tap. Render-only: own sprites, manual dt timers (house style — no
// time.addEvent), no new art (hook/fish_01/sparkle textures only).
import Phaser from 'phaser';
import { WORLD_W, SURFACE_Y } from '../data/world.ts';

const UI = { font: 'sans-serif', stroke: '#1B2A41' } as const;

const HOOK_X = WORLD_W / 2;
const DESCEND_SPEED = 130; // px/s in the demo (game ramps 140-260)
const REEL_SPEED = 150;
const FISH_SPEED = 44; // px/s approach — WARN_R->BITE_R takes ~1.1s, like the real telegraph
const BITE_R = 26; // mirror of the hook attach reach feel
const WARN_R = 75; // where the '!' lights up
const DEMO_DEPTH_Y = 336; // how deep the demo hook parks
const CURSOR = { x: 392, y: 606 };

type Phase = 'hold' | 'release' | 'nin' | 'reel' | 'sell';

export class TitleDemo {
  private scene: Phaser.Scene;
  private anchor: () => { x: number; y: number };
  private g: Phaser.GameObjects.Graphics;
  private hookImg: Phaser.GameObjects.Image;
  private fishImg: Phaser.GameObjects.Image;
  private bang: Phaser.GameObjects.Text;
  private cursorRing: Phaser.GameObjects.Graphics;
  private cursorDot: Phaser.GameObjects.Image;
  private cursorLabel: Phaser.GameObjects.Text;
  private caption: Phaser.GameObjects.Text;
  private phase: Phase = 'hold';
  private t = 0;
  private clock = 0;
  private hookY = SURFACE_Y + 6;
  private fishX = 64;
  private fishY = DEMO_DEPTH_Y;
  private shown = true;

  constructor(scene: Phaser.Scene, anchor: () => { x: number; y: number }) {
    this.scene = scene;
    this.anchor = anchor;
    this.g = scene.add.graphics().setDepth(13);
    this.hookImg = scene.add.image(HOOK_X, this.hookY, 'hook').setDepth(13);
    this.hookImg.setDisplaySize(48, Math.round((48 * this.hookImg.height) / this.hookImg.width));
    this.fishImg = scene.add
      .image(this.fishX, this.fishY, 'fish_01')
      .setDepth(12)
      .setVisible(false);
    this.fishImg.setDisplaySize(48, 24);
    this.bang = scene.add
      .text(0, 0, '!', { fontFamily: UI.font, fontSize: '26px', color: '#FFE66D', stroke: UI.stroke, strokeThickness: 5 })
      .setOrigin(0.5)
      .setDepth(14)
      .setVisible(false);
    this.cursorRing = scene.add.graphics().setDepth(39).setScrollFactor(0);
    this.cursorDot = scene.add.image(CURSOR.x, CURSOR.y, 'sparkle').setDepth(39).setScrollFactor(0).setScale(1.1).setAlpha(0.9);
    this.cursorLabel = scene.add
      .text(CURSOR.x, CURSOR.y - 30, 'HOLD', { fontFamily: UI.font, fontSize: '13px', color: '#ffffff', stroke: UI.stroke, strokeThickness: 4 })
      .setOrigin(0.5)
      .setDepth(39)
      .setScrollFactor(0);
    this.caption = scene.add
      .text(240, 748, 'Hold to drop  ·  stay still to hook  ·  release to reel up', {
        fontFamily: UI.font, fontSize: '13px', color: '#cfe8ff', stroke: UI.stroke, strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(39)
      .setScrollFactor(0);
  }

  setVisible(v: boolean): void {
    this.shown = v;
  }

  update(dt: number): void {
    this.clock += dt;
    if (!this.shown) {
      this.g.clear();
      this.cursorRing.clear();
      this.hideObjects();
      return;
    }
    // re-shown after a run started: everything except the fish is always on
    this.hookImg.setVisible(true);
    this.cursorDot.setVisible(true);
    this.cursorLabel.setVisible(true);
    this.caption.setVisible(true);
    this.t += dt;
    this.stepPhase(dt);
    this.drawScene(dt);
  }

  private to(phase: Phase): void {
    this.phase = phase;
    this.t = 0;
  }

  private stepPhase(dt: number): void {
    switch (this.phase) {
      case 'hold': // ghost hand presses: the bait drops
        this.hookY = Math.min(DEMO_DEPTH_Y, this.hookY + DESCEND_SPEED * dt);
        if (this.t >= 1.7) this.to('release');
        break;
      case 'release': // finger lifts: brief reel
        this.hookY = Math.max(SURFACE_Y + 6, this.hookY - REEL_SPEED * dt);
        if (this.t >= 0.55) {
          this.to('nin');
          this.fishX = 64;
          this.fishY = this.hookY;
          this.fishImg.setVisible(true).setDisplaySize(48, 24);
        }
        break;
      case 'nin': // bait is still — a fish notices, '!' flashes, then the bite
        this.fishX += FISH_SPEED * dt;
        {
          const dist = HOOK_X - this.fishX;
          this.bang.setVisible(dist <= WARN_R);
          if (dist <= WARN_R) {
            this.bang
              .setPosition(this.fishX + 6, this.fishY - 24)
              // pulse 0.4..1 (never fully off): reads as a steady alert, and a
              // frozen frame always shows the mark (screenshot QA relies on it)
              .setAlpha(0.7 + 0.3 * Math.sin(this.clock * 14));
          }
          if (dist <= BITE_R) {
            this.bang.setVisible(false);
            this.floatText(HOOK_X + 30, this.hookY - 10, '+$12', '#FFE66D', 16);
            this.to('reel');
          }
        }
        break;
      case 'reel': // release: reel the catch home
        this.hookY = Math.max(SURFACE_Y + 6, this.hookY - REEL_SPEED * dt);
        if (this.hookY <= SURFACE_Y + 6) this.to('sell');
        break;
      case 'sell': // money at the boat, then loop
        if (this.t >= 0.05 && this.t - dt <= 0.05) {
          this.floatText(HOOK_X, SURFACE_Y - 30, '+$12', '#FFE66D', 22);
          this.fishImg.setVisible(false);
        }
        if (this.t >= 1) {
          this.to('hold');
          this.hookY = SURFACE_Y + 6;
        }
        break;
    }
  }

  private drawScene(dt: number): void {
    const a = this.anchor();
    const hooked = this.phase === 'reel' || (this.phase === 'sell' && this.t < 0.05);
    // fish follows the hook while hooked; otherwise swims its approach line
    if (this.fishImg.visible) {
      if (hooked) {
        this.fishImg.setPosition(HOOK_X, this.hookY).setRotation(Math.sin(this.clock * 18) * 0.6);
        this.fishImg.setDisplaySize(53, 21); // attach squash
      } else {
        this.fishImg
          .setPosition(this.fishX, this.fishY)
          .setRotation(Math.sin(this.clock * 4) * 0.08)
          .setDisplaySize(48, 24);
      }
    }
    this.hookImg.setPosition(HOOK_X, this.hookY);

    // demo line: same bowed-curve language as the in-game line renderer
    const g = this.g;
    g.clear();
    const slack = this.phase === 'reel' || this.phase === 'sell' ? 8 : 26;
    g.lineStyle(2, 0xffd166, 0.95);
    g.beginPath();
    g.moveTo(a.x, a.y);
    for (let i = 1; i <= 12; i++) {
      const k = i / 12;
      const u = k * (1 - k) * 4;
      const x = a.x + (HOOK_X - a.x) * k + Math.sin(this.clock * 2) * 5 * u;
      const y = a.y + (this.hookY - a.y) * k + slack * u;
      g.lineTo(x, y);
    }
    g.strokePath();

    // ghost hand: pulsing ring + touch dot; dim while the finger is "up"
    const pressed = this.phase === 'hold' || this.phase === 'nin';
    const r = 15 + 3 * Math.sin(this.clock * 7);
    this.cursorRing.clear();
    this.cursorRing.lineStyle(3, 0xffe66d, pressed ? 0.85 : 0.3);
    this.cursorRing.strokeCircle(CURSOR.x, CURSOR.y, r);
    this.cursorDot.setAlpha(pressed ? 0.9 : 0.3);
    const label = this.phase === 'release' || this.phase === 'reel' ? 'RELEASE' : 'HOLD';
    this.cursorLabel.setText(this.phase === 'sell' ? '' : label);
    void dt;
  }

  private floatText(x: number, y: number, str: string, color: string, size: number): void {
    const text = this.scene.add
      .text(x, y, str, { fontFamily: UI.font, fontSize: `${size}px`, color, stroke: UI.stroke, strokeThickness: 4 })
      .setOrigin(0.5)
      .setDepth(30);
    this.scene.tweens.add({
      targets: text,
      y: y - 90,
      alpha: 0,
      duration: 900,
      ease: 'Cubic.out',
      onComplete: () => text.destroy(),
    });
  }

  private hideObjects(): void {
    this.hookImg.setVisible(false);
    this.fishImg.setVisible(false);
    this.bang.setVisible(false);
    this.cursorDot.setVisible(false);
    this.cursorLabel.setVisible(false);
    this.caption.setVisible(false);
  }
}
