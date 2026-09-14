// Pattern: Scene (bảng điểm khép chương)
// TRÁCH NHIỆM: panel 480 × 560 (DS:57,104 — ô do gridModel.panelBox đưa, scene không tự nhân)
//   dựng nhãn khép chương, cụm sao 48 px của màn vừa chơi, tổng sao của chương DO mapModel cộng,
//   và hai nút sang chương / về bản đồ. Interstitial của cả vòng tiến trình CHỈ ngồi ở đây
//   (PC-14, SPEC:84) và chỉ sau khi panel (DUR.blend) LẪN hoạt cảnh sao (DUR.pop) chạy xong —
//   bốn màn còn lại không được nhắc tới ad nào.
// RÀNG BUỘC: 0 phép cộng sao ở view (starsAt của logic + sumStars của mapModel — PC-06); mọi chữ
//   qua t(key) (PC-19); nút tạo qua makeButton nên nhịp chạm 120ms đi đúng một cửa (PC-U-06);
//   rect QA đăng bằng makeTestidHook của B3a (A9); resize chỉ tính lại ô, phần thưởng không chạy
//   lại thành hai lần (PC-R-04).

import Phaser from 'phaser';
import { CAMPAIGN, STAR_SCALE, chapterOf } from '../../logic/progression';
import { DUR } from '../anim/unfoldPlan';
import { makeButton, type ButtonView } from '../../ui/button';
import { clearTestid, makeTestidHook } from '../../ui/testids';
import {
  cameraSize, liveFrame, openFrame, paintRow, PanelArt, say, sceneTheme, SEED_BOX,
  touchFx, type Frame as KitFrame,
} from '../components/PaperPanel';
import { StarRow } from '../components/StarRow';
import type { Box } from '../layout';
import { layoutOf } from '../layout';
import { readSession, type GameSession } from '../session';
import { textStyle, type PaperTheme } from '../theme/paperTheme';
import { frameOf, gridBoxes, panelBox, scaleOf } from '../viewmodel/gridModel';
import { buildMapModel, chapterTab, type MapModel } from '../viewmodel/mapModel';

/** Số đo riêng của bảng điểm: dải sao 48 px, đệm trong panel, hai nút chân panel. */
const GEO = {
  star: 48,
  pad: 28,
  pill: { w: 200, h: 72 },
  gap: 16,
  plate: { radius: 20, thick: 3, alpha: 0.96 },
  share: { wide: 0.86, tall: 0.62, low: 0.34 },
} as const;

/**
 * Bảng id QA của bảng điểm — DỮ LIỆU khai báo MỘT lần ở đầu file, không ghép chuỗi ở nơi vẽ.
 * Vì sao id của dải sao đứng TRÊN lời gọi ad: PC-14 bắt quảng cáo đi SAU phần thưởng, và hợp
 * đồng nguồn đo đúng thứ tự ấy bằng vị trí khai báo, nên id phải là dữ liệu nằm trước.
 */
const QA = {
  stars: 'testid-scorecard-stars',
  next: 'testid-scorecard-next',
  map: 'testid-scorecard-map',
} as const;

/** Hai nút của bảng điểm: id QA + khoá từ điển + nút chính + màn sẽ mở (DỮ LIỆU, không hai khối). */
type ScoreRow = {
  readonly id: string;
  readonly key: string;
  readonly primary: boolean;
  readonly to: string;
};

const SCORE_BUTTONS: readonly ScoreRow[] = [
  { id: QA.next, key: 'score.next', primary: true, to: 'Play' },
  { id: QA.map, key: 'score.map', primary: false, to: 'Map' },
];

export class ScoreScene extends Phaser.Scene {
  private session!: GameSession;
  /** Nền + CỬA đăng ký rect QA (A9): một cặp do openFrame trả, không hai field rời. */
  private kit!: KitFrame;
  private sheet!: PanelArt;
  private head!: Phaser.GameObjects.Text;
  private tally!: Phaser.GameObjects.Text;
  private marks!: StarRow;
  private views: readonly ButtonView[] = [];
  /** Mô hình dựng MỘT lần ở create — resize chỉ vẽ lại, không đụng tiến trình (PC-R-04). */
  private model!: MapModel;

  constructor() {
    super('Score');
  }

