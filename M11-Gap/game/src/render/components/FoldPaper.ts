// Pattern: Component (view) — MẶT GIẤY ĐANG GẤP
// TRÁCH NHIỆM: vẽ TỪNG lát giấy của tờ đang gập vào / mở bung (tứ giác + bóng đổ), hệ nếp gấp
//   đứt nét, nét hint tô đậm một nếp, và tam giác nhát cắt trên gói giấy. Mọi hình là output của
//   anim/foldShape (đầu mút mở-hẳn trùng ĐÚNG hình học mở bung của logic) nên hoạt cảnh không
//   thể "vẽ một chỗ, đáp án ở chỗ khác".
// Vì SAU RIÊNG MỘT FILE: SheetView là orchestrator (lịch tween + bộ lỗ + rung + thở); kéo thêm
//   hình giấy vào đó là vượt trần dòng và trộn hai trách nhiệm (gate G1 + E1).
// RÀNG BUỘC: không ms, không lịch tween (tất cả ở anim/unfoldPlan), không luật đúng/sai, không
//   tự sinh điểm — điểm đưa vào là sự thật của LevelSpec.

import Phaser from 'phaser';
import { layerCorners, type FoldModel } from '../anim/foldShape';
import type { FoldKind } from '../../logic/types';
import { parseHex, type PaperTheme } from '../theme/paperTheme';

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

/** Tỷ lệ bóng đổ của một lát giấy so với cạnh tờ (độ sâu để mắt thấy giấy CHỒNG NHAU). */
const SHADOW = { dx: 0.004, dy: 0.016, alpha: 0.18 };

/** Bề dày nét theo cạnh tờ — sàn px để nét không biến mất trên màn nhỏ. */
const STROKE = { creaseMin: 1.5, creaseRatio: 0.006, edgeMin: 1, edgeRatio: 0.005, hintMin: 3, hintRatio: 0.016 };

export class FoldPaper {
  private readonly quads: Phaser.GameObjects.Graphics;

  private readonly cuts: Phaser.GameObjects.Graphics;

  private readonly lines: Phaser.GameObjects.Graphics;

  private model: FoldModel | null = null;

  private folds: readonly FoldKind[] = [];

  private side = 0;

  private theme: PaperTheme;

  constructor(scene: Phaser.Scene, host: Phaser.GameObjects.Container, theme: PaperTheme) {
    this.theme = theme;
    this.quads = scene.add.graphics();
    this.cuts = scene.add.graphics();
    this.lines = scene.add.graphics();
    host.add([this.quads, this.cuts, this.lines]);
  }

  /**
   * Nhớ đề + ô vẽ rồi kẻ lại hệ nếp. Gọi khi nạp đề và mỗi lần resize/đổi chương —
   * `side` đổi thì mọi nét phải tính lại, không được giữ hình của cỡ cũ.
   */
  setSheet(model: FoldModel | null, folds: readonly FoldKind[], side: number, theme: PaperTheme): void {
    this.model = model;
    this.folds = folds;
    this.side = side;
    this.theme = theme;
    this.drawCreases();
  }

  /**
   * Tô lại lát giấy của MỌI lớp theo `prog[i]` = tiến trình theo nếp của lớp i (SheetView giữ
   * tiến trình, ở đây chỉ vẽ). Thứ tự vẽ: lớp gấp NHIỀU nếp nhất xuống trước, lớp nằm ngửa
   * trên packet cuối cùng => gói giấy luôn là mặt trên, đúng như tờ giấy thật.
   */
  paint(prog: readonly (readonly number[])[]): void {
    const g = this.quads;
    g.clear();
    if (this.model === null || this.side <= 0) return;
    const thick = Math.max(STROKE.edgeMin, this.side * STROKE.edgeRatio);
    const sx = this.side * SHADOW.dx;
    const sy = this.side * SHADOW.dy;
    for (let i = 0; i < prog.length; i += 1) {
      const corners = layerCorners(this.model, i, prog[i] ?? [], this.side);
      g.fillStyle(parseHex(this.theme.shade), SHADOW.alpha);
      this.tracePath(g, corners, sx, sy);
      g.fillPath();
      g.fillStyle(parseHex(this.theme.paper), 1);
      this.tracePath(g, corners, 0, 0);
      g.fillPath();
      g.lineStyle(thick, parseHex(this.theme.crease), 1);
      g.strokePath();
    }
  }

  /**
   * Tam giác đã cắt trên gói giấy (đề chương cắt góc): `tri` là 6 số 0..1 của hệ packet,
   * nhân cạnh tờ ở đây vì đó là nơi duy nhất biết `side`. Hiện dần theo cùng nhịp với lỗ đục.
   */
  paintCuts(triangles: readonly (readonly number[])[], alpha: number): void {
    const g = this.cuts;
    g.clear();
    if (alpha <= 0) return;
    const thick = Math.max(STROKE.edgeMin, this.side * STROKE.edgeRatio);
    for (const tri of triangles) {
      g.fillStyle(parseHex(this.theme.bg.bottom), alpha);
      this.tracePath(g, tri, 0, 0, this.side);
      g.fillPath();
      g.lineStyle(thick, parseHex(this.theme.ink), alpha);
      this.tracePath(g, tri, 0, 0, this.side);
      g.strokePath();
    }
  }

  /** Nhấn mạnh nếp mà hint đang chỉ (peekFold trả index — logic quyết, view chỉ tô). */
  hint(index: number | null): void {
    this.lines.clear();
    this.drawCreases();
    if (index === null) return;
    const kind = this.folds[index];
    const draw = kind === undefined ? undefined : CREASE_BY_KIND[kind];
    if (draw === undefined) return;
    draw(this.lines, this.side, 2 ** (index + 1), parseHex(this.theme.ink),
      Math.max(STROKE.hintMin, this.side * STROKE.hintRatio));
  }

  destroy(): void {
    this.quads.destroy();
    this.cuts.destroy();
    this.lines.destroy();
  }

  /** Kẻ hệ nếp gấp trên toàn tờ (dù giấy đã gập lại — đó là "sơ đồ gấp" người chơi cần thấy). */
  private drawCreases(): void {
    const g = this.lines;
    g.clear();
    if (this.side <= 0) return;
    const thick = Math.max(STROKE.creaseMin, this.side * STROKE.creaseRatio);
    this.folds.forEach((kind, i) => {
      const draw = CREASE_BY_KIND[kind];
      if (draw !== undefined) draw(g, this.side, 2 ** (i + 1), parseHex(this.theme.crease), thick);
    });
  }

  /** Một tứ giác (8 số) thành path đang mở — `k` đổi 0..1 -> px; caller quyết định tô hay viền. */
  private tracePath(g: Phaser.GameObjects.Graphics, p: readonly number[], dx: number, dy: number, k = 1): void {
    g.beginPath();
    g.moveTo((p[0] ?? 0) * k + dx, (p[1] ?? 0) * k + dy);
    for (let i = 2; i + 1 < p.length; i += 2) g.lineTo((p[i] ?? 0) * k + dx, (p[i + 1] ?? 0) * k + dy);
    g.closePath();
  }
}