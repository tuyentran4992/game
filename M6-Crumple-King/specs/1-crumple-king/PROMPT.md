# PROMPT — Coding Agent viết code theo SPEC này

> Paste nguyên khối `---` dưới đây vào Claude Code (hoặc agent code tương đương), chạy ở repo root.
> Mọi đường dẫn là tương đối trong repo — KHÔNG hardcode đường dẫn máy cá nhân.

---

BẠN LÀ CODING AGENT của game factory `youtube-playables` (cwd hiện tại là repo root).

VIỆC: implement game **"Crumple King"** theo spec `M6-Crumple-King/specs/1-crumple-king/SPEC.md`.

BẮT BUỘC ĐỌC TRƯỚC KHI CODE:
1. `M6-Crumple-King/specs/1-crumple-king/SPEC.md` — nguồn sự thật duy nhất; mọi con số lấy từ bảng §4, không tự chế.
2. `docs/ARCHITECTURE.md` §3 (ranh giới tầng) + §5 (pipeline) — kiến trúc bắt buộc.

VỊ TRÍ CODE: `M6-Crumple-King/game/` — tạo mới (Vite + TS + pnpm + Phaser 4.x + matter-js point constraints), 9:16 portrait, 1 tay cái.
KHÔNG sửa file nào khác của repo (game khác, packages — không đụng). KHÔNG commit/push — owner tự làm.

KIẾN TRÚC (chống god-class — mỗi file ≤400 dòng):
- `src/config/` — MỌI con số tunable tách file theo domain (crumple.ts, throw.ts, basket.ts, score.ts), comment rõ đơn vị
- `src/logic/` — thuần TS không import Phaser: 4 mức nhàu (area 100/65/40/25%), flick velocity→vector, scoring + streak, miss-counter đẩy sọt; unit test được
- `src/render/` — tờ giấy mesh co theo pinch + 12 wrinkle lines cố định, wobble khi bay, vụn khi lên mức nhàu
- `src/scenes/` — mỏng: Boot → Play; type shared để `src/logic/types.ts`

PHASE 1 — FUN GATE (làm xong thì DỪNG, không tự ý sang phase 2):
- Core loop §3 (bóp 4 mức → flick → bay → sọt rung → tờ mới; kéo cứu giấy lạc vào sọt) + số §4 + feel §5 (Âm bóp giấy pitch-variance, "rắc" lên mức, nảy đúng mức nhàu — KHÔNG được cắt) + HUD tối giản §6
- KHÔNG menu, KHÔNG save, KHÔNG SDK. Art placeholder (rectangle trắng + line). Âm synth/CC0.
- Gate kỹ thuật: `pnpm typecheck` 0 lỗi · vitest logic pass (tối thiểu: velocity → vector bay đúng hướng, area ngưỡng → đủ chặt, trúng sọt → +100, miss×3 → sọt gần 8%) · `pnpm build` sạch
- BÁO CÁO cuối phase 1: lệnh chạy local + file config anh tinh chỉnh được. Owner (anh Tuyền) chơi qua fun gate §7 — chỉ khi anh xác nhận pass mới làm tiếp.

PHASE 2 — chỉ khi owner xác nhận fun gate PASS:
- Scope §9 của SPEC: `@game/sdk`, endless + daily challenge, art thật theo DESIGN-SPEC (chưa tồn tại → nhắc owner yêu cầu viết trước).

---
