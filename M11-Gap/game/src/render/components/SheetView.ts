// Pattern: Component (Phaser container)
// TRÁCH NHIỆM: tờ giấy của màn chơi — gói giấy đang gấp, các nếp gấp, lịch mở bung theo
//   LAYER (DS:120), pop lỗ theo LỖ (DS:121), vệt giải thích (DS:122), hơi thở hint (DS:124).
// RÀNG BUỘC: chỉ VẺ những điểm mà scene đưa tới (LevelSpec / Option.holes đã là sự thật của
//   logic). Không import validator, không so đáp án, không đồng hồ rieng — mọi timing đến từ
//   anim/unfoldPlan (một nguồn số duy nhất).

import Phaser from 'phaser';
import { toNumber } from '../../logic/rational';
import type { FoldKind, Point } from '../../logic/types';
import { DUR, MAX_LAYERS, type BreathPlan, type EaseName, type HolePop, type UnfoldLayer } from '../anim/unfoldPlan';
import { shakeSteps } from '../anim/juicePlan';
import { holeRadius } from '../holeView';
import type { Box } from '../layout';
import { parseHex, type PaperTheme, type SkinAsset } from '../theme/paperTheme';
import { HolePool } from './HolePool';

/** Token ease của lịch -> tên ease Phaser. Thêm token = thêm một dòng, không thêm if. */
const EASE: Readonly<Record<EaseName, string>> = { easeOut: 'Cubic.Out' };

type CreaseDraw = (g: Phaser.GameObjects.Graphics, side: number, split: number, color: number, thick: number) => void;

const drawRows: CreaseDraw = (g, side, split, color, thick) => {
  g.lineStyle(thick, color, 1);
  for (let k = 1; k < split; k += 2) g.lineBetween(0, (side * k) / split, side, (side * k) / split);
};

const drawCols: CreaseDraw = (g, side, split, color, thick) => {
  g.lineStyle(thick, color, 1);
  for (let k = 1; k < split; k += 2) g.lineBetween((side * k) / split, 0, (side * k) / split, side);
};

const drawDiags: CreaseDraw = (g, side, split, color, thick) => {
  g.lineStyle(thick, color, 1);
  const step = side / split;
  for (let k = 0; k <= split; k += 1) {
    g.lineBetween(k * step, 0, 0, k * step);
    g.lineBetween(side, k * step, side - k * step, side);
  }
};

/** Bảng tra: kiểu nếp -> cách kẻ đường gấp. FoldKind mới bắt buộc thêm dòng (lỗi biên dịch). */
const CREASE_BY_KIND: Readonly<Record<FoldKind, CreaseDraw>> = { H: drawRows, V: drawCols, D: drawDiags };

/** Vai trò bộ lỗ đang vẽ — màu khác nhau để mắt phân biệt bản đúng / bản mình chọn. */
export type HoleRole = 'answer' | 'picked';

/** Texture giấy có thật hay chưa (BootScene có thể thiếu asset trên nền tảng lạ) => không ném. */
function textureOf(scene: Phaser.Scene, key: string): string | undefined {
  return scene.textures.exists(key) ? key : undefined;
}

export class SheetView extends Phaser.GameObjects.Container {
  private readonly ghost: Phaser.GameObjects.Rectangle;

  private readonly grain: Phaser.GameObjects.Image;

  private readonly creases: Phaser.GameObjects.Graphics;

  private readonly hint: Phaser.GameObjects.Graphics;

  private readonly layers: Phaser.GameObjects.Rectangle[] = [];

  /** Bộ lỗ của tờ giấy — cấp phát theo số lỗ THẬT, không cắt ở một trần tự đặt (F1). */
  private readonly holes: HolePool;

  private readonly band: Phaser.GameObjects.Rectangle;

  private readonly flash: Phaser.GameObjects.Rectangle;

  private theme: PaperTheme;

  private side = 0;

