// ============================================================================
// INPUT GATE (AUDIT-COMMERCIAL §B2 — PRE-ROLL, SPEC §3/§7)
//
// "Platform tự chạy pre-roll… sau ad mới nhận tap": trước đây KHÔNG có state nào
// chặn input, nên tap trên màn trắng / trong lúc pre-roll vẫn đăng ký (mất tap,
// bấm PLAY 2 lần, đổ ống trước khi board vẽ xong).
//
// Cổng = ready && !paused:
//   * ready   → StartScene đã render + nhận được input (ngay sau gameReady()).
//   * paused  → ytgame.system.onPause (pre-roll / ad / tab ẩn) → onResume mở lại.
// KHÔNG phụ thuộc Phaser → unit-testable; main.ts nối vào game.input.enabled.
// ============================================================================

type GateListener = (enabled: boolean) => void;

class InputGate {
  private ready = false;
  private paused = false;
  private listeners: GateListener[] = [];

  /** true = được phép nhận tap. */
  get enabled(): boolean {
    return this.ready && !this.paused;
  }

  get isReady(): boolean { return this.ready; }
  get isPaused(): boolean { return this.paused; }

  /** StartScene: khung đầu tiên đã render + gameReady() đã gửi. */
  markReady(): void {
    if (this.ready) return;
    this.ready = true;
    this.emit();
  }

  /** ytgame.system.onPause/onResume (hoặc visibilitychange fallback). */
  setPaused(paused: boolean): void {
    if (this.paused === paused) return;
    this.paused = paused;
    this.emit();
  }

  /** Nghe thay đổi (gọi ngay 1 lần với trạng thái hiện tại). */
  onChange(cb: GateListener): void {
    this.listeners.push(cb);
    this.safeCall(cb);
  }

  /** Chỉ dùng cho test. */
  resetForTest(): void {
    this.ready = false;
    this.paused = false;
    this.listeners = [];
  }

  private emit(): void {
    for (const cb of this.listeners) this.safeCall(cb);
  }

  /** 1 listener lỗi KHÔNG được làm sập cổng input của cả game. */
  private safeCall(cb: GateListener): void {
    try { cb(this.enabled); } catch (e) { console.warn('[gate] listener failed', e); }
  }
}

export const inputGate = new InputGate();
