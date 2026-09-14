// Pattern: Scene (view của máy trạng thái levelState)
// TRÁCH NHIỆM: NỐI DÂY vòng chơi — dựng tờ giấy + 4 ô đáp án từ LevelSpec, chuyển MỌI cú bấm
//   qua transition của levelState (tap/resolve/retry/useUndo/useHint/nextLevel) và vẽ đúng lịch
//   trong anim/unfoldPlan. Không phán quyết: không so correctIndex, không suy sao, không tự
//   quyết điều kiện undo (PC-16 ranh giới một chiều logic -> render).
// KHÔNG CÒN NẰM Ở ĐÂY (A2): bảng nút -> ui/button.PLAY_SLOTS; bảng rect QA ->
//   ui/testids.PLAY_HOOKS; lịch + gate + bộ giữ cú bấm + phần thưởng -> anim/unfoldPlan.
//   Scene còn lại đúng một việc: đọc bảng, đặt tween, gọi transition.
// RÀNG BUỘC: không đồng hồ wall-clock — mọi timing đi qua this.time/this.tweens nên một lệnh
//   pause của PC-17 dừng đúng cả tween lẫn timer; không gọi mạng (PC-15); không màn thắng
//   (PC-09) — sau `correct` chính scene này dựng tờ màn kế từ nextSpec mà logic đã sinh sẵn.
// INPUT BUFFER (PC-05): ô khoá vẫn nhận bấm, cú bấm được giữ lại và ăn ngay khi máy về
//   `ready` — flush nối vào paint(), tức là vào MỌI đường trở lại ready (retry/undo/màn kế).

import Phaser from 'phaser';
import { t } from '../../logic/i18n';
import {
  advanceClock, initialLevelState, markReady, nextLevel, peekFold, resolve, retry,
  tap, TRANSITIONS, useHint, useUndo, type LevelPhase, type LevelState,
} from '../../logic/levelState';
import { toPoints } from '../../logic/rational';
import type { LevelSpec, Point } from '../../logic/types';
import { makeButton, PLAY_SLOTS, type ButtonView, type SlotFlags, type SlotRow } from '../../ui/button';
import {
  clearTestid, makeTestidHook, OPTION_IDS, PLAY_HOOKS, type Hook,
} from '../../ui/testids';
// CỬA ĐĂNG KÝ RECT QA của scene này là this.hook (makeTestidHook -> registerTestid trong
// ui/testids.ts); gọi thẳng registerTestid ở đây là copy lại phép đổi toạ độ (A9) — cấm.
import {
  applyOutcome, breathPlan, createInputBuffer, DUR, holeBudget, isOpenPhase,
  optionEnabledByState, RENDER_BY_PHASE, TOUCH, unfoldTimeline, type RenderPhase,
} from '../anim/unfoldPlan';
import { MOTION_PHASE, setMotionPhase } from '../../ui/motion';
import { InkBadge } from '../components/InkBadge';
import { OptionCard } from '../components/OptionCard';
import { SheetView } from '../components/SheetView';
import { StarRow } from '../components/StarRow';
import type { Box, Layout } from '../layout';
import { creaseBand, layoutOf, slotBoxes } from '../layout';
import { openLevelSource, readSession, type GameSession, type LevelSource } from '../session';
import { playFx } from '../audio/sfx';
import { parseHex, sheetSkinOf, themeFor, textStyle } from '../theme/paperTheme';

/** Nhịp đồng hồ mềm (TC-SES-05): chỉ cộng elapsedMs, không bao giờ tự phạt. */
const TICK_MS = 1000;

/** Event nội bộ báo "bảng lịch phải cắt/bỏ input" — C9: không im lặng mất dữ liệu vẽ. */
export const VIEW_REPORT = 'view:report';

/** Một hành động gắn với cú bấm nút. */
type ButtonRun = () => void;

export class PlayScene extends Phaser.Scene {
  private session!: GameSession;

  /** Cửa xin đề của màn kế — tên `makeSpec` sống ở session.ts, không nằm trong file này (R-04). */
  private source!: LevelSource;

  private state!: LevelState;

  private phase: RenderPhase = 'unfolding';

  /** Cú bấm bị khoá lúc đang hoạt cảnh (PC-05) — bộ giữ là dữ liệu, không phải số trần. */
  private readonly held = createInputBuffer();

  /** Cửa đăng ký rect DUY NHẤT của scene (A9: không copy phép đổi toạ độ, không mất `this`). */
  private hook!: Hook;

  /** PC-17: handler lifecycle của nền tảng sống song song với scene — shutdown rồi là KHÔNG. */
  private alive = false;

