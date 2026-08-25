// ============================================================================
// AD UX (AUDIT-COMMERCIAL §B2-5 / B2 "Ad-failure fallback UX")
//
// 3 mảnh giao diện dùng chung cho MỌI luồng quảng cáo — không bao giờ để người
// chơi bấm vào hư không:
//   * showAdConfirm()  — sheet xác nhận "Watch a short ad for a hint?" + CANCEL
//                        (chuẩn "no surprise ads": không bao giờ vào ad khi chưa hỏi)
//   * showAdLoading()  — spinner "Ad loading…" trong lúc await ad (interstitial
//                        + rewarded), chặn input phía dưới, tự tắt khi xong
//   * showToast()      — thông báo ngắn khi ad lỗi/không khả dụng, hoặc khi
//                        gợi ý đã dùng hết suất (thay vì im lặng no-op)
//
// Giữ đúng ngôn ngữ neon-galaxy: kính tối + viền neon + glow ADD blend.
// ============================================================================
import Phaser from 'phaser';
import { color, type, sp, radius, z, dur, fontStyle, toColor } from './tokens';
import { drawButton, synthAudio } from './ui';
import { L } from './lang';

const OVERLAY_DEPTH = z.overlay + 60;

export interface AdOverlay {
  /** Gỡ overlay (an toàn khi gọi nhiều lần). */
  destroy(): void;
}

function dimBackdrop(scene: Phaser.Scene, alpha: number): Phaser.GameObjects.Rectangle {
  const { width, height } = scene.scale;
  return scene.add
    .rectangle(width / 2, height / 2, Math.max(width, 1), Math.max(height, 1), toColor('#05030F'), alpha)
    .setDepth(OVERLAY_DEPTH)
    .setInteractive();   // chặn mọi tap xuyên qua (không đổ ống khi đang chờ ad)
}

// ----------------------------------------------------------------- spinner ---
/**
 * "Ad loading…" — hiện ngay khi bắt đầu await 1 quảng cáo (B2-3/B2-5).
 * KHÔNG tự hết hạn: caller luôn bọc ad trong raceTimeout() rồi gọi destroy().
 */
export function showAdLoading(scene: Phaser.Scene, label = L('ad_loading')): AdOverlay {
  const { width, height } = scene.scale;
  const cx = width / 2;
  const cy = height / 2;

  const backdrop = dimBackdrop(scene, 0.62);
  backdrop.setData('testid', 'ad-loading');

  const ring = scene.add.graphics().setDepth(OVERLAY_DEPTH + 1).setBlendMode(Phaser.BlendModes.ADD);
  ring.lineStyle(5, toColor(color.primary), 0.28);
  ring.strokeCircle(0, 0, 22);
  ring.lineStyle(5, toColor(color.accent), 1);
  ring.beginPath();
  ring.arc(0, 0, 22, Phaser.Math.DegToRad(-90), Phaser.Math.DegToRad(50), false);
  ring.strokePath();
  ring.setPosition(cx, cy - 8);

  const spin = scene.tweens.add({
    targets: ring,
    angle: 360,
    duration: 900,
    repeat: -1,
    ease: 'linear',
  });

  const txt = scene.add
    .text(cx, cy + 40, label, fontStyle(type.small, color.accent))
    .setOrigin(0.5)
    .setDepth(OVERLAY_DEPTH + 1);
  txt.setShadow(0, 2, color.shadow, 4, false, true);
  txt.setData('testid', 'ad-loading-label');

  const pulse = scene.tweens.add({
    targets: txt,
    alpha: 0.45,
    duration: 620,
    yoyo: true,
    repeat: -1,
    ease: 'sine.inout',
  });

  let dead = false;
  return {
    destroy() {
      if (dead) return;
      dead = true;
      spin.remove();
      pulse.remove();
      ring.destroy();
      txt.destroy();
      backdrop.destroy();
    },
  };
}

// ------------------------------------------------------------------- toast ---
/** Thông báo ngắn (ad lỗi / hết suất gợi ý). Không chặn input, tự tan. */
export function showToast(scene: Phaser.Scene, msg: string, ms = 1900): void {
  const { width, height } = scene.scale;
  const root = scene.add.container(width / 2, height * 0.3).setDepth(OVERLAY_DEPTH + 2).setAlpha(0);
  root.setData('testid', 'toast');

  const t = scene.add.text(0, 0, msg, fontStyle(type.small, color.surface)).setOrigin(0.5);
  t.setShadow(0, 2, color.shadow, 4, false, true);
  t.setData('testid', 'toast-label');

  const w = Math.min(width - sp[4] * 2, t.width + sp[5] * 2);
  const h = t.height + sp[3];
  const g = scene.add.graphics();
  g.fillStyle(toColor('#120D2C'), 0.96);
  g.fillRoundedRect(-w / 2, -h / 2, w, h, radius.md);
  g.lineStyle(1.5, toColor(color.accent), 0.75);
  g.strokeRoundedRect(-w / 2, -h / 2, w, h, radius.md);

  root.add([g, t]);
  scene.tweens.add({
    targets: root,
    alpha: 1,
    y: height * 0.3 - 10,
    duration: dur.base,
    ease: 'quad.out',
    onComplete: () => {
      scene.time.delayedCall(ms, () => {
        if (!root.scene) return;
        scene.tweens.add({
          targets: root,
          alpha: 0,
          y: height * 0.3 - 26,
          duration: dur.base,
          onComplete: () => root.destroy(),
        });
      });
    },
  });
}

