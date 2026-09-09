// src/scenes/GameScene.ts — CONNECT mong: input tap → match API; MatchState → render.
// MOI cong thuc luat nam trong core/rules.ts + systems (TB-05 chong god class).
import Phaser from 'phaser'
import { ctx, newShift } from '../context.ts'
import type { Match, MatchEvent } from '../core/match.ts'
import { comboMult } from '../core/rules.ts'
import { CUSTOMERS } from '../data/customers.ts'
import { HINT_MAX_PER_CUSTOMER, HINT_MAX_PER_SHIFT, VIEW_H, VIEW_W } from '../data/shift.ts'
import { flashDurationMs } from '../systems/order.ts'
import { buildBoard, type Board } from '../ui/board.ts'
import { buildTray, type TrayView } from '../ui/tray.ts'
import { drawGhostBubble, OrderBubble } from '../ui/bubble.ts'
import { PatienceArc } from '../ui/patienceArc.ts'
import { BTNS, CUST, HUD } from '../ui/layout.ts'
import { button } from '../ui/widgets.ts'
import { comboPopup, fastBadge, floatText, revealTicks, starFly, strikeFx, tipFly } from '../ui/effects.ts'
import { sfx } from '../audio.ts'
import { bridge } from '../bridge.ts'
import { patienceFrac } from '../systems/patience.ts'

export class GameScene extends Phaser.Scene {
  private m!: Match
  private bubble!: OrderBubble
  private ghost!: Phaser.GameObjects.Graphics
  private arc!: PatienceArc
  private board!: Board
  private tray!: TrayView
  private btnUndo!: Phaser.GameObjects.Container
  private btnServe!: Phaser.GameObjects.Container
  private btnHint!: Phaser.GameObjects.Container
  private hintBadge!: Phaser.GameObjects.Text
  private dim!: Phaser.GameObjects.Rectangle
  private drawn = 0
  private lastWaitIdx: number | undefined

  constructor() {
    super('GameScene')
  }

  create(): void {
    this.m = ctx.match ?? newShift()
    this.drawn = 0
    this.lastWaitIdx = undefined
    this.add.image(VIEW_W / 2, VIEW_H / 2, 'bg_street').setDisplaySize(VIEW_W, VIEW_H)
    this.dim = this.add.rectangle(VIEW_W / 2, 1000, VIEW_W, 560, 0x000000, 0.2).setVisible(false).setDepth(4)
    this.board = buildBoard(this)
    this.bubble = new OrderBubble(this)
    this.ghost = drawGhostBubble(this, HUD.ghostX, HUD.ghostY)
    this.arc = new PatienceArc(this)
    this.tray = buildTray(this, (id) => this.handle(this.m.tapLayer(id)))
    this.board.showCustomer(this.m.state.customerIdx)

    this.btnUndo = button(this, BTNS.undo.x, BTNS.y, BTNS.undo.w, BTNS.undo.h, 'UNDO', { testid: 'btn-undo', color: '#6b6470', dark: '#4a4450' })
    this.btnServe = button(this, BTNS.serve.x, BTNS.y, BTNS.serve.w, BTNS.serve.h, 'SERVE', { testid: 'btn-serve', size: 36 })
    this.btnHint = button(this, BTNS.hint.x, BTNS.y, BTNS.hint.w, BTNS.hint.h, '👁', { testid: 'btn-hint', color: '#2A9D8F', dark: '#1f7168', size: 34 })
    this.hintBadge = this.add.text(BTNS.hint.x + 34, BTNS.y - 44, '', { fontFamily: 'sans-serif', fontSize: '20px', color: '#3A2E39', fontStyle: '900' }).setDepth(20)
    this.btnUndo.on('pointerdown', () => { sfx.pop(); this.handle(this.m.tapUndo()) })
    this.btnServe.on('pointerdown', () => { sfx.pop(); this.handle(this.m.tapServe()) })
    this.btnHint.on('pointerdown', () => void this.tryHint())

    if (!this.shiftListener) {
      this.shiftListener = true
      this.events.on('m10:new-shift', () => {
        this.m = newShift()
        this.drawn = 0
        this.lastWaitIdx = undefined
        this.board.clearStack()
        this.board.showCustomer(0)
      })
      // Rewarded continue: su kien cua match phai di qua handle() de render khach moi
      this.events.on('m10:continue', () => this.handle(this.m.continueAfterAd()))
    }
  }

  private shiftListener = false

  private async tryHint(): Promise<void> {
    const st = this.m.state
    if (st.phase !== 'BUILD' || st.hintUsedThisCustomer >= HINT_MAX_PER_CUSTOMER || st.hintsShift >= HINT_MAX_PER_SHIFT) {
      floatText(this, BTNS.hint.x, BTNS.y - 90, 'no hints left', '#7a7069', 22)
      return
    }
    const granted = await bridge.showRewarded('hint')
    if (!granted) return
    this.handle(this.m.tapHint())
  }