  private bg!: Phaser.GameObjects.Graphics;

  private sheet!: SheetView;

  private cards: OptionCard[] = [];

  private stars!: StarRow;

  private ink!: InkBadge;

  private levelText!: Phaser.GameObjects.Text;

  private explainText!: Phaser.GameObjects.Text;

  private slots: readonly { readonly row: SlotRow; readonly view: ButtonView }[] = [];

  private idle: Phaser.Time.TimerEvent | null = null;

  private clock: Phaser.Time.TimerEvent | null = null;

  private adsAbsent = false;

  constructor() {
    super('Play');
  }

  create(init: { level?: number }): void {
    this.session = readSession(this.game.registry);
    this.source = openLevelSource(this.session);
    this.hook = makeTestidHook(this, this.game.canvas, () => {
      const cam = this.cameras.main;
      return { width: cam.width, height: cam.height };
    });
    this.bg = this.add.graphics();
    const spec = this.source.specAt(init.level ?? this.session.startLevel());
    if (!spec) {
      this.scene.start('Title');
      return;
    }
    this.alive = true;
    this.state = initialLevelState(spec);
    this.spawn(spec);
    this.watchLifecycle();
    this.openSpec(spec);
    this.scale.on('resize', this.arrange, this);
    this.events.once('shutdown', () => this.teardown());
  }

  /** pause/resume của nền tảng -> dừng và NỐI LẠI đúng vòng đời scene (PC-17). */
  private watchLifecycle(): void {
    const life = this.session.adapter.lifecycle;
    life.onPause(() => {
      if (this.alive && this.scene.isActive()) this.scene.pause();
    });
    life.onResume(() => {
      if (this.alive && this.scene.isPaused()) this.scene.resume();
    });
    life.onMute((on) => {
      if (this.alive) this.sound.setMute(on);
    });
  }

  /** Dựng một lần toàn bộ object của màn chơi — hàng nút sinh từ bảng PLAY_SLOTS. */
  private spawn(spec: LevelSpec): void {
    const theme = themeFor(spec.chapter);
    const l = layoutOf(this.cameras.main.width, this.cameras.main.height);
    this.sheet = new SheetView(this, l.sheet, theme, sheetSkinOf(theme.grain));
    this.add.existing(this.sheet);
    this.cards = OPTION_IDS.map((_, i) => {
      const card = new OptionCard(this, i, l.options[i], theme);
      this.add.existing(card);
      card.onTap((index) => this.answer(index));
      return card;
    });
    this.stars = new StarRow(this, l.stars, theme);
    this.add.existing(this.stars);
    this.ink = new InkBadge(this, l.ink, theme);
    this.add.existing(this.ink);
    this.levelText = this.add.text(0, 0, '', textStyle('heading', theme.ink)).setOrigin(0.5);
    this.explainText = this.add.text(0, 0, '', textStyle('label', theme.ink)).setOrigin(0.5);
    const runs: Readonly<Record<string, ButtonRun>> = {
      'testid-btn-hint': () => this.useHintNow(),
      'testid-btn-undo': () => this.undoNow(),
      'testid-btn-undo-ad': () => this.adUndoNow(),
      'testid-btn-retry': () => this.retryNow(),
      'testid-btn-unfold': () => this.toNext(),
      'testid-btn-menu': () => this.leaveToTitle(),
      'testid-btn-sound': () => this.toggleSound(),
    };
    this.slots = PLAY_SLOTS.map((row) => {
      const view = makeButton(this, row.id, row.box(l), theme, row.glyph, row.primary, this.hook);
      this.add.existing(view.obj);
      if (row.labelKey !== null) view.setLabel(t(row.labelKey, this.session.dict));
      view.onTap(() => (runs[row.id] ?? (() => {}))());
      return { row, view };
    });
  }

  /** Nạp một đề: tờ giấy MỞ -> hoạt cảnh gập vào + mũi đục -> chờ 140ms (DUR.head) rồi `ready`. */
  private openSpec(spec: LevelSpec): void {
    this.state = initialLevelState(spec);
    this.phase = 'unfolding';
    this.held.reset();
    const theme = themeFor(spec.chapter);
    const l = layoutOf(this.cameras.main.width, this.cameras.main.height);
    this.cards.forEach((card, i) => {
      card.retint(theme, l.options[i]);
      card.setPoints(toPoints(spec.options[i].holes));
      card.markPick(false);
    });
    this.levelText.setText(String(spec.levelIndex));
    this.explainText.setText('');
    this.restartClock(spec);
    this.arrange();
    // BUGFIX "mất hoạt cảnh gấp giấy": tờ giấy PHẢI hiện ra ĐANG gập vào rồi mũi đục mới xuống
    // (như `drawFoldPunch` của MVP) — bản cũ đặt thẳng tư thế gấp cuối nên không có gì để xem.
    this.sheet.spread(spec.folds, spec.action);
    this.foldIn();
  }

