// ============================================================================
// scene-boot.test.ts — B3a (vòng sửa, mục F2): đoạn bootstrap THẬT của màn chơi.
//
// Trước vòng sửa, file này là một "spike" để dò đường: it() "probe host shape" KHÔNG CÓ
// assert nào, it() "probe headless" chốt bằng expect(true).toBe(true) và bốn dòng console.log
// ⇒ đỏ-xanh giả. Nay mỗi it() đều chốt MỘT hành vi:
//   · 5 cửa đọc rect mà bảng PLAY_HOOKS (ui/testids.ts) gọi trên scene;
//   · boot PlayScene headless rồi ĐỌC registry QA: đủ rect HUD + 4 ô, là số hữu hạn, cạnh
//     chạm không nhỏ hơn TAP_MIN (PC-U-05) và 4 ô không đè nhau (PC-03);
//   · scene shutdown thì rect phải bị xoá — không để lại vùng bấm vô hình.
// BÀI HỌC harness (vòng sửa F2): `new Phaser.Game()` CHƯA nổ máy ngay — boot bị hoãn sang một
//   macrotask (đo thật: isRunning=false + getScenes(false)=[] ngay sau constructor), nên
//   `scene.add` đồng bộ bị bỏ và mọi phép đo rect sau đó là đo trên máy chưa chạy. Helper
//   bootPlay() vì vậy chờ isActive('Play') rồi mới bước khung hình — chờ có trần BOOT_TICKS,
//   hết trần thì it() ĐỎ chứ không im lặng pass.
// RÀNG BUỘC: không wall-clock, không mạng (PC-15/PC-17) — game được bước tay qua
//   game.loop.step() trên DOM shim (tests/logic/helpers/dom-shim.ts), không mở browser.
// ============================================================================
import './helpers/dom-shim'
import { describe, expect, it } from 'vitest'
import Phaser from 'phaser'
import { bootGame, makeSession } from '../../src/main'
import { CAMERA, TAP_MIN } from '../../src/render/layout'
import { SESSION_KEY } from '../../src/render/session'
import { PlayScene } from '../../src/render/scenes/PlayScene'
import { TitleScene } from '../../src/render/scenes/TitleScene'
import { OPTION_IDS, TESTIDS } from '../../src/ui/testids'
import { MOTION, MOTION_PHASE } from '../../src/ui/motion'
import { DUR, MAX_LAYERS, foldInPlan } from '../../src/render/anim/unfoldPlan'

/** ms của một khung hình giả (60fps) — cùng nhịp Phaser dùng khi step(). */
const FRAME_MS = 16.7
/**
 * Đủ khung hình cho HOẠT CẢNH VÀO ĐỀ chạy trọn: `foldInPlan` (gập từng lớp -> mũi đục) rồi
 * thêm DUR.head máy mới sang `ready`, và rect QA của gói giấy chỉ đăng khi tờ giấy ĐÃ gập
 * xong. Con số Suy RA từ chính bảng lịch — đổi nhịp ở unfoldPlan là test tự dài ra, không lệch.
 */
const FRAMES = Math.ceil((foldInPlan(MAX_LAYERS).totalMs + DUR.head) / FRAME_MS) + 5
/** Trần macrotask chờ Phaser nổ máy; hết trần mà scene chưa chạy thì it() ĐỎ (không im lặng bỏ qua). */
const BOOT_TICKS = 20

function stepFrames(game: Phaser.Game, frames: number): void {
  const loop = game.loop as unknown as { step: (t: number) => void; lastTime: number }
  let t = loop.lastTime
  for (let i = 0; i < frames; i += 1) {
    t += FRAME_MS
    loop.step(t)
  }
}