  override update(time: number, delta: number): void {
    this.handle(this.m.tick(Math.min(delta, 100)))
    this.render(time)
  }

  /** 1 buoc thoi gian/su kien: juice + broadcast cho HudScene. */
  private handle(evs: MatchEvent[]): void {
    for (const e of evs) {
      // Luu/sendScore TRUOC khi broadcast de overlay WIN/LOSE doc duoc BEST moi nhat
      if (e.type === 'win' || e.type === 'lose') bridge.reportShift(this.m.summary().tips)
      this.game.events.emit('m10:event', e)
      switch (e.type) {
        case 'customer_start':
          this.drawn = 0
          this.board.clearStack()
          this.board.showCustomer(e.customerIdx)
          break
        case 'build_start':
          sfx.pop()
          break
        case 'wait':
          this.lastWaitIdx = e.changedIdx
          sfx.chime()
          floatText(this, HUD.ghostX, HUD.ghostY, 'WAIT!', '#FFC048', 40)
          break
        case 'hint_replay':
          sfx.coin()
          break
        case 'serve':
          this.board.serveLid()
          revealTicks(this, e.revealed, () => undefined)
          break
        case 'fast':
          fastBadge(this)
          break
        case 'happy': {
          const n = this.m.state.lastServe?.revealed.length ?? 1
          const t = 500 + n * 500 + 150
          this.time.delayedCall(t, () => {
            starFly(this, e.stars)
            tipFly(this, e.tip)
            sfx.chime()
            sfx.coin()
            if (e.comboStreak >= 2) comboPopup(this, comboMult(e.comboStreak))
          })
          break
        }
        case 'walkout':
          this.board.setAngry(true)
          sfx.angry()
          break
        case 'strike':
          strikeFx(this)
          break
        case 'interstitial_start':
          bridge.showInterstitial()
          break
        default:
          break
      }
    }
  }

  /** Dong bo MatchState → hinh anh moi frame. */
  private render(time: number): void {
    const st = this.m.state
    const n = st.order.length
    // bong bong: FLASH = hien + vong den; BUILD luc pause (WAIT!/HINT replay) = hien lai
    if (st.phase === 'FLASH') {
      const dur = flashDurationMs(st.customerIdx)
      const hl = CUSTOMERS[st.customerIdx]!.tutorial ? Math.floor((dur - st.timer) / 800) % Math.max(1, n) : undefined
      this.bubble.show(st.order, { flashFrac: st.timer / dur, highlight: hl })
      if (hl !== undefined) this.tray.glow(st.order[hl])
      else this.tray.glow(null)
      this.dim.setVisible(true)
      this.ghost.setVisible(false)
    } else if (st.phase === 'BUILD' && st.pauseMs > 0) {
      this.bubble.show(st.order, { waitIdx: this.lastWaitIdx })
      this.tray.glow(null)
      this.dim.setVisible(false)
    } else {
      this.bubble.hide()
      this.tray.glow(null)
      this.dim.setVisible(false)
      this.lastWaitIdx = undefined
      this.ghost.setVisible(st.phase === 'BUILD' || st.phase === 'SCORING')
    }
    this.arc.setVisible(st.phase === 'BUILD')
    if (st.phase === 'BUILD') {
      const frac = patienceFrac(st)
      this.arc.draw(CUST.x, CUST.feetY - 300, frac, time) // vong cung quanh dau khach (DESIGN-SPEC §2)
      if (frac < 0.3 && Math.floor(time / 1000) !== this.lastBeatSec) {
        this.lastBeatSec = Math.floor(time / 1000)
        sfx.heartbeat()
      }
    }
    this.tray.setDim(st.phase === 'FLASH')
    // stack layer moi (thua/hoi = undo) — dung board.addLayer khi tap duoc ghi o tren
    while (this.drawn < st.stack.length) {
      this.board.addLayer(st.stack[this.drawn]!)
      sfx.pop()
      this.drawn++
    }
    while (this.drawn > st.stack.length) {
      this.board.popLastLayer()
      this.drawn--
    }
    const buildable = st.phase === 'BUILD'
    this.btnUndo.setAlpha(st.stack.length > 0 && buildable ? 1 : 0.5)
    this.btnServe.setAlpha(buildable ? 1 : 0.5)
    this.btnHint.setAlpha(buildable && st.hintsShift < HINT_MAX_PER_SHIFT && st.hintUsedThisCustomer < HINT_MAX_PER_CUSTOMER ? 1 : 0.45)
    this.hintBadge.setText(`${Math.max(0, HINT_MAX_PER_SHIFT - st.hintsShift)}`)
  }

  private lastBeatSec = -1
}
