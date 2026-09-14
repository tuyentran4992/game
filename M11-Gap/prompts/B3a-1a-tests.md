Bạn là dev viết test cho batch B3a (render vòng chơi: Boot·Title·Play). **90 lượt tối đa.**

Luật phiên + GÓI NGỮ CẢNH B3a đã nằm trong system prompt (pack `harness/packs/b3a.md`) — palette, cỡ chữ, animation, testid, hợp đồng logic đều ở đó, kèm số dòng. KHÔNG mở lại specs/ lan man; chỉ mở đúng file được nêu dưới.

Đọc thêm trước khi viết:
- /data/youtube-playables/M11-Gap/specs/1-paper-crease/E2E-TESTS.md §1.1–1.2 (nhóm B, O) + §4 phủ BR
- /data/youtube-playables/M11-Gap/game/tests/logic/helpers.ts (quy ước helper — KHÔNG tạo helper mới)
- /data/youtube-playables/M11-Gap/game/src/logic/types.ts (LevelSpec thật)

NHIỆM VỤ — chỉ tạo 2 file test (mặc dù chưa tồn tại file nào trong src/render ⇒ import PHẢI ĐỎ, đó là RED đúng nghĩa TDD):
1. `tests/logic/view-b3a-geometry.test.ts` — cho `src/render/anim/unfoldPlan.ts` + `src/render/theme/paperTheme.ts` (2 file này CẤM import phaser nên test chạy được trong node):
   - `unfoldPlan(4)` ⇒ tổng thời gian ≈ 0,7s theo công thức DS:120: lớp i bắt đầu tại i×110ms, mỗi lớp 140ms ease-out ⇒ 3×110+140=**470ms** phần so le + các mốc tuyệt đối từng lớp. Assert mảng mốc cụ thể, không assert mơ hồ.
   - `unfoldPlan(8)` ⇒ 7×110+140=**910ms** ≈ 0,9s (DS:120). Số phần tử = số lớp; lớp ngoài cùng mốc 0.
   - Lỗ: so le **60ms**, scale duration `dur.pop`=250ms (DS:121) — lịch hiện lỗ tính từ pack đã chốt, assert số.
   - `paperTheme`: là **bảng registry** (thêm chương = thêm dòng); theme chương 1 ≠ chương 2 ≠ chương 8; mỗi theme có đủ khoá bắt buộc (paper/crease/ink/nền gradient); giá trị mặc định lấy DS §1; chương chưa khai báo ⇒ fallback theme 1, không ném.
2. `tests/logic/view-b3a-contract.test.ts` — source-scan bằng `node:fs` trên `src/render/**` + `src/ui/**` (pattern test: file chưa tồn tại ⇒ đỏ; tồn tại ⇒ quét):
   - **Testid contract B3a**: chuỗi `testid-...` xuất hiện trong `src/render` + `src/ui` phải phủ ĐỦ 20 tên pack §6 (đọc danh sách từ pack, chép vào test làm bảng hardcode).
   - Registry M10-style: file định nghĩa `registerTestid` tồn tại + gán `window.__pcTestids` (grep chuỗi).
   - **i18n (PC-19)**: không literal display-string trong scene — cho phép chuỗi khớp `^testid-`, key `t('…')`, màu hex, path asset; mọi `setText(`/'text' khác phải bọc `t(`. Test tự viết regex, giải thích boundary trong comment.
   - **Cấm call mạng** (PC-15): `grep` chuỗi fetch/XMLHttpRequest/WebSocket/sendBeacon/http trong src/render+src/ui ⇒ 0.
   - **Ranh giới 1 chiều**: file trong `src/render` không được export hàm tính đúng/sai — quét pattern `=== spec.correctIndex`/`=== correctIndex` ⇒ 0 (scene chỉ nhận kết quả từ levelState; correctIndex chỉ để vẽ sao/ẩn hiện, không so sánh trong scene).

E2E nhóm B/O phải PASS sau build (Hermes chạy Playwright+vision, BẠN KHÔNG viết Playwright) — liệt kê vào đầu file test dưới dạng comment bảng để trace: **PC-B-01..05 · PC-O-01..05** (E2E-TESTS.md:23-37). Mỗi mô tả test vitest ghi rõ case E2E nó neo (vd mốc 470ms ⇒ PC-L-01; hint thở 2 nhịp ⇒ PC-O-03).

RÀNG BUỘC: chỉ tạo 2 file test trên — CẤM sửa src/, cấm tạo file render (test đỏ là đích), cấm npm install, cấm chạy build. Chứng minh RED: chạy `cd /data/youtube-playables/M11-Gap/game && npx vitest run tests/logic/view-b3a-geometry.test.ts tests/logic/view-b3a-contract.test.ts 2>&1 | tail -15` và dán output đỏ thật.

BÁO CÁO CUỐI: 2 file + tổng số `it()` · output vitest (RED thật) · bảng case→rule (PC-05/09/15/19 + E2E B/O).
