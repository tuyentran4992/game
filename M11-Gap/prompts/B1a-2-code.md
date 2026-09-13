Bạn là dev TypeScript. Thực hiện batch B1a: implement lõi logic để bộ test đang ĐỎ chuyển XANH.

Đọc trước: /data/youtube-playables/M11-Gap/specs/1-paper-crease/SPEC.md (PC-02/03/04, mục 5.4/6) · docs/STRUCTURE.md (pattern + ranh giới 1 chiều + cổng kiểm) · tests/logic/*.test.ts (đích phải đạt) · khung src/logic/*.ts.
Tham chiếu để PORT (không copy mù): /data/shared-board-agent-waves/game-gap-giay/code/g01_fold_sim.py · g08_generator.py · g08_verify.py.

PHẠM VI FILE: chỉ được sửa/tạo trong /data/youtube-playables/M11-Gap/game/src/logic/.
Muốn thêm file mới ⇒ khai báo 1 dòng trách nhiệm vào docs/STRUCTURE.md trước rồi báo lại trong báo cáo.

RÀNG BUỘC CỨNG:
- Logic THUẦN: 0 import phaser / DOM / @game/sdk / platform.
- Toạ độ lỗ dùng Rat (số hữu tỉ, mẫu 2^n) — CẤM float cho toạ độ; so khớp phải chính xác.
- CẤM Math.random — mọi thứ từ seed.
- Mỗi file 1 trách nhiệm, header `// Pattern: <tên>` theo STRUCTURE.md; CẤM if/else ≥3 nhánh (dùng bảng tra/registry).
- Không bịa ngưỡng/số: nếu cần hằng số thì đặt tên rõ + ghi nguồn (SPEC/TEST-CASES).
- Nếu thấy test assert SAI so với hợp đồng/spec ⇒ BÁO LẠI, KHÔNG tự sửa test.

TRƯỚC KHI BÁO XONG (bắt buộc chạy, dán output thật):
  cd /data/youtube-playables/M11-Gap/game && npm run typecheck && npm run test:logic
KHÔNG commit/push.

BÁO CÁO: danh sách file đã sửa · output typecheck + test:logic (thật) · bảng PC-02/03/04 → hàm implement · mọi chỗ PHẢI lệch spec (nếu có) + lý do.