  private breathTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene, box: Box, theme: PaperTheme, skin: SkinAsset, fault?: (what: string) => void) {
    super(scene, box.x, box.y);
    this.theme = theme;
    this.fault = fault ?? ((what: string) => console.error('[sheet] ' + what));
    this.ghost = scene.add.rectangle(0, 0, box.w, box.h, parseHex(theme.paper), 0.35);
    this.grain = scene.add.image(0, 0, skin.assetKey);
    this.grain.setAlpha(GRAIN_ALPHA);
    for (let i = 0; i < MAX_LAYERS; i += 1) {
      this.layers.push(scene.add.rectangle(0, 0, 10, 10, parseHex(theme.paper), 1));
    }
    this.creases = scene.add.graphics();
    this.hint = scene.add.graphics();
    this.holes = new HolePool(scene, this);
    this.band = scene.add.rectangle(0, 0, 10, 10, parseHex(theme.shade), 0.55);
    this.flash = scene.add.rectangle(0, 0, 10, 10, parseHex(theme.ink), 0);
    this.add([this.ghost, this.grain, ...this.layers, this.creases, this.hint, this.band, this.flash]);
    this.setSkin(skin);
    this.relayout(box, theme);
  }

  /** Nếp gấp + gói giấy của một đề mới (gói = vùng giữa tờ, mở ra là phủ kín tờ). */
  fold(folds: readonly FoldKind[]): void {
    this.drawCreases(folds);
    this.layers.forEach((layer, i) => {
      layer.setVisible(true).setOrigin(0, 0).setAlpha(1);
      const shrink = 0.5;
      const off = i * this.side * 0.012;
      layer.setSize(this.side, this.side).setScale(shrink, shrink);
      layer.setPosition(this.side * (1 - shrink) * 0.5 + off, this.side * (1 - shrink) * 0.5 + off);
    });
    this.holes.hide();
    this.ghost.setVisible(true);
    this.band.setVisible(false);
    this.flash.setAlpha(0);
  }

  /** Rect thật của gói giấy đang gấp — scene dùng để đăng ký testid-sheet-folded. */
  packetBox(box: Box): Box {
    const side = this.side * 0.5;
    return { x: box.x + (this.side - side) / 2, y: box.y + (this.side - side) / 2, w: side, h: side };
  }

  /**
   * Mở bung từng lớp theo lịch (lớp ngoài cùng trước), xong mới tới phần đuôi. Đường chờ lấy
   * từ CHÍNH dòng cuối của bảng lớp (`totalMs`) — không có nhánh "hết lịch là đứng hình":
   * bao nhiêu lớp thì bấy nhiêu dòng, kể cả 16 lớp của trần chainTable (C6/C9).
   */
  unfold(rows: readonly UnfoldLayer[], tail: () => void): void {
    rows.forEach((row, i) => {
      const layer = this.layers[i];
      if (!layer) return;
      const base = row.index % 2 === 0 ? 0 : this.side * 0.03;
      this.scene.tweens.add({
        targets: layer,
        x: 0,
        y: base,
        scaleX: 1,
        scaleY: 1,
        delay: row.startMs,
        duration: row.layerDurMs,
        ease: EASE[row.ease],
      });
    });
    this.ghost.setVisible(false);
    const last = rows.length > 0 ? rows[rows.length - 1] : undefined;
    this.scene.time.delayedCall(last === undefined ? 0 : last.totalMs, tail);
  }

  /** Lỗ hiện dần theo holePlan (DS:121) — scale 0 -> 1, so le 60ms. */
  popHoles(points: readonly Point[], rows: readonly HolePop[], role: HoleRole, done: () => void): void {
    this.placeHoles(points, role);
    rows.forEach((row, i) => {
      const hole = this.holes.at(i);
      if (!hole) return;
      hole.setScale(0, 0);
      this.scene.tweens.add({
        targets: hole, scaleX: 1, scaleY: 1, delay: row.startMs, duration: row.durMs, ease: EASE.easeOut,
      });
    });
    const last = rows.length > 0 ? rows[rows.length - 1].endMs : 0;
    this.scene.time.delayedCall(last, done);
  }

  /**
   * Bản giải thích (PC-L-03): vệt sáng quét qua tờ giấy DUR.sweep rồi nháy hoà lẫn
   * DUR.blend — tổng đúng 700ms, không được ngắn hơn (DS:122).
   */
  explain(points: readonly Point[], role: HoleRole, done: () => void): void {
    this.placeHoles(points, role);
    this.band.setVisible(true).setOrigin(0, 0);
    this.band.setSize(this.side * 0.16, this.side).setPosition(-this.side * 0.16, 0);
    this.scene.tweens.add({
      targets: this.band, x: this.side, duration: DUR.sweep, ease: 'Linear',
      onComplete: () => {
        this.band.setVisible(false);
        this.flash.setAlpha(0);
        this.scene.tweens.add({
          targets: this.flash, alpha: 0.35, duration: DUR.blend / 2, yoyo: true, onComplete: done,
        });
      },
    });
  }

  /**
   * Rung nhẹ khi sai — biên lấy từ BẢNG seed (không bao giờ vượt TOUCH.shakeMaxPx, DS:127) nên
   * cùng một seed cho cùng một dãy nhát rung (PC-B-04: ba lần reload là một chuyển động).
   * Nhát cuối KE VỀ đúng vị trí gốc để tờ giấy không lệch vĩnh viễn sau khi rung.
   */
  shake(seed: string): void {
    const baseX = this.x;
    const baseY = this.y;
    const steps = shakeSteps(seed);
    steps.forEach((step, i) => {
      const last = i === steps.length - 1;
      this.scene.tweens.add({
        targets: this,
        x: last ? baseX : baseX + step.dx,
        y: last ? baseY : baseY + step.dy,
        duration: step.durationMs,
        ease: 'Quad.Out',
      });
    });
  }

  /** Hơi thở hint (DS:124): 1 -> 1,02 yoyo, lặp ĐÚNG `repeat` nhịp rồi dứt (PC-O-03). */
  breath(plan: BreathPlan): void {
    this.stopBreath();
    this.breathTween = this.scene.tweens.add({
      targets: this,
      scaleX: plan.scaleTo,
      scaleY: plan.scaleTo,
      duration: plan.yoyoMs / 2,
      yoyo: true,
      repeat: plan.repeat,
      onComplete: () => {
        this.breathTween = null;
        this.setScale(1);
      },
    });
  }

  stopBreath(): void {
    if (this.breathTween) this.breathTween.stop();
    this.breathTween = null;
    this.setScale(1);
  }

  /** Nhấn mạnh nếp mà hint đang chỉ (peekFold trả index — logic quyết, view chỉ tô). */
  highlightCrease(index: number | null, folds: readonly FoldKind[]): void {
    this.hint.clear();
    if (index === null) return;
    const kind = folds[index];
    const draw = kind === undefined ? undefined : CREASE_BY_KIND[kind];
    if (!draw) return;
    draw(this.hint, this.side, 2 ** (index + 1), parseHex(this.theme.ink), Math.max(3, this.side * 0.016));
  }

  /** Tô lại toàn bộ theo theme + Box mới (gọi khi resize và khi đổi chương). */
  relayout(box: Box, theme: PaperTheme): void {
    this.theme = theme;
    this.x = box.x;
    this.y = box.y;
    // C10: slideOut để lại alpha 0 — mỗi lần xếp bài PHẢI dựng tờ giấy về trạng thái thật,
    // nếu không thì từ màn thứ hai tờ giấy vô hình vĩnh viễn.
    this.setAlpha(1);
    this.side = Math.min(box.w, box.h);
    this.ghost.setSize(this.side, this.side).setPosition(this.side / 2, this.side / 2);
    this.grain.setPosition(this.side / 2, this.side / 2).setDisplaySize(this.side, this.side);
    for (const layer of this.layers) layer.setFillStyle(parseHex(theme.paper), 1);
    this.drawCreases(this.lastFolds);
    this.placeHoles(this.lastPoints, this.lastRole);
  }

  private lastFolds: readonly FoldKind[] = [];

  private lastPoints: readonly Point[] = [];

  /** Vai trò đã vẽ gần nhất — relayout (resize/đổi chương) phải Tô lại đúng màu bản đó. */
  private lastRole: HoleRole = 'answer';

  private drawCreases(folds: readonly FoldKind[]): void {
    this.lastFolds = folds;
    const thick = Math.max(1.5, this.side * 0.006);
    this.creases.clear();
    this.hint.clear();
    folds.forEach((kind, i) => {
      const draw = CREASE_BY_KIND[kind];
      if (draw) draw(this.creases, this.side, 2 ** (i + 1), parseHex(this.theme.crease), thick);
    });
  }

  private placeHoles(points: readonly Point[], role: HoleRole): void {
    this.lastPoints = points;
    this.lastRole = role;
    // MỘT trần vẽ duy nhất cho mọi bề mặt (holeView/holeBudget) — tờ giấy không cắt mỗi nơi
    // một khác so với ô đáp án; số lỗ vượt trần do scene BÁO về QA, không âm thầm mất.
    this.holes.place(points, this.side, 0, 0, 'sheet', {
      fill: parseHex(role === 'picked' ? this.theme.shade : this.theme.ink),
      ring: parseHex(this.theme.ink),
    });
  }

  /** Rect thật của lỗ đầu tiên (QA cần vùng nhìn thấy của cái lỗ — PC-U-04). */
  holeBox(box: Box): Box {
    const r = holeRadius('sheet', this.lastPoints.length, this.side);
    const p = this.lastPoints[0];
    const cx = box.x + (p ? toNumber(p.x) : 0.5) * this.side;
    const cy = box.y + (p ? toNumber(p.y) : 0.5) * this.side;
    return { x: cx - r, y: cy - r, w: r * 2, h: r * 2 };
  }

  /** Trượt sang màn kế (pack §5: 400ms) — xong thì scene nạp đề mới ở vị trí cũ.
   *  alpha 0 chỉ là TẠM: relayout() dựng tờ giấy lại đầy đủ cho đề kế (C10). */
  slideOut(done: () => void): void {
    this.scene.tweens.add({
      targets: this, x: this.x - this.side, alpha: 0, duration: SLIDE_MS, ease: 'Cubic.Out', onComplete: done,
    });
  }

  /** Da giấy đang đeo (assetKey + tint) — đổi skin ở spa là đổi đúng hai thứ này. */
  private skin: SkinAsset | null = null;

  /** Cửa BÁO của scene: thiếu texture là lỗi nền tảng, không được thành tờ giấy trơ không da. */
  private readonly fault: (what: string) => void;

  /** Đeo một da giấy: đổi texture + đổi tint, giữ nguyên hình đã xếp ở relayout. */
  setSkin(skin: SkinAsset): void {
    if (this.skin?.assetKey === skin.assetKey && this.skin.tint === skin.tint) return;
    this.skin = skin;
    this.applyGrain(skin.assetKey, skin.tint);
  }

  /** Gán texture grain khi nền tảng thực sự có nó; THIẾU LÀ BÁO, không tự đổi ảnh khác. */
  private applyGrain(key: string, tint: string): void {
    const found = textureOf(this.scene, key);
    if (found === undefined) {
      this.fault(`thieu texture giay "${key}" (BootScene nap tu manifest - xem console [boot])`);
      this.grain.setVisible(false);
      return;
    }
    this.grain.setTexture(found).setTint(parseHex(tint)).setVisible(true);
  }

  retint(theme: PaperTheme, box: Box): void {
    if (this.skin !== null) this.applyGrain(this.skin.assetKey, this.skin.tint);
    this.relayout(box, theme);
  }
}

/** Độ đậm của lớp da giấy phủ lên tờ trắng — DỮ LIỆU ở component, không rải trong scene. */
const GRAIN_ALPHA = 0.35;

/** Thời lượng trượt sang màn kế — đúng con số pack §5 (400ms), không tự đổi. */
const SLIDE_MS = 400;
