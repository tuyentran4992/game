// Pattern: Factory + Data Table (component tái dùng giữa các scene)
// TRÁCH NHIỆM: một NÚT bấm thật cho tầng render: nền + (nhãn đã qua t() HOẶC hình vẽ), rung
//   khi chạm, và ĐĂNG KÝ / XOÁ rect trong registry QA đúng theo trạng thái hiển thị. File này
//   còn sở hữu PLAY_SLOTS — BẢNG dữ liệu "nút nào ngồi đâu, khi nào hiện" của màn chơi, để
//   scene chỉ còn một vòng lặp dựng nút thay vì bảy khối lệnh (A2).
// RÀNG BUỘC: không tự dựng chuỗi hiển thị (nhãn do scene đưa sau khi gọi t()); icon là HÌNH
//   VẼ nên màn tắt chữ vẫn hiểu (PC-O-02); rect testid là hit area thật (PC-U-05) — ẩn nút là
//   xoá rect VÀ tắt bấm, không để lại vùng bấm vô hình (F2). Mọi số đo bên trong nút (ô hình,
//   ô chữ, cỡ chữ) lấy từ layout (`buttonFace`/`fitFontSize`) — file này không tự cộng trừ px.

import Phaser from 'phaser';
import { DUR, TOUCH, type RenderPhase } from '../render/anim/unfoldPlan';
import { basePx, centerOf, fittedStyle } from '../render/components/fitText';
import { buttonFace, pressShift, type Box, type Layout } from '../render/layout';
import { parseHex, textStyle, type PaperTheme } from '../render/theme/paperTheme';
import { clearTestid, type Hook } from './testids';

/** Mỗi kiểu nút có một hình vẽ riêng — thêm hình = thêm một dòng, không thêm if. */
type Glyph = (g: Phaser.GameObjects.Graphics, r: number, color: number, thick: number) => void;

const gPlay: Glyph = (g, r, color) => {
  g.fillStyle(color, 1);
  g.fillTriangle(-r * 0.6, -r, -r * 0.6, r, r * 0.9, 0);
};

const gShop: Glyph = (g, r, color, thick) => {
  g.lineStyle(thick, color, 1);
  g.strokeRect(-r * 0.8, -r * 0.2, r * 1.6, r * 1.1);
  g.beginPath();
  g.moveTo(-r, -r * 0.2);
  g.lineTo(-r * 0.7, -r);
  g.lineTo(r * 0.7, -r);
  g.lineTo(r, -r * 0.2);
  g.strokePath();
};

const gSound: Glyph = (g, r, color, thick) => {
  g.fillStyle(color, 1);
  g.fillRect(-r * 0.8, -r * 0.25, r * 0.45, r * 0.5);
  g.fillTriangle(-r * 0.35, -r * 0.25, -r * 0.35, r * 0.25, r * 0.05, r * 0.65);
  g.fillTriangle(-r * 0.35, -r * 0.25, -r * 0.35, r * 0.25, r * 0.05, -r * 0.65);
  g.lineStyle(thick, color, 1);
  for (let i = 1; i <= 2; i += 1) g.lineBetween(r * 0.35, -r * 0.5 * i * 0.6, r * 0.6, r * 0.5 * i * 0.6);
};

const gMenu: Glyph = (g, r, color, thick) => {
  g.lineStyle(thick, color, 1);
  for (let i = -1; i <= 1; i += 1) g.lineBetween(-r, i * r * 0.55, r, i * r * 0.55);
};

/** Mũi tên quay lại: thân nằm ngang + đầu mút bên trái + nét gãy nhắc "hoàn tác". */
const gUndo: Glyph = (g, r, color, thick) => {
  g.lineStyle(thick, color, 1);
  g.beginPath();
  g.moveTo(-r * 0.8, -r * 0.1);
  g.lineTo(r * 0.5, -r * 0.1);
  g.lineTo(r * 0.8, r * 0.55);
  g.strokePath();
  g.fillStyle(color, 1);
  g.fillTriangle(-r * 0.85, -r * 0.55, -r * 0.85, r * 0.35, -r * 0.15, -r * 0.1);
};

