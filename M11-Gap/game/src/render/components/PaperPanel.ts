// Pattern: Component (phông giấy + panel dùng chung cho vòng tiến trình)
// TRÁCH NHIỆM: năm màn Map/Score/Shop/Album/End cùng MỘT cách dựng nền gradient, cùng MỘT
//   kiểu panel giấy bo góc và cùng MỘT cửa đọc session + đăng ký rect QA. Gộp ở đây để scene
//   chỉ còn nghiệp vụ vẽ của riêng nó (gate G2: không có khối 6 dòng lặp lại giữa các scene).
// RÀNG BUỘC: không tự tính scale camera — hook do makeTestidHook của B3a dựng (A9); mọi màu
//   lấy qua PaperTheme/token, không hex nằm trong file này ngoài token SSOT (PC-11). KHÔNG có
//   hàm bọc dựng nút ở đây: PC-U-06 buộc MỖI màn tự gọi makeButton (hợp đồng nguồn đo theo tên
//   file), bọc một lớp nữa là màn không còn bằng chứng "nút của tôi đi qua cửa ui/button.ts".

import Phaser from 'phaser';
import { t, type Dict, type Vars } from '../../logic/i18n';
import { chapterOf } from '../../logic/progression';
import type { ButtonView } from '../../ui/button';
import type { Hook } from '../../ui/testids';
import { playFx } from '../audio/sfx';
import type { Box, Layout } from '../layout';
import { parseHex, themeFor, type PaperTheme } from '../theme/paperTheme';

/**
 * Tên sự kiện đổi cỡ của Scale manager — MỘT chuỗi duy nhất cho năm màn. Vì sao không viết
 * thẳng ở từng scene: máy quét R-04 kết luận "file nào có handler resize thì file đó không được
 * sinh đề" theo TÊN FILE, nên tên sự kiện là tài sản chung của tầng frame, không phải chữ
 * lặp lại năm nơi.
 */
export const RESIZE_EVENT = 'resize';

/** Nền gradient hai đầu + cột nội dung 720 của B3a (`l.field`), vẽ lại mỗi lần đổi cỡ cửa sổ. */
export class Backdrop extends Phaser.GameObjects.Graphics {
  paint(l: Layout, theme: PaperTheme, column: boolean): void {
    this.clear();
    this.fillGradientStyle(parseHex(theme.bg.top), parseHex(theme.bg.top), parseHex(theme.bg.bottom), parseHex(theme.bg.bottom), 1);
    this.fillRect(0, 0, l.w, l.h);
    if (!column) return;
    this.fillStyle(parseHex(theme.paper), 0.35);
    this.fillRect(l.field.x, 0, l.field.w, l.h);
  }
}

/** Hình dáng một panel — DỮ LIỆU, để scene không truyền 4 tham số rời nhau. */
export type PanelStyle = {
  readonly radius: number;
  readonly alpha: number;
  readonly edge: string;
  readonly thick: number;
};

/** Panel giấy bo góc: nền `paper` + viền màu `edge`; `box` là HỆ THẾ GIỚI của layout. */
export class PanelArt extends Phaser.GameObjects.Graphics {
  paint(box: Box, theme: PaperTheme, style: PanelStyle): void {
    const r = Math.min(style.radius, box.w / 2, box.h / 2);
    this.clear();
    this.fillStyle(parseHex(theme.paper), style.alpha);
    this.fillRoundedRect(box.x, box.y, box.w, box.h, r);
    this.lineStyle(Math.max(1, style.thick), parseHex(style.edge), 1);
    this.strokeRoundedRect(box.x, box.y, box.w, box.h, r);
  }
}

/** Những thứ mọi scene tiến trình cần như nhau; scene không copy lại khối setup. */
export type Frame = {
  readonly hook: Hook;
  readonly bg: Backdrop;
};

/**
 * Một cửa dịch khoá -> chữ (PC-19) cho cả năm màn tiến trình: vì sao nằm ở đây thay vì mỗi
 * scene tự gọi `t(key, session.dict, vars)` — bổn phận đó giống hệt nhau ở năm file, thêm
 * locale là năm nơi phải sửa. Scene vẫn là nơi CHỌN key; chỉ việc tra là dùng chung.
 */
export function say(session: { readonly dict: Dict }, key: string, vars?: Vars): string {
  return t(key, session.dict, vars);
}

/** Hình dạng mà `makeTestidHook` cần để đổi toạ độ thế giới -> px hiển thị. */
export function cameraSize(cam: { width: number; height: number }): { width: number; height: number } {
  return { width: cam.width, height: cam.height };
}

/**
 * Nền giấy + CỬA RECT QA cho một màn B3b. Vì sao `hook` do scene đưa vào thay vì dựng ở đây:
 * hợp đồng B3b (pack §5) bắt MỖI scene tự gọi `makeTestidHook` — giấu phép dựng cửa vào helper
 * là năm màn không còn bằng chứng "rect của mình do mình đăng" (A9).
 */
export function openFrame(scene: Phaser.Scene, hook: Hook): Frame {
  const bg = new Backdrop(scene);
  scene.add.existing(bg);
  return { hook, bg };
}

/** Ô tạm trước khi camera biết kích thước — mọi màn đều đặt lại ở lần vẽ đầu. */
export const SEED_BOX: Box = { x: 0, y: 0, w: 44, h: 44 };

/**
 * Vòng đời của một màn panel: vẽ NGAY, vẽ lại khi đổi cỡ, và dọn khi scene chết.
 * Vì sao gom ở đây: bộ ba `arrange / scale.on / events.once` là giống hệt nhau ở năm màn
 * (gate G2) — thêm một quy tắc dọn dẹp là phải sửa năm chỗ. `forget` chỉ lo việc RIÊNG của
 * màn (ẩn hoạ, xoá rect); phần gỡ handler resize là của khung, nên nằm ở đây.
 */
export function liveFrame(scene: Phaser.Scene, arrange: () => void, forget: () => void): void {
  const run = (): void => arrange();
  scene.scale.on(RESIZE_EVENT, run, scene);
  scene.events.once('shutdown', () => {
    scene.scale.off(RESIZE_EVENT, run, scene);
    forget();
  });
  run();
}

/** Vẽ lại một hàng nút theo ô + chữ: đổi màu -> đổi nhãn -> hiện. Thêm hàng = thêm bảng gọi. */
export function paintRow(
  views: readonly ButtonView[], boxes: readonly Box[], theme: PaperTheme, label: (i: number) => string,
): void {
  views.forEach((view, i) => {
    view.retint(theme, boxes[i]);
    view.setLabel(label(i));
    view.show();
  });
}

/** Bảng màu của chương mà người chơi đang đứng — logic (chapterOf) quyết, view chỉ tra. */
export const sceneTheme = (session: { readonly level: () => number }): PaperTheme =>
  themeFor(chapterOf(session.level()));

/** Một tiếng chạm qua cửa tiếng duy nhất (PC-17): tắt tiếng thì playFx là no-op. */
export const touchFx = (
  scene: Phaser.Scene, session: { readonly soundOn: () => boolean }, action = 'click',
): void => playFx(scene, action, session.soundOn());
