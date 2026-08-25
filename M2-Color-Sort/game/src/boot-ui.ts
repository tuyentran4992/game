// ============================================================================
// P0-5 — Loading overlay HTML (#boot-overlay trong index.html).
// Tách module riêng để StartScene dùng được mà KHÔNG import vòng vào main.ts.
// ============================================================================

/** Cập nhật thanh progress (0..1) trong lúc BootScene.preload() tải asset. */
export function setBootProgress(p: number): void {
  if (typeof document === 'undefined') return;
  const bar = document.getElementById('boot-bar');
  if (bar) bar.style.width = `${Math.round(Math.max(4, Math.min(1, p) * 100))}%`;
}

/** Gỡ overlay — CHỈ gọi khi màn Start đã render & sẵn sàng nhận input. */
export function hideBootOverlay(): void {
  if (typeof document === 'undefined') return;
  const el = document.getElementById('boot-overlay');
  if (!el || el.classList.contains('hidden')) return;
  el.classList.add('hidden');
  setTimeout(() => el.remove(), 350);
}
