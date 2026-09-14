// Pattern: Component (Phaser container)
// TRÁCH NHIỆM: MỘT ô đáp án — vẽ đúng các lỗ mà LevelSpec đưa cho nó, nhận một cú chạm,
//   đổi độ mờ theo bảng gate (DS:94-96) và nhát lún khi nhấn (DS:95).
// RÀNG BUỘC: không so sánh với đáp án, không tự quyết enabled (levelState + optionEnabledByState
//   quyết hết — PC-16 ranh giới một chiều). Số lỗ vượt trần chỉ bị CẮT KHI VẼ, không sửa dữ liệu.
//   Hình trong ô (nhãn số / viền giấy thu nhỏ / ô tâm lỗ) lấy THẲNG từ layout.cardArt — file này
//   không được tự cộng trừ padding: đó là ba lỗi nhìn thấy trong ảnh chụp thật (V6.1 + V6.2).

import Phaser from 'phaser';
import type { Point } from '../../logic/types';
import { DUR, TOUCH } from '../anim/unfoldPlan';
import { HolePool } from './HolePool';
import { centerOf, fittedStyle } from './fitText';
import { cardArt, frameStroke, pressShift, type Box } from '../layout';
import { parseHex, type PaperTheme } from '../theme/paperTheme';

export class OptionCard extends Phaser.GameObjects.Container {
  readonly index: number;

  private readonly plate: Phaser.GameObjects.Rectangle;

  /** Thumbnail tờ giấy trong ô — hình thu nhỏ của đáp án, VIỀN là mép giấy, không phải mép ô. */
  private readonly paper: Phaser.GameObjects.Rectangle;

  private readonly badge: Phaser.GameObjects.Text;

  /** Bộ lỗ cấp phát theo số lỗ THẬT của phương án (review F1) — dùng chung với tờ giấy. */
  private readonly holes: HolePool;

  /** Ô hiện hành (hệ thế giới) — container có gốc ở góc trái-trên nên mọi phép cần cạnh phải đọc nó. */
  private box: Box = { x: 0, y: 0, w: 0, h: 0 };

  private side = 0;

  private holeX = 0;

  private holeY = 0;

  private theme: PaperTheme;

  /** Bộ điểm của phương án này — scene nạp một lần lúc mở đề, resize thì vẽ lại từ đây. */
  private points: readonly Point[] = [];

  constructor(scene: Phaser.Scene, index: number, box: Box, theme: PaperTheme) {
    const label = String(index + 1);
    super(scene, box.x, box.y);
    this.index = index;
    this.theme = theme;
    // QUY ƯỚC TOẠ ĐỘ của mọi container ở đây: container NGỒI TẠI GỐC TRÁI-TRÊN của ô, mọi con
    // là HỆ LỆ so với gốc đó. Rectangle/Image mặc định vẽ theo TÂM nên phải setOrigin(0,0), nếu
    // không nó lệch đi nửa ô — đó chính là lỗi "nhãn 1-2-3-4 nằm ngoài card" (V6.1).
    this.plate = scene.add.rectangle(0, 0, box.w, box.h, parseHex(theme.paper), 1).setOrigin(0, 0);
    this.paper = scene.add.rectangle(0, 0, 10, 10, parseHex(theme.paper), 1).setOrigin(0, 0);
    this.badge = scene.add.text(0, 0, label, fittedStyle('label', theme.ink, label, box));
    this.badge.setOrigin(0.5);
    this.holes = new HolePool(scene, this);
    this.add([this.plate, this.paper, this.badge]);
    this.relayout(box);
  }

  /** Vẽ lại bộ lỗ của ô (điểm đã chuẩn hoá 0..1 — view chỉ nhân kích thước). */
  setPoints(points: readonly Point[]): void {
    this.points = points;
    this.paintHoles();
  }

  /** Vẽ lại đúng SỐ lỗ của phương án này theo ô hiện hành (gọi cả khi resize — C10). */
  private paintHoles(): void {
    this.holes.place(this.points, this.side, this.holeX, this.holeY, 'card', {
      fill: parseHex(this.theme.ink), ring: null,
    });
  }

  /** Độ mờ của ô do bảng gate quyết (1 / 0.6 khi khoá / 0.45 khi mờ đi — DS:94-96). */
  setGate(alpha: number): void {
    this.setAlpha(alpha);
  }

  /** Viền đậm = ô người chơi vừa chọn; scene truyền cờ sau khi máy trạng thái chốt. */
  markPick(on: boolean): void {
    const width = Math.max(3, this.box.h * (on ? 0.03 : 0.014));
    this.plate.setStrokeStyle(width, parseHex(on ? this.theme.ink : this.theme.crease));
  }

  /** Nhát lún khi nhấn: 0,96 rồi nảy lại (DS:95 + pack §5) — không chặn cú bấm kế tiếp. */
  press(): void {
    const shift = pressShift(this.box, TOUCH.pressScale);
    this.scene.tweens.add({
      targets: this,
      x: this.x + shift.x,
      y: this.y + shift.y,
      scaleX: TOUCH.pressScale,
      scaleY: TOUCH.pressScale,
      duration: DUR.fast,
      yoyo: true,
      onComplete: () => {
        this.setScale(1).setPosition(this.box.x, this.box.y);
      },
    });
  }

  onTap(handler: (index: number) => void): void {
    this.plate.on('pointerdown', () => handler(this.index));
  }

  /** Đổi kích thước camera: xếp lại mọi thứ theo Box mới (rect QA đăng ký lại từ đây). */
  relayout(box: Box): void {
    this.box = box;
    this.x = box.x;
    this.y = box.y;
    const art = cardArt(box);
    // cardArt trả HỆ THẾ GIỚI; con của container tính theo HỆ LỆ của ô nên trừ đúng gốc ô.
    const local = (b: Box): Box => ({ x: b.x - box.x, y: b.y - box.y, w: b.w, h: b.h });
    const badge = local(art.badge);
    const paper = local(art.paper);
    const holes = local(art.holes);
    this.plate.setSize(box.w, box.h);
    // Nét viền DO LAYOUT quyết (frameStroke) — chính nét mà `dotFieldSide` đã trừ vào đệm chấm.
    this.plate.setStrokeStyle(frameStroke(box.h), parseHex(this.theme.crease));
    this.plate.setInteractive({ useHandCursor: true });
    this.paper.setSize(paper.w, paper.h).setPosition(paper.x, paper.y);
    this.paper.setStrokeStyle(frameStroke(paper.w), parseHex(this.theme.crease));
    this.side = holes.w;
    this.holeX = holes.x;
    this.holeY = holes.y;
    const mark = centerOf(badge);
    this.badge
      .setStyle(fittedStyle('label', this.theme.ink, this.badge.text, badge))
      .setPosition(mark.x, mark.y);
    this.paintHoles();
  }

  retint(theme: PaperTheme, box: Box): void {
    this.theme = theme;
    this.plate.setFillStyle(parseHex(theme.paper), 1);
    this.paper.setFillStyle(parseHex(theme.paper), 1);
    this.relayout(box); // paintHoles ở cuối relayout đã tô lại lỗ + canh lại nhãn theo theme mới
  }
}