  /**
   * Nhịp vào đề: gập từng lớp theo `foldInPlan` -> đục lỗ của ĐỀ -> chờ thêm `DUR.head` mới
   * sang `ready`. Suốt nhịp này máy ở pha `loading` nên bảng GATE đã khoá chạm (buffer=1).
   */
  private foldIn(): void {
    setMotionPhase(MOTION_PHASE.folding);
    this.sheet.foldIn(() => {
      setMotionPhase(MOTION_PHASE.folded);
      this.time.delayedCall(DUR.head, () => this.go(markReady(this.state)));
    });
  }

  /**
   * TRÁI TIM của tầng vẽ: mỗi khung hình đưa delta cho đồng hồ hoạt cảnh của tờ giấy và tờ giấy
   * VẼ LẠI từ giá trị hiện tại của nó (SheetView.tick -> SheetView.draw(frame)). Không có đường
   * "vẽ lại khi đổi pha" — đó chính là lỗi khiến mắt không thấy chuyển động (hình đứng im tới
   * lúc kết thúc), và cũng không dùng tween: xem anim/motionTrack.ts.
   */
  override update(_time: number, delta: number): void {
    if (this.sheet) this.sheet.tick(delta);
  }


  /** MỘT cửa đổi state: máy quyết, scene chỉ vẽ lại (PC-16). */
  private go(next: LevelState): void {
    this.state = next;
    this.paint();
  }

  private paint(): void {
    this.phase = RENDER_BY_PHASE[this.state.phase];
    this.applyCopy();
    this.arrange();
    this.armIdle();
    // PC-05: MỌI đường trở về ready (màn mới / retry / undo) đều ăn cú bấm đã giữ.
    this.flush();
  }

  /** Nhãn + nút chỉ đổi theo pha; sao/mực đọc từ session (logic + save), không tính ở view. */
  private applyCopy(): void {
    const st = this.state;
    const key = st.wrongInfo === null ? st.explainKey : st.wrongInfo.explainKey;
    this.explainText.setText(key === null ? '' : t('explain.' + key, this.session.dict));
    this.stars.setCount(this.session.starsAt(st.spec.levelIndex));
    this.ink.setValue(this.session.ink());
  }

  /** Cú bấm vào một ô: qua `tap`, xong `resolve` — máy trạng thái là nơi duy nhất phán quyết. */
  private answer(index: number): void {
    const gate = optionEnabledByState[this.phase];
    const next = tap(this.state, index);
    this.cards[index]?.press();
    playFx(this, 'click', this.session.soundOn());
    if (next === this.state) {
      // Đang animate: máy đã buffer (không đếm lượt), scene giữ lại để ăn khi về ready.
      if (gate.buffer === 1) this.held.hold(index);
      return;
    }
    this.stopBreath();
    this.state = next;
    this.phase = 'unfolding';
    this.arrange();
    this.state = resolve(this.state, (i) => this.source.specAt(i));
    this.reveal();
  }

  /**
   * Mở bung theo lịch (DS:120-122). Bản sai vẽ bộ lỗ của ô đã chọn + vệt giải thích.
   * Đường chờ lớp lấy từ bảng `unfoldPlan(layers)` nên mọi số lớp (2..16) đều có hoạt cảnh;
   * `unfoldTimeline` chỉ còn vai trò KIỂM TRẦN và báo về QA khi input lọt khỏi dải (C9).
   */
  private reveal(): void {
    const st = this.state;
    const wrong = st.phase === 'wrong';
    const chosen = st.wrongInfo === null ? null : st.wrongInfo.chosenIndex;
    const points: readonly Point[] = toPoints(
      wrong && chosen !== null ? st.spec.options[chosen].holes : st.spec.answerHoles,
    );
    const layers = 2 ** st.spec.folds.length;
    const budget = holeBudget(points.length);
    const plan = unfoldTimeline({ layers, holes: Math.max(1, budget.shown), wrong });
    if (budget.hidden > 0) this.report({ reason: 'holes-clipped', level: st.spec.levelIndex, hidden: budget.hidden });
    if (plan === null) this.report({ reason: 'no-timeline', level: st.spec.levelIndex, layers });
    playFx(this, 'unfold', this.session.soundOn());
    setMotionPhase(MOTION_PHASE.unfolding);
    this.sheet.unfold(() => {
      if (wrong) {
        setMotionPhase(MOTION_PHASE.explaining);
        this.sheet.explain(points, 'picked', () => this.finish());
      } else {
        setMotionPhase(MOTION_PHASE.holes);
        this.sheet.popHoles(points, 'answer', () => this.finish());
      }
    });
  }


