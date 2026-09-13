Bạn là REVIEWER ĐỘC LẬP #1 — chấm **CODE CÓ ĐÚNG KHÔNG** cho batch B1a. **CẤM SỬA BẤT KỲ FILE NÀO TRONG REPO** (được viết snippet nháp trong /tmp để đo).

Đọc: /data/youtube-playables/M11-Gap/REVIEW-1-CODE.md (checklist C1-C12) · specs/1-paper-crease/SPEC.md (PC-02/03/04) · game/src/logic/*.ts · game/tests/logic/*.test.ts · bản Python gốc /data/shared-board-agent-waves/game-gap-giay/code/g01_fold_sim.py.

Việc phải làm:
1. Chạy thật và dán output: `cd /data/youtube-playables/M11-Gap/game && npm run typecheck && npm run test:logic`
2. grep: `phaser|document|window|@game/sdk` trong src/logic · `Math.random` · `fetch|XMLHttpRequest|WebSocket` · `any` · `@ts-ignore` · `console.log` · `NOT_IMPLEMENTED`.
3. Chấm TỪNG mục C1..C12: PASS / FAIL / KHÔNG KIỂM CHỨNG ĐƯỢC + **file:dòng** + 1 câu lý do.
4. Liệt kê mọi `it()` không assert giá trị thật (test sáo rỗng) và xác nhận case 10.000 đề chạy đủ vòng lặp.
5. Đối chiếu chân lý hình học (4/2/1/8/3 lỗ) với bản Python: được chạy `python3` bản gốc để so.

KẾT LUẬN: PASS / FAIL (danh sách C#) + 3 rủi ro lớn nhất + mục nào KHÔNG KIỂM CHỨNG ĐƯỢC và vì sao. Nói "PASS" mà không dẫn file:dòng = báo cáo bị loại.
