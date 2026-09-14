// Pattern: Scene (album nếp gấp + hàng huy hiệu)
// TRÁCH NHIỆM: lưới 4 cột mẫu giấy 200 × 200 px thiết kế (DS:109 — ô do gridModel.tileGrid chia)
//   và một hàng huy hiệu tròn ⌀ 96 px. MỤC TIÊU PC-12: số dòng vẽ ra ĐÚNG BẰNG số dòng danh mục
//   mà view-model trả — scene KHÔNG tự cắt theo trần, KHÔNG tự cấp, KHÔNG sở hữu danh sách id.
//   Trần 14 mẫu / 6 huy hiệu sống ở logic/cache.ts (CAPS) và được addAlbumItems/awardBadge cắt
//   trước khi tới đây; albumModel ghép danh mục với save nên mỗi dòng mang cờ `unlocked`/`earned`.
//   Mẫu chưa mở vẫn nằm trên lưới, chỉ đổi silhouette xám — ẩn mục đi là người chơi không còn
//   biết mình thiếu gì (PC-12).
// Id QA: testid-album-item-1 … testid-album-item-14 cho ô mẫu, testid-badge-1 … testid-badge-6
//   cho huy hiệu (id thật do qaId ghép với index dữ liệu, scene không viết prefix hở).
// RÀNG BUỘC: 0 phép .slice( trong file này; nút nền qua makeButton (PC-U-06), rect qua
//   makeTestidHook (A9), chữ qua cửa say() của PaperPanel (PC-19), mọi màu lấy từ PaperTheme
//   (PC-11) — nên ở đây chỉ còn HAI field dựng màn: `session` (cửa nghiệp vụ) và `kit`.

import Phaser from 'phaser';
import type { AlbumItem, Badge } from '../../logic/economy';
import { chapterOf } from '../../logic/progression';
import { makeButton, type ButtonView } from '../../ui/button';
import { makeTestidHook, qaId } from '../../ui/testids';
import { playFx } from '../audio/sfx';
import { BadgeIcon } from '../components/BadgeIcon';
import {
  cameraSize, liveFrame, openFrame, say, type Frame as KitFrame,
} from '../components/PaperPanel';
import type { Box, Layout } from '../layout';
import { layoutOf } from '../layout';
import { readSession, type GameSession } from '../session';
import { parseHex, themeFor, textStyle, type PaperTheme } from '../theme/paperTheme';
import { badgeBoxes, frameOf, scaleOf, tileGrid, type Frame } from '../viewmodel/gridModel';
import { albumRows, badgeRows, type AlbumRow, type BadgeRow } from '../viewmodel/albumModel';

/** Ô tạm trước khi camera biết kích thước — arrange() đặt lại ngay lần vẽ đầu. */
const ZERO: Box = { x: 0, y: 0, w: 44, h: 44 };

/** Kẽ + dải nhãn riêng của màn album; mẫu 200 × 200 và huy hiệu ⌀ 96 đã nằm trong gridModel. */
const GEO = {
  gap: 18,
  pad: 24,
  pill: { w: 200, h: 72 },
  /** Hình mẫu giấy: bán kính bo + số nếp gấp vẽ bên trong ô ĐÃ MỞ (DỮ LIỆU, không hardcode). */
  tile: { radius: 0.08, crease: 0.3, edge: 2 },
} as const;

/** Danh mục do logic + view-model đưa; scene chỉ đi qua đúng hai cửa này. */
type Shelf = { readonly items: readonly AlbumItem[]; readonly owned: readonly Badge[] };

export class AlbumScene extends Phaser.Scene {
  private session!: GameSession;

  /** Nền giấy + CỬA đăng ký rect QA (A9): MỘT cặp do `openFrame` trả, không hai field rời. */
  private kit!: KitFrame;

  /** Toàn bộ mẫu giấy vẽ chung MỘT Graphics: mỗi lần arrange là clear + vẽ lại đúng số dòng. */
  private art!: Phaser.GameObjects.Graphics;

  private head!: Phaser.GameObjects.Text;

  private band!: Phaser.GameObjects.Text;

  private note!: Phaser.GameObjects.Text;

  private plates: readonly ButtonView[] = [];

  private medals: readonly BadgeIcon[] = [];

  private back!: ButtonView;

  /** Ô đang được chọn để đọc nhãn — state vẽ của riêng màn này, không liên quan save. */
  private picked = 0;

  constructor() {
    super('Album');
  }

  create(): void {
    this.session = readSession(this.game.registry);
    this.kit = openFrame(this, makeTestidHook(this.game.canvas, () => cameraSize(this.cameras.main)));
    const theme = this.palette();
    this.art = this.add.graphics();
    this.head = this.add.text(0, 0, '', textStyle('title', theme.ink)).setOrigin(0, 0.5);
    this.band = this.add.text(0, 0, '', textStyle('label', theme.ink)).setOrigin(0, 0.5);
    this.note = this.add.text(0, 0, '', textStyle('label', theme.ink)).setOrigin(0.5);
    const shelf = this.shelf();
    const tiles = albumRows(shelf.items);
    // `_row` không dùng ở đây: cờ đã-mở chỉ cần lúc VẼ (samples()), còn lúc dựng thì mọi dòng
    // đều có một nền bấm — số nút dựng ra ĐÚNG BẰNG số dòng danh mục (PC-12, không tự cắt).
    this.plates = tiles.map((_row, i) => this.tile(qaId('album-item', i + 1), i));
    this.medals = badgeRows(shelf.owned).map(() => this.add.existing(new BadgeIcon(this)));
    this.back = makeButton(this, 'testid-album-back', ZERO, theme, null, false, this.kit.hook);
    this.add.existing(this.back.obj);
    this.back.onTap(() => this.leave());
    liveFrame(this, () => this.arrange(), () => this.forget());
  }