  /** Báo bất thường của tầng vẽ cho scene cha (QA nối vào event này — không im lặng cắt số). */
  private report(detail: Record<string, number | string>): void {
    // EventBus của Phaser 4 bắt tuple nghiệm (tuple rỗng) ->_cast_ cửa emit của riêng báo cáo.
    const bus = this.events as unknown as { emit(type: string, payload: unknown): void };
    bus.emit(VIEW_REPORT, detail);
  }

  /** Hoạt cảnh kết thúc: vẽ pha thật của máy + chơi phần thưởng của bảng OUTCOME. */
  private finish(): void {
    setMotionPhase(MOTION_PHASE.result);
    this.paint();
    applyOutcome(this.state, {
      fx: (key) => playFx(this, key, this.session.soundOn()),
      shake: () => this.sheet.shake(this.state.spec.seed),
      commit: (result) => {
        this.session.commit(result);
        this.stars.setCount(this.session.starsAt(result.level));
      },
    });
  }

  /** PC-05: máy vừa về ready thì ăn cú bấm đã giữ (đường nào về ready cũng qua paint()). */
  private flush(): void {
    if (this.phase !== 'ready') return;
    const index = this.held.take();
    if (index !== null) this.answer(index);
  }

  /** Cạch vào máy: pha hiện tại có đi tới `to` được không (đồ thị cạnh do logic sở hữu). */
  private canGo(to: LevelPhase): boolean {
    return TRANSITIONS[this.state.phase].includes(to);
  }

  private backToReady(next: LevelState): void {
    this.sheet.fold(this.state.spec.folds, this.state.spec.action);
    setMotionPhase(MOTION_PHASE.folded);
    this.go(next);
  }

  private useHintNow(): void {
    if (this.state.phase !== 'ready') return; // F2: bấm trùng lúc đang animate không được ném
    const next = useHint(this.state);
    if (next === this.state) return;
    this.go(next);
    this.sheet.highlightCrease(peekFold(this.state));
    this.sheet.breath(breathPlan());
    playFx(this, 'punch', this.session.soundOn());
  }

  /** Retry / undo đều là wrong -> ready; guard bằng đồ thị transition (F2). */
  private retryNow(): void {
    if (!this.canGo('ready')) return;
    this.backToReady(retry(this.state));
  }

  /** Undo miễn phí: chỉ hiện khi nền tảng không có ad (PC-13 — không để nút chết). */
  private undoNow(): void {
    if (!this.canUndo() || !this.canGo('ready')) return;
    this.backToReady(useUndo(this.state));
  }

  /**
   * Undo bằng rewarded ad; 'unavailable' => ẩn nút ad, chuyển sang đường miễn phí.
   * A12: Promise KHÔNG được bỏ — mọi đường lỗi (kể cả adapter ném) đều chốt về adsAbsent.
   */
  private adUndoNow(): void {
    this.session.rewarded('undo')
      .then((ok) => {
        if (!this.alive) return;
        if (ok) this.undoNow();
        else this.adsUnavailable();
      })
      .catch(() => {
        this.adsUnavailable();
      });
  }

  private adsUnavailable(): void {
    this.adsAbsent = true;
    this.arrange();
  }

  /** Quyền hoàn của máy (không phải luật ở view): còn lượt sai và chưa dùng undo. */
  private canUndo(): boolean {
    const st = this.state;
    return this.phase === 'wrong' && !st.undoUsed && st.misses > 0;
  }

  private toNext(): void {
    if (!this.canGo('next')) return; // F2: bấm "next" lần thứ hai khi đang trượt là no-op
    this.state = nextLevel(this.state);
    const next = this.state.nextSpec;
    if (!next) {
      this.scene.start('Title');
      return;
    }
    this.clearTimers();
    this.sheet.slideOut(() => this.openSpec(next));
  }

  private leaveToTitle(): void {
    this.scene.start('Title');
  }

  private toggleSound(): void {
    const on = this.session.toggleSound();
    this.sound.setMute(!on);
    if (on) playFx(this, 'click', true);
  }

  /** Timer mềm của màn có đồng hồ — cờ do LevelSpec mang (PC-01), view không tự suy. */
  private restartClock(spec: LevelSpec): void {
    this.clearTimers();
    if (!spec.timerOn) return;
    this.clock = this.time.addEvent({
      delay: TICK_MS,
      loop: true,
      callback: () => {
        this.state = advanceClock(this.state, TICK_MS);
      },
    });
  }

