// src/scenes/HudScene.ts — HUD tren (tips/stars/strikes) + badge HINT + ghost +
// interstitial mock + overlay WIN/LOSE (rank S/A/B, rewarded continue 1 lan/ca).
import Phaser from 'phaser'
import { ctx } from '../context.ts'
import type { MatchEvent } from '../core/match.ts'
import { STRIKES_MAX, VIEW_H, VIEW_W } from '../data/shift.ts'
import { HUD } from '../ui/layout.ts'
import { button, text } from '../ui/widgets.ts'
import { registerTestid } from '../ui/testids.ts'
import { bridge } from '../bridge.ts'
import { sfx } from '../audio.ts'

const FONT = 'sans-serif'

export class HudScene extends Phaser.Scene {
  private tipText!: Phaser.GameObjects.Text
  private starText!: Phaser.GameObjects.Text
  private strikesG!: Phaser.GameObjects.Graphics
  private overlay?: Phaser.GameObjects.Container
  private adPanel?: Phaser.GameObjects.Container

  constructor() {
    super('HudScene')
  }

  create(): void {
    const g = this.add.graphics().setDepth(100)
    g.fillStyle(0xffffff, 0.92).fillRoundedRect(10, 10, VIEW_W - 20, 68, 18)
    this.add.text(HUD.tipsX, HUD.tipsY, '💰', { fontFamily: FONT, fontSize: '30px' }).setOrigin(0, 0.5).setDepth(101)
    this.tipText = text(this, HUD.tipsX + 44, HUD.tipsY, '0', 30, '#3A2E39', { strokeThickness: 0 }).setOrigin(0, 0.5).setDepth(101)
    this.starText = text(this, HUD.starsX, HUD.starsY, '★ 0/24', 28, '#B8860B', { strokeThickness: 0 }).setDepth(101)
    this.strikesG = this.add.graphics().setDepth(101)
    registerTestid('hud-tips', 10, 10, 220, 68)
    registerTestid('hud-stars', 240, 10, 240, 68)
    registerTestid('hud-strikes', VIEW_W - 240, 10, 230, 68)
    this.game.events.on('m10:event', this.onEvent, this)
  }

  private onEvent(e: MatchEvent): void {
    if (e.type === 'interstitial_start') this.showInterstitialMock()
    if (e.type === 'win') this.showWin()
    if (e.type === 'lose') this.showLose()
  }

  override update(): void {
    const st = ctx.match?.state
    if (!st) return
    this.tipText.setText(`${st.tips}`)
    this.starText.setText(`★ ${st.stars}/24`)
    const g = this.strikesG
    g.clear()
    for (let i = 0; i < STRIKES_MAX; i++) {
      const x = VIEW_W - 120 + i * 40
      g.fillStyle(i < st.strikes ? 0xe74c3c : 0xffffff, i < st.strikes ? 1 : 0.8)
        .fillCircle(x, HUD.strikesY, 15)
      g.lineStyle(3, 0x3a2e39, 1).strokeCircle(x, HUD.strikesY, 15)
    }
  }

  // ---------- interstitial MOCK (SPEC §7: giua khach #4 va #5) ----------
  private showInterstitialMock(): void {
    const c = this.add.container(0, 0).setDepth(300)
    c.add(this.add.rectangle(VIEW_W / 2, VIEW_H / 2, VIEW_W, VIEW_H, 0x000000, 0.82))
    c.add(text(this, VIEW_W / 2, VIEW_H / 2 - 60, 'AD (mock)', 44, '#FFFFFF', { strokeThickness: 0 }))
    c.add(text(this, VIEW_W / 2, VIEW_H / 2 + 10, 'Quick break — stall restock', 24, '#CCCCCC', { strokeThickness: 0 }))
    const bar = this.add.graphics()
    bar.fillStyle(0xe85d26, 1).fillRoundedRect(VIEW_W / 2 - 140, VIEW_H / 2 + 70, 280, 14, 7)
    c.add(bar)
    this.tweens.add({ targets: bar, scaleX: 0, duration: 6000, ease: 'Linear' })
    this.adPanel = c
    this.time.delayedCall(6000, () => { c.destroy(); this.adPanel = undefined })
  }

