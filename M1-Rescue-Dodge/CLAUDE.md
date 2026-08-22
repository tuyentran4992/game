# CLAUDE.md — M1 Rescue/Dodge (YouTube Playables Games)

## Vai trò
- Bạn là DEV nhận SPEC từ PM (Hermes). Nguồn sự thật: `SPEC.md` trong thư mục này.
- Trả lời TIẾNG VIỆT. KHÔNG tự ý vượt scope ngoài SPEC.

## Nguồn tài liệu (đọc có chọn lọc, cần file nào đọc file đó)
- `SPEC.md` — chức năng + business rules (BR-01..17) + data-testid (mục 4.2) + state (mục 7). BẮT BUỘC.
- `DESIGN-SPEC.md` — visual: màn hình, component, color/type token, animation, multi-palette art (level 1/2/3), popup.
- `docs/DESIGN-SYSTEM.md` — token hệ thống (convention dấu chấm: color.primary, type.display, sp.4, radius.md, dur.pop, z.40). BẮT BUỘC cho mọi màu/type/nhịp.
- `DATA-MODEL.md` — config/score/saved-game khi cần (progression config).
- `CLAUDE.md` này.

## BƯỚC HIỆN TẠI: code GAME Phaser "Cứu Mèo" (bước 2)
- `game/` đã có scaffold Phaser 3.80 (vite+ts): `src/main.ts`, `src/scenes/{Start,Tutorial,Gameplay,GameOver}.ts`, `src/sdk-handler.ts`. Fill logic theo SPEC + thiết kế.
- KHÔNG thay đổi `pipeline/` trừ khi bắt buộc (chỉ khi asset path/scaffold tạo game cần sửa) — nếu cần, nêu rõ.
- `games/cuu-meo.yaml` là nguồn config (asset key, progression, palette).

## Quy tắc kỹ thuật
- Logic gameplay THUẦN (score, difficulty curve, combo, level/progression, best record) → tách module riêng testable (TypeScript/JS thuần hoặc Python), viết test TRƯỚC (TDD). Phần Phaser scene render (canvas) không test đơn vị.
- data-testid theo SPEC 4.2 ĐÚNG: `start-btn, tutorial-text, game-canvas, score-label, level-label, level-popup, combo-popup, record-popup, final-score, best-score, retry-btn, continue-btn`.
- Assets dùng placeholder từ `assets/raw/` (png hiện hữu) — nếu chưa có file đủ thì dùng chỗ trống/style code; đừng tự sinh asset ảnh lớn làm nặng bundle.
- Điều kiện xong: (1) test logic pass; (2) nat `npm run build` (trong `game/`) KHÔNG lỗi → bundle sinh ra; (3) đúng chuẩn Playables (bundle < 30MB initial, cấm gọi mạng ngoài, responsive, pause/mute).
- Trả lời tiếng Việt, báo kết quả BẰNG SỐ LIỆU (test pass/fail, build OK/không, bundle size).
- CẤM commit/push.

## Nền tảng
- Game render 100% trong browser (canvas), KHÔNG gọi mạng ngoài (Playables cấm). Không cần backend.
- Font system sans-serif (không nhúng font — giữ bundle nhỏ).