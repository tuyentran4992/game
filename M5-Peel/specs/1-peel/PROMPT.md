# PROMPT — Coding Agent viết code theo SPEC này

> Paste nguyên khối `---` dưới đây vào Claude Code (hoặc agent code tương đương), chạy ở repo root.
> Mọi đường dẫn là tương đối trong repo — KHÔNG hardcode đường dẫn máy cá nhân.

---

BẠN LÀ CODING AGENT của game factory `youtube-playables` (cwd hiện tại là repo root).

VIỆC: implement game **"Peel!"** theo spec `M5-Peel/specs/1-peel/SPEC.md`.

BẮT BUỘC ĐỌC TRƯỚC KHI CODE:
1. `M5-Peel/specs/1-peel/SPEC.md` — nguồn sự thật duy nhất; mọi con số lấy từ bảng §4, không tự chế.
2. `docs/ARCHITECTURE.md` §3 (ranh giới tầng) + §5 (pipeline) — kiến trúc bắt buộc.

VỊ TRÍ CODE: `M5-Peel/game/` — tạo mới (Vite + TS + pnpm + Phaser 4.x + matter-js), 9:16 portrait, 1 tay cái.
KHÔNG sửa file nào khác của repo (game khác, packages — không đụng). KHÔNG commit/push — owner tự làm.

KIẾN TRÚC (chống god-class — mỗi file ≤400 dòng):
- `src/config/` — MỌI con số tunable tách file theo domain (peel.ts, fruits.ts, score.ts), comment rõ đơn vị
- `src/logic/` — thuần TS không import Phaser: peel-state machine (liền/disconnect/%, streak), scoring, combo, cắt lát; unit test được
- `src/render/` — mesh vỏ 64 slice peel + ribbon curl rời rãnh, particle vụn, camera shake
- `src/scenes/` — mỏng: Boot → Play (chơi chính) → Result ngắn; type shared để `src/logic/types.ts`

PHASE 1 — FUN GATE (làm xong thì DỪNG, không tự ý sang phase 2):
- Core loop §3 + cơ chế/số §4 + 3 quả §5 + juice §6 (âm pitch-variance, pop PERFECT, rung 2px — KHÔNG được cắt) + HUD tối giản §7
- KHÔNG menu, KHÔNG save, KHÔNG SDK. Art placeholder tuyệt đối (color block + text). Âm synth WebAudio / file CC0.
- Gate kỹ thuật: `pnpm typecheck` 0 lỗi · vitest logic pass (tối thiểu: ≥90% liền → PERFECT, rời rãnh >150ms → disconnect, lát → +50) · `pnpm build` sạch
- BÁO CÁO cuối phase 1: lệnh chạy local + danh sách file config anh tinh chỉnh được. Owner (anh Tuyền) sẽ chơi qua fun gate §8 — chỉ khi anh xác nhận pass mới được làm tiếp.

PHASE 2 — chỉ khi owner xác nhận fun gate PASS:
- Scope §10 của SPEC: `@game/sdk` (save streak, Game Ready, mute), menu, chuỗi quả vô hạn + milestone, art theo DESIGN-SPEC (chưa tồn tại → nhắc owner yêu cầu viết trước khi code art).

---
