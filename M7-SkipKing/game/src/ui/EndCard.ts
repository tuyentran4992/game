/**
 * M7 Skip King — EndCard (T5 TẦNG B — CONTRACT 3.5 + mục 4 testid `end-card`):
 * overlay cuối run — "N BOUNCES" to nhất + best dạng GAP:
 *   phá kỷ lục  → "NEW BEST! (was M)"
 *   chưa phá    → "K AWAY FROM BEST M" (K = M − điểm run)
 *   edge lần đầu (best cũ 0) → KHÔNG dòng gap
 * 0 nảy → "SPLASH!" thay FAILED (0 nảy vẫn hiện "0 BOUNCES" + SPLASH top).
 * Nút "THROW AGAIN" ≥44px (touchTargetPx) nửa dưới màn — thumb reach (CONTRACT §2).
 * Nút nằm TRONG vùng chạm toàn màn PullBackInput: kéo-thả từ nút = cú mới
 * (verb pull-back duy nhất — tap đơn không ném, anti-misfire AIM.minDragPx).
 * Chỉ ĐỌC số qua RunLifecycle + engine.toResult() (tầng A public interface) — 0 tự tính điểm.
 * Text từ MechanicsConfig.endCard (nguồn duy nhất — 0 hardcode). 100% EN (PB-5).
 */
import * as Phaser from 'phaser';
import { MECHANICS } from '../config/mechanics';
import type { RunResult } from '../logic/types';

const HEADLINE_SIZE_PX = 76;  // px — "N BOUNCES" / "SPLASH!" to nhất card (CONTRACT 3.5)
const STAT_SIZE_PX = 46;      // px — "0 BOUNCES" dưới SPLASH
const GAP_SIZE_PX = 36;       // px — dòng gap best
const BTN_LABEL_SIZE_PX = 34; // px — nhãn THROW AGAIN
const BTN_PAD_X_PX = 48;      // px — padding ngang nền nút [PLACEHOLDER] feel-tune
const BTN_PAD_Y_PX = 28;      // px — padding dọc nền nút [PLACEHOLDER] feel-tune
const BG_COLOR = 0x0a1428;    // overlay mờ tối sau card (đồng dải HUD)
const BG_ALPHA = 0.55;        // [PLACEHOLDER] feel-tune
const BTN_COLOR = 0x1e90d6;   // CTA sáng nhất card — nổi trên nền tối (SOUL: CTA chính)
const SPLASH_COLOR = '#ffd76a';
const HEADLINE_COLOR = '#ffffff';
const GAP_NEW_COLOR = '#8ef6b2';  // đồng mint combo PERFECT
const GAP_AWAY_COLOR = '#dff1ff';

/** Vị trí dọc khối card (px từ đáy — [PLACEHOLDER] feel-tune). */
const LINES = { headlineFromBottom: 0.34, statFromBottom: 0.27, gapFromBottom: 0.22, btnFromBottom: 0.28 };

export interface EndCardRun {
  /** best NGAY TRƯỚC run này (đọc lifecycle trước applyRun — nguồn tầng A). */
  bestBeforeRun: number;
  /** Kết quả run (engine.toResult() — tầng A chốt, 0 tự tính). */
  run: RunResult;
}

export class EndCard {
  private bg: Phaser.GameObjects.Rectangle;
  private headline: Phaser.GameObjects.Text;
  private stat: Phaser.GameObjects.Text;
  private gap: Phaser.GameObjects.Text;
  private btnBg: Phaser.GameObjects.Rectangle;
  private button: Phaser.GameObjects.Text;
  private shownFlag = false;

  constructor(scene: Phaser.Scene) {
    const cx = scene.scale.width / 2;
    const h = scene.scale.height;
    this.bg = scene.add
      .rectangle(cx, h / 2, scene.scale.width, h, BG_COLOR, BG_ALPHA)
      .setDepth(38)
      .setVisible(false)
      .setActive(false);
    this.headline = this.makeText(scene, cx, h * (1 - LINES.headlineFromBottom), HEADLINE_SIZE_PX, HEADLINE_COLOR);
    this.stat = this.makeText(scene, cx, h * (1 - LINES.statFromBottom), STAT_SIZE_PX, GAP_AWAY_COLOR);
    this.gap = this.makeText(scene, cx, h * (1 - LINES.gapFromBottom), GAP_SIZE_PX, GAP_AWAY_COLOR);
    // Nút THROW AGAIN — nửa dưới màn (thumb reach, CONTRACT §2) + nền ≥ touchTargetPx.
    this.btnBg = scene.add
      .rectangle(cx, h * (1 - LINES.btnFromBottom), MECHANICS.touchTargetPx, MECHANICS.touchTargetPx, BTN_COLOR, 1)
      .setDepth(40)
      .setVisible(false)
      .setActive(false);
    this.button = this.makeText(scene, cx, h * (1 - LINES.btnFromBottom), BTN_LABEL_SIZE_PX, '#ffffff');
    // QA soi qua testid trên MỌI thành phần card (CONTRACT mục 4).
    for (const o of [this.bg, this.headline, this.stat, this.gap, this.btnBg, this.button]) {
      o.setData('testid', 'end-card');
    }
  }

