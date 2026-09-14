// Pattern: Scene (spa Mực)
// TRÁCH NHIỆM: lưới 2 cột card spa, mỗi card 260 × 300 px thiết kế (DS:108 — ô thật do
//   gridModel.cardGrid chia, scene không tự nhân), mỗi ô là MỘT DÒNG của bảng giá mà session
//   đọc lên từ config/skins.json qua economy. Hình thức ô do SkinCard vẽ theo bốn trạng thái
//   locked / buyable / owned / equipped (khoá mờ, hiện giá Mực, ✓ đã mua, viền primary 4px).
// KHÔNG Ở ĐÂY: con số giá (TC-INC-01 — giá là dữ liệu, scene chỉ in `price.ink`), phán quyết
//   mua (economy.buySkin trả { ok, state, reason }), màu (PaperTheme + token PRIMARY), và mọi
//   phép cộng/trừ Mực (stars/economy là chủ duy nhất — PC-11).
// Id QA: testid-shop-skin-0, testid-shop-skin-1, … theo thứ tự bảng giá + testid-shop-price
//   cho số DƯ Mực trên đầu màn (một id tĩnh duy nhất, không trùng giữa tám ô).
// RÀNG BUỘC: bố cục qua layoutOf + cột 720 của B3a (PC-R-01), rect đăng bằng makeTestidHook
//   (A9), nền bấm tạo qua makeButton nên nhịp chạm 120ms đi một cửa (PC-U-06), chữ qua say/t
//   (PC-19), đổi cỡ cửa sổ chỉ tính lại ô — không đụng ví, không đụng save (PC-R-04).

import Phaser from 'phaser';
import type { Inventory, SkinPrice } from '../../logic/economy';
import { makeButton, type ButtonView } from '../../ui/button';
import { makeTestidHook, qaId } from '../../ui/testids';
import {
  cameraSize, liveFrame, openFrame, say, sceneTheme, touchFx, type Frame as KitFrame,
} from '../components/PaperPanel';
import { InkBadge } from '../components/InkBadge';
import type { CardFace, SkinState } from '../components/SkinCard';
import { SkinCard } from '../components/SkinCard';
import type { Box, Layout } from '../layout';
import { layoutOf } from '../layout';
import { readSession, type GameSession } from '../session';
import { PAPER_THEMES, textStyle, type PaperTheme } from '../theme/paperTheme';
import { cardGrid, frameOf, scaleOf, type Frame } from '../viewmodel/gridModel';

/** Ô tạm trước khi camera biết kích thước — arrange() đặt lại ngay lần vẽ đầu. */
const ZERO: Box = { x: 0, y: 0, w: 44, h: 44 };

/** Kẽ + ô riêng của màn spa (px thiết kế); card 260 × 300 đã nằm trong lưới của gridModel. */
const GEO = {
  gap: 18,
  purse: { w: 150, h: 66 },
  pill: { w: 200, h: 72 },
} as const;

/** Nhãn nút của từng trạng thái: GIÁ TRỊ LÀ KEY từ điển, không phải chữ (PC-19). */
const ACTION: Readonly<Record<SkinState, string>> = {
  locked: 'shop.locked', buyable: 'shop.buy', owned: 'shop.owned', equipped: 'shop.equipped',
};

/** Một ô trên lưới: nền bấm của B3a + hoạ card của SkinCard + chỗ ngồi trong lưới. */
type Stall = { readonly slot: number; readonly skinId: string; readonly view: ButtonView; readonly art: SkinCard };

/**
 * Cờ ví -> trạng thái vẽ, theo thứ tự ưu tiên SPEC §4.5 (đang đeo > đã có > mua được > khoá).
 * Đây là CHỌN HÌNH, không phải luật kinh tế: `buySkin` vẫn là nơi duy nhất được phép nói
 * "không bán" và là nơi duy nhất trừ Mực.
 */
function stateOf(price: SkinPrice, inv: Inventory): SkinState {
  if (inv.equipped === price.id) return 'equipped';
  if (inv.owned.includes(price.id)) return 'owned';
  return inv.ink >= price.ink ? 'buyable' : 'locked';
}

/** Da giấy preview của một ô: lấy theo dòng palette của B3a, không định nghĩa màu riêng. */
const swatchOf = (slot: number): PaperTheme => PAPER_THEMES[slot % PAPER_THEMES.length];

export class ShopScene extends Phaser.Scene {
  private session!: GameSession;
  /** Nền giấy + CỬA đăng ký rect của RIÊNG màn này (A9 — không tự nhân sx/sy). */
  private kit!: KitFrame;
  private head!: Phaser.GameObjects.Text;
  private purse!: InkBadge;
  private back!: ButtonView;
  private stalls: readonly Stall[] = [];

  constructor() {
    super('Shop');
  }