  // --------------------------------------------------------------- cửa bấm
  /** Chọn một mẫu để đọc nhãn: chỉ đổi phần đang vẽ, dữ liệu album giữ nguyên (PC-R-04). */
  pick(index: number): void {
    playFx(this, 'click', this.session.soundOn());
    this.picked = index;
    this.arrange();
  }

  /** Một cú bấm về bản đồ (PC-09). */
  leave(): void {
    playFx(this, 'click', this.session.soundOn());
    this.scene.start('Map');
  }

  // ------------------------------------------------------------- bên trong
  /** Hai danh sách ĐÃ ĐẠT của save — trần đã được logic cắt trước khi tới đây (PC-12). */
  private shelf(): Shelf {
    return { items: this.session.albumItems(), owned: this.session.badges() };
  }

  /** Bảng màu theo chương hiện hành — chủ của bảng là logic, scene chỉ tra. */
  private palette(): PaperTheme {
    const standing = this.session.level();
    return themeFor(chapterOf(standing));
  }

  /** Chữ hiển thị: MỘT cửa dùng chung cho năm màn tiến trình (PaperPanel.say) — PC-19. */
  private tile(id: string, index: number): ButtonView {
    const view = makeButton(this, id, ZERO, this.palette(), null, false, this.kit.hook);
    this.add.existing(view.obj);
    view.onTap(() => this.pick(index));
    return view;
  }

  /** Vẽ lại: lưới mẫu theo đúng số dòng danh mục, hàng huy hiệu theo đúng số dòng logic. */
  private arrange(): void {
    const l = layoutOf(this.cameras.main.width, this.cameras.main.height);
    const f = frameOf(l);
    this.kit.bg.paint(l, this.palette(), true);
    this.head.setText(say(this.session, 'album.title'));
    this.head.setPosition(f.head.x, f.head.y + f.head.h / 2);
    const shelf = this.shelf();
    this.samples(l, albumRows(shelf.items));
    this.honours(f, l, badgeRows(shelf.owned));
    this.note.setPosition(l.cx, f.bar.y - GEO.pad * scaleOf(l));
    this.exit(l, f);
  }

  /** Một ô mẫu: đã mở thì đủ màu + nếp gấp, chưa mở thì silhouette xám (PC-12). */
  private samples(l: Layout, rows: readonly AlbumRow[]): void {
    const theme = this.palette();
    this.art.clear();
    this.note.setText(rows[this.picked]?.title ?? '');
    this.note.setVisible(this.note.text.length > 0);
    tileGrid(l, rows.length).forEach((cell, i) => {
      const row = rows[i];
      this.face(theme, cell, row.unlocked);
      const view = this.plates[i];
      view.retint(theme, cell);
      view.show();
    });
  }

  /** Hình một ô giấy: nền + viền nếp; mục khoá chỉ còn khối xám, không có nếp bên trong. */
  private face(theme: PaperTheme, cell: Box, unlocked: boolean): void {
    const radius = cell.w * GEO.tile.radius;
    const fill = unlocked ? theme.paper : theme.shade;
    const edge = unlocked ? theme.crease : theme.shade;
    this.art.fillStyle(parseHex(fill), unlocked ? 1 : 0.55);
    this.art.fillRoundedRect(cell.x, cell.y, cell.w, cell.h, radius);
    this.art.lineStyle(GEO.tile.edge, parseHex(edge), 1);
    this.art.strokeRoundedRect(cell.x, cell.y, cell.w, cell.h, radius);
    if (!unlocked) return;
    const at = cell.h * GEO.tile.crease;
    this.art.lineBetween(cell.x, cell.y + at, cell.x + cell.w, cell.y + at);
    this.art.lineBetween(cell.x + cell.w - at, cell.y, cell.x + cell.w - at, cell.y + cell.h);
  }

  /** Hàng huy hiệu: mỗi dòng một BadgeIcon, id QA `testid-badge-1` … đăng theo ô thật. */
  private honours(f: Frame, l: Layout, rows: readonly BadgeRow[]): void {
    const s = scaleOf(l);
    const area: Box = { x: f.grid.x, y: f.grid.y - GEO.pill.h * s, w: f.grid.w, h: GEO.pill.h * s };
    this.band.setText(say(this.session, 'album.badges'));
    this.band.setPosition(area.x, area.y - GEO.gap * s);
    badgeBoxes(area, rows.length, l).forEach((box, i) => {
      this.medals[i].paint(box, this.palette(), rows[i]);
      this.kit.hook(qaId('badge', i + 1), box);
    });
  }

  /** Nút về bản đồ nằm chân màn: một cú bấm, không màn chờ (PC-09). */
  private exit(l: Layout, f: Frame): void {
    const s = scaleOf(l);
    this.back.retint(this.palette(), { x: f.bar.x, y: f.bar.y, w: GEO.pill.w * s, h: f.bar.h });
    this.back.setLabel(say(this.session, 'back.title'));
    this.back.show();
  }

  /** Ẩn hết nút thì rect cũng phải hết (PC-U-05) — handler resize do `liveFrame` gỡ. */
  private forget(): void {
    for (const view of this.plates) view.hide();
    this.back.hide();
  }
}
