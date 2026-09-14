// Pattern: Scene (bản đồ tiến trình)
// TRÁCH NHIỆM: một cột dọc gồm hàng tab 8 chương (pill 200x72 — DS:102), lưới 15 ô của tab đang
//   chọn (ô 168 × 168, cụm sao 32 px — DS:102), dòng điều kiện khoá khi tab chưa mở, và modal
//   Settings (sound / mute / reset có xác nhận HAI bước). Scene chỉ VẼ những gì mapModel trả:
//   cờ `locked` và cặp số {need}/{total} là KẾT LUẬN của progression — không có phép so sánh
//   nào viết lại ở đây, nên file này không xuất hiện con số ngưỡng nào (PC-07).
// RÀNG BUỘC: mọi nhãn qua t(key) (PC-19); mọi ô qua gridModel + layoutOf (PC-R-01: đổi cỡ chỉ
//   tính lại ô, không sinh đề — PC-R-04); nút bấm tạo qua makeButton nên nhịp chạm 120ms đi
//   đúng một cửa (PC-U-06); rect QA đăng bằng makeTestidHook của B3a và bị xoá khi nút ẩn.

import Phaser from 'phaser';
import { CAMPAIGN, chapterOf } from '../../logic/progression';
import { TOUCH } from '../anim/unfoldPlan';
import { makeButton, type ButtonView } from '../../ui/button';
import { clearTestid, makeTestidHook, qaId } from '../../ui/testids';
import {
  cameraSize, liveFrame, openFrame, paintRow, PanelArt, say, touchFx,
  type Frame as KitFrame,
} from '../components/PaperPanel';
import { MapNode } from '../components/MapNode';
import { StarRow } from '../components/StarRow';
import type { Box, Layout } from '../layout';
import { layoutOf } from '../layout';
import { readSession, type GameSession } from '../session';
import { themeFor, textStyle, type PaperTheme } from '../theme/paperTheme';
import { cellGrid, frameOf, gridBoxes, scaleOf, type Frame } from '../viewmodel/gridModel';
import {
  buildMapModel, chapterTab, type MapModel, type MapNode as MapCell,
} from '../viewmodel/mapModel';

/** Ô tạm trước khi camera biết kích thước — arrange() đặt lại ngay ở lần vẽ đầu. */
const ZERO: Box = { x: 0, y: 0, w: 44, h: 44 };

/** Số đo riêng của màn này (pack §3): pill 200x72, kẽ 16, cụm sao tab 32, dải khoá 60. */
const GEO = {
  pill: { w: 200, h: 72 },
  gap: 16,
  star: 32,
  gate: 60,
  modal: { radius: 16, thick: 2, alpha: 0.95 },
} as const;

/** Một hàng nút: id QA + khoá từ điển + việc phải làm — DỮ LIỆU, không ba khối lặp nhau. */
type BarRow = {
  readonly id: string;
  readonly key: string;
  readonly glyph: string | null;
  readonly run: (s: MapScene) => void;
};

/** Hàng dưới của bản đồ: sang spa, sang album, mở modal Settings. */
const BAR: readonly BarRow[] = [
  { id: 'testid-map-shop', key: 'shop.title', glyph: 'shop', run: (s) => s.visit('Shop') },
  { id: 'testid-map-album', key: 'album.title', glyph: null, run: (s) => s.visit('Album') },
  { id: 'testid-map-settings', key: 'map.settings', glyph: 'menu', run: (s) => s.toggleSettings() },
];

/** Bốn nút trong modal Settings; `reset` là nút có hai nhát bấm (PC-17). */
const PANEL: readonly BarRow[] = [
  { id: 'testid-set-sound', key: 'map.sound', glyph: 'sound', run: (s) => s.setSound(true) },
  { id: 'testid-set-mute', key: 'map.mute', glyph: 'sound', run: (s) => s.setSound(false) },
  { id: 'testid-set-reset', key: 'map.reset', glyph: null, run: (s) => s.confirmReset() },
  { id: 'testid-map-close', key: 'map.close', glyph: null, run: (s) => s.toggleSettings() },
];

/** Một ô màn: nút nền (B3a) + hoạ sao/khoá (MapNode) — một hồ sơ theo levelIndex. */
type CellEntry = { readonly view: ButtonView; readonly art: MapNode };

export class MapScene extends Phaser.Scene {
  private session!: GameSession;
  /** Nền giấy + CỬA rect QA của riêng màn này (A9 — không tự nhân sx/sy). */
  private kit!: KitFrame;
  private sheet!: PanelArt;
  private head!: Phaser.GameObjects.Text;
  private gate!: Phaser.GameObjects.Text;
  private note!: Phaser.GameObjects.Text;
  private marks!: StarRow;
  private model!: MapModel;
  private tabs: readonly ButtonView[] = [];
  private bar: readonly ButtonView[] = [];
  private panel: readonly ButtonView[] = [];
  /** Ô đã dựng lần trước — tạo MỘT lần để id QA theo levelIndex ổn định mọi lần vào màn. */
  private readonly pool = new Map<number, CellEntry>();
  private chapter = 1;
  private settings = false;
  /** Cờ "nhát reset đầu đã đứng đây" — chưa có lệnh nào chạm vào save. */
  private armed = false;