const gUnfold: Glyph = (g, r, color, thick) => {
  g.lineStyle(thick, color, 1);
  g.strokeRect(-r * 0.35, -r * 0.35, r * 0.7, r * 0.7);
  g.beginPath();
  g.moveTo(-r, -r);
  g.lineTo(-r * 0.35, -r);
  g.moveTo(-r, -r);
  g.lineTo(-r, -r * 0.35);
  g.moveTo(r, r);
  g.lineTo(r * 0.35, r);
  g.moveTo(r, r);
  g.lineTo(r, r * 0.35);
  g.strokePath();
};

const gHint: Glyph = (g, r, color, thick) => {
  g.lineStyle(thick, color, 1);
  g.strokeCircle(0, -r * 0.25, r * 0.6);
  g.beginPath();
  g.lineBetween(-r * 0.3, r * 0.6, r * 0.3, r * 0.6);
  g.lineBetween(-r * 0.25, r * 0.9, r * 0.25, r * 0.9);
  g.strokePath();
};

const GLYPHS: Readonly<Record<string, Glyph>> = {
  play: gPlay, shop: gShop, sound: gSound, menu: gMenu, undo: gUndo, unfold: gUnfold, hint: gHint,
};

/**
 * Cờ trạng thái của một màn — bảng NÚT chỉ đọc cờ, không tự phán quyết (PC-16).
 * `undoLeft` = máy còn cho hoàn (misses > 0 && !undoUsed && pha wrong); scene tính bằng
 * hàm guard của logic, bảng này chỉ quyết NÚT NÀO đại diện cho quyền đó (PC-13).
 */
export type SlotFlags = {
  readonly phase: RenderPhase;
  readonly hintUsed: boolean;
  readonly undoLeft: boolean;
  readonly adsAbsent: boolean;
};

/** Một chỗ ngồi trong hàng nút dưới: id QA + ô + hình + khoá từ điển + khi nào hiện. */
export type SlotRow = {
  readonly id: string;
  readonly box: (l: Layout) => Box;
  readonly glyph: string | null;
  /** Khoá từ điển; null = nút CHỈ hình (icon HUD — PC-O-02 "tắt chữ vẫn hiểu"). */
  readonly labelKey: string | null;
  readonly primary: boolean;
  readonly on: (f: SlotFlags) => boolean;
};

/**
 * Bảng nút của màn chơi (pack §5 + PC-13 "không có nút chết"): undo thường và undo-ad
 * cùng một chỗ ngồi và loại trừ nhau theo `adsAbsent`; retry và next cũng vậy.
 * Thêm một nút = thêm một dòng, PlayScene không đổi.
 */
export const PLAY_SLOTS: readonly SlotRow[] = [
  {
    id: 'testid-btn-hint', box: (l) => l.hint, glyph: 'hint', labelKey: 'hud.hint', primary: false,
    on: (f) => f.phase === 'ready' && !f.hintUsed,
  },
  {
    id: 'testid-btn-undo', box: (l) => l.undo, glyph: 'undo', labelKey: 'hud.undo', primary: false,
    on: (f) => f.undoLeft && f.adsAbsent,
  },
  {
    id: 'testid-btn-undo-ad', box: (l) => l.undoAd, glyph: 'undo', labelKey: 'hud.undo', primary: false,
    on: (f) => f.undoLeft && !f.adsAbsent,
  },
  {
    id: 'testid-btn-retry', box: (l) => l.retry, glyph: null, labelKey: 'hud.retry', primary: false,
    on: (f) => f.phase === 'wrong',
  },
  {
    id: 'testid-btn-unfold', box: (l) => l.unfold, glyph: 'unfold', labelKey: 'hud.next', primary: true,
    on: (f) => f.phase === 'correct',
  },
  {
    id: 'testid-btn-menu', box: (l) => l.menu, glyph: 'menu', labelKey: null, primary: false,
    on: () => true,
  },
  {
    id: 'testid-btn-sound', box: (l) => l.sound, glyph: 'sound', labelKey: null, primary: false,
    on: () => true,
  },
];

export type ButtonView = {
  readonly obj: Phaser.GameObjects.Container;
  readonly id: string;
  setLabel: (text: string) => void;
  show: () => void;
  hide: () => void;
  onTap: (handler: () => void) => void;
  press: () => void;
  retint: (theme: PaperTheme, box: Box) => void;
};

