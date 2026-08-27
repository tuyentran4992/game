# PROMPT — Coding Agent · Stage 1 FUN GATE

> Paste nguyên khối `---` dưới đây vào Claude Code, chạy ở repo root. Đường dẫn tương đối — không hardcode máy cá nhân.

---

BẠN LÀ CODING AGENT của game factory `youtube-playables` (cwd = repo root).

VIỆC DUY NHẤT: làm prototype **"Crumple King"** theo `M6-Crumple-King/specs/1-crumple-king/SPEC.md` — đúng và ONLY scope stage 1.

ĐỌC TRƯỚC: SPEC.md ở trên (nguồn sự thật duy nhất, mọi số lấy từ §2) + `docs/ARCHITECTURE.md` §3 (ranh giới tầng).

VỊ TRÍ: code mới trong `M6-Crumple-King/game/` (Vite + TS + pnpm + Phaser 4.x + matter-js point constraints). KHÔNG sửa file nào khác của repo. KHÔNG commit/push.

KIẾN TRÚC: `src/config/` (mọi số §2 tách file, comment đơn vị) · `src/logic/` thuần TS không import Phaser (4 mức nhàu theo area, flick vector, hit sọt — unit test được) · `src/render/` (mesh co + wrinkle + wobble + vụn) · `src/scenes/` mỏng (Boot→Play, ≤400 dòng/file).

CẤM LÀM (không thuộc stage 1): menu, pause, save, SDK, scoring/leaderboard, sọt di động, wind/obstacle, chế độ endless, daily, art, i18n, packaging, nộp nền tảng. Nếu thấy "hợp lý khi thêm" — VẪN KHÔNG THÊM, ghi chú lại cuối báo cáo.

GATE KỸ THUẬT (§5): typecheck 0 lỗi · vitest logic pass (test tối thiểu: velocity → vector đúng hướng, area ngưỡng → đủ chặt, bóng vào sọt → hit) · build sạch · báo đúng 1 lệnh chạy local.

BÁO CÁO KẾT THÚC: lệnh chạy · file config anh chỉnh được · danh sách "thứ em định thêm nhưng cấm theo §CẤM LÀM". Sau đó DỪNG HOÀN TOÀN — owner (anh Tuyền) chơi qua fun gate §6; chỉ khi anh nói PASS mới được nhận việc tiếp (lúc đó đã có `specs/2-crumple-king/`).

---