  /** Hơi thở chỉ đường (DS:124): chỉ ở màn dạy luật, chỉ sau khi idle đủ 5s. */
  private armIdle(): void {
    const plan = breathPlan();
    if (this.idle) this.idle.remove();
    this.idle = null;
    if (!plan.teachOnly || !this.session.teach(this.state.spec.levelIndex)) return;
    this.idle = this.time.delayedCall(plan.idleGateMs, () => {
      if (this.phase === 'ready') this.sheet.breath(plan);
    });
  }

  private stopBreath(): void {
    this.sheet.stopBreath();
    this.sheet.highlightCrease(null);
  }

  private clearTimers(): void {
    if (this.idle) this.idle.remove();
    if (this.clock) this.clock.remove();
    this.idle = null;
    this.clock = null;
  }

  private teardown(): void {
    this.alive = false;
    this.clearTimers();
    this.scale.off('resize', this.arrange, this);
    for (const row of PLAY_HOOKS) clearTestid(row.id);
    for (const row of PLAY_SLOTS) clearTestid(row.id);
  }

  /** Xếp lại theo camera + đăng ký rect thật cho QA (gọi cả khi resize). */
  private arrange(): void {
    if (!this.sheet) return;
    const cam = this.cameras.main;
    const l = layoutOf(cam.width, cam.height);
    const theme = themeFor(this.state.spec.chapter);
    this.bg.clear();
    this.bg.fillGradientStyle(
      parseHex(theme.bg.top), parseHex(theme.bg.top), parseHex(theme.bg.bottom), parseHex(theme.bg.bottom), 1,
    );
    this.bg.fillRect(0, 0, l.w, l.h);
    this.sheet.relayout(l.sheet, theme);
    this.cards.forEach((card, i) => card.relayout(l.options[i]));
    this.stars.retint(theme, l.stars);
    this.ink.retint(theme, l.ink);
    this.levelText.setStyle(textStyle('heading', theme.ink))
      .setPosition(l.level.x + l.level.w / 2, l.level.y + l.level.h / 2);
    this.explainText.setStyle(textStyle('label', theme.ink));
    this.explainText.setPosition(l.cx, l.banner.y + l.banner.h / 2);
    const gate = optionEnabledByState[this.phase];
    const picked = this.pickedNow();
    const dimmed = this.shown('correct') || this.shown('wrong');
    this.cards.forEach((card, i) => {
      card.setGate(i === picked || !dimmed ? gate.alpha : TOUCH.alphaUnchosen);
      card.markPick(i === picked);
    });
    const flags: SlotFlags = {
      phase: this.phase,
      hintUsed: this.state.hintUsed,
      undoLeft: this.canUndo(),
      adsAbsent: this.adsAbsent,
    };
    // Hàng nút: khe ĐƠN ĐỘC trong hàng phải về TRỤC CỘT (Việc 2 — luật ở layout.slotBoxes,
    // không phải một nhánh if trong scene: thêm hàng mới là thêm một dòng `row` trong bảng).
    const places = this.slots.map((slot) => ({
      id: slot.row.id, row: slot.row.row, box: slot.row.box(l), shown: slot.row.on(flags),
    }));
    const boxes = slotBoxes(places, l.cx);
    this.slots.forEach((slot, i) => {
      if (slot.row.on(flags)) slot.view.show();
      else slot.view.hide();
      slot.view.retint(theme, boxes[i]);
    });
    for (const row of PLAY_HOOKS) {
      const b = row.rect(this, l);
      if (b) this.hook(row.id, b);
      else clearTestid(row.id);
    }
  }

  /** Ô được chọn ở lượt này (machine cho biết, view không đoán). */
  private pickedNow(): number {
    const st = this.state;
    return st.picked ?? st.lastWrong ?? -1;
  }

  // --- cửa đọc cho bảng PLAY_HOOKS (scene khác không gọi) --------------------

  opened(): boolean {
    return isOpenPhase(this.phase);
  }

  shown(phase: RenderPhase): boolean {
    return this.phase === phase;
  }

  packetBox(l: Layout): Box {
    return this.sheet.packetBox(l.sheet);
  }

  holeBox(l: Layout): Box {
    return this.sheet.holeBox(l.sheet);
  }

  breathBox(l: Layout): Box {
    if (!this.state.hintUsed) return l.sheet;
    return creaseBand(l.sheet, peekFold(this.state) ?? this.state.spec.folds.length - 1);
  }
}