/**
 * Nút dẹt theo Box. `glyph` là khoá trong bảng GLYPHS — truyền vào undefined để có nút chỉ
 * chữ, truyền nhãn rỗng để có nút chỉ hình (icon buttons của HUD).
 * QUY ƯỚC TOẠ ĐỘ: container ngồi tại GỐC TRÁI-TRÊN của `box`, nên mọi Rectangle con phải
 * setOrigin(0,0); nền nút vẽ theo tâm (mặc định) đã từng lệch nửa ô và đẩy nhãn "Hint" ra
 * ngoài hộp nút — ảnh chụp thật V6.3. Ô của hình + nhãn lấy từ layout.buttonFace.
 */
export function makeButton(
  scene: Phaser.Scene,
  id: string,
  box: Box,
  theme: PaperTheme,
  glyph: string | null,
  primary: boolean,
  hook: Hook,
): ButtonView {
  const obj = scene.add.container(box.x, box.y);
  const plate = scene.add
    .rectangle(0, 0, box.w, box.h, parseHex(primary ? theme.ink : theme.paper), primary ? 1 : 0.9)
    .setOrigin(0, 0);
  plate.setStrokeStyle(Math.max(2, box.h * 0.03), parseHex(primary ? theme.shade : theme.crease));
  plate.setInteractive({ useHandCursor: true });
  obj.add(plate);
  const art = scene.add.graphics();
  obj.add(art);
  const label = scene.add.text(0, 0, '', textStyle('label', primary ? theme.paper : theme.ink));
  label.setOrigin(0.5);
  obj.add(label);
  let shown = false;

  let current = box;

  let activeTheme = theme;

  /** Tô hình + đặt lại chữ theo ô hiện hành: MỘT đường cho mọi trạng thái (không if rải rác). */
  const arrange = (): void => {
    const face = buttonFace(current, basePx('label'), label.text, glyph !== null);
    const fg = primary ? activeTheme.paper : activeTheme.ink;
    const at = centerOf(face.label);
    label.setStyle(fittedStyle('label', fg, label.text, face.label));
    label.setPosition(at.x - current.x, at.y - current.y);
    art.clear();
    if (glyph === null || !face.showArt) return; // V6.3: chữ chật thì layout đã bỏ hình
    const draw = GLYPHS[glyph];
    if (!draw) return;
    const mark = centerOf(face.art);
    art.setPosition(mark.x - current.x, mark.y - current.y);
    draw(art, Math.min(face.art.w, face.art.h) * 0.5, parseHex(fg), Math.max(2, face.art.w * 0.08));
  };

  const view: ButtonView = {
    obj,
    id,
    setLabel: (text: string) => {
      label.setText(text);
      arrange();
    },
    show: () => {
      obj.setVisible(true);
      shown = true;
      // Nút hiện thì mới bấm được — retint() đã bật sẵn, đây là cửa về từ hide().
      plate.setInteractive({ useHandCursor: true });
      hook(id, current);
    },
    hide: () => {
      obj.setVisible(false);
      shown = false;
      // F2: ẩn mà để tương tác là còn vùng bấm vô hình — cú bấm thừa ném thẳng vào handler.
      plate.disableInteractive();
      clearTestid(id);
    },
    onTap: (handler: () => void) => {
      plate.on('pointerdown', () => handler());
    },
    press: () => {
      // Ô có gốc ở góc trái-trên nên phải bù `pressShift` thì đòn lún mới co QUANH TÂM nút.
      const shift = pressShift(current, TOUCH.pressScale);
      scene.tweens.add({
        targets: obj,
        x: obj.x + shift.x,
        y: obj.y + shift.y,
        scaleX: TOUCH.pressScale,
        scaleY: TOUCH.pressScale,
        duration: DUR.fast / 2,
        yoyo: true,
        onComplete: () => obj.setScale(1).setPosition(current.x, current.y),
      });
    },
    retint: (theme2: PaperTheme, box2: Box) => {
      current = box2;
      activeTheme = theme2;
      obj.setPosition(box2.x, box2.y);
      plate.setSize(box2.w, box2.h);
      plate.setFillStyle(parseHex(primary ? theme2.ink : theme2.paper), primary ? 1 : 0.9);
      plate.setStrokeStyle(Math.max(2, box2.h * 0.03), parseHex(primary ? theme2.shade : theme2.crease));
      // Đang ẩn thì giữ nguyên trạng thái TẮT bấm (F2) — retint chỉ là đổi màu/ô.
      if (shown) plate.setInteractive({ useHandCursor: true });
      arrange();
      if (shown) hook(id, box2);
    },
  };
  arrange();
  return view;
}