  constructor() {
    super('Map');
  }

  create(): void {
    this.session = readSession(this.game.registry);
    this.kit = openFrame(this, makeTestidHook(this.game.canvas, () => cameraSize(this.cameras.main)));
    this.pool.clear();
    this.sheet = this.add.existing(new PanelArt(this));
    this.rebuild();
    this.chapter = chapterOf(this.session.level());
    const ink = this.palette().ink;
    this.head = this.add.text(0, 0, '', textStyle('title', ink)).setOrigin(0, 0.5);
    this.gate = this.add.text(0, 0, '', textStyle('label', ink)).setOrigin(0.5);
    this.note = this.add.text(0, 0, '', textStyle('label', ink)).setOrigin(0.5);
    this.marks = this.add.existing(new StarRow(this, ZERO, this.palette()));
    // Id QA động (pack §5): tab chương n là `testid-map-chapter-1` … `testid-map-chapter-8`,
    // qaId là cửa duy nhất ghép số thứ tự, không prefix hở ở nơi gọi.
    this.tabs = CAMPAIGN.map((row) => this.spawn(qaId('map-chapter', row.chapter), null));
    this.bar = BAR.map((row) => this.spawn(row.id, row.glyph));
    this.panel = PANEL.map((row) => this.spawn(row.id, row.glyph));
    this.tabs.forEach((view, i) => view.onTap(() => this.pick(CAMPAIGN[i].chapter)));
    BAR.forEach((row, i) => this.bar[i].onTap(() => this.run(row, i)));
    PANEL.forEach((row, i) => this.panel[i].onTap(() => this.run(row, i)));
    liveFrame(this, () => this.arrange(), () => this.forget());
  }

  // ------------------------------------------------------------ cửa cho bảng
  /** Đổi tab: chỉ thay phần đang vẽ, dữ liệu tiến trình giữ nguyên (PC-R-04). */
  pick(chapter: number): void {
    touchFx(this, this.session);
    this.chapter = chapter;
    this.arrange();
  }

  /** Vào một màn của tab đang chọn — cờ `locked` do mapModel trả, scene không tự suy. */
  play(node: MapCell): void {
    touchFx(this, this.session);
    if (node.locked) return;
    this.scene.start('Play', { level: node.levelIndex });
  }

  /** Một cú bấm sang màn khác trong cùng vòng tiến trình. */
  visit(key: string): void {
    touchFx(this, this.session);
    this.scene.start(key);
  }

  toggleSettings(): void {
    touchFx(this, this.session);
    this.settings = !this.settings;
    this.armed = false;
    this.arrange();
  }

  /** Tiếng/Mute cùng một cửa: nền tảng chỉ có một toggle nên nhát bấm chỉ sửa khi khác. */
  setSound(on: boolean): void {
    touchFx(this, this.session);
    if (this.session.soundOn() !== on) this.session.toggleSound();
    this.arrange();
  }

  /** Nhát một: vũ khí + in câu xác nhận. Nhát hai: qua ĐÚNG cửa session.resetProgress. */
  confirmReset(): void {
    touchFx(this, this.session);
    if (!this.armed) {
      this.armed = true;
      this.arrange();
      return;
    }
    this.armed = false;
    this.session.resetProgress();
    this.rebuild();
    this.chapter = chapterOf(this.session.level());
    this.arrange();
  }

  // ------------------------------------------------------------- bên trong
  /** Mô hình tiến trình dựng lại từ đúng ba input đã lưu (view-model là nguồn duy nhất). */
  private rebuild(): void {
    this.model = buildMapModel(CAMPAIGN, this.session.stars(), this.session.unlockFlags());
  }

  private palette(): PaperTheme {
    return themeFor(this.chapter);
  }

  /** Nút nền của một ô/tab: `makeButton` của ui/button.ts là cửa duy nhất cho phản hồi chạm. */
  private spawn(id: string, glyph: string | null): ButtonView {
    const view = makeButton(this, id, ZERO, this.palette(), glyph, false, this.kit.hook);
    this.add.existing(view.obj);
    return view;
  }

  /** Một cú bấm ở hàng dưới hoặc modal: bảng dữ liệu tự nói nó thuộc nhóm nào. */
  private run(row: BarRow, index: number): void {
    const inModal = PANEL.indexOf(row) >= 0;
    (inModal ? this.panel[index] : this.bar[index]).press();
    row.run(this);
  }

  /** Vẽ lại cả màn: tính ô từ camera, đặt chữ, đăng rect cho ĐÚNG nút đang hiện. */
  private arrange(): void {
    const l = layoutOf(this.cameras.main.width, this.cameras.main.height);
    const theme = this.palette();
    const f = frameOf(l);
    this.kit.bg.paint(l, theme, true);
    this.head.setPosition(f.head.x, f.head.y + f.head.h / 2);
    this.head.setText(say(this.session, 'map.title'));
    this.paintTabs(l, theme, f);
    this.paintStars(l, theme, f);
    this.paintGrid(l, theme, f);
    this.paintBar(l, theme, f);
    this.paintModal(l, theme, f);
  }

