Bạn là REVIEWER ĐỘC LẬP #3 (góc TẤN CÔNG) — stress/fuzz/purity cho batch B1a. **CẤM SỬA FILE TRONG REPO**; được tự viết script fuzz trong /tmp.

Đọc: /data/youtube-playables/M11-Gap/REVIEW-3-STRESS.md (đòn F1-F8) · specs/1-paper-crease/SPEC.md (PC-02/03/04) · game/src/logic/*.ts.
Cấm dùng lại test của tác giả làm bằng chứng — phải tự viết script riêng (có thể `node --experimental-strip-types` hoặc import qua vitest nháp trong /tmp, hoặc gọi hàm qua file test tạm ở /tmp).
Bản Python tham chiếu: /data/shared-board-agent-waves/game-gap-giay/code/g01_fold_sim.py (được chạy python3 để so).

Thực hiện đủ F1..F8, mỗi mục: kết quả + **output lệnh thật** + file:dòng nếu kết luận về code.
KẾT LUẬN: danh sách ca làm implementation SAI/CHẾT (kèm repro: input → thật/mong đợi) · 3 rủi ro lớn nhất · đã thử những gì (kể cả ca không tìm ra lỗi). Nói "không có lỗi" mà không liệt kê đã thử gì = báo cáo bị loại.
