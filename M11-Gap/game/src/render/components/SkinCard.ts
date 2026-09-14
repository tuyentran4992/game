// Pattern: Component + State Registry (một card skin trong shop)
// TRÁCH NHIỆM: vẽ MỘT card theo 4 trạng thái của SPEC §4.5 / DS:108 — mờ khoá, mua được (hiện
//   giá Mực), đã sở hữu (✓), đang dùng (✓ + viền 4px màu primary). Nền ô và vùng bấm là của
//   makeButton (B3a) để phản hồi chạm đi qua một cửa (PC-U-06).
// RÀNG BUỘC: giá là DỮ LIỆU economy.SkinPrice do scene đưa xuống — component không giữ con số
//   giá nào (TC-INC-01), không tự phán quyết mua được hay không (economy.buySkin trả lời),
//   không setInteractive, không màu hex riêng (màu = PaperTheme + token progressTheme.PRIMARY).

import Phaser from 'phaser';
import type { SkinPrice } from '../../logic/economy';
import { TOUCH } from '../anim/unfoldPlan';
import { RATIOS, type Box } from '../layout';
import { parseHex, textStyle, type PaperTheme } from '../theme/paperTheme';
import { PRIMARY } from '../theme/progressTheme';

/** Bốn trạng thái card — đúng bốn khoá của bảng SKIN_STATE bên dưới. */
export type SkinState = 'locked' | 'buyable' | 'owned' | 'equipped';

/** Khoá màu viền: 'primary' là token SSOT, ba khoá còn lại là token của PaperTheme. */
type EdgeToken = 'crease' | 'ink' | 'shade' | 'primary';

const PRIMARY_EDGE: EdgeToken = 'primary';
const CREASE_EDGE: EdgeToken = 'crease';
const INK_EDGE: EdgeToken = 'ink';

/** Một dòng bảng trạng thái: hình thức vẽ, không phải luật kinh tế. */
type StateRow = {
  readonly alpha: number;
  readonly dim: number;
  readonly showPrice: boolean;
  readonly tick: string;
  readonly edge: EdgeToken;
  readonly thick: number;
};

/**
 * Registry 4 trạng thái (DS:108): thêm một trạng thái = thêm MỘT DÒNG, không rải if/else.
 * `alpha` mờ dần khi khoá, `tick` là ✓ của mục đã sở hữu, `equipped` lấy viền primary 4px.
 */
const SKIN_STATE: Readonly<Record<SkinState, StateRow>> = {
  locked: { alpha: TOUCH.alphaDisabled, dim: 0.35, showPrice: true, tick: '', edge: CREASE_EDGE, thick: 2 },
  buyable: { alpha: 1, dim: 1, showPrice: true, tick: '', edge: CREASE_EDGE, thick: 2 },
  owned: { alpha: 1, dim: 1, showPrice: false, tick: '✓', edge: INK_EDGE, thick: 2 },
  equipped: { alpha: 1, dim: 1, showPrice: false, tick: '✓', edge: PRIMARY_EDGE, thick: 4 },
};

/** Viền = tra bảng theo token, không so chuỗi rải rác trong hàm vẽ. */
const edgeColor: Readonly<Record<EdgeToken, (theme: PaperTheme) => string>> = {
  crease: (theme) => theme.crease,
  ink: (theme) => theme.ink,
  shade: (theme) => theme.shade,
  primary: () => PRIMARY,
};

/** Những gì một card cần để vẽ: dữ liệu từ economy + nhãn đã qua t() ở scene (PC-19). */
export type CardFace = {
  readonly price: SkinPrice;
  readonly state: SkinState;
  readonly preview: PaperTheme;
  readonly cost: string;
  readonly action: string;
};

/** Tỷ lệ ô mẫu giấy trong card — DỮ LIỆU bố cục ở layout.RATIOS, không phải px thô trong vòng vẽ. */
const SWATCH = RATIOS.skinCard.swatch;

export class SkinCard extends Phaser.GameObjects.Container {
  private readonly art: Phaser.GameObjects.Graphics;

  private readonly costText: Phaser.GameObjects.Text;

  private readonly tickText: Phaser.GameObjects.Text;

  private readonly actionText: Phaser.GameObjects.Text;

  private face: CardFace | null = null;

  private cell: Box = { x: 0, y: 0, w: 0, h: 0 };

  constructor(scene: Phaser.Scene, box: Box, theme: PaperTheme) {
    super(scene, box.x, box.y);
    this.art = scene.add.graphics();
    this.costText = scene.add.text(0, 0, '', textStyle('digit', theme.ink));
    this.tickText = scene.add.text(0, 0, '', textStyle('heading', theme.ink));
    this.actionText = scene.add.text(0, 0, '', textStyle('label', theme.ink));
    this.add([this.art, this.costText, this.tickText, this.actionText]);
    this.cell = box;
  }

  /** Scene đưa face đã tra từ economy; card chỉ vẽ, không tự đổi trạng thái. */
  set(face: CardFace): void {
    this.face = face;
    this.paint();
  }

  retint(theme: PaperTheme, box: Box): void {
    this.cell = box;
    this.setPosition(box.x, box.y);
    this.costText.setStyle(textStyle('digit', theme.ink));
    this.tickText.setStyle(textStyle('heading', theme.ink));
    this.actionText.setStyle(textStyle('label', theme.ink));
    this.paint();
  }

  private paint(): void {
    const face = this.face;
    if (face === null) return;
    const box = this.cell;
    const state = face.state;
    const row = SKIN_STATE[state];
    const inkColor = face.preview.ink;
    this.setAlpha(row.alpha);
    this.art.clear();
    this.art.fillStyle(parseHex(face.preview.paper), row.dim);
    this.art.fillRoundedRect(0, 0, box.w, box.h * SWATCH, box.w * 0.06);
    this.art.lineStyle(Math.max(2, row.thick), parseHex(edgeColor[row.edge](face.preview)), 1);
    this.art.strokeRoundedRect(0, 0, box.w, box.h, box.w * 0.06);
    this.place(this.costText, row.showPrice ? face.cost : '', 0.5, 0.68, inkColor);
    this.place(this.tickText, row.tick, 0.84, 0.12, inkColor);
    this.place(this.actionText, face.action, 0.5, 0.9, inkColor);
  }

  /** Một dòng chữ trong card: căn theo tỷ lệ ô, rỗng thì ẩn (không để lại chữ 'undefined').
   *  `color` là TOKEN hex nguyên văn — Text.setColor nhận chuỗi, không nhận số nguyên màu. */
  private place(text: Phaser.GameObjects.Text, value: string, fx: number, fy: number, color: string): void {
    text.setText(value);
    text.setVisible(value.length > 0);
    text.setPosition(this.cell.w * fx, this.cell.h * fy);
    text.setOrigin(0.5);
    text.setColor(color);
  }
}
