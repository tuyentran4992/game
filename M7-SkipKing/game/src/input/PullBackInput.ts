/**
 * M7 Skip King — PullBackInput (T3 Tầng B): kéo ngược kiểu dây cung (CONTRACT 3.2).
 * Kéo ngược = tích lựC + hướng; thả = FlickInput theo schema chung tầng A (K4×V1).
 * Pure DOM-free: scene wire pointer events vào onDown/onMove/onUp — dễ test headless.
 * Feedback & vibrate là việc scene (tầng B render) — lớp này chỉ phát aim/release.
 */
import type { FlickInput } from '../logic/types';
import type { MechanicsConfig } from '../config/mechanics';
import { MECHANICS } from '../config/mechanics';
import { AIM } from '../render/layout';

export interface PullBackOpts {
  /** Gọi mỗi frame khi kéo (aim guide đọc) — null khi đang không kéo. */
  onAim?(input: FlickInput | null): void;
  /** Gọi đúng 1 lần khi thả hợp lệ. */
  onRelease(input: FlickInput): void;
  /** Config tầng A (mặc định MECHANICS) — đọc skip.maxAngleDeg làm trần góc lệch. */
  cfg?: MechanicsConfig;
}

/**
 * Trạng thái kéo: điểm gốc chạm + vector kéo hiện tại.
 * Hướng bắn = NGƯỢC vector kéo (kéo ngược về người → đá bay ra xa).
 */
export class PullBackInput {
  private origin: { x: number; y: number } | null = null;
  private drag: { dx: number; dy: number } = { dx: 0, dy: 0 };
  private dragging = false;
  private cfg: MechanicsConfig;

  constructor(private opts: PullBackOpts) {
    this.cfg = opts.cfg ?? MECHANICS;
  }

  onDown(x: number, y: number): void {
    this.origin = { x, y };
    this.drag = { dx: 0, dy: 0 };
    this.dragging = true;
  }

  onMove(x: number, y: number): void {
    if (!this.dragging || !this.origin) return;
    this.drag.dx = x - this.origin.x;
    this.drag.dy = y - this.origin.y;
    this.opts.onAim?.(this.currentInput());
  }

  onUp(x: number, y: number): void {
    if (!this.dragging || !this.origin) return;
    this.drag.dx = x - this.origin.x;
    this.drag.dy = y - this.origin.y;
    const input = this.currentInput();
    this.dragging = false;
    this.origin = null;
    this.opts.onAim?.(null);
    if (input) this.opts.onRelease(input);
  }

  /** Huỷ cú kéo đang giữa chừng (pointercancel / scene chuyển trạng thái). */
  cancel(): void {
    this.dragging = false;
    this.origin = null;
    this.opts.onAim?.(null);
  }

  /** FlickInput đang kéo (null nếu không kéo hoặc kéo quá ngắn — anti-misfire). */
  currentInput(): FlickInput | null {
    if (!this.dragging || !this.origin) return null;
    const len = Math.hypot(this.drag.dx, this.drag.dy);
    if (len < AIM.minDragPx) return null;
    // power ∝ độ dài kéo, kẹp 0..1 (kéo quá maxDrag không vượt 1).
    const power = Math.min(1, len / AIM.maxDragPx);
    // Hướng: NGƯỢC chiều kéo ngang (dây cung), góc lệch tỉ lệ thành phần ngang,
    // kẹp trong skip-gate maxAngleDeg (config tầng A) → MỌI cú luôn bay về phía
    // horizon (dirZ < 0 nghiêm ngặt) — không tồn tại cú ném ngang 90° chắc chìm.
    const lat = len > 0 ? -this.drag.dx / len : 0; // -1..1 (+ = bay phải)
    const maxDeg = this.cfg.skip.maxAngleDeg;
    const angleDeg = Math.min(maxDeg, Math.max(-maxDeg, lat * maxDeg));
    const rad = (angleDeg * Math.PI) / 180;
    return { dirX: Math.sin(rad), dirZ: -Math.cos(rad), power };
  }
}