/**
 * Máy headless đã nạp session + scene Play và THẬT SỰ đã nổ máy + qua DUR.head.
 * Vì sao phải chờ (đo thật, không đoán): ngay sau `new Phaser.Game()` thì
 * `game.isRunning === false` và `game.scene.getScenes(false)` còn [] — Phaser hoãn
 * `boot()` sang một macrotask, nên `scene.add(...)` gọi đồng bộ bị bỏ qua. Khi boot xong
 * (`isActive('Play') === true`) thì create() đã chạy và rect QA đã vào registry.
 * helpers/dom-shim.ts cho requestAnimationFrame trả 0 ⇒ vòng lặp KHÔNG tự chạy,
 * test phải tự đẩy game.loop.step(). Mỗi it() một instance, không chia sẻ state.
 */
async function bootPlay(frames = FRAMES): Promise<Phaser.Game> {
  const { adapter, flags } = bootGame()
  // Camera KHỚP với CAMERA của layout.ts (cột dọc 720×1420) — rect QA đo ra đúng px mockup.
  const game = new Phaser.Game({ type: Phaser.HEADLESS, width: CAMERA.width, height: CAMERA.height })
  game.registry.set(SESSION_KEY, makeSession(adapter, flags))
  game.scene.add('Play', PlayScene, true, { level: 1 })
  for (let i = 0; i < BOOT_TICKS && !game.scene.isActive('Play'); i += 1) {
    await new Promise((done) => { setTimeout(done, 0) })
    stepFrames(game, 1)
  }
  stepFrames(game, frames)
  return game
}