  private makeText(
    scene: Phaser.Scene,
    x: number,
    y: number,
    sizePx: number,
    color: string,
  ): Phaser.GameObjects.Text {
    return scene.add
      .text(x, y, '', {
        fontFamily: 'Arial, sans-serif',
        fontSize: `${sizePx}px`,
        color,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(41)
      .setAlpha(0)
      .setVisible(false)
      .setActive(false);
  }

  /** Hiện card cuối run — SỐ chỉ đọc từ tầng A (EndCardRun), 0 tự tính điểm. */
  show(data: EndCardRun): void {
    const cfg = MECHANICS.endCard;
    const b = data.run.bounces;
    // Headline: 0 nảy → SPLASH! (thay FAILED — CONTRACT 3.5); ngược lại "N BOUNCES" to nhất.
    this.headline.setText(b === 0 ? cfg.splash : `${b} BOUNCES`).setColor(b === 0 ? SPLASH_COLOR : HEADLINE_COLOR);
    // 0 nảy vẫn hiện số run ("0 BOUNCES") — run nảy thì headline ĐÃ là "N BOUNCES".
    this.stat.setText(b === 0 ? `${b} BOUNCES` : '');
    // Gap best theo điểm run so best-trước-run (tầng A applyRun là chủ best — card chỉ đọc):
    if (data.bestBeforeRun === 0) {
      this.gap.setText(''); // edge lần đầu: chưa có best cũ — KHÔNG dòng gap (CONTRACT 3.5)
    } else if (data.run.score > data.bestBeforeRun) {
      this.gap.setText(`NEW BEST! (was ${data.bestBeforeRun})`).setColor(GAP_NEW_COLOR);
    } else {
      this.gap
        .setText(`${data.bestBeforeRun - data.run.score} AWAY FROM BEST ${data.bestBeforeRun}`)
        .setColor(GAP_AWAY_COLOR);
    }
    this.button.setText(cfg.button);
    // Nút ≥44px: nền đo theo text, sàn = touchTargetPx (CONTRACT §2 THROW AGAIN ≥44px).
    const w = Math.max(Math.ceil(this.button.width) + BTN_PAD_X_PX, MECHANICS.touchTargetPx);
    const hgt = Math.max(Math.ceil(this.button.height) + BTN_PAD_Y_PX, MECHANICS.touchTargetPx);
    this.btnBg.setSize(w, hgt);
    this.button.setDepth(41);
    this.shownFlag = true;
    for (const o of [this.bg, this.headline, this.stat, this.gap, this.btnBg, this.button]) {
      o.setVisible(true).setActive(true);
    }
    for (const t of [this.headline, this.stat, this.gap, this.button]) t.setAlpha(1);
  }

  /** Tắt card — thả cú mới (THROW AGAIN) hoặc scene trao trạng thái khác. */
  hide(): void {
    this.shownFlag = false;
    for (const o of [this.bg, this.headline, this.stat, this.gap, this.btnBg, this.button]) {
      o.setVisible(false).setActive(false);
    }
  }

  get shown(): boolean {
    return this.shownFlag;
  }

  get headlineText(): string {
    return this.headline.text;
  }

  get buttonText(): string {
    return this.button.text;
  }

  /** Cạnh ngắn nhất của nút (px) — ràng buộc ≥ touchTargetPx (CONTRACT §2). */
  get buttonMinSidePx(): number {
    return Math.min(this.btnBg.width, this.btnBg.height);
  }

  /** Tâm nút theo trục Y (px) — ràng buộc nửa dưới màn (thumb reach). */
  get buttonCenterY(): number {
    return this.btnBg.y;
  }
}