  // ---------- WIN ----------
  private showWin(): void {
    const s = ctx.match!.summary()
    const c = this.clear(this.add.container(0, 0).setDepth(300))
    c.add(this.add.rectangle(VIEW_W / 2, VIEW_H / 2, VIEW_W, VIEW_H, 0x17131c, 0.86))
    c.add(this.add.image(VIEW_W / 2, 330, 'hero_sandwich').setDisplaySize(400, 250))
    c.add(text(this, VIEW_W / 2, 190, 'SHIFT COMPLETE!', 52, '#FFD700'))
    const col = s.rank === 'S' ? '#FFD700' : s.rank === 'A' ? '#C7CCD6' : '#CD7F32'
    const badge = this.add.graphics()
    badge.fillStyle(0xffffff, 1).fillCircle(VIEW_W / 2, 560, 74)
    badge.lineStyle(10, parseInt(col.slice(1), 16), 1).strokeCircle(VIEW_W / 2, 560, 74)
    c.add(badge)
    c.add(text(this, VIEW_W / 2, 560, s.rank, 88, col))
    if (s.rank === 'S') {
      const rays = this.add.graphics().setDepth(299)
      rays.lineStyle(6, 0xffd700, 0.7)
      for (let a = 0; a < 360; a += 30) rays.lineBetween(VIEW_W / 2, 560, VIEW_W / 2 + Math.cos((a * Math.PI) / 180) * 150, 560 + Math.sin((a * Math.PI) / 180) * 150)
      c.add(rays)
      this.tweens.add({ targets: rays, angle: 360, duration: 8000, repeat: -1 })
    }
    c.add(text(this, VIEW_W / 2, 690, `💰 ${s.tips} tips · ★ ${s.stars}/24`, 34, '#FFFFFF', { strokeThickness: 0 }))
    c.add(text(this, VIEW_W / 2, 740, `FAST! ×${s.fastCount}   ·   BEST: 💰${bridge.best}`, 24, '#CCCCCC', { strokeThickness: 0 }))
    const again = button(this, VIEW_W / 2, 900, 320, 96, 'CHƠI LẠI', { testid: 'btn-play-again' })
    again.on('pointerdown', () => this.restart(c))
    this.overlay = c
    sfx.fanfare()
  }

  // ---------- LOSE ----------
  private showLose(): void {
    const m = ctx.match!
    const s = m.summary()
    const c = this.clear(this.add.container(0, 0).setDepth(300))
    c.add(this.add.rectangle(VIEW_W / 2, VIEW_H / 2, VIEW_W, VIEW_H, 0x17131c, 0.88))
    c.add(this.add.image(VIEW_W / 2, 380, 'stall_closed').setDisplaySize(460, 300))
    c.add(text(this, VIEW_W / 2, 200, 'STALL CLOSED', 54, '#E74C3C'))
    c.add(text(this, VIEW_W / 2, 560, `Served ${s.served}/8 · 💰${s.tips} tips · ★${s.stars}`, 30, '#FFFFFF', { strokeThickness: 0 }))
    if (m.canContinue()) {
      const cont = button(this, VIEW_W / 2, 680, 420, 90, '▶ WATCH AD — +1 LIFE', { testid: 'btn-rewarded-continue', color: '#2A9D8F', dark: '#1f7168' })
      cont.on('pointerdown', () => {
        void bridge.showRewarded('continue').then((ok) => {
          if (!ok) return
          c.destroy()
          // event continueAfterAd (customer_start khach ke) phai chay qua pipeline
          // render cua GameScene — emit cho GameScene xu ly, KHONG goi thang o day
          this.scene.get('GameScene').events.emit('m10:continue')
        })
      })
      c.add(cont)
    }
    const retry = button(this, VIEW_W / 2, 830, 320, 96, 'THỬ LẠI', { testid: 'btn-retry' })
    retry.on('pointerdown', () => this.restart(c))
    c.add(retry)
    this.overlay = c
    sfx.angry()
  }

  private restart(c: Phaser.GameObjects.Container): void {
    c.destroy()
    this.overlay = undefined
    this.scene.get('GameScene').events.emit('m10:new-shift')
  }

  private clear(c: Phaser.GameObjects.Container): Phaser.GameObjects.Container {
    this.overlay?.destroy()
    this.adPanel?.destroy()
    return c
  }
}
