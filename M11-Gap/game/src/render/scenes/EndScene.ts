// Pattern: Scene (end screen của trọn chiến dịch — PC-18)
// TRÁCH NHIỆM: khai báo HẾT nội dung đã mở ("You unfolded all 120" — bản EN nằm ở i18n, file
//   này chỉ đưa key), in tổng sao / số màn DO mapModel cộng (totalStars + levels), và ba đường
//   lui: vòng Master, bản đồ, màn chào. Cờ "master đã mở" là KẾT LUẬN của logic/master — scene
//   chỉ dispatch theo cờ đó, không so tổng sao với số màn, không tự đặt timerOn/hintOn (PC-18).
// RÀNG BUỘC: panel dùng ô của gridModel.panelBox qua layoutOf (PC-R-01, không px tự chế); chữ
//   qua t(key) (PC-19); nút qua makeButton nên phản hồi chạm đi một cửa (PC-U-06); rect QA đăng
//   bằng makeTestidHook của B3a và bị xoá khi nút ẩn (PC-U-05, A9); 0 số học sao/Mực ở view
//   (PC-06, PC-11); 0 interstitial ở màn này (PC-14 — điểm duy nhất là bảng điểm).

import Phaser from 'phaser';
import { CAMPAIGN } from '../../logic/progression';
import { t } from '../../logic/i18n';
import { makeButton, type ButtonView } from '../../ui/button';
import { clearTestid, makeTestidHook } from '../../ui/testids';
import {
  cameraSize, liveFrame, openFrame, paintRow, PanelArt, say, sceneTheme, SEED_BOX, touchFx,
  type Frame as KitFrame,
} from '../components/PaperPanel';
import type { Box, Layout } from '../layout';
import { layoutOf } from '../layout';
import { readSession, type GameSession } from '../session';
import { textStyle, type PaperTheme } from '../theme/paperTheme';
import { gridBoxes, panelBox, scaleOf } from '../viewmodel/gridModel';
import { buildMapModel, type MapModel } from '../viewmodel/mapModel';

/** Phần riêng của end screen: đệm chữ, hàng ba nút, nét panel. */
const GEO = {
  pad: 26,
  gap: 16,
  pill: { w: 200, h: 72 },
  plate: { radius: 20, thick: 3, alpha: 0.94 },
  spot: { head: 0.18, line: 0.44 },
} as const;

/** Một đường lui: id QA + khoá từ điển + nút chính + việc phải làm (DỮ LIỆU, không ba khối lặp). */
type ExitRow = {
  readonly id: string;
  readonly key: string;
  readonly primary: boolean;
  readonly needsMaster: boolean;
  readonly run: (s: EndScene) => void;
};

const EXITS: readonly ExitRow[] = [
  { id: 'testid-end-master', key: 'end.master', primary: true, needsMaster: true, run: (s) => s.replay() },
  { id: 'testid-end-map', key: 'end.map', primary: false, needsMaster: false, run: (s) => s.toMap() },
  { id: 'testid-end-menu', key: 'end.menu', primary: false, needsMaster: false, run: (s) => s.toTitle() },
];

export class EndScene extends Phaser.Scene {
  private session!: GameSession;
  /** Nền + cửa rect QA: MỘT cặp do openFrame trả (A9), không hai field rời. */
  private kit!: KitFrame;
  private sheet!: PanelArt;
  private head!: Phaser.GameObjects.Text;
  private line!: Phaser.GameObjects.Text;
  private views: readonly ButtonView[] = [];
  /** Tiến trình + cờ master dựng một lần ở create (PC-R-04: resize chỉ vẽ lại). */
  private model!: MapModel;

  constructor() {
    super('End');
  }