describe('PlayScene khi boot (F2: hết test dò đường)', () => {
  it('TMP trace motion', async () => {
    const game = await bootPlay(0)
    const scene = game.scene.getScene('Play') as unknown as Phaser.Scene
    let updates = 0
    let ticks = 0
    let completes = 0
    scene.events.on(Phaser.Scenes.Events.UPDATE, () => { updates += 1 })
    scene.time.addEvent({ delay: 16, loop: true, callback: () => { ticks += 1 } })
    const plain = { v: 1 }
    const t1 = scene.tweens.add({ targets: plain, v: 0, duration: 280, onComplete: () => { completes += 1 } })
    const rect = scene.add.rectangle(0, 0, 10, 10, 0xffffff)
    scene.tweens.add({ targets: rect, alpha: 0, duration: 280 })
    for (let i = 0; i < 20; i += 1) stepFrames(game, 1)
    console.warn('TMP updates=' + updates + ' ticks=' + ticks + ' completes=' + completes +
      ' plain.v=' + plain.v + ' rect.alpha=' + rect.alpha)
    t1.update(200)
    console.warn('TMP manual plain.v=' + plain.v)
    game.destroy(false, false)
    expect(true).toBe(true)
  })

  it('là Scene thật, có create và đủ 5 cửa đọc rect cho bảng PLAY_HOOKS', () => {
    const play = new PlayScene()
    const title = new TitleScene()
    expect(play).toBeInstanceOf(Phaser.Scene)
    expect(typeof play.create).toBe('function')
    expect(typeof title.create).toBe('function')
    for (const door of ['opened', 'shown', 'packetBox', 'holeBox', 'breathBox'] as const) {
      expect(typeof play[door], 'PlayScene thiếu cửa ' + door).toBe('function')
    }
  })

  it('boot headless => đăng đủ rect HUD + 4 ô, số hữu hạn và không nhỏ hơn trần chạm', async () => {
    const game = await bootPlay()
    const active = game.scene.getScenes(true).map((s) => s.scene.key)
    expect(active, 'scene chơi phải là scene đang chạy').toContain('Play')
    const wanted = [
      ...OPTION_IDS,
      'testid-hud-level', 'testid-hud-stars', 'testid-hud-ink', 'testid-sheet-folded',
    ]
    for (const id of wanted) {
      const r = TESTIDS[id]
      expect(r, 'thiếu rect QA ' + id).toBeDefined()
      for (const v of Object.values(r ?? {})) {
        expect(Number.isFinite(v), id + ' có toạ độ không phải số').toBe(true)
      }
      expect(r?.w, id + '.w phải >= trần chạm').toBeGreaterThanOrEqual(TAP_MIN)
      expect(r?.h, id + '.h phải >= trần chạm').toBeGreaterThanOrEqual(TAP_MIN)
    }
    game.destroy(false, false)
  })

  it('bốn ô đáp án không đè nhau trên màn hình (PC-03: bốn câu hỏi riêng)', async () => {
    const game = await bootPlay()
    const rects = OPTION_IDS.map((id) => TESTIDS[id])
    rects.forEach((r, i) => {
      expect(r, 'ô ' + OPTION_IDS[i] + ' không có rect thì đo đè nhau là vô nghĩa').toBeDefined()
    })
    const overlaps: string[] = []
    rects.forEach((a, i) => rects.forEach((b, j) => {
      if (i >= j || !a || !b) return
      const free = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y
      if (!free) overlaps.push(OPTION_IDS[i] + ' ~ ' + OPTION_IDS[j])
    }))
    expect(overlaps, 'ô đè nhau => một cú bấm trúng hai ô: ' + overlaps.join(', ')).toEqual([])
    game.destroy(false, false)
  })

  it('hoạt cảnh VÀO ĐỀ chạy trọn: giấy gập kín + lỗ đục đã hiện, không nhảy tức thì (BUGFIX anim)', async () => {
    const game = await bootPlay()
    expect(MOTION.phase, 'xong nhịp vào đề thì pha phải là folded').toBe(MOTION_PHASE.folded)
    expect(MOTION.foldProgress, 'foldProgress phải về 1 = gói giấy kín').toBeGreaterThan(0.99)
    expect(MOTION.layerScales.length, 'layerScales phải dài đúng số lớp của đề').toBe(4)
    expect(MOTION.layerScales.every((v) => v < 0.01), 'mọi lớp phải nằm chồng khít lên packet').toBe(true)
    expect(MOTION.holeCount, 'mũi đục xuống mà không có lỗ nào hiện là mất đề').toBeGreaterThan(0)
    game.destroy(false, false)
  })

  /**
   * 8 khung ≈ 134ms: vẫn còn TRONG nhịp gập (foldMs 450) ⇒ tờ giấy phải đang ở tư thế dở,
   * không phải "nhảy thẳng tới gói giấy kín" — đó chính là cái bug bản cũ (0 px đổi).
   */
  const MID_FRAMES = 8

  it('giữa nhịp vào đề: giấy còn ĐANG gập và các lớp so le nhau (không nhảy tức thì)', async () => {
    const game = await bootPlay(MID_FRAMES)
    expect(MOTION.foldProgress, 'foldProgress = 0 là tờ chưa nhúc nhích').toBeGreaterThan(0)
    expect(MOTION.foldProgress, 'foldProgress = 1 là đã gói kín, không còn gì để xem').toBeLessThan(1)
    const open = MOTION.layerScales.map((v) => v.toFixed(2))
    expect(new Set(open).size, 'mọi lớp cùng một giá trị là không có so le: ' + open.join(',')).toBeGreaterThan(1)
    expect(MOTION.holeCount, 'mũi đục chưa xuống tới mốc punchStartMs thì chưa được có lỗ').toBe(0)
    game.destroy(false, false)
  })

  it('shutdown thì rect của màn chơi bị xoá khỏi registry (không còn vùng bấm vô hình)', async () => {
    const game = await bootPlay()
    const live = [...OPTION_IDS, 'testid-sheet-folded']
    for (const id of live) {
      expect(TESTIDS[id], 'boot xong mà thiếu rect ' + id + ' thì shutdown chẳng đo được gì').toBeDefined()
    }
    game.scene.stop('Play')
    stepFrames(game, 10)
    expect(game.scene.isActive('Play'), 'scene phải đã dừng hẳn trước khi đo rect').toBe(false)
    for (const id of [...OPTION_IDS, 'testid-sheet-folded']) {
      expect(TESTIDS[id], 'rect còn sót sau shutdown: ' + id).toBeUndefined()
    }
    game.destroy(false, false)
  })
})
