// Pattern: Scene (boot + tải asset)
// TRÁCH NHIỆM: tải ảnh giấy + âm thanh và vẽ MÀN CHỜ CÓ TIẾN TRÌNH (PC-B-05: không trắng
//   màn hình), rồi đưa người chơi sang Title. Không một dòng nghiệp vụ ở đây.
// RÀNG BUỘC: chỉ đọc session do main.ts gắn vào registry (logic + adapter đi qua cửa đó —
//   PC-16); chuỗi hiển thị duy nhất là nhãn app qua t() (PC-19); không gọi mạng (PC-15) —
//   asset là đường dẫn cục bộ; rect thanh tiến trình là rect thật đăng ký cho QA.

import Phaser from 'phaser';
import { t } from '../../logic/i18n';
import { makeTestidHook, markCanvas } from '../../ui/testids';
import { loadSfx } from '../audio/sfx';
import { layoutOf } from '../layout';
import { readSession } from '../session';
import { IMAGE_ASSETS } from '../generated/assetList';
import { PAPER_THEMES, parseHex, textStyle } from '../theme/paperTheme';

/**
 * Danh sách nạp = `src/render/generated/assetList.ts`, do `scripts/gen-asset-list.mjs` sinh
 * từ ../assets/manifest.json + ../assets/sfx-manifest.json. Thêm asset là thêm một dòng
 * MANIFEST rồi chạy lại script — không gõ tay đường dẫn trong file này (một nguồn sự thật).
 */
const MISSING = new Set<string>();

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  /** everything vẽ ở preload để người chơi THẤY tiến trình trong lúc đang tải (PC-B-05). */
  preload(): void {
    const cam = this.cameras.main;
    const layout = layoutOf(cam.width, cam.height);
    const theme = PAPER_THEMES[0];
    this.add.rectangle(0, 0, layout.w, layout.h, parseHex(theme.bg.top)).setOrigin(0, 0);
    const word = layout.titleWord;
    const bar = layout.progress;
    this.add
      .text(word.x + word.w / 2, word.y + word.h / 2, t('app.title', readSession(this.game.registry).dict), textStyle('title', theme.ink))
      .setOrigin(0.5);
    // Bar tiến trình tự vẽ (Phaser 4 không còn createProgressBar): rãnh + phần lấp theo 'progress'.
    this.add.rectangle(bar.x + bar.w / 2, bar.y + bar.h / 2, bar.w, bar.h, parseHex(theme.shade), 0.3);
    const fill = this.add.graphics();
    const paintBar = (value: number): void => {
      const done = Math.min(1, Math.max(0, value));
      fill.clear();
      fill.fillStyle(parseHex(theme.ink), 1);
      fill.fillRect(bar.x, bar.y, bar.w * done, bar.h);
    };
    this.load.on('progress', paintBar);
    paintBar(0);
    // Rect thanh tiến trình đi qua CỬA CHUNG của ui/testids (V4): Boot có TÊN trong registry
    // chủ học thì lúc Boot tắt, `testid-loading-bar` biến mất — để QA không đọc nó thành vùng
    // bấm của màn Title đang chạy (nó nằm ngay khe giữa chữ và nút PLAY).
    const hook = makeTestidHook(this, this.game.canvas, () => {
      const c = this.cameras.main;
      return { width: c.width, height: c.height };
    });
    hook('testid-loading-bar', bar);
    // Thiếu file là LỖI NỀN TẢNG, không phải chuyện để người chơi chịu: ghi tên khoá + đường
    // dẫn thật ra console (QA đọc console — PC-B-01) chứ không âm thầm chạy thiếu hình.
    this.load.on('loaderror', (file: { key?: string; url?: string }) => {
      MISSING.add((file.key ?? '?') + ' <- ' + (file.url ?? '?'));
    });
    for (const asset of IMAGE_ASSETS) this.load.image(asset.key, asset.path);
    loadSfx(this.load);
  }

  create(): void {
    for (const what of MISSING) console.error('[boot]missing-asset:' + what);
    if (MISSING.size > 0) console.error(`[boot] tong cong ${MISSING.size}/${IMAGE_ASSETS.length} anh thieu - sua manifest roi chay node scripts/gen-asset-list.mjs`);
    markCanvas(this.game);
    this.scene.start('Title');
  }
}