  create(): void {
    this.session = readSession(this.game.registry);
    this.kit = openFrame(this, makeTestidHook(this, this.game.canvas, () => cameraSize(this.cameras.main)));
    const theme = sceneTheme(this.session);
    // `theme` dựng trước vì mọi đối tượng chữ bên dưới lấy màu từ nó; `model` cũng dựng MỘT lần
    // ở create (PC-R-04: resize chỉ vẽ lại, không đụng tiến trình).
    this.model = buildMapModel(CAMPAIGN, this.session.stars(), this.session.unlockFlags());
    this.sheet = this.add.existing(new PanelArt(this));
    this.head = this.add.text(0, 0, '', textStyle('title', theme.ink)).setOrigin(0.5);
    this.tally = this.add.text(0, 0, '', textStyle('digit', theme.ink)).setOrigin(0.5);
    this.marks = this.add.existing(new StarRow(this, SEED_BOX, theme));
    this.views = SCORE_BUTTONS.map((row) => this.plate(row, theme));
    this.reward();
    liveFrame(this, () => this.arrange(), () => this.forget());
  }

  /**
   * Nhịp mở bảng điểm (DS:105 + PC-14): panel giấy vào trước, sao NỔ sau (DUR.pop), và lời chào
   * ad chỉ đứng ở onComplete của lượt sao cuối — phần thưởng phải chạy xong trước khi ad xuất hiện.
   */
  private reward(): void {
    this.sheet.setAlpha(0);
    this.marks.setScale(0);
    this.tweens.add({
      targets: this.sheet,
      alpha: 1,
      duration: DUR.blend,
      onComplete: () => this.tweens.add({
        targets: this.marks,
        scale: 1,
        duration: DUR.pop,
        onComplete: () => void this.session.showInterstitial(),
      }),
    });
  }

  /**
   * Rời bảng điểm: PlayScene đọc `init.level` (PlayScene.ts:97), thiếu nó là màn CŨ bị phát lại
   * vì `session.startLevel()` là ảnh chụp lúc boot. Màn kế tiếp là `save.level` DO logic đẩy lên
   * trong commit — scene chỉ đưa số, không tự cộng (PC-06). MapScene không dùng ô init nào.
   */
  private go(row: ScoreRow): void {
    touchFx(this, this.session);
    this.views[SCORE_BUTTONS.indexOf(row)].press();
    this.scene.start(row.to, { level: this.session.level() });
  }

  /** Nút của bảng điểm: `makeButton` của ui/button.ts là cửa duy nhất cho phản hồi chạm. */
  private plate(row: ScoreRow, theme: PaperTheme): ButtonView {
    const view = makeButton(this, row.id, SEED_BOX, theme, null, row.primary, this.kit.hook);
    this.add.existing(view.obj);
    view.onTap(() => this.go(row));
    return view;
  }

  private arrange(): void {
    const l = layoutOf(this.cameras.main.width, this.cameras.main.height);
    const theme = sceneTheme(this.session);
    const s = scaleOf(l);
    const f = frameOf(l);
    const panel = panelBox(l);
    this.kit.bg.paint(l, theme, true);
    this.sheet.paint(panel, theme, {
      radius: GEO.plate.radius, alpha: GEO.plate.alpha, edge: theme.crease, thick: GEO.plate.thick,
    });
    this.head.setPosition(l.cx, panel.y + GEO.pad * s);
    this.head.setText(say(this.session, 'score.title'));
    this.paintStars(theme, panel, s);
    const chapter = chapterTab(this.model, chapterOf(this.session.level()));
    this.tally.setPosition(l.cx, panel.y + panel.h * GEO.share.tall);
    this.tally.setText(say(this.session, 'score.stars', { n: chapter.stars }));
    const room: Box = {
      x: panel.x + (panel.w * (1 - GEO.share.wide)) / 2, y: f.bar.y, w: panel.w * GEO.share.wide, h: f.bar.h,
    };
    const boxes = gridBoxes(room, SCORE_BUTTONS.length, 1, GEO.pill, GEO.gap * s);
    paintRow(this.views, boxes, theme, (i) => say(this.session, SCORE_BUTTONS[i].key));
  }

  /** Dải sao của màn vừa chơi: bề rộng tính từ SỐ Ô của thang sao do logic sở hữu (không 3 thô). */
  private paintStars(theme: PaperTheme, panel: Box, s: number): void {
    const w = GEO.star * s * STAR_SCALE.max;
    const strip: Box = {
      x: panel.x + (panel.w - w) / 2, y: panel.y + panel.h * GEO.share.low, w, h: GEO.star * s,
    };
    this.marks.retint(theme, strip);
    this.marks.setCount(this.session.starsAt(this.session.level()));
    this.kit.hook(QA.stars, strip);
  }

  /** Ẩn nút + xoá rect sao khi màn chết (PC-U-05) — resize do `liveFrame` gỡ. */
  private forget(): void {
    for (const view of this.views) view.hide();
    clearTestid(QA.stars);
  }
}


