// Pattern: Component (Phaser container)
// TRÁCH NHIỆM: tờ giấy của màn chơi — HAI hoạt cảnh giấy của một vòng chơi:
//   (1) VÀO ĐỀ: tờ phẳng -> gập từng lớp về packet -> mũi đục xuống (`foldIn`, lịch `foldInPlan`);
//   (2) TRẢ LỜI: mở bung từng lớp (DS:120) -> pop lỗ theo LỖ (DS:121) / vệt giải thích (DS:122).
//   Hình mỗi lát giấy do anim/foldShape tính và components/FoldPaper tô; bộ lỗ dùng HolePool
//   chung với ô đáp án; thêm hơi thở hint (DS:124) và rung khi sai (DS:127).
// RÀNG BUỘC: chỉ VẺ những điểm mà scene đưa tới (LevelSpec / Option.holes đã là sự thật của
//   logic). Không import validator, không so đáp án, không đồng hồ riêng — mọi timing đến từ
//   anim/unfoldPlan (một nguồn số duy nhất). Mỗi khung hình ghi một lần vào cửa đo MOTION.
// VÌ SAU PHẢI LÀ HÌNH THẬT (BUGFIX "mất hoạt cảnh gấp giấy"): bản trước xếp vài Rectangle CÙNG
//   MÀU GIẤY ở scale 0,5 rồi "mở" lên scale 1, trong khi nền + da giấy + nếp gấp vẫn vẽ ĐẦY ô —
//   trên màn hình đó tờ giấy LUÔN đã mở, nên hoạt cảnh gập/mở không đổi một điểm ảnh nào (đo
//   Playwright: 0 px đổi suốt 1,2s). Giờ lát giấy là tứ giác thật của chính phép gấp đó, và hai
//   đầu mút tiến trình khớp đúng hình học mở bung của logic (xem anim/foldShape).

import Phaser from 'phaser';
import { cutSnipTriangle, cutSnips } from '../../logic/cutGeometry';
import { toNumber, toPoints } from '../../logic/rational';
import type { FoldKind, Point, SheetAction } from '../../logic/types';
import { foldModel, layerProgress, openness, type FoldModel } from '../anim/foldShape';
import {
  easeOut, explainTrack, foldInTrack, openTrack, popTrack, type MotionFrame, type MotionTrack,
} from '../anim/motionTrack';
import { MotionPlayer } from '../motionPlayer';
import { shakeSteps } from '../anim/juicePlan';
import { closestPair, holeBudget, holeRadius } from '../holeView';
import type { Box } from '../layout';
import type { BreathPlan } from '../anim/unfoldPlan';
import { parseHex, type PaperTheme, type SkinAsset } from '../theme/paperTheme';
import { setMotionFold, setMotionHoles } from '../../ui/motion';
import { FoldPaper } from './FoldPaper';
import { HolePool } from './HolePool';

/** Trung bình một dãy tiến trình — 0 khi dãy rỗng (đề một lớp cũng phải có MỘT con số). */
const mean = (values: readonly number[]): number =>
  (values.length === 0 ? 0 : values.reduce((s, v) => s + v, 0) / values.length);

/** 4 góc Rat của một tam giác nhát cắt -> 6 số 0..1 của hệ tờ giấy (nhân `side` ở bước vẽ). */
function unitTriangle(pts: readonly Point[]): number[] {
  return pts.flatMap((p) => [toNumber(p.x), toNumber(p.y)]);
}


/** Vai trò bộ lỗ đang vẽ — màu khác nhau để mắt phân biệt bản đúng / bản mình chọn. */
export type HoleRole = 'answer' | 'picked';

/** Texture giấy có thật hay chưa (BootScene có thể thiếu asset trên nền tảng lạ) => không ném. */
function textureOf(scene: Phaser.Scene, key: string): string | undefined {
  return scene.textures.exists(key) ? key : undefined;
}

export class SheetView extends Phaser.GameObjects.Container {
  /** Nền nhạt của CẢ tờ giấy — chỗ giấy đã gập đi thì chỉ còn bóng này. */
  private readonly ghost: Phaser.GameObjects.Rectangle;

  /** Da giấy (skin): alpha bám theo độ mở của tờ, gói giấy kín thì watermark gần biến mất. */
  private readonly grain: Phaser.GameObjects.Image;

  /** Mặt giấy: lát giấy từng lớp + hệ nếp gấp + nét hint + tam giác cắt (component riêng). */
  private readonly paper: FoldPaper;

