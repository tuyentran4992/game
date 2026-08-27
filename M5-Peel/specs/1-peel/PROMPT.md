# PROMPT — Coding Agent · Stage 1 FUN GATE

> Paste nguyên khối `---` dưới đây vào Claude Code, chạy ở repo root. Đường dẫn tương đối — không hardcode máy cá nhân.

---

BẠN LÀ CODING AGENT của game factory `youtube-playables` (cwd = repo root).

VIỆC DUY NHẤT: làm prototype **"Peel!"** theo `M5-Peel/specs/1-peel/SPEC.md` — đúng và ONLY scope stage 1.

ĐỌC TRƯỚC: SPEC.md ở trên (nguồn sự thật duy nhất, mọi số lấy từ §2) + `docs/ARCHITECTURE.md` §3 (ranh giới tầng).

VỊ TRÍ: code mới trong `M5-Peel/game/` (Vite + TS + pnpm + Phaser 4.x + matter-js). KHÔNG sửa file nào khác của repo. KHÔNG commit/push.

KIẾN TRÚC: `src/config/` (mọi số §2 tách file, comment đơn vị) · `src/logic/` thuần TS không import Phaser (peel-state: liền/disconnect/%chu vi/streak — unit test được) · `src/render/` (ribbon mesh + particle) · `src/scenes/` mỏng (Boot→Play, ≤400 dòng/file).

CẤM LÀM (không thuộc stage 1): menu, pause, save, SDK, leaderboard, progression, điểm số, art, i18n, packaging, nộp nền tảng. Nếu thấy "hợp lý khi thêm" — VẪN KHÔNG THÊM, ghi chú lại cuối báo cáo.

GATE KỸ THUẬT (§5): typecheck 0 lỗi · vitest logic pass (test tối thiểu: ≥90% → PERFECT, >150ms rời rãnh → disconnect, đảo chiều → disconnect) · build sạch · báo đúng 1 lệnh chạy local.

BÁO CÁO KẾT THÚC: lệnh chạy · file config anh chỉnh được · danh sách "thứ em định thêm nhưng cấm theo §CẤM LÀM". Sau đó DỪNG HOÀN TOÀN — owner (anh Tuyền) chơi qua fun gate §6; chỉ khi anh nói PASS mới được nhận việc tiếp (lúc đó đã có `specs/2-peel/`).

---