  private paintTabs(l: Layout, theme: PaperTheme, f: Frame): void {
    const boxes = gridBoxes(f.tabs, CAMPAIGN.length, 1, GEO.pill, GEO.gap * scaleOf(l));
    paintRow(this.tabs, boxes, theme, (i) => say(this.session, 'map.chapter', { n: CAMPAIGN[i].chapter }));
    CAMPAIGN.forEach((row, i) => {
      const tab = chapterTab(this.model, row.chapter);
      this.tabs[i].obj.setAlpha(tab.locked ? TOUCH.alphaDisabled : 1);
    });
  }

  /** Cụm sao của tab đang chọn: tổng sao DO mapModel cộng, scene chỉ đưa ô cho StarRow. */
  private paintStars(l: Layout, theme: PaperTheme, f: Frame): void {
    const w = GEO.star * scaleOf(l) * 4;
    this.marks.retint(theme, { x: f.head.x + f.head.w - w, y: f.head.y, w, h: f.head.h });
    this.marks.setCount(chapterTab(this.model, this.chapter).stars);
  }

  /** Tab khoá => ẩn lưới + in dải điều kiện khoá; tab mở => vẽ ô, xoá rect dải khoá. */
  private paintGrid(l: Layout, theme: PaperTheme, f: Frame): void {
    const tab = chapterTab(this.model, this.chapter);
    if (!tab.locked) {
      this.dropGate();
      const boxes = cellGrid(l);
      tab.nodes.forEach((node, i) => this.slot(node, theme, boxes[i]));
      return;
    }
    this.hideCells();
    const band: Box = { x: f.grid.x, y: f.grid.y + f.grid.h / 2 - GEO.gate / 2, w: f.grid.w, h: GEO.gate };
    this.gate.setVisible(true);
    this.gate.setPosition(band.x + band.w / 2, band.y + band.h / 2);
    this.gate.setText(say(this.session, 'map.gate', { need: this.model.gate.need, total: this.model.gate.total }));
    this.kit.hook('testid-map-locked', band);
  }

  private dropGate(): void {
    this.gate.setVisible(false);
    clearTestid('testid-map-locked');
  }

  /** Ô của một màn: tạo một lần theo levelIndex, lần sau chỉ đổi chỗ và đổi hoạ. */
  private slot(node: MapCell, theme: PaperTheme, box: Box): void {
    let entry = this.pool.get(node.levelIndex);
    if (entry === undefined) {
      // Ô màn levelIndex n => `testid-map-node-1` … `testid-map-node-120` (id dựng từ index).
      const view = this.spawn(qaId('map-node', node.levelIndex), null);
      view.onTap(() => this.play(node));
      entry = { view, art: this.add.existing(new MapNode(this, box, theme)) };
      this.pool.set(node.levelIndex, entry);
    }
    entry.view.retint(theme, box);
    entry.view.setLabel(String(node.levelIndex));
    entry.art.retint(theme, box);
    entry.art.set(node);
    entry.art.setVisible(true);
    entry.view.show();
  }

  private hideCells(): void {
    for (const entry of this.pool.values()) {
      entry.view.hide();
      entry.art.setVisible(false);
    }
  }

  private paintBar(l: Layout, theme: PaperTheme, f: Frame): void {
    const boxes = gridBoxes(f.bar, BAR.length, 1, GEO.pill, GEO.gap * scaleOf(l));
    paintRow(this.bar, boxes, theme, (i) => say(this.session, BAR[i].key));
  }

  /** Modal: đóng là ẩn nút + xoá rect (PC-U-05); mở thì đè lên đúng dải lưới. */
  private paintModal(l: Layout, theme: PaperTheme, f: Frame): void {
    if (!this.settings) {
      for (const view of this.panel) view.hide();
      this.sheet.clear();
      this.note.setVisible(false);
      return;
    }
    const box: Box = { x: f.grid.x, y: f.grid.y, w: f.grid.w, h: f.grid.h };
    this.sheet.paint(box, theme, {
      radius: GEO.modal.radius, alpha: GEO.modal.alpha, edge: theme.crease, thick: GEO.modal.thick,
    });
    const boxes = gridBoxes(box, 2, 2, GEO.pill, GEO.gap * scaleOf(l));
    paintRow(this.panel, boxes, theme, (i) => say(this.session, PANEL[i].key));
    this.note.setText(say(this.session, 'map.confirm'));
    this.note.setVisible(this.armed);
    this.note.setPosition(l.cx, box.y - GEO.gate * scaleOf(l));
  }

  /** Tất cả nút ẩn thì rect cũng phải biến mất — không để lại vùng bấm vô hình. */
  private forget(): void {
    this.hideCells();
    for (const view of [...this.tabs, ...this.bar, ...this.panel]) view.hide();
    this.dropGate();
  }
}