  /** Bộ lỗ của tờ giấy — cấp phát theo số lỗ THẬT, không cắt ở một trần tự đặt (F1). */
  private readonly holes: HolePool;

  private readonly band: Phaser.GameObjects.Rectangle;

  private readonly flash: Phaser.GameObjects.Rectangle;

  /** Tư thế hiện tại + đồng hồ của hoạt cảnh giấy — nguồn giá trị DUY NHẤT của `draw`. */
  private readonly player = new MotionPlayer(0, 0);

  /** Nhát trượt màn kế (tự chạy theo khung hình, không gửi gắm vào tween). */
  private glide: { ms: number; done: () => void } | null = null;

  /** Góc trên-trái của ô giấy trên màn — điểm neo để nhát trượt kéo về rồi trả lại đúng chỗ. */
  private readonly home = { x: 0, y: 0 };

  private theme: PaperTheme;

  private model: FoldModel | null = null;

  private folds: readonly FoldKind[] = [];

  /** Điểm đục của ĐỀ BÀI (hệ packet 0..1) — gói giấy PHẢI show, thiếu nó là mất đề. */
  private punch: readonly Point[] = [];

  /** Tam giác nhát cắt của đề (hệ 0..1), rỗng với đề đục lỗ. */
  private cuts: readonly (readonly number[])[] = [];

  private side = 0;

