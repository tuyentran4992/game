// Pattern: Scene (menu)
// TRÁCH NHIỆM: màn Title 9:16 — một cột chân dung ở giữa camera: nhãn app, MỘT nút vào chơi,
//   nút Shop và nút Tiếng. Không dựng HUD của màn chơi ở đây (PC-B-02: không hiện nhầm).
// RÀNG BUỘC: mọi nhãn qua t() (PC-19); không gọi mạng (PC-15); không tự suy màn sẽ mở —
//   session.startLevel() trả lời (save + debug ?level=NN ở main.ts). Nút Shop của B3a chỉ
//   chiếm chỗ + phản hồi chạm; màn Shop do B3b dựng.

import Phaser from 'phaser';
import { t } from '../../logic/i18n';
import { makeButton, type ButtonView } from '../../ui/button';
import { makeTestidHook, type Hook } from '../../ui/testids';
import type { Box, Layout } from '../layout';
import { layoutOf } from '../layout';
import { PanelArt } from '../components/PaperPanel';
import { readSession, type GameSession } from '../session';
import { playFx } from '../audio/sfx';
import { parseHex, PAPER_THEMES, textStyle } from '../theme/paperTheme';

/** Hình dáng tờ giấy demo của Title (§4.2: ô 560×560 ở (80,180)) — DỮ LIỆU, không số trong hàm. */
const SHEET_ART = { radius: 16, alpha: 0.95, thick: 2 } as const;

/** Box tạm trước khi có camera thật — arrange() thay ngay trong create(). */
const ZERO: Box = { x: 0, y: 0, w: 44, h: 44 };

/** Một hàng trên màn Title: id QA + hình + ô + cú bấm — DỮ LIỆU, không 3 khối lặp nhau. */
type TitleRow = {
  readonly id: string;
  readonly glyph: string;
  readonly box: (l: Layout) => Box;
  readonly primary: boolean;
  /** null = nút chỉ hình (PC-O-02); khác là hàm dựng nhãn qua t() (PC-19). */
  readonly label: ((s: TitleScene) => string) | null;
  readonly onTap: (s: TitleScene) => void;
};

/**
 * Bảng 3 nút của Title (§4.2): PLAY giữa cột, SHOP ngay dưới PLAY, sound ở góc phải hàng 1.
 * Mọi ô lấy THẲNG từ layout — scene không nhân tỷ lệ lẻ (Vòng sửa layout).
 */
const ROWS: readonly TitleRow[] = [
  {
    id: 'testid-title-play', glyph: 'play', box: (l) => l.play, primary: true,
    label: (s) => s.copy('hud.continue', { n: s.startLevel() }), onTap: (s) => s.go(),
  },
  {
    id: 'testid-title-shop', glyph: 'shop', box: (l) => l.shop, primary: false,
    label: null, onTap: (s) => s.fx('click'),
  },
  {
    id: 'testid-btn-sound', glyph: 'sound', box: (l) => l.sound, primary: false,
    label: null, onTap: (s) => s.fx('click'),
  },
];

export class TitleScene extends Phaser.Scene {
  private session!: GameSession;

  private bg!: Phaser.GameObjects.Graphics;

  /** Tờ giấy demo 560×560 của §4.2 — ô do layout.titleSheet phát ra, scene không tự đặt. */
  private sheet!: PanelArt;

  private art!: Phaser.GameObjects.Text;

  private views: readonly ButtonView[] = [];

  /** Cửa đăng ký rect duy nhất (A9: không copy phép đổi toạ độ từ PlayScene). */
  private hook!: Hook;

  constructor() {
    super('Title');
  }

  create(): void {
    const session = readSession(this.game.registry);
    this.session = session;
    this.hook = makeTestidHook(this, this.game.canvas, () => {
      const cam = this.cameras.main;
      return { width: cam.width, height: cam.height };
    });
    const theme = PAPER_THEMES[0];
    this.bg = this.add.graphics();
    this.sheet = new PanelArt(this);
    this.add.existing(this.sheet);
    this.art = this.add.text(0, 0, t('app.title', session.dict), textStyle('title', theme.ink));
    this.art.setOrigin(0.5);
    this.views = ROWS.map((row) => {
      const view = makeButton(this, row.id, ZERO, theme, row.glyph, row.primary, this.hook);
      this.add.existing(view.obj);
      view.onTap(() => row.onTap(this));
      if (row.label !== null) view.setLabel(row.label(this));
      return view;
    });
    this.arrange();
    this.scale.on('resize', this.arrange, this);
  }

  /** Một cửa dịch khoá -> chữ (PC-19): bảng ROWS không được tự ghép chuỗi. */
  copy(key: string, vars?: Record<string, string | number>): string {
    return t(key, this.session.dict, vars);
  }

  /** Màn sẽ mở khi bấm PLAY — do save/debug trả lời (session), scene không suy (PC-16). */
  startLevel(): number {
    return this.session.startLevel();
  }

  /** Cú bấm PLAY: tiếng + phản hồi lún rồi vào màn chơi (không màn chờ trung gian — PC-09). */
  go(): void {
    this.views[0]?.press();
    this.fx('click');
    this.scene.start('Play');
  }

  /** Phát tiếng qua session (nút sound của Title cũng đi qua đây — PC-17 mute của nền tảng). */
  fx(key: string): void {
    playFx(this, key, this.session.soundOn());
  }

  /** Đổi cỡ cửa sổ: vẽ lại nền gradient, xếp cột 9:16, đăng ký lại mọi rect QA. */
  private arrange(): void {
    const theme = PAPER_THEMES[0];
    const l = layoutOf(this.cameras.main.width, this.cameras.main.height);
    this.bg.clear();
    this.bg.fillGradientStyle(
      parseHex(theme.bg.top), parseHex(theme.bg.top), parseHex(theme.bg.bottom), parseHex(theme.bg.bottom), 1,
    );
    this.bg.fillRect(0, 0, l.w, l.h);
    this.bg.fillStyle(parseHex(theme.paper), 0.35);
    this.bg.fillRect(l.portrait.x, 0, l.portrait.w, l.h);
    this.sheet.paint(l.titleSheet, theme, { ...SHEET_ART, edge: theme.crease });
    this.art.setPosition(l.titleWord.x + l.titleWord.w / 2, l.titleWord.y + l.titleWord.h / 2);
    ROWS.forEach((row, i) => {
      const view = this.views[i];
      if (!view) return;
      view.retint(theme, row.box(l));
      view.show();
    });
  }
}