  create(): void {
    this.session = readSession(this.game.registry);
    this.kit = openFrame(this, makeTestidHook(this, this.game.canvas, () => cameraSize(this.cameras.main)));
    this.head = this.add.text(0, 0, '', textStyle('title', this.tint().ink)).setOrigin(0, 0.5);
    this.purse = this.add.existing(new InkBadge(this, ZERO, this.tint()));
    // Nút nền do `makeButton` của ui/button.ts dựng (PC-U-06): container phải được gắn lên
    // display list thì mới vẽ, còn hit area là của riêng plate bên trong nút.
    this.back = makeButton(this, 'testid-shop-back', ZERO, this.tint(), null, false, this.kit.hook);
    this.add.existing(this.back.obj);
    this.back.onTap(() => this.leave());
    this.stalls = this.session.skinPrices().map((price, slot) => this.build(price.id, slot));
    liveFrame(this, () => this.arrange(), () => this.forget());
  }

  // --------------------------------------------------------------- cửa bấm
  /** Mua / đổi skin: economy trả lời, scene chỉ vẽ lại ví + lưới theo dữ liệu mới. */
  take(skinId: string): void {
    const deal = this.session.buySkin(skinId);
    if (!deal.ok) return;
    touchFx(this, this.session, 'counter');
    this.arrange();
  }

  /** Một cú bấm về bản đồ (PC-09: không màn chờ trung gian). */
  leave(): void {
    touchFx(this, this.session);
    this.scene.start('Map');
  }

  // ------------------------------------------------------------- bên trong
  /** Một ô dựng MỘT lần để id QA (`qaId('shop-skin', slot)` -> testid-shop-skin-0, -1, …)
   *  ổn định mọi lần vào màn; nền bấm do `makeButton` dựng nên nhịp chạm đi đúng một cửa. */
  private build(skinId: string, slot: number): Stall {
    const view = makeButton(this, qaId('shop-skin', slot), ZERO, this.tint(), null, false, this.kit.hook);
    this.add.existing(view.obj);
    view.onTap(() => this.take(skinId));
    const art = this.add.existing(new SkinCard(this, ZERO, this.tint()));
    return { slot, skinId, view, art };
  }

  /** Vẽ lại cả màn: ô từ camera, chữ từ từ điển, rect cho ĐÚNG thứ đang hiện. */
  private arrange(): void {
    const l = layoutOf(this.cameras.main.width, this.cameras.main.height);
    // Nền + cột giấy là lớp dưới cùng nên vẽ NGAY khi có layout; chia ô chỉ cần cho lớp sau.
    this.kit.bg.paint(l, this.tint(), true);
    const f = frameOf(l);
    this.head.setText(say(this.session, 'shop.title'));
    this.head.setPosition(f.head.x, f.head.y + f.head.h / 2);
    this.wallet(l, f);
    this.rack(l);
    this.exit(l, f);
  }

  /** Số DƯ Mực trên đầu màn — id QA tĩnh `testid-shop-price` vì tám ô chỉ có MỘT ví. */
  private wallet(l: Layout, f: Frame): void {
    const s = scaleOf(l);
    const box: Box = {
      x: f.head.x + f.head.w - GEO.purse.w * s,
      y: f.head.y + (f.head.h - GEO.purse.h * s) / 2,
      w: GEO.purse.w * s,
      h: GEO.purse.h * s,
    };
    this.purse.retint(this.tint(), box);
    this.purse.setValue(this.session.ink());
    this.kit.hook('testid-shop-price', box);
  }

  /** Lưới card: mỗi ô nhận đúng một dòng bảng giá, nhãn tra bằng `[state]` (registry). */
  private rack(l: Layout): void {
    const inv = this.session.inventory();
    cardGrid(l, this.stalls.length).forEach((cell, i) => this.draw(this.stalls[i], cell, inv));
  }

  /** Face của một ô: giá + nhãn nút + da preview; scene không tự đặt giá nào (TC-INC-01). */
  private draw(stall: Stall, cell: Box, inv: Inventory): void {
    const price = this.session.skinPrices()[stall.slot];
    const state = stateOf(price, inv);
    stall.view.retint(this.tint(), cell);
    stall.view.show();
    stall.art.retint(this.tint(), cell);
    stall.art.set({
      price,
      state,
      preview: swatchOf(stall.slot),
      cost: say(this.session, 'shop.price', { n: price.ink }),
      action: say(this.session, ACTION[state]),
    } as CardFace);
  }

  /** Nút về nằm chân màn, bề rộng theo pill của pack §3. */
  private exit(l: Layout, f: Frame): void {
    const door: Box = { x: f.bar.x, y: f.bar.y, w: GEO.pill.w * scaleOf(l), h: f.bar.h };
    this.back.retint(this.tint(), door);
    this.back.setLabel(say(this.session, 'back.title'));
    this.back.show();
  }

  /** Bảng màu theo chương hiện hành — `sceneTheme` của khung là cửa tra duy nhất (PC-11). */
  private tint(): PaperTheme {
    return sceneTheme(this.session);
  }

  /** Nút ẩn thì rect phải biến mất theo (PC-U-05) — resize do `liveFrame` gỡ. */
  private forget(): void {
    for (const stall of this.stalls) {
      stall.view.hide();
      stall.art.setVisible(false);
    }
    this.back.hide();
  }
}