  private breathTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene, box: Box, theme: PaperTheme, skin: SkinAsset, fault?: (what: string) => void) {
    super(scene, box.x, box.y);
    this.theme = theme;
    this.fault = fault ?? ((what: string) => console.error('[sheet] ' + what));
    // Thứ tự xếp lớp là THỨ TỰ DRAW: nền tờ -> lát giấy (FoldPaper tự add) -> da giấy -> lỗ -> band/flash.
    this.ghost = scene.add.rectangle(0, 0, box.w, box.h, parseHex(theme.paper), 0.35);
    this.add(this.ghost);
    this.paper = new FoldPaper(scene, this, theme);
    this.grain = scene.add.image(0, 0, skin.assetKey).setAlpha(0);
    this.add(this.grain);
    this.holes = new HolePool(scene, this);
    this.band = scene.add.rectangle(0, 0, 10, 10, parseHex(theme.shade), 0.55).setVisible(false);
    this.flash = scene.add.rectangle(0, 0, 10, 10, parseHex(theme.ink), 0);
    this.add([this.band, this.flash]);
    this.setSkin(skin);
    this.relayout(box, theme);
  }

  // ------------------------------------------------------- MỘT đường vẽ, gọi mỗi khung hình

  /**
   * Vẽ lại tờ giấy từ ĐÚNG giá trị của `frame` — được gọi mỗi khung hình (qua `tick`), không có
   * đường nào "vẽ lại khi đổi pha": chuyển động vì thế là nội suy theo khung, không nhảy.
   * Đây cũng là chỗ DUY NHẤT ghi cửa đo MOTION, nên QA thấy đúng cái mắt đang thấy.
   */
  draw(frame: MotionFrame): void {
    const model = this.model;
    if (model === null) return;
    const prog = frame.layers.map((q, i) => layerProgress(model, i, q));
    const open = mean(frame.layers);
    this.paper.paint(prog);
    // Vết đục thuộc về gói giấy: tờ mở tới đâu nó mờ tới đó (đủ 1 khi gập kín, sạch khi phẳng).
    this.paper.paintCuts(this.cuts, frame.reveal * (1 - open));
    this.grain.setAlpha(GRAIN_ALPHA * mean(prog.map(openness)));
    this.drawBand(frame.band);
    this.flash.setAlpha(frame.flash);
    frame.holes.forEach((v, i) => {
      this.holes.at(i)?.setScale(v, v);
    });
    setMotionFold(1 - open, frame.layers);
    setMotionHoles(frame.holes.filter((v) => v > 0).length);
  }

  /** Bước một khung hình: nhát trượt + đồng hồ hoạt cảnh, rồi VẺ lại bằng frame vừa bôi. */
  tick(dtMs: number): void {
    this.stepGlide(dtMs);
    const frame = this.player.advance(dtMs);
    if (frame !== null) this.draw(frame);
  }

  /** Vệt giải thích: band ở [-1..1]; chỉ hiện khi đang ở GIỮA nhịp quét (đầu/cuối là ẩn). */
  private drawBand(band: number): void {
    const shown = band > 0 && band < 1;
    this.band.setVisible(shown);
    if (shown) this.band.setPosition(band * this.side, 0);
  }

  // ------------------------------------------------------------- ba nhịp của một vòng chơi

  /** Nạp đề ở tư thế MỞ PHẲNG (điểm khởi đầu của hoạt cảnh gập vào), chưa có lỗ nào. */
  spread(folds: readonly FoldKind[], action: SheetAction): void {
    this.load(folds, action);
    this.holes.hide();
    this.pose(this.folding(0), 0, 0);
  }

  /** Gấp KHÍT tức thì (retry / undo): mọi lớp về packet + lỗ đục của đề hiện nguyên như đã đục. */
  fold(folds: readonly FoldKind[], action: SheetAction): void {
    this.load(folds, action);
    const pts = this.capped(this.punch);
    const t = this.folding(pts.length);
    this.placeFor(pts, 'answer');
    this.pose(t, pts.length, t.totalMs);
  }

  /**
   * Hoạt cảnh VÀO ĐỀ: từng lớp gập về packet theo `foldInPlan`, tới `punchStartMs` thì mũi đục
   * xuống và lỗ pop theo `holePlan` (DS:121). Xong là `done` — scene mở khoá chạm từ đó.
   */
  foldIn(done: () => void): void {
    const pts = this.capped(this.punch);
    const t = this.folding(pts.length);
    this.placeFor(pts, 'answer');
    this.play(t, pts.length, done);
  }


  /** Rect thật của gói giấy đang gấp — scene dùng để đăng ký testid-sheet-folded. */
  packetBox(box: Box): Box {
    const w = this.model === null ? 0.5 : toNumber(this.model.packet.w);
    const h = this.model === null ? 0.5 : toNumber(this.model.packet.h);
    return { x: box.x, y: box.y, w: this.side * w, h: this.side * h };
  }

  /**
   * MỞ BUNG từng lớp (DS:120) theo lịch `unfoldPlan`; vết đục của gói giấy teo dần theo nhịp
   * DUR.head. Đường chờ lấy từ CHÍNH dòng cuối của bảng lớp nên mọi số lớp (2..16) có hoạt cảnh.
   */
  unfold(done: () => void): void {
    const holes = this.player.frame().holes.length;
    this.play(openTrack(this.layerCount(), holes), holes, done);
  }

  /** Lỗ của ĐÁP ÁN hiện dần theo `holePlan` (DS:121) — so le DUR.holeStagger, mỗi lỗ DUR.pop. */
  popHoles(points: readonly Point[], role: HoleRole, done: () => void): void {
    const pts = this.capped(points);
    this.placeFor(pts, role);
    this.play(popTrack(pts.length), pts.length, done);
  }

  /**
   * Bản giải thích (DS:122 / PC-L-03): bộ lỗ của ô đã chọn hiện ĐẦY ở khung hình đầu, vệt sáng
   * quét DUR.sweep rồi nháy hoà lẫn DUR.blend — tổng đúng 700ms, không được ngắn hơn.
   */
  explain(points: readonly Point[], role: HoleRole, done: () => void): void {
    const pts = this.capped(points);
    this.placeFor(pts, role);
    this.play(explainTrack(pts.length), pts.length, done);
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
  highlightCrease(index: number | null): void {
    this.paper.hint(index);
  }

  /** Tô lại toàn bộ theo theme + Box mới (gọi khi resize và khi đổi chương). */
  relayout(box: Box, theme: PaperTheme): void {
    this.theme = theme;
    this.home.x = box.x;
    this.home.y = box.y;
    // C10: slideOut để lại alpha 0 — mỗi lần xếp bài PHẢI dựng tờ giấy về trạng thái thật,
    // nếu không thì từ màn thứ hai tờ giấy vô hình vĩnh viễn.
    this.setPosition(box.x, box.y);
    this.setAlpha(1);
    this.side = Math.min(box.w, box.h);
    this.ghost.setSize(this.side, this.side).setPosition(this.side / 2, this.side / 2);
    this.grain.setPosition(this.side / 2, this.side / 2).setDisplaySize(this.side, this.side);
    this.paper.setSheet(this.model, this.folds, this.side, theme);
    this.band.setOrigin(0, 0).setSize(this.side * BAND_WIDTH, this.side);
    this.placeFor(this.lastPoints, this.lastRole);
    this.draw(this.player.frame());
  }

  private lastPoints: readonly Point[] = [];

  /** Vai trò đã vẽ gần nhất — relayout (resize/đổi chương) phải vẽ lại ĐÚNG bộ lỗ đó. */
  private lastRole: HoleRole = 'answer';

  // ------------------------------------------------------------- nội bộ

  /** Số lớp của đề đang nạp — MỖI nếp gấp đôi tờ, không có chỗ nào khác được giữ số này. */
  private layerCount(): number {
    return 2 ** this.folds.length;
  }

  /** Nhịp gập vào của ĐỀ hiện tại, với đúng `holes` lỗ được phép vẽ. */
  private folding(holes: number): MotionTrack {
    return foldInTrack(this.layerCount(), holes);
  }

  /** Cắt bộ điểm về trần vẽ của một bề mặt (phần vượt do scene BÁO về QA — không im lặng). */
  private capped(points: readonly Point[]): readonly Point[] {
    return points.slice(0, holeBudget(points.length).shown);
  }

  /** Nạp một đề: model hình + điểm đục + tam giác cắt; chưa đặt tư thế (do nhịp kế quyết). */
  private load(folds: readonly FoldKind[], action: SheetAction): void {
    this.player.reset();
    this.glide = null;
    this.folds = folds;
    const model = foldModel(folds);
    this.model = model;
    this.punch = action.kind === 'punch' ? toPoints(action.points) : [];
    this.cuts = action.kind === 'cut'
      ? cutSnips(action).map((snip) => unitTriangle(cutSnipTriangle(model.packet, snip)))
      : [];
    this.paper.setSheet(model, folds, this.side, this.theme);
    this.holes.hide();
  }

  /** Cho một nhịp chạy từ khung hình này (và vẽ ngay khung hình đầu, không chờ `tick`). */
  private play(t: MotionTrack, holes: number, done: () => void): void {
    this.glide = null;
    this.player.play(t, this.layerCount(), holes, done);
    this.draw(this.player.frame());
  }

  /** Một khung HÌNH TĨNH: bôi nhịp `t` ở tuổi `ms` rồi vẽ — không để lại đồng hồ nào chạy. */
  private pose(t: MotionTrack, holes: number, ms: number): void {
    this.glide = null;
    this.draw(this.player.pose(t, this.layerCount(), holes, ms));
  }

  /** Nhát trượt màn kế — tự bước theo khung hình vì tween của Phaser không chạy theo nhịp. */
  private stepGlide(dtMs: number): void {
    const g = this.glide;
    if (g === null) return;
    g.ms += dtMs;
    const k = easeOut(Math.min(1, g.ms / SLIDE_MS));
    this.setPosition(this.home.x - k * this.side, this.home.y);
    this.setAlpha(1 - k);
    if (k < 1) return;
    this.glide = null;
    g.done();
  }

  /**
   * Dời bộ lỗ của tờ sang một bộ điểm mới. Ở đây CHỈ có vị trí + bán kính; độ lớn của từng lỗ
   * là do `draw()` bôi từ frame, nên không tồn tại đường nào "ẩn lỗ" ngoài tiến trình 0.
   */
  private placeFor(points: readonly Point[], role: HoleRole): void {
    this.lastPoints = points;
    this.lastRole = role;
    this.holes.place(points, this.side, 0, 0, 'sheet', this.holeStyle(role));
  }

  /** Màu bộ lỗ theo vai trò; độ tương phản do theme quyết, không hardcode ở đây. */
  private holeStyle(role: HoleRole): { fill: number; ring: number } {
    const theme = this.theme;
    return { fill: parseHex(role === 'picked' ? theme.shade : theme.ink), ring: parseHex(theme.ink) };
  }

  /** Rect thật của lỗ đầu tiên (QA cần vùng nhìn thấy của cái lỗ — PC-U-04). */
  holeBox(box: Box): Box {
    const units = this.lastPoints.map((p) => ({ x: toNumber(p.x), y: toNumber(p.y) }));
    const r = holeRadius('sheet', units.length, this.side, closestPair(units, this.side));
    const p = units[0];
    const cx = box.x + (p ? p.x : 0.5) * this.side;
    const cy = box.y + (p ? p.y : 0.5) * this.side;
    return { x: cx - r, y: cy - r, w: r * 2, h: r * 2 };
  }

  /** Trượt sang màn kế (pack §5: 400ms) — xong thì scene nạp đề mới ở vị trí cũ (C10). */
  slideOut(done: () => void): void {
    this.player.stop();
    this.glide = { ms: 0, done };
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

/** Bề rộng vệt quét của bản giải thích, theo cạnh tờ (DS:122). */
const BAND_WIDTH = 0.16;