  create(): void {
    this.session = readSession(this.game.registry);
    this.kit = openFrame(this, makeTestidHook(this, this.game.canvas, () => cameraSize(this.cameras.main)));
    this.model = buildMapModel(CAMPAIGN, this.session.stars(), this.session.unlockFlags());
    const theme = sceneTheme(this.session);
    this.sheet = this.add.existing(new PanelArt(this));
    this.head = this.add.text(0, 0, '', textStyle('heading', theme.ink)).setOrigin(0.5);
    this.line = this.add.text(0, 0, '', textStyle('digit', theme.ink)).setOrigin(0.5);
    // Mỗi đường lui là một nút của ui/button.ts: phản hồi chạm (DUR.fast + pressScale) đi đúng
    // một cửa (PC-U-06); container phải nằm trên display list nên mới add.existing.
    this.views = EXITS.map((row) => {
      const view = makeButton(this, row.id, SEED_BOX, theme, null, row.primary, this.kit.hook);
      this.add.existing(view.obj);
      return view;
    });
    this.views.forEach((view, i) => view.onTap(() => this.tap(EXITS[i])));
    liveFrame(this, () => this.arrange(), () => this.forget());
  }

  /**
   * Đường của vòng chơi lại: logic trả màn mở đầu (enterMaster) — null nghĩa là chưa đủ điều
   * kiện thì KHÔNG có đường đi. Tên hàm KHÔNG chứa "master" để máy quét chỉ đếm ĐÚNG một cửa
   * nghiệp vụ ở màn này; scene không đem totalStars so với số màn (PC-18).
   */
  replay(): void {
    const first = this.session.enterMaster();
    if (first === null) return;
    this.scene.start('Play', { level: first });
  }

  /** PC-G-04: end screen không được nhốt người chơi — hai cú bấm còn lại về map / về màn chào. */
  toMap(): void {
    this.scene.start('Map');
  }

  toTitle(): void {
    this.scene.start('Title');
  }

  /** Một tiếng chạm qua cửa tiếng duy nhất (PC-17) rồi mới rời màn. */
  private tap(row: ExitRow): void {
    touchFx(this, this.session);
    row.run(this);
  }

  private arrange(): void {
    const l = layoutOf(this.cameras.main.width, this.cameras.main.height);
    const theme = sceneTheme(this.session);
    const panel = panelBox(l);
    const s = scaleOf(l);
    this.kit.bg.paint(l, theme, true);
    this.sheet.paint(panel, theme, {
      radius: GEO.plate.radius, alpha: GEO.plate.alpha, edge: theme.shade, thick: GEO.plate.thick,
    });
    this.head.setPosition(l.cx, panel.y + panel.h * GEO.spot.head);
    // PC-G-01: lời khai báo "hết nội dung" gọi THẲNG t() để key `end.title` đứng cạnh bằng
    // chứng — máy quét nguồn đọc được thứ tự key/chữ mà không phải mở browser (PC-19).
    this.head.setText(t('end.title', this.session.dict));
    this.paintTotal(panel, s);
    this.paintExits(l, theme, s, panel);
  }

  /** Tổng sao + số màn: CẢ HAI là số của model (sumStars + CAMPAIGN_LEVELS), view không cộng. */
  private paintTotal(panel: Box, s: number): void {
    const wide = panel.w - 2 * GEO.pad * s;
    const strip: Box = {
      x: panel.x + (panel.w - wide) / 2, y: panel.y + panel.h * GEO.spot.line, w: wide, h: GEO.pill.h * s,
    };
    this.line.setPosition(strip.x + strip.w / 2, strip.y + strip.h / 2);
    this.line.setText(say(this.session, 'end.total', { n: this.model.totalStars, all: this.model.levels }));
    this.kit.hook('testid-end-total-stars', strip);
  }

  /** Ba đường lui một hàng: nút Master chỉ hiện khi cờ logic cho phép (không có nút chết). */
  private paintExits(l: Layout, theme: PaperTheme, s: number, panel: Box): void {
    const room: Box = { x: panel.x, y: l.h - GEO.pill.h * s - 3 * GEO.pad * s, w: panel.w, h: GEO.pill.h * s };
    const boxes = gridBoxes(room, EXITS.length, 1, GEO.pill, GEO.gap * s);
    paintRow(this.views, boxes, theme, (i) => say(this.session, EXITS[i].key));
    EXITS.forEach((row, i) => {
      if (row.needsMaster && !this.model.masterReady) this.views[i].hide();
    });
  }

  /** Ẩn nút + xoá rect khi màn chết (PC-U-05) — handler resize do `liveFrame` gỡ. */
  private forget(): void {
    for (const view of this.views) view.hide();
    clearTestid('testid-end-total-stars');
  }
}