// ----------------------------------------------------------- confirm sheet ---
export interface AdConfirmOptions {
  title: string;
  /** dòng phụ nhỏ (mặc định: nhắc đây là quảng cáo có thưởng) */
  note?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

/**
 * Sheet xác nhận trước MỌI rewarded ad (B2-5). Tap ra ngoài = CANCEL.
 * Trả về container để caller đóng sớm nếu cần.
 */
export function showAdConfirm(scene: Phaser.Scene, opts: AdConfirmOptions): Phaser.GameObjects.Container {
  const { width, height } = scene.scale;
  const cx = width / 2;
  const pw = Math.min(340, Math.max(240, width - sp[5] * 2));
  const ph = 214;
  const cy = height / 2;

  const backdrop = dimBackdrop(scene, 0.6);
  const root = scene.add.container(cx, cy + 24).setDepth(OVERLAY_DEPTH + 1).setAlpha(0);
  root.setData('testid', 'ad-confirm');

  const g = scene.add.graphics();
  g.fillStyle(toColor(color.primary), 0.18);
  g.fillRoundedRect(-pw / 2 - 6, -ph / 2 - 6, pw + 12, ph + 12, radius.lg + 4);
  g.fillStyle(toColor('#120E2E'), 0.97);
  g.fillRoundedRect(-pw / 2, -ph / 2, pw, ph, radius.lg);
  g.lineStyle(2.5, toColor(color.primary), 0.9);
  g.strokeRoundedRect(-pw / 2, -ph / 2, pw, ph, radius.lg);
  root.add(g);

  const badge = scene.add
    .text(0, -ph / 2 + sp[4] + 6, L('rewarded_badge'), fontStyle(type.small, color.accent))
    .setOrigin(0.5);
  badge.setShadow(0, 0, color.accent, 10, false, true);
  root.add(badge);

  const title = scene.add
    .text(0, -ph / 2 + sp[6] + 16, opts.title, {
      ...fontStyle(type.body, color.surface),
      wordWrap: { width: pw - sp[5] * 2 },
    })
    .setOrigin(0.5);
  title.setShadow(0, 2, color.shadow, 4, false, true);
  root.add(title);

  const note = scene.add
    .text(0, title.y + title.height / 2 + 16, opts.note ?? L('note_short_ad'), {
      ...fontStyle(type.small, color.surface),
      wordWrap: { width: pw - sp[5] * 2 },
    })
    .setOrigin(0.5)
    .setAlpha(0.72);
  root.add(note);

  let closed = false;
  const close = (cb?: () => void) => {
    if (closed) return;
    closed = true;
    scene.tweens.add({
      targets: root,
      alpha: 0,
      y: cy + 20,
      duration: dur.fast,
      onComplete: () => {
        root.destroy();
        backdrop.destroy();
        cb?.();
      },
    });
  };

  const yes = drawButton(scene, 0, ph / 2 - 76, opts.confirmText ?? L('confirm_yes'), {
    variant: 'amber',
    width: pw - sp[5] * 2,
    height: 52,
    fontSize: 20,
    enableShimmer: true,
    testid: 'ad-confirm-yes',
  });
  yes.container.on('pointerdown', (
    _p: Phaser.Input.Pointer,
    _lx: number,
    _ly: number,
    event: Phaser.Types.Input.EventData,
  ) => {
    event.stopPropagation();
    close(opts.onConfirm);
  });
  root.add(yes.container);

  const no = drawButton(scene, 0, ph / 2 - 20, opts.cancelText ?? L('confirm_no'), {
    variant: 'ghost',
    width: pw - sp[5] * 2,
    height: 42,
    fontSize: 16,
    enableShimmer: false,
    testid: 'ad-confirm-no',
  });
  no.container.on('pointerdown', (
    _p: Phaser.Input.Pointer,
    _lx: number,
    _ly: number,
    event: Phaser.Types.Input.EventData,
  ) => {
    event.stopPropagation();
    close(opts.onCancel);
  });
  root.add(no.container);

  // tap ra ngoài = cancel (không "bẫy" người chơi trong sheet)
  backdrop.on('pointerdown', () => close(opts.onCancel));

  scene.tweens.add({ targets: root, alpha: 1, y: cy, duration: dur.base, ease: 'cubic.out' });
  synthAudio.playClick();
  return root;
}
