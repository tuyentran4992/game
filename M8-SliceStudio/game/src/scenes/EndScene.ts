// Slice Studio — scenes/EndScene.ts (Tier B, thin — popup End + compliance đóng)
// Popup có nút đóng rõ (C-19), keyboard Enter/Space confirm + Esc đóng + arrow
// đổi chọn (C-15), 2 nút trong vùng thumb-reach bottom 40% (y >= 768/1280).
import * as Phaser from 'phaser';
import { totalStars } from '../core/scoring';
import { COPY_EN } from '../config/copy-en';

const CLOSE_HIT = 44; // px — hit-region >= 44px (compliance S5-T2)
const THUMB_TOP = 768; // bottom 40% of 1280 — mọi nút hành động nằm dưới vạch này
const STARS_PER_ROW = 12; // 36 sao tối đa = 3 hàng 12 — chống tràn/đè chữ

export class EndScene extends Phaser.Scene {
  private stars = 0;
  private streakMax = 0;
  private startLevel = 1;
  private selected = 0; // 0 = PLAY AGAIN (primary), 1 = REPLAY LEVEL
  private again: Phaser.GameObjects.Text | null = null;
  private replay: Phaser.GameObjects.Text | null = null;

  constructor() {
    super('EndScene');
  }

  init(data: { totalStars?: number; ghostStreak?: number; lastLevel?: number }): void {
    // TraceScene passes the run award list via registry (simple + typed enough for proto)
    const runAwards = (this.registry.get('awards') as { stars: number }[] | undefined) ?? [];
    this.stars = data.totalStars ?? totalStars(runAwards);
    // streak tại cuối run (engine giữ streak xuyên level tới khi đứt) — proxy max
    // khả dụng không đụng TraceScene; nâng cấp khi ranh giới TraceScene mở (S4/S6).
    this.streakMax = typeof data.ghostStreak === 'number' ? data.ghostStreak : 0;
    // level cuối của run: data.lastLevel nếu có, fallback = số level đã cắt.
    this.startLevel = data.lastLevel ?? Math.max(1, Math.min(runAwards.length, 12));
  }

  create(): void {
    this.selected = 0;

    // dim behind popup
    this.add.rectangle(360, 640, 720, 1280, 0x000000, 0.45).setDepth(0);

    // panel
    const bg = this.add.graphics();
    bg.fillRoundedRect(140, 320, 440, 660, 28);
    bg.fillStyle(0x111827, 0.92);
    bg.setDepth(1);

    // close button (top-right of panel) — testid btn-close, hit >= 44px
    const close = this.add.text(534, 348, COPY_EN.close, {
      fontFamily: 'Arial', fontSize: '30px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(5);
    close.setName('btn-close');
    close.setInteractive(
      new Phaser.Geom.Rectangle(-CLOSE_HIT / 2, -CLOSE_HIT / 2, CLOSE_HIT, CLOSE_HIT),
      Phaser.Geom.Rectangle.Contains,
    );
    close.on('pointerdown', () => this.closePopup());

    // title + stars
    this.add.text(360, 418, COPY_EN.endTitle, {
      fontFamily: 'Arial', fontSize: '44px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(5);

    // 3 hàng x 12 ô sao (đầy/ rỗng) — layout tĩnh, không tràn khung
    const rows: string[] = [];
    for (let r = 0; r < 3; r++) {
      const filled = Phaser.Math.Clamp(this.stars - r * STARS_PER_ROW, 0, STARS_PER_ROW);
      rows.push('★'.repeat(filled) + '☆'.repeat(STARS_PER_ROW - filled));
    }
    this.add.text(360, 520, rows.join('\n'), {
      fontFamily: 'Arial', fontSize: '34px', color: '#fde047', align: 'center',
      lineSpacing: 6,
    }).setOrigin(0.5).setDepth(5);

    this.add.text(360, 620, `${this.stars} / 36`, {
      fontFamily: 'Arial', fontSize: '34px', color: '#cbd5e1',
    }).setOrigin(0.5).setDepth(5);

    this.add.text(360, 668, `${COPY_EN.bestStreak} ${this.streakMax}`, {
      fontFamily: 'Arial', fontSize: '28px', color: '#a5f3fc',
    }).setOrigin(0.5).setDepth(5);

    // CTAs — thumb-reach bottom 40%
    this.again = this.add.text(360, 790, COPY_EN.playAgain, {
      fontFamily: 'Arial', fontSize: '38px', color: '#083344', fontStyle: 'bold',
      backgroundColor: '#67e8f9', padding: { x: 30, y: 14 },
    }).setOrigin(0.5).setDepth(5).setInteractive({ useHandCursor: true });
    this.again.on('pointerdown', () => this.playAgain());

    this.replay = this.add.text(360, 872, COPY_EN.replayLevel, {
      fontFamily: 'Arial', fontSize: '30px', color: '#67e8f9',
      backgroundColor: '#164e63', padding: { x: 26, y: 12 },
    }).setOrigin(0.5).setDepth(5).setInteractive({ useHandCursor: true });
    this.replay.on('pointerdown', () => this.replayLevel());

    this.add.text(360, 950, COPY_EN.foot, {
      fontFamily: 'Arial', fontSize: '20px', color: '#64748b',
    }).setOrigin(0.5).setDepth(5);

    this.refreshSelection();
    this.bindKeys();
  }

  private bindKeys(): void {
    const kb = this.input.keyboard;
    kb?.on('keydown-ENTER', () => this.confirm());
    kb?.on('keydown-SPACE', () => this.confirm());
    kb?.on('keydown-ESC', () => this.closePopup());
    kb?.on('keydown-UP', () => this.moveSelection(-1));
    kb?.on('keydown-DOWN', () => this.moveSelection(1));
    kb?.on('keydown-LEFT', () => this.moveSelection(-1));
    kb?.on('keydown-RIGHT', () => this.moveSelection(1));
  }

  private moveSelection(dir: number): void {
    this.selected = (this.selected + (dir > 0 ? 1 : -1) + 2) % 2;
    this.refreshSelection();
  }

  private refreshSelection(): void {
    const on = (t: Phaser.GameObjects.Text | null, sel: boolean) => {
      if (!t) return;
      t.setAlpha(sel ? 1 : 0.75);
      t.setScale(sel ? 1.06 : 1);
    };
    on(this.again, this.selected === 0);
    on(this.replay, this.selected === 1);
  }

  private confirm(): void {
    if (this.selected === 0) this.playAgain();
    else this.replayLevel();
  }

  private playAgain(): void {
    this.registry.set('awards', []);
    // S5F: truyền tường minh { startLevel: 0 } — scene.start() KHÔNG data thì
    // Phaser giữ data cũ ({ startLevel } của lượt REPLAY trước) → stale leak.
    this.scene.start('TraceScene', { startLevel: 0 });
  }

  private replayLevel(): void {
    // startLevel đi qua data-param chuẩn Phaser — TraceScene hiện chưa đọc
    // (create luôn L1); cắm đọc tại create() thuộc TraceScene (S4 là chủ file).
    this.registry.set('awards', []);
    this.scene.start('TraceScene', { startLevel: this.startLevel });
  }

  private closePopup(): void {
    this.registry.set('awards', []);
    // S5F: truyền tường minh { startLevel: 0 } — scene.start() KHÔNG data thì
    // Phaser giữ data cũ ({ startLevel } của lượt REPLAY trước) → stale leak.
    this.scene.start('TraceScene', { startLevel: 0 });
  }
}
